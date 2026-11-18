# Tools & Automation

<div class="z2r-page-intro" markdown="1">
<span class="z2r-level-kicker">PRACTITIONER FIELD REFERENCE / TOOLING & AUTOMATION</span>

A working reference for selecting, operating and connecting security tools. The focus is reproducible assessment workflows, reliable evidence and controlled automation—not a catalogue of commands without context.
</div>

## How to use this module

Use the guides in the order that matches the engagement. The intended operating model is **scope → discovery → targeted testing → analyst validation → evidence and retest**. Not every engagement needs every tool family, and a result from one stage must not silently authorise the next.

| Guide | Primary question | Typical outputs |
|---|---|---|
| [Reconnaissance & attack-surface discovery](01-recon-tools.md) | What approved assets and services are exposed? | Domain lists, DNS records, live-host inventory, endpoint inventory |
| [Network scanning & vulnerability assessment](02-scanning-tools.md) | Which hosts, ports, services and candidate weaknesses exist? | Nmap XML, scanner exports, Nuclei JSONL, TLS reports |
| [Web & API testing](03-web-tools.md) | How does the application behave under controlled security tests? | HTTP evidence, proxy projects, API test results, crawl data |
| [Network traffic & protocol analysis](04-network-tools.md) | What actually happened on the wire? | PCAP/PCAPNG, decoded protocol fields, packet timelines |
| [Mobile application testing](05-mobile-tools.md) | What can static and runtime analysis establish about an app? | Decompiled resources, manifests, runtime traces, MobSF reports |
| [Windows, Active Directory & identity](06-ad-tools.md) | How are domain identities, permissions and trust paths configured? | Directory inventory, collection data, relationship graphs |
| [Cloud, container & IaC security](07-cloud-tools.md) | Which cloud permissions, images and deployment definitions are risky? | Cloud posture reports, image findings, IaC findings, SBOMs |
| [Source code & supply chain](08-code-tools.md) | Which code paths, dependencies and secrets need review? | SAST findings, secret reports, dependency inventories, SARIF |
| [Scripting & security automation](09-scripting-automation.md) | How can a repeatable task be automated safely? | Validated scripts, structured JSON/CSV, logs and test results |
| [End-to-end assessment workflows](10-workflows.md) | How should tools exchange data across an engagement? | Run manifests, correlated findings, evidence packages |

## Choose a workflow by target

| Assessment target | Recommended starting path | Important boundary |
|---|---|---|
| Public attack surface | Recon → scanning → web/API | Passive discoveries remain candidates until ownership and scope are checked |
| Internal network | Network scanning → traffic analysis → identity | Confirm ranges, source IPs, scan windows and fragile assets |
| Web application or API | Web/API → scripting → end-to-end workflow | Use dedicated roles and synthetic records; avoid state-changing routes unless approved |
| Android or iOS app | Mobile → traffic analysis → source review | Record device state, app build, signing and instrumentation conditions |
| Cloud or Kubernetes | Cloud/IaC → source and supply-chain review | Confirm tenant/account and read-only identity before any scan |
| Repository or build pipeline | Source/supply chain → scripting → CI workflow | Keep code scanning, dependency analysis, secret detection and SBOM generation distinct |

## Selection principles

Do not choose a tool solely because it is popular. Select it according to the question being answered, the target type, authorisation, the quality of its output and the ability to validate its findings.

- **Discovery is not proof of vulnerability.** A banner, version string, scanner signature or technology fingerprint is a lead that needs verification.
- **Use the least intrusive method that answers the question.** Begin with passive sources or low-impact checks where suitable. Increase testing depth only when the rules of engagement allow it.
- **Prefer structured output.** XML, JSON, JSONL, CSV and SARIF are easier to parse, compare and retain than terminal text alone.
- **Keep raw evidence.** Never make the normalised spreadsheet or dashboard the only copy of a scan result.
- **Record versions and configuration.** Tool version, template version, scan profile, target list, time window and exclusions all affect reproducibility.
- **Separate automation from judgement.** A scanner may identify candidates; an analyst determines applicability, exploitability, impact and remediation.

## Authorisation and operational safety

!!! warning "Scope is a hard boundary"
    Run active tools only against assets and accounts explicitly authorised for the assessment. A parent domain, discovered subdomain, CDN address, SaaS tenant, cloud account or adjacent network is not automatically in scope. Confirm ownership and written permission before testing it.

Before each run, record:

1. Approved target names, IP ranges, applications, cloud accounts and test identities.
2. Exclusions, prohibited techniques, request ceilings, permitted time windows and emergency contacts.
3. Whether authenticated scanning, crawling, fuzzing, active checks or state-changing tests are permitted.
4. The operator, source IP, tool version, command/configuration and start/end time.

Use dedicated test accounts and synthetic records. Avoid password spraying, destructive payloads, denial-of-service testing, bulk data extraction, credential dumping and persistence unless the engagement explicitly authorises the exact activity and safeguards.

## Common evidence layout

A predictable directory layout makes results easier to reproduce and review.

~~~text
engagement-identifier/
├── 00-scope/
│   ├── scope-approved.txt
│   └── exclusions.txt
├── 01-recon/
├── 02-scanning/
├── 03-web-api/
├── 04-network-pcaps/
├── 05-identity/
├── 06-mobile/
├── 07-cloud-code/
├── 08-validation/
├── 09-reports/
└── run-manifest.json
~~~

Restrict filesystem permissions because scan files can contain internal hostnames, URLs, tokens, personal data or authentication material. Encrypt transfer and storage where required by the engagement. Redact secrets before sharing evidence.

## Tool setup and version control

Prefer official installation instructions and signed release artifacts. Avoid copying installation commands from unverified blogs. For containers, pin a tested image tag or digest rather than relying indefinitely on an unqualified `latest` tag. Keep a local inventory:

~~~text
tool,version,source,configuration,run_date
nmap,<installed-version>,official-package,approved-profile,YYYY-MM-DD
~~~

The version placeholders above are examples, not version recommendations. Check each tool's current release notes and command help before adopting a command in an automated pipeline. Flags, output schemas, default templates and licensing can change.

## Minimum run record

Every active run should have a small manifest that answers: who ran it, what exact approved targets were used, which tool and version ran, which options/templates were applied, when it ran, where the raw output is stored, and whether the output was validated. Keep exclusions and skipped targets visible rather than silently dropping them.

A practical hand-off has four separate states:

1. **Discovered:** observed from passive data or an inventory source.
2. **In scope:** matched against the written authorisation and exclusions.
3. **Tested:** an approved tool or manual test was actually executed.
4. **Validated:** an analyst confirmed applicability and retained reproducible evidence.

Do not collapse these states into a single `found` or `vulnerable` label.

## Output and validation expectations

| Output type | Useful for | Validation requirement |
|---|---|---|
| Nmap XML | Host, port, service and script results | Check target list, scan options and service evidence |
| Nessus / Greenbone export | Vulnerability and configuration findings | Review plugin/test evidence and credentialed-scan coverage |
| JSON / JSONL | Automation and finding correlation | Validate schema, timestamps, target and tool version |
| PCAP / PCAPNG | Network-level evidence | Preserve capture context, clock source and filter |
| SARIF | Code-scanning integration | Confirm rule identity, file/line locations and repository revision |
| CSV / HTML / PDF | Human review and reporting | Retain the raw source export and document filtering |

A result should not be reported merely because it appears in tool output. Reproduce the observation where safe, verify the affected component and version, distinguish scanner inference from direct evidence, and record any limitations.

## Further references

- [Nmap Reference Guide](https://nmap.org/book/man.html)
- [ProjectDiscovery documentation](https://docs.projectdiscovery.io/)
- [PortSwigger Burp Suite documentation](https://portswigger.net/burp/documentation/contents)
- [Wireshark User's Guide](https://www.wireshark.org/docs/wsug_html/)
- [OWASP MASTG testing tools](https://mas.owasp.org/MASTG/tools/)
- [Tenable Nessus documentation](https://docs.tenable.com/nessus/)
- [Trivy documentation](https://trivy.dev/latest/)
- [Python documentation](https://docs.python.org/3/)
