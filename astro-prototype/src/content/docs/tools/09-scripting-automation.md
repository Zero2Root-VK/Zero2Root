---
title: "Scripting & Security Automation"
description: "Python, Bash, structured data, HTTP clients, safe subprocess execution, retries, logging and tests."
---

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

The module includes a reusable Python utility and its unit tests:

- [HTTP inventory script](/downloads/tools/http_inventory.py)
- [Unit tests](/downloads/tools/test_http_inventory.py)
- [Runtime dependencies](/downloads/tools/requirements.txt)

This is a metadata inventory tool, not a crawler or vulnerability scanner. It accepts one approved HTTP(S) URL per line and requires a separate file containing the exact hostnames or IP addresses allowed for the run.

### Install in an isolated environment

Run these commands from the examples directory:

~~~bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
~~~

On Windows PowerShell, activate with:

~~~powershell
.venv\Scripts\Activate.ps1
~~~

### Prepare the approved inputs

Create `approved-hosts.txt` with exact hostnames, one per line. Do not use wildcards or parent-domain entries unless the exact parent hostname itself is authorised.

~~~text
app.example.test
api.example.test
~~~

Create `approved-urls.txt` with exact URLs that are included in the engagement scope:

~~~text
https://app.example.test/
https://api.example.test/health
~~~

The `.test` names are documentation placeholders. Replace them only with exact hosts and URLs approved for your assessment. The default allowed ports are 80 and 443; add a non-standard port explicitly with `--allowed-ports`, for example `--allowed-ports 443,8443`.

### Validate before sending requests

First run validation-only mode. It checks URL syntax, exact host membership, allowed ports, duplicate targets and the maximum target count without making network requests:

~~~bash
python http_inventory.py \
  --input approved-urls.txt \
  --allow-hosts approved-hosts.txt \
  --output evidence/http-inventory.json \
  --validate-only
~~~

Review the printed origins and resolve any scope issue before removing `--validate-only`.

### Run the inventory

~~~bash
python http_inventory.py \
  --input approved-urls.txt \
  --allow-hosts approved-hosts.txt \
  --output evidence/http-inventory.json
~~~

Default safeguards include:

- Exact hostname/IP matching; subdomains are not implicitly accepted.
- Explicit port allowlisting (80 and 443 by default).
- GET requests only, one target at a time, with a one-second delay by default.
- A maximum of 100 unique targets unless deliberately changed.
- Connect/read timeouts and a limited retry policy for GET requests.
- TLS certificate verification enabled; redirects are recorded but never followed.
- Response bodies are not downloaded.
- Query values, URL paths and raw redirect locations are not written to the JSON report. The report records only the origin and whether a path or query was present.
- Output is written atomically with owner-only file permissions on POSIX systems.
- Environment proxy variables are not inherited automatically. The utility connects directly; adapt it to use an explicitly approved proxy if the engagement requires one.

The exact host allowlist and port list are guardrails, not a complete scope engine. They do not validate ownership of resolved IP addresses, CIDR boundaries, CDN tenancy or every engagement exclusion. Confirm DNS answers and the written rules of engagement independently. A GET request can still trigger side effects on a poorly designed application; use a permitted test environment and check the target behaviour before running.

### Run the tests

The tests use local parsing and mocked HTTP responses; they do not contact external systems:

~~~bash
python -m unittest -v test_http_inventory.py
python -m py_compile http_inventory.py
~~~

The suite checks hostname normalisation, IDNA and IPv6 handling, exact allowlist enforcement, port restrictions, URL credential/fragment rejection, duplicate limits, redirect non-following and secret-value redaction from results.

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
