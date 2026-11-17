# Infrastructure Security Testing

A controlled methodology for network and host security assessments.

## Assessment stages

1. **Scope validation:** confirm CIDRs, exclusions, permitted scan windows and rate limits.
2. **Asset discovery:** identify live hosts using approved low-impact methods.
3. **Service enumeration:** record open ports, service versions and exposed management interfaces.
4. **Configuration review:** validate TLS, authentication, patch state and secure defaults.
5. **Segmentation testing:** test only the explicitly approved source-to-destination paths.
6. **Vulnerability validation:** corroborate scanner findings with service evidence and safe checks.
7. **Reporting:** map evidence to affected assets, CWE/CVE where applicable and practical remediation.

## Evidence and operational safeguards

- Keep an asset inventory and timestamp all scan results.
- Use conservative scan rates and coordinate intrusive checks.
- Avoid denial-of-service tests unless explicitly authorized and separately approved.
- Never attempt password spraying or credential attacks outside written authorization.
- Do not pivot from an approved asset to unrelated systems.
- Record false positives, filtered ports and inconclusive checks separately.

## References

- [NIST SP 800-115](https://csrc.nist.gov/pubs/sp/800/115/final)
- [OWASP WSTG](https://owasp.org/www-project-web-security-testing-guide/)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks)
