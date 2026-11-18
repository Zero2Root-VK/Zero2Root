---
title: "Network Scanning & Vulnerability Assessment Tools"
description: "Host discovery, TCP/UDP scanning, service identification, vulnerability scanners, TLS checks and manual validation."
---

## 1. Scanning sequence

Use a staged approach. Each phase should answer a defined question and inform the next phase.

1. **Host discovery:** identify responsive hosts in the authorised range.
2. **Port inventory:** identify listening TCP and selected UDP services.
3. **Service identification:** establish protocol and version evidence.
4. **Vulnerability assessment:** run approved checks against the confirmed services.
5. **Manual validation:** test whether the reported condition is present and applicable.
6. **Retest:** repeat the original test after remediation using comparable options.

Do not begin with maximum timing, every port, every plugin and every template. Large scans can disrupt fragile devices, trigger monitoring alerts or affect shared services.

## 2. Nmap — network exploration and service discovery

Create the output directory from the engagement workspace before running the examples:

~~~bash
umask 077
mkdir -p evidence
~~~

The examples write files beneath `evidence/`; without the directory, Nmap and the other tools may fail to create their output files.

[Nmap](https://nmap.org/docs.html) is used for host discovery, port scanning, service/version detection, OS fingerprinting and supported NSE scripts.

### Host discovery

~~~bash
nmap -sn -oA evidence/host-discovery 192.168.56.0/24
~~~

This discovers hosts without performing a port scan. Discovery behaviour depends on privileges, routing and filtering. A host that does not answer the selected probes is not necessarily offline.

### TCP port inventory

~~~bash
sudo nmap -sS -p 1-1000 -T3 --reason \
  -oA evidence/tcp-top-1000 192.168.56.10
~~~

- `-sS` uses a TCP SYN scan and normally requires raw-packet privileges.
- `-p` defines the port range.
- `-T3` uses Nmap's normal timing profile.
- `--reason` records the reason for the reported state.
- `-oA` writes normal, grepable and XML output files.

If raw-packet privileges are unavailable, `-sT` performs a TCP connect scan through the operating system. Use the scan type that is supported and permitted by the environment.

### Service and version detection

~~~bash
nmap -sV --version-light -p 22,80,443 \
  -oA evidence/service-detection 192.168.56.10
~~~

Version detection sends probes to identify services. Treat product/version output as evidence to investigate, not conclusive proof of vulnerability. Proxies, banners, backported patches and custom builds can make version-only matching misleading.

### Limited UDP assessment

~~~bash
sudo nmap -sU --top-ports 20 -T2 --reason \
  -oA evidence/udp-top-20 192.168.56.10
~~~

UDP results can be ambiguous. Nmap may report `open|filtered` when no response is received. Use protocol-aware checks and corroborating evidence instead of treating that state as a confirmed open service.

::: note[Reserved example address]
The address in the examples is from a private lab range. Replace it with an asset explicitly approved for your assessment. Do not copy the commands against arbitrary public targets.
:::

## 3. Masscan — high-speed port discovery

Masscan can identify exposed ports across large approved ranges quickly. Its speed is also its principal operational risk.

Use it only when the network owner has approved the exact ranges, rate, source address and time window. Start with a small range and a low request rate; coordinate with monitoring teams.

~~~bash
sudo masscan 192.168.56.0/24 -p80,443 --rate 100 \
  -oL evidence/masscan-web-ports.txt
~~~

Treat the output as candidate open ports. Confirm service identity with a targeted Nmap scan. Do not copy internet examples that use extremely high rates into a corporate or production network.

## 4. Nessus and Greenbone/OpenVAS

### Nessus

Tenable Nessus provides discovery, vulnerability and compliance-oriented scan templates. Select a scan template to match the purpose:

| Scan purpose | Appropriate starting point |
|---|---|
| Asset discovery | Host Discovery |
| Standard vulnerability assessment | Basic Network Scan |
| Targeted plugin assessment | A relevant vulnerability template or approved custom policy |
| Configuration/compliance review | A matching compliance audit and supported audit file |
| Authenticated patch/configuration review | A credentialed scan configured for the target operating system |

Use credentialed scans when the engagement and client configuration permit them. Validate successful authentication and coverage in the scan evidence; an attempted credentialed scan is not proof that local checks ran.

### Greenbone/OpenVAS

Greenbone Vulnerability Management provides an alternative vulnerability-management platform. Keep scanner feeds current, select an appropriate scan configuration and ensure the target list and port list reflect the approved scope. Record feed status and scanner version alongside the report.

### Scanner configuration controls

- Confirm the exact target list and exclusions before launching.
- Use safe checks and conservative performance settings for fragile or production systems.
- Coordinate credential use and account lockout policy.
- Avoid enabling brute-force or denial-of-service checks unless explicitly approved.
- Schedule scans to avoid backup windows, batch jobs and peak traffic.
- Store the native export as well as the human-readable report.

Nessus can export native scan files and reports in several formats. A native export is useful for later review, while a PDF/HTML/CSV report is convenient for distribution. Protect both because they can disclose hostnames, software versions and internal configuration.

## 5. Nuclei — template-based detection

Nuclei evaluates targets against YAML templates. It is useful for repeatable detection of known exposures and vulnerability signatures, but the quality of a result depends on the template, target response and conditions required by the check.

Start with a narrow severity selection and a conservative request ceiling:

~~~bash
nuclei -l evidence/recon/live-urls.txt \
  -severity high,critical \
  -rate-limit 5 -c 5 \
  -jsonl -o evidence/nuclei-high-critical.jsonl
~~~

Before a run:

- Review template IDs, authorship, tags and required conditions.
- Keep the template repository/version or update date with the engagement record.
- Exclude templates that are intrusive, destructive or outside the rules of engagement.
- Use `-validate` when authoring or modifying templates.
- Keep the request-rate and concurrency settings appropriate to the application.

A template match is a candidate finding. Inspect the request/response evidence and reproduce it safely before reporting. Some vulnerabilities require out-of-band callbacks, authentication or application state that a template cannot infer.

## 6. TLS configuration assessment with testssl.sh

[testssl.sh](https://github.com/testssl/testssl.sh) checks TLS/SSL protocols, ciphers and known configuration weaknesses.

~~~bash
./testssl.sh https://app.example.test:443
~~~

Use the current README and `./testssl.sh --help` for machine-readable output options in the installed release. Record the exact hostname, port, SNI name, date and tool version. A TLS result against an IP without the expected SNI name may assess a different virtual host.

Interpret protocol and cipher results in the context of the service role, client compatibility requirements and current cryptographic policy. Do not report a deprecated protocol as exploitable without explaining the actual exposure and supported threat model.

## 7. Reading results correctly

| Result | What it means | What it does not mean |
|---|---|---|
| Port `open` | A service accepted the scan's probe | The service is vulnerable |
| Port `filtered` | Filtering prevented Nmap from determining open/closed | The host is down |
| `open|filtered` | Nmap could not distinguish those states | A confirmed open UDP service |
| Version fingerprint | The response resembles a known service/version | The exact patch level is proven |
| Scanner plugin finding | A check matched its detection logic | The condition is exploitable in this deployment |
| Nuclei template match | A template's matcher conditions were satisfied | The finding is independently validated |

## 8. Validation workflow

For each important candidate:

1. Identify the exact asset, port, service and scan time.
2. Read the plugin/template description and evidence, not only the severity label.
3. Confirm the product and patch level using authoritative system evidence where available.
4. Determine whether compensating controls, reverse proxies or backported patches affect applicability.
5. Reproduce with a safe, narrow check and preserve the request/response or host evidence.
6. Record false-positive reasoning and test limitations.
7. Retest with comparable settings after remediation.

Do not combine plugin severity, CVSS, EPSS and business impact into one unexplained number. Keep the source metrics and the analyst's risk decision distinct.

## 9. Operational failure modes

- **Large scan queues:** reduce hosts/checks concurrency and split the approved range into batches.
- **Missing hosts:** confirm routing, discovery method and firewall policy; consider an approved `-Pn` scan only when host discovery is known to be blocked.
- **Missing UDP services:** review rate limiting and protocol-specific response behaviour.
- **Credentialed scan failures:** validate the account, required privileges, remote management configuration and scanner logs.
- **Inconsistent results:** compare scan profile, plugin/feed version, target resolution, credentials and time window.
- **Unexpected service impact:** stop the scan, notify the engagement contact and preserve logs before changing configuration.

## Official references

- [Nmap documentation](https://nmap.org/docs.html)
- [Nmap port-scanning techniques](https://nmap.org/book/man-port-scanning-techniques.html)
- [Tenable Nessus scan templates](https://docs.tenable.com/nessus/Content/ScanAndPolicyTemplates.htm)
- [Tenable Nessus scan policies](https://docs.tenable.com/nessus/Content/Policies.htm)
- [Tenable scan exports and reports](https://docs.tenable.com/nessus/Content/ScanReportFormats.htm)
- [ProjectDiscovery Nuclei](https://docs.projectdiscovery.io/tools/nuclei/overview)
- [testssl.sh](https://github.com/testssl/testssl.sh)
