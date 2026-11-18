# Source Code, Dependency & Supply-Chain Tools

<div class="z2r-page-intro" markdown="1">
<span class="z2r-level-kicker">TOOLS / 08 · CODE & SOFTWARE SUPPLY CHAIN</span>

Combine static analysis, secret detection, dependency inventory and vulnerability matching to identify candidate weaknesses in source repositories and build artefacts.
</div>

## 1. Know what each tool can establish

| Tool | Main function | Does not prove by itself |
|---|---|---|
| [Semgrep](https://semgrep.dev/docs/) | Pattern- and rule-based source-code analysis | That every matched code path is reachable or exploitable |
| [Gitleaks](https://github.com/gitleaks/gitleaks) | Detect likely secrets in repository content/history | That a detected value is still valid or externally accessible |
| [Trivy](https://trivy.dev/latest/) | Dependency, filesystem, image, secret and misconfiguration scanning | That a package is reachable in the deployed execution path |
| [Syft](https://github.com/anchore/syft) | Generate SBOMs from filesystems and images | That an SBOM component is vulnerable |
| [Grype](https://github.com/anchore/grype) | Match SBOM/package data to known vulnerabilities | That the vulnerable code is reachable or exploitable |
| [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning) | Review supported SARIF results in repositories | That every third-party report will be accepted without schema/permission requirements |

Use these tools as complementary evidence sources. Do not collapse SAST, SCA, secret scanning and runtime testing into a single generic “code scan”.

## 2. Semgrep — source-code analysis

Semgrep uses rules to identify code patterns. Select rules according to the language, framework and assessment question. For a repeatable local run, prefer an explicitly selected ruleset or version-controlled local rules over an unpinned automatic selection.

~~~bash
semgrep scan --config auto --json --output evidence/semgrep.json .
~~~

The `auto` configuration fetches rules from the Semgrep Registry and uses the project URL during rule selection; the CLI documentation also describes pseudonymous usage metrics when registry configuration is used. Review the data-handling implications before scanning private client repositories. For repeatable or restricted environments, select a pinned ruleset such as `p/default` or use version-controlled local rules, subject to the ruleset's terms. Record the ruleset revision and do not assume that an automatically selected rule set is identical across dates or environments.

For each finding, trace:

- Source: where attacker-controlled or untrusted data enters.
- Transformations: validation, canonicalisation, encoding and sanitisation.
- Sink: where data reaches a sensitive API or operation.
- Reachability: whether the code path can execute in the deployed configuration.
- Context: framework behaviour, trust boundary and runtime controls.

A pattern match is a review candidate. Follow the data flow and run a safe test where appropriate.

## 3. Gitleaks — secret detection

**Maintenance note (checked 18 November 2026):** the upstream Gitleaks repository currently describes the project as feature-complete, with future releases focused on security patches. It remains usable for existing workflows, but teams choosing a new long-lived secret-scanning dependency should review current maintenance activity, supported releases and alternatives rather than assuming active feature development.

Scan a local repository directory:

~~~bash
gitleaks dir --redact --report-format json \
  --report-path evidence/gitleaks.json .
~~~

Gitleaks supports machine-readable reporting, including JSON, CSV, JUnit and SARIF. Confirm the installed release's help before using a command in CI; command names and legacy aliases have changed across versions.

If a possible secret is found:

1. Do not print or paste the raw secret into chat, a ticket or a report.
2. Identify its type, file and commit context.
3. Determine whether it is a placeholder, test value or real credential.
4. Ask the owner to revoke/rotate it when exposure is confirmed.
5. Review where it may have been used, while avoiding access to unrelated data.
6. Remove it from active source and address repository-history exposure under the organisation's process.

Redaction in scanner output does not automatically make all logs safe. Check CI logs, artifacts and debug output too.

## 4. Trivy — repository and dependency checks

Trivy can scan local filesystems and supported dependency manifests/lockfiles for vulnerabilities and secrets; misconfiguration scanning can be enabled for relevant files.

~~~bash
trivy fs --scanners vuln,misconfig,secret \
  --format json --output evidence/trivy-source.json .
~~~

Check which scanners are enabled in the installed release. A missing scanner or unsupported lockfile can create an apparent clean result with incomplete coverage.

## 5. Syft and Grype — SBOM then vulnerability matching

Generate a software inventory:

~~~bash
syft . -o cyclonedx-json=evidence/sbom.cdx.json
~~~

Match known vulnerabilities against the SBOM:

~~~bash
grype sbom:evidence/sbom.cdx.json -o json > evidence/grype.json
~~~

Preserve the SBOM and Grype report together with the repository commit or image digest. Package matching can be affected by renamed/forked components, vendored code, operating-system backports and package metadata quality.

## 6. SAST, SCA, secrets and SBOM are different controls

| Control | Core question | Typical result |
|---|---|---|
| SAST | Does the source contain a risky code pattern or flow? | Rule ID, file, line, source/sink evidence |
| SCA | Which third-party components and versions are present? | Package, version, advisory/CVE, fixed version |
| Secret scanning | Are credential-like values present in tracked content? | Secret type, file/commit, redacted match |
| SBOM | What components are present in this build? | Component inventory and relationships |
| Container scanning | What vulnerabilities or secrets exist in an image? | Package/image layer and finding |
| DAST | Does the running application exhibit a weakness? | Request/response and runtime behaviour |

A source-level pattern may not be reachable. A package vulnerability may not affect the deployed configuration. A secret may be revoked. A DAST finding may be caused by a proxy or test fixture. Validate before reporting.

## 7. SARIF and CI integration

SARIF is a standard format for representing static-analysis results. GitHub Code Scanning can ingest compatible SARIF files from third-party tools, subject to repository permissions, supported schema/version and upload constraints.

Before enabling uploads:

- Confirm Code Security availability for the repository.
- Pin the scanner and ruleset versions.
- Set a unique analysis category when uploading multiple result sets for the same commit.
- Avoid committing secrets or full scanner artifacts to public repositories.
- Preserve the raw report as a secured build artifact when needed.
- Review duplicate-alert and partial-fingerprint behaviour.

A CI pass/fail policy should distinguish new high-confidence findings from accepted legacy findings and documented exceptions. Do not fail builds solely on every historical result without a triage/baseline strategy.

## 8. Validation and triage

For every candidate, record the repository URL and commit SHA, scanner version, ruleset/database version, file and line, package ecosystem/version, relevant evidence and analyst decision.

Check whether:
- The code is compiled or executed in the deployed build.
- The dependency is direct, transitive, optional or development-only.
- The vulnerable function is actually used.
- A vendor backport or patched distribution package changes applicability.
- A secret is a dummy fixture or an active credential.
- A source-code issue can be reproduced in a controlled environment.

## Official references

- [Semgrep documentation](https://semgrep.dev/docs/)
- [Semgrep CLI reference](https://semgrep.dev/docs/cli-reference/)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
- [Trivy filesystem scanning](https://trivy.dev/docs/latest/guide/target/filesystem/)
- [Syft](https://github.com/anchore/syft)
- [Grype](https://github.com/anchore/grype)
- [GitHub SARIF uploads](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file)
- [SARIF support for Code Scanning](https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/sarif-support)
