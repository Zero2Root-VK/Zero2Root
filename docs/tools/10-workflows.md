# End-to-End Assessment Workflows & Tool Integration

<div class="z2r-page-intro" markdown="1">
<span class="z2r-level-kicker">TOOLS / 10 · ORCHESTRATION & EVIDENCE</span>

Connect individual tools into controlled, repeatable assessment workflows. The goal is reliable hand-offs and evidence—not an unattended scanner that probes whatever it discovers.
</div>

## 1. Automation architecture

A safe assessment pipeline should have distinct stages:

~~~text
Approved scope
    |
    v
Scope validation and exclusions
    |
    v
Passive discovery
    |
    v
DNS resolution and asset inventory
    |
    v
Human-reviewed approved-host allowlist
    |
    v
Service / application probing
    |
    v
Selected scanners and manual testing
    |
    v
Analyst validation and deduplication
    |
    v
Evidence package and report
    |
    v
Retest and closure
~~~

Each stage should have defined inputs and outputs. Do not pass every discovered hostname directly into an active scanner. Insert a scope check and an operator review before any higher-impact testing.

## 2. Example: bounded web attack-surface pipeline

This example demonstrates a conservative workflow for one authorised root domain. It is not a complete penetration test and it does not automatically validate or report vulnerabilities.

Prerequisites: current versions of Subfinder, dnsx, httpx, Nuclei and jq installed from their official sources. Confirm that each binary is the expected tool and review its current `-h` output. The example sets low explicit request limits and sends active requests only to an explicit, human-reviewed host allowlist.

Create `scope-approved-hosts.txt` separately. It must contain only exact hostnames approved for active testing, one per line. Review candidate discovery results against the engagement scope and exclusions before populating this file.

~~~bash
#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT_DOMAIN="example.test"  # Reserved documentation domain; replace only with an approved root.
SCOPE_FILE="scope-approved-hosts.txt"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="evidence/$STAMP"

mkdir -p "$OUT"

for tool in subfinder dnsx httpx nuclei jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Required tool not found: %s\n' "$tool" >&2
    exit 127
  fi
done

ROOT_DOMAIN="$(printf '%s' "$ROOT_DOMAIN" | tr '[:upper:]' '[:lower:]' | sed 's/\.$//')"
if [[ ! "$ROOT_DOMAIN" =~ ^[a-z0-9.-]+$ || "$ROOT_DOMAIN" == *..* || "$ROOT_DOMAIN" == .* || "$ROOT_DOMAIN" == *. ]]; then
  printf 'ROOT_DOMAIN is not a valid basic DNS name: %s\n' "$ROOT_DOMAIN" >&2
  exit 2
fi

printf 'Root domain: %s\nRun started: %s\n' "$ROOT_DOMAIN" "$STAMP" \
  > "$OUT/run-manifest.txt"

# Passive discovery is collected for analyst review only.
subfinder -d "$ROOT_DOMAIN" -silent -o "$OUT/passive-hostname-candidates.txt"

if [[ ! -s "$OUT/passive-hostname-candidates.txt" ]]; then
  printf 'No passive names returned; continuing only if an approved scope file exists.\n' \
    >> "$OUT/run-manifest.txt"
fi

if [[ ! -s "$SCOPE_FILE" ]]; then
  printf 'Create and review %s before active testing.\n' "$SCOPE_FILE" >&2
  exit 2
fi

# Build a normalised exact-host allowlist. This is not a wildcard expansion.
NORMALIZED_SCOPE="$OUT/approved-hostnames.txt"
: > "$NORMALIZED_SCOPE"

while IFS= read -r raw || [[ -n "$raw" ]]; do
  host="${raw%%#*}"
  host="$(printf '%s' "$host" | tr '[:upper:]' '[:lower:]' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//; s/\.$//')"
  [[ -z "$host" ]] && continue

  if [[ ! "$host" =~ ^[a-z0-9.-]+$ || "$host" == *..* ]]; then
    printf 'Invalid hostname in scope file: %s\n' "$host" >&2
    exit 2
  fi

  IFS='.' read -r -a labels <<< "$host"
  for label in ${labels[@]}; do
    if [[ ! "$label" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$ ]]; then
      printf 'Invalid DNS label in scope file: %s\n' "$label" >&2
      exit 2
    fi
  done

  case "$host" in
    "$ROOT_DOMAIN"|*."$ROOT_DOMAIN") ;;
    *)
      printf 'Out-of-root hostname in scope file: %s\n' "$host" >&2
      exit 2
      ;;
  esac

  printf '%s\n' "$host" >> "$NORMALIZED_SCOPE"
done < "$SCOPE_FILE"

sort -u "$NORMALIZED_SCOPE" -o "$NORMALIZED_SCOPE"

if [[ ! -s "$NORMALIZED_SCOPE" ]]; then
  printf 'The normalised approved scope is empty; stopping.\n' >&2
  exit 2
fi

# Only explicitly listed, reviewed hosts move to active DNS resolution.
dnsx -l "$NORMALIZED_SCOPE" -a -silent -rl 5 -t 5 \
  -o "$OUT/resolved-hostnames.txt"

if [[ ! -s "$OUT/resolved-hostnames.txt" ]]; then
  printf 'No approved hostnames resolved; stopping before HTTP probing.\n' >&2
  exit 0
fi

# Perform one HTTP probe and retain both JSONL evidence and a URL list.
httpx -l "$OUT/resolved-hostnames.txt" -silent \
  -status-code -title -tech-detect -json \
  -rl 5 -t 5 \
  -o "$OUT/http-inventory.jsonl"

jq -r '.url // empty' "$OUT/http-inventory.jsonl" \
  | sort -u > "$OUT/live-urls.txt"

if [[ -s "$OUT/live-urls.txt" ]]; then
  # Review template IDs/tags and engagement exclusions before this stage.
  nuclei -l "$OUT/live-urls.txt" \
    -severity high,critical \
    -rate-limit 3 -c 5 -bs 5 \
    -jsonl -o "$OUT/nuclei-high-critical.jsonl"
fi

printf 'Run finished: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  >> "$OUT/run-manifest.txt"
~~~

Before using this workflow beyond a lab:

- Replace the example domain with a scope-approved root.
- Populate the approved-host file through a documented human scope review.
- Add engagement-specific exclusions to that review; the suffix guard above is not a substitute for a complete scope policy.
- Set request rate, concurrency and time window according to the rules of engagement.
- Review active scanning templates and exclude intrusive checks.
- Confirm the output schemas for the exact installed versions, especially the JSONL URL field used by `jq`.
- The root-domain suffix check is only a basic guard. It does not replace the engagement's exact scope, exclusions, third-party ownership checks or CDN/IP validation.
- Inspect the Nuclei templates that will run. A `high,critical` severity filter is not a guarantee that every matching template is non-intrusive.

The HTTP inventory is collected once. `jq` extracts the URL field from the JSONL output for Nuclei, avoiding a second HTTP probe. If the installed httpx output schema changes, inspect it with that version's field-discovery help and update the parser before running the pipeline.

## 3. Example: web application assessment hand-off

| Stage | Tool / method | Output to retain |
|---|---|---|
| Application mapping | Browser, Burp Proxy, approved crawler | Site map, role and route inventory |
| Request capture | Burp Proxy / curl | Baseline request/response |
| Manual validation | Burp Repeater | Modified request and comparison |
| Passive automation | ZAP Baseline | HTML/JSON alert report |
| Controlled fuzzing | ffuf | JSON result and wordlist/rate details |
| API schema review | OpenAPI tooling and manual tests | Versioned schema and role matrix |
| Vulnerability confirmation | Analyst-run narrow test | Reproduction steps and minimal evidence |
| Retest | Same request/profile after fix | Before/after evidence |

Automated discovery and manual testing should share a target inventory but must not silently inherit each other's permissions. For example, a crawler may discover a production payment endpoint that is excluded from fuzzing.

## 4. Normalise findings without losing source evidence

A common finding record can make results easier to compare:

~~~json
{
  "engagement_id": "ENG-EXAMPLE",
  "run_id": "2026-01-01T00:00:00Z",
  "asset": "app.example.test",
  "url": "https://app.example.test/example",
  "tool": "example-tool",
  "tool_version": "record-the-installed-version",
  "rule_id": "rule-or-plugin-id",
  "severity_source": "tool-reported-value",
  "status": "needs-validation",
  "evidence_file": "raw/tool-output.json",
  "analyst_note": "Candidate finding; manual validation pending"
}
~~~

This is an illustrative schema, not a universal import format. Preserve the original tool report and the fields needed to interpret it. Do not overwrite source severity or rule identifiers during normalisation.

Useful deduplication keys may include asset, URL/path, parameter, rule/plugin identifier and affected component. Do not merge findings merely because they share the same CVE or hostname; different endpoints or root causes may need separate records.

## 5. Evidence package design

For every run, retain:

- Approved scope and exclusions.
- Start/end time in UTC.
- Operator/source host and tool versions.
- Exact command line or versioned configuration file.
- Raw scanner exports and the target inventory used.
- Logs, errors and skipped/failed checks.
- Analyst validation notes and false-positive rationale.
- Retest evidence and report references.

Keep secrets, cookies, authentication headers, customer data and raw packet captures in restricted storage. Use redacted copies for reports and wider review. Record hashes if evidence integrity is important to the engagement.

## 6. Operational controls

### Before execution
- Validate scope programmatically and with a human review.
- Use a dry-run mode to print the planned targets and actions.
- Set a maximum request rate, concurrency, scan duration and output size.
- Pin tool and template versions.
- Confirm the monitoring and emergency stop contact.

### During execution
- Log each stage and its exit status.
- Stop on unexpected scope expansion or target errors.
- Respect HTTP 429, Retry-After and service-owner throttling instructions.
- Do not automatically escalate from passive checks to active exploitation.
- Keep a stop/kill switch that terminates child processes.

### After execution
- Confirm output completeness and parse errors.
- Compare discovered targets with the approved list.
- Triage results manually and remove duplicates.
- Redact sensitive data before report generation.
- Retain raw evidence per the engagement's retention policy.

## 7. CI/CD considerations

For code and build pipelines, prefer non-destructive source and artefact checks early in the workflow: SAST, secret scanning, dependency scanning, IaC validation and SBOM generation. Reserve active DAST against a controlled preview/staging environment with dedicated test accounts and an explicit test window.

SARIF can integrate supported third-party code-analysis output into GitHub Code Scanning. Confirm repository feature availability, required permissions, SARIF compatibility and unique analysis categories before configuring uploads.

A CI pipeline should fail according to a documented policy, not simply because any scanner emitted any warning. Separate new findings, accepted exceptions, baseline debt and tool errors.

## 8. Automation anti-patterns

Avoid:
- Scanning every hostname discovered by passive sources without scope validation.
- Running high-concurrency fuzzing by default.
- Treating an HTTP 200 response as proof of an exposed resource.
- Chaining a JSON-producing tool into a line-oriented tool without parsing the data.
- Ignoring tool exit codes or incomplete scan warnings.
- Deleting raw output after creating a summary spreadsheet.
- Storing credentials in scripts or CI logs.
- Auto-exploiting or auto-remediating findings without human approval.

## Official references

- [ProjectDiscovery tools and chaining](https://projectdiscovery.io/open-source)
- [ZAP Automation Framework](https://www.zaproxy.org/docs/automate/automation-framework/)
- [GitHub SARIF uploads](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file)
- [GitHub SARIF support](https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/sarif-support)
- [Python subprocess](https://docs.python.org/3/library/subprocess.html)
