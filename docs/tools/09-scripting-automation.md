# Scripting & Security Automation

<div class="z2r-page-intro" markdown="1">
<span class="z2r-level-kicker">TOOLS / 09 · SCRIPTING ENGINEERING</span>

Build small, auditable programs that turn repeatable assessment tasks into reliable workflows. A good security script constrains its targets, handles failures, records evidence and never hides risky behaviour behind automation.
</div>

## 1. Choose the right automation layer

| Need | Prefer | Why |
|---|---|---|
| Combine existing CLI tools | Bash or PowerShell | Good for simple, transparent pipelines |
| Parse and normalise results | Python | Strong JSON, CSV, XML and text support |
| Call HTTP APIs | Python Requests or a purpose-built client | Explicit headers, sessions, timeouts and structured handling |
| Create or inspect packets | Scapy | Protocol-aware packet construction and dissection |
| Parallelise independent safe tasks | Python `concurrent.futures` | Bounded concurrency with explicit worker limits |
| Run a large assessment | Existing scanner/orchestrator | Avoid reimplementing scanning engines unnecessarily |

Automate the repetitive parts; keep test selection, exploitability judgement, impact assessment and reporting decisions under analyst control.

## 2. A reliable script structure

A maintainable command-line utility should include:

1. A clear purpose and supported input format.
2. Required arguments and validated defaults.
3. An explicit target/scope input.
4. Timeouts and bounded retries.
5. Rate and concurrency controls.
6. Structured output and useful logging.
7. Deterministic exit codes.
8. Unit tests for parsing and edge cases.
9. A versioned dependency list and usage documentation.

Prefer Python's standard library for argument parsing, JSON/CSV, paths, logging and process execution. Add third-party dependencies only where they provide a clear benefit.

## 3. Set up an isolated Python environment

~~~bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install requests
~~~

On Windows PowerShell, activate with:

~~~powershell
.venv\Scripts\Activate.ps1
~~~

Record dependencies in a requirements file and pin tested versions for repeatable runs. Do not install Python packages globally with elevated privileges unless the machine's management policy requires it.

## 4. Example: bounded HTTP inventory utility

This example reads a file containing URLs that have already been approved for testing. It sends GET requests only, does not follow redirects, validates URL syntax, uses explicit timeouts, retries only eligible GET responses and writes structured JSON. It does not crawl, discover additional targets or disable TLS certificate verification.

Create `http_inventory.py`:

~~~python
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from urllib.parse import urlsplit

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


LOG = logging.getLogger("http_inventory")


def validate_url(value: str) -> str:
    parts = urlsplit(value)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise ValueError("expected an absolute HTTP(S) URL")
    if parts.username or parts.password:
        raise ValueError("credentials must not be embedded in URLs")
    return value


def load_targets(path: Path) -> list[str]:
    targets: list[str] = []
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        value = raw.strip()
        if not value or value.startswith("#"):
            continue
        try:
            targets.append(validate_url(value))
        except ValueError as exc:
            raise ValueError(f"{path}:{line_number}: {exc}") from exc

    # Preserve order while removing duplicate URLs.
    return list(dict.fromkeys(targets))


def build_session() -> requests.Session:
    retry = Retry(
        total=2,
        connect=2,
        read=0,
        status=2,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET"}),
        respect_retry_after_header=True,
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)

    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({"User-Agent": "Zero2Root-Authorized-Inventory/1.0"})
    return session


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Inventory HTTP response metadata for an approved URL list."
    )
    parser.add_argument("--input", required=True, type=Path, help="Approved URL list")
    parser.add_argument("--output", required=True, type=Path, help="JSON output path")
    parser.add_argument("--connect-timeout", type=float, default=3.05)
    parser.add_argument("--read-timeout", type=float, default=10.0)
    args = parser.parse_args()

    if args.connect_timeout <= 0 or args.read_timeout <= 0:
        parser.error("timeouts must be greater than zero")

    try:
        targets = load_targets(args.input)
    except (OSError, UnicodeError, ValueError) as exc:
        LOG.error("Cannot load target list: %s", exc)
        return 2

    if not targets:
        LOG.error("The approved target list is empty")
        return 2

    args.output.parent.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, object]] = []

    with build_session() as session:
        for url in targets:
            try:
                response = session.get(
                    url,
                    timeout=(args.connect_timeout, args.read_timeout),
                    allow_redirects=False,
                    verify=True,
                )
                results.append({
                    "url": urlsplit(url)._replace(query="", fragment="").geturl(),
                    "query_parameters_present": bool(urlsplit(url).query),
                    "status_code": response.status_code,
                    "server": response.headers.get("Server"),
                    "content_type": response.headers.get("Content-Type"),
                    "location": response.headers.get("Location"),
                })
            except requests.RequestException as exc:
                # Avoid logging a complete URL that might contain sensitive query data.
                LOG.warning("Request failed for %s (%s)", urlsplit(url).hostname,
                            type(exc).__name__)
                results.append({
                    "url": url,
                    "error": type(exc).__name__,
                })

    with args.output.open("w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2)
        handle.write("\n")

    LOG.info("Wrote %d results to %s", len(results), args.output)
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    raise SystemExit(main())
~~~

Create `approved-urls.txt` with only authorised test URLs:

~~~text
https://app.example.test/
https://api.example.test/health
~~~

Run it:

~~~bash
python http_inventory.py \
  --input approved-urls.txt \
  --output evidence/http-inventory.json
~~~

The script intentionally does not follow redirects. This prevents it from silently moving to an unreviewed host. Review any `Location` value and add a new URL to the input file only after checking scope.

## 5. Process execution: avoid shell injection

When a script invokes a scanner, pass arguments as a list and avoid `shell=True`.

~~~python
import subprocess

command = [
    "nmap",
    "-sV",
    "-p", "22,80,443",
    "-oX", "evidence/nmap.xml",
    "192.168.56.10",
]

result = subprocess.run(
    command,
    check=True,
    capture_output=True,
    text=True,
    timeout=300,
)
~~~

Validate every target and option before constructing the command. Catch `FileNotFoundError`, `subprocess.TimeoutExpired` and `subprocess.CalledProcessError` in production code. Treat scanner output as untrusted input when parsing it.

Never build shell commands by concatenating user-supplied hostnames, URLs, filenames or payload values.

## 6. HTTP client engineering

For API-based automation:

- Use a session when connection reuse and shared configuration are appropriate.
- Set connect and read timeouts on every request.
- Retry only operations that are safe to repeat; an HTTP GET is generally safer to retry than a state-changing POST.
- Respect Retry-After and provider rate limits.
- Validate TLS certificates; do not normalise `verify=False` as a workaround.
- Handle 3xx, 4xx, 5xx and transport errors separately.
- Do not log credentials, cookies, bearer tokens or sensitive query strings.
- Keep API keys in an approved secret manager or environment injection mechanism, not in source control.

A timeout is not necessarily a total wall-clock deadline for the entire response body. Set an outer job deadline as well when the overall task must finish within a fixed window.

## 7. Structured data and logging

Prefer JSONL for streaming large result sets and JSON for smaller reports. CSV is useful for analyst review but can lose nested structures. Retain the raw scanner output beside any normalised export.

A useful record contains:

- Engagement and run identifier.
- Asset and endpoint.
- Tool name and version.
- Rule/plugin/template identifier.
- Observation timestamp in UTC.
- Raw evidence path.
- Validation state and analyst note.

Do not use a single free-text field as a substitute for provenance. Avoid storing secrets or full HTTP bodies when headers and a minimal response excerpt are sufficient.

## 8. Testing and quality gates

Before using an automation utility in an assessment:

1. Run syntax checks and a linter.
2. Unit-test URL parsing, scope validation, output serialisation and error handling.
3. Test with a local mock service and controlled responses.
4. Confirm rate limits and timeout behaviour.
5. Test empty input, duplicate input, invalid URLs, redirects, TLS errors and HTTP 429/5xx responses.
6. Verify that logs and JSON output do not contain credentials.
7. Run against a small approved target set before expanding the scope.

For the example utility:

~~~bash
python -m py_compile http_inventory.py
~~~

A successful compile checks syntax only. It does not prove that dependencies, network behaviour or scope decisions are correct.

## Official references

- [Python argparse](https://docs.python.org/3/library/argparse.html)
- [Python subprocess](https://docs.python.org/3/library/subprocess.html)
- [Python logging](https://docs.python.org/3/library/logging.html)
- [Requests Quickstart](https://requests.readthedocs.io/en/stable/user/quickstart/)
- [Scapy documentation](https://scapy.readthedocs.io/en/stable/)
