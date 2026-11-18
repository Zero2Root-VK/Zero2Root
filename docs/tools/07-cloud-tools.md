# Cloud, Container & Infrastructure-as-Code Security Tools

<div class="z2r-page-intro" markdown="1">
<span class="z2r-level-kicker">TOOLS / 07 · CLOUD & PLATFORM SECURITY</span>

Review cloud identity and configuration, container images, Kubernetes posture and infrastructure definitions using read-only identities and repeatable evidence.
</div>

## 1. Coverage and tool selection

| Tool | Primary purpose | Typical target |
|---|---|---|
| [Prowler](https://docs.prowler.com/) | Cloud security posture assessment | AWS, Azure, GCP and supported providers |
| [Trivy](https://trivy.dev/latest/) | Vulnerability, secret and misconfiguration scanning | Filesystems, repositories, container images and supported targets |
| [Checkov](https://www.checkov.io/) | Infrastructure-as-Code policy scanning | Terraform, CloudFormation, Kubernetes and other supported definitions |
| [Syft](https://github.com/anchore/syft) | Software Bill of Materials generation | Filesystem and container image |
| [Grype](https://github.com/anchore/grype) | Known-vulnerability scanning | Filesystem, container image and SBOM |
| [kube-bench](https://github.com/aquasecurity/kube-bench) | Kubernetes CIS benchmark checks | Kubernetes nodes and supported distributions |

The tools overlap, but they do not answer the same question. Prowler checks cloud-account posture; Checkov evaluates IaC definitions; Trivy and Grype examine software artefacts; Syft describes components in an SBOM.

## 2. Cloud account safety

Use a dedicated assessment identity with the minimum read permissions required by the selected checks. Prefer an approved role or short-lived session. Do not use a personal administrator key or export cloud credentials into a project directory.

Before scanning, confirm:

- Provider, tenant/account, subscription/project and region.
- The exact identity the CLI will use.
- Whether the assessment is organisation-wide or restricted to selected accounts/projects.
- Which services and metadata may be queried.
- Data residency, evidence retention and rate limits.
- Whether the scanner makes any changes (the intended posture checks should be read-only unless the scope says otherwise).

For AWS, confirm the active identity before running a posture scan:

~~~bash
aws sts get-caller-identity --profile audit-readonly
~~~

The profile name is an example. Check the returned account and principal with the cloud owner; do not proceed if the identity or account is unexpected.

## 3. Prowler — cloud posture assessment

Prowler provides provider-specific security checks and compliance-oriented reporting. Its checks and output options evolve; use the official documentation for the provider and installed version.

For an AWS profile explicitly configured for the assessment:

~~~bash
prowler aws --profile audit-readonly
~~~

Prowler supports multiple cloud providers, but provider authentication and required permissions differ. Configure the appropriate provider identity first and validate it independently. Review findings for the specific resource, region, service, check identifier and evidence.

A failed or skipped check is not a passed control. Distinguish:

- **PASS:** the check's condition passed.
- **FAIL:** the check identified a condition requiring review.
- **MANUAL / MUTED / ERROR / OUT OF SCOPE:** status meanings depend on the report schema and tool version; do not silently convert these to PASS.

## 4. Trivy — filesystem and container scanning

Scan a checked-out project directory:

~~~bash
trivy fs --scanners vuln,misconfig,secret \
  --format json --output evidence/trivy-filesystem.json .
~~~

Scan a pinned container image reference:

~~~bash
trivy image --scanners vuln,secret --severity HIGH,CRITICAL \
  --format json --output evidence/trivy-image.json \
  registry.example.test/team/app:1.2.3
~~~

Use immutable digests where reproducibility matters. A mutable tag such as `latest` can point to a different image on a later run. Record the image digest, platform, scanner version and database update time.

Trivy's default scanner set and supported target options can change. Review the current documentation before relying on a particular scanner being enabled by default. Misconfiguration scanning of IaC files is best performed against the source definitions, not inferred from the container package inventory.

## 5. Checkov — IaC policy checks

Checkov scans supported infrastructure-as-code files against security policies. For a Terraform directory:

~~~bash
checkov -d . --framework terraform --output json
~~~

Use the relevant framework selector for the files under review. Keep the source revision and configuration file with the output. A policy failure is a candidate misconfiguration; review whether the resource is deployed, whether variables/modules alter its final configuration and whether an approved exception exists.

## 6. SBOM and component vulnerability workflow

An SBOM records the software components identified in an artefact. It is not itself a vulnerability assessment.

Generate a CycloneDX JSON SBOM with Syft:

~~~bash
syft . -o cyclonedx-json=evidence/sbom.cdx.json
~~~

Scan the SBOM with Grype:

~~~bash
grype sbom:evidence/sbom.cdx.json -o json > evidence/grype-sbom.json
~~~

The result depends on package recognition, metadata quality and vulnerability database state. Review package name, ecosystem, installed version, fixed version and source. Record the SBOM format/version and scanner database timestamp.

Syft and Grype support several additional targets and formats; consult their current documentation before adding new output formats to a pipeline.

## 7. Kubernetes and container platform checks

A Kubernetes review should include the cluster version and distribution, control-plane exposure, API authentication, RBAC, service accounts, pod security settings, network policies, admission controls, secrets management, image provenance and node configuration.

Use kube-bench or a supported alternative to evaluate CIS benchmark controls, but verify support for the cluster distribution and version. Benchmark checks are configuration indicators; they do not replace validation of the deployed workload and runtime controls.

For container registries and images:

- Pin base images and production image digests.
- Scan images during build and before deployment.
- Restrict image pull permissions and registry exposure.
- Review Dockerfile/Kubernetes manifests and runtime privileges.
- Generate and retain SBOMs where required.
- Define how accepted vulnerabilities and VEX/exceptions are documented.

## 8. Prioritise and validate findings

Do not equate a scanner's severity with cloud risk. Determine:

1. Is the resource deployed and reachable?
2. Does the identity have the privilege suggested by the finding?
3. Is the configuration inherited, overridden or unused?
4. Does the resource contain sensitive data or provide a path to other resources?
5. Is the check current for this provider/API and region?
6. Is there a documented compensating control or accepted risk?

For cloud issues, collect resource identifiers and configuration evidence, not secret values. Redact account IDs or resource names when publishing examples.

## 9. Operational pitfalls

- **Wrong account:** verify identity and region before scanning.
- **Permission errors:** check the read-only policy and scanner requirements; do not solve them by giving the scanner administrator access automatically.
- **Large output volume:** limit projects/accounts intentionally and preserve a clear scope manifest.
- **Stale image tag:** record the digest, not only the tag.
- **Outdated vulnerability database:** record database timestamp and update status.
- **Policy exception drift:** record rule ID, resource, owner, expiry and reason.
- **False confidence from IaC:** source configuration may differ from deployed infrastructure.

## Official references

- [Prowler documentation](https://docs.prowler.com/)
- [Trivy documentation](https://trivy.dev/latest/)
- [Trivy filesystem scanning](https://trivy.dev/docs/latest/guide/target/filesystem/)
- [Trivy container-image scanning](https://trivy.dev/docs/latest/guide/target/container_image/)
- [Checkov](https://www.checkov.io/)
- [Syft](https://github.com/anchore/syft)
- [Grype](https://github.com/anchore/grype)
- [kube-bench](https://github.com/aquasecurity/kube-bench)
