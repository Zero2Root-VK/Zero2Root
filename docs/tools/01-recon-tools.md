# Reconnaissance & Attack-Surface Discovery

<div class="z2r-page-intro" markdown="1">
<span class="z2r-level-kicker">TOOLS / 01 · DISCOVERY</span>

Build an evidence-backed inventory of approved domains, DNS records, live web services and application endpoints. Keep passive collection separate from active probing and never assume that a discovered asset is automatically authorised.
</div>

## 1. Purpose and workflow

Reconnaissance answers: **which assets are associated with the approved organisation, which respond, and what should be examined next?**

A defensible workflow is:

1. Load the approved root domains, IP ranges and explicit exclusions.
2. Collect passive observations from permitted public sources.
3. Resolve candidate hostnames and remove duplicates.
4. Probe only approved hosts for live services.
5. Crawl approved applications at a controlled depth and request rate.
6. Validate ownership, scope and material observations before passing targets to scanners.

Passive data can be stale, incomplete or associated with third-party infrastructure. Active DNS queries, crawling and probing create traffic and must follow the engagement rules.

## 2. Tool selection

| Tool | Best fit | Important limitation |
|---|---|---|
| [Subfinder](https://docs.projectdiscovery.io/tools/subfinder/overview) | Passive subdomain discovery from configured public sources | Coverage depends on source availability and configured API keys |
| [Amass](https://github.com/owasp-amass/amass) | DNS and attack-surface mapping, including passive enumeration | Active modes can generate additional DNS traffic |
| [theHarvester](https://github.com/laramies/theHarvester) | Collecting public email, hostname and source references | Source coverage and API limits vary |
| [Certificate Transparency](https://crt.sh/) | Finding names appearing in public TLS certificates | Certificate entries do not prove that a host is live or in scope |
| [Shodan](https://help.shodan.io/) | Reviewing internet-exposure observations from Shodan's index | Results are point-in-time observations, not a live scan |
| [dnsx](https://docs.projectdiscovery.io/tools/dnsx/overview) | Resolving and querying DNS records at scale | DNS answers can vary by resolver, location and time |
| [httpx](https://docs.projectdiscovery.io/tools/httpx/overview) | HTTP probing, status codes, titles and technology hints | A response does not prove application ownership or vulnerability |
| [Katana](https://docs.projectdiscovery.io/tools/katana/overview) | Controlled web crawling and endpoint discovery | Crawling may trigger state changes if the app exposes unsafe GET routes |

The ProjectDiscovery CLI tool named `httpx` is not the Python HTTPX library. Check the binary path and version when both are installed.

## 3. Establish a controlled workspace

Use a separate directory for each engagement. The domain below is a placeholder; replace it only with a root explicitly present in the approved scope.

~~~bash
umask 077
mkdir -p evidence/recon
printf '%s\n' 'example.com' > evidence/recon/approved-roots.txt
~~~

Keep the approved scope file under change control. Do not construct target lists from search results and feed them directly into active tools without checking them against scope and exclusions.

## 4. Passive discovery

### Subfinder

Subfinder queries passive sources to discover subdomains. Provider configuration and API keys determine source coverage.

~~~bash
subfinder -d example.com -silent -o evidence/recon/subfinder.txt
~~~

For repeatable work, record the Subfinder version, provider configuration identifier (not the API key), source options and collection time. Avoid publishing provider keys or raw authenticated configuration files.

### Amass

Use passive mode when the task is to collect data without active DNS brute forcing:

~~~bash
amass enum -passive -d example.com -o evidence/recon/amass-passive.txt
~~~

Amass has other modes and options. Review its current help and documentation before enabling active enumeration, brute forcing or recursive discovery.

### Certificate Transparency

A simple CT query can identify names present in certificates issued for a domain:

~~~bash
curl -fsS 'https://crt.sh/?q=%25.example.com&output=json' \
  | jq -r '.[].name_value' \
  | sed 's/^\*\.//' \
  | sort -u > evidence/recon/ct-names.txt
~~~

Treat every returned name as an unverified candidate. Certificate entries may be historical, wildcard-derived, misspelled, delegated or hosted by a third party.

### Shodan and other indexed sources

Use a provider's official interface or API and retain the query, account context and collection time. Confirm that the indexed address belongs to the authorised asset before using it as an active scan target. A Shodan observation can help prioritise review; it cannot replace direct validation.

## 5. Resolve and normalise candidates

Merge passive results, remove blank lines and deduplicate:

~~~bash
cat evidence/recon/subfinder.txt evidence/recon/amass-passive.txt evidence/recon/ct-names.txt \
  | tr '[:upper:]' '[:lower:]' \
  | sed '/^[[:space:]]*$/d' \
  | sort -u > evidence/recon/candidate-hostnames.txt
~~~

Resolve the candidate list with dnsx:

~~~bash
dnsx -l evidence/recon/candidate-hostnames.txt -a -resp -silent \
  -rl 5 -t 5 -o evidence/recon/resolved-a-records.txt
~~~

This example collects A-record responses. Add AAAA, CNAME, MX or other record queries only when they answer a defined assessment question. Do not discard the original hostname list: unresolved names can be temporarily unavailable or intentionally internal.

## 6. Probe approved HTTP services

After a human scope review, save the approved hostnames as one hostname per line in `evidence/recon/approved-hostnames.txt`. Do not pass the unreviewed candidate file directly to an active probe. The ProjectDiscovery httpx CLI currently supports JSONL output with `-json` and request-rate/thread controls with `-rl` and `-t`.

~~~bash
httpx -l evidence/recon/approved-hostnames.txt \
  -silent -status-code -title -tech-detect -json \
  -rl 5 -t 5 \
  -o evidence/recon/http-inventory.jsonl
~~~

Create a plain URL list from the structured output for tools that expect one URL per line:

~~~bash
jq -r '.url // empty' evidence/recon/http-inventory.jsonl \
  | sort -u > evidence/recon/live-http-urls.txt
~~~

The `.url` field is part of the httpx JSON output. Confirm it against the installed binary's `-ldv` output if you pin a different release or change the output format. The two files now serve different purposes: JSONL retains the structured observations; `live-http-urls.txt` is a simple downstream target list. Technology detection is fingerprinting, not proof of a specific version or exploitable weakness. httpx does not follow redirects unless that behaviour is enabled; review any discovered redirect destination against scope before testing it.

## 7. Controlled crawling

Katana can discover links and application endpoints from a seed URL. Start with one approved application and a low crawl depth. Review current options with `katana -h` and the official documentation before adding JavaScript crawling, form submission or higher concurrency.

Example command shape:

~~~bash
katana -u https://app.example.test -d 2 -rl 2 -jsonl \
  -o evidence/recon/katana-endpoints.jsonl
~~~

The hostname ending in `.test` is a lab placeholder. Do not crawl login, logout, payment, administrative or state-changing flows unless the engagement permits them. Avoid submitting forms or following workflows that can create, modify or delete production data.

## 8. Normalise results for the next stage

A useful asset record should preserve at least:

| Field | Meaning |
|---|---|
| `asset` | Canonical hostname or IP address |
| `source` | Tool or passive source that discovered it |
| `observed_at` | UTC collection timestamp |
| `record_type` | DNS record or HTTP observation type |
| `resolved_address` | Address observed at collection time, where relevant |
| `scope_status` | In scope, excluded, pending verification |
| `evidence_file` | Path to the raw result |

Do not merge two services solely because they share an IP address. Virtual hosting, CDNs and reverse proxies can place unrelated tenants behind the same address.

## 9. Common errors and troubleshooting

- **No results:** check the root domain, DNS connectivity, resolver policy and provider API configuration. Empty output does not prove that no assets exist.
- **Unexpected third-party names:** compare registrant, DNS delegation, certificate data and written scope. Exclude until ownership is confirmed.
- **Wildcard DNS:** compare random, non-existent labels to understand wildcard responses before trusting brute-force results.
- **HTTP probe failures:** distinguish DNS failure, TLS failure, timeout, redirect and HTTP error. Do not automatically label all non-200 responses as dead.
- **Rate limiting:** reduce request rate, observe Retry-After and coordinate with the owner. Do not evade provider limits by rotating identities or source addresses.
- **Tool output changes:** pin tool versions for an engagement and review release notes before upgrading.

## 10. Handoff checklist

- [ ] Roots and exclusions match the approved scope.
- [ ] Passive and active results are stored separately.
- [ ] Candidate names are deduplicated and resolved.
- [ ] Every active target has been scope-checked.
- [ ] HTTP status, title and final URL are retained where collected.
- [ ] Third-party services and shared infrastructure are flagged for review.
- [ ] Tool versions, timestamps and commands are recorded.
- [ ] Raw results are protected and retained.

## Official references

- [ProjectDiscovery documentation](https://docs.projectdiscovery.io/)
- [Subfinder](https://docs.projectdiscovery.io/tools/subfinder/overview)
- [Amass](https://github.com/owasp-amass/amass)
- [theHarvester](https://github.com/laramies/theHarvester)
- [crt.sh](https://crt.sh/)
- [Shodan Help Centre](https://help.shodan.io/)
- [Katana](https://docs.projectdiscovery.io/tools/katana/overview)
