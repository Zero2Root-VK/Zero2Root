# Payload & Fuzzing Reference

A searchable reference for security-testing inputs, encoding notes and test methodology. Payloads are test data, not proof of a vulnerability.

> Use these materials only on systems you own or are explicitly authorized to assess. Respect program scope, rate limits and data-handling rules. Prefer intentionally vulnerable labs for learning.

## Payload collections

| Category | What to test | Curated reference |
|---|---|---|
| Cross-site scripting | Context-aware output encoding and DOM sinks | [PortSwigger XSS](https://portswigger.net/web-security/cross-site-scripting) |
| SQL injection | Query parameterization and database error behavior | [PortSwigger SQLi](https://portswigger.net/web-security/sql-injection) |
| NoSQL injection | Query operator handling and type validation | [OWASP WSTG](https://owasp.org/www-project-web-security-testing-guide/) |
| Server-side template injection | Template context and sandbox boundaries | [PortSwigger SSTI](https://portswigger.net/web-security/server-side-template-injection) |
| SSRF | Outbound request allowlists and network egress controls | [PortSwigger SSRF](https://portswigger.net/web-security/ssrf) |
| Path traversal | Canonicalization and file access boundaries | [PortSwigger Path Traversal](https://portswigger.net/web-security/file-path-traversal) |
| XML / XXE | External entity processing and parser configuration | [OWASP XXE Prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html) |
| JWT | Signature, algorithm, issuer, audience and expiry validation | [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html) |
| CORS | Origin allowlists and credential handling | [PortSwigger CORS](https://portswigger.net/web-security/cors) |
| Prompt injection | Instruction/data separation and tool authorization | [OWASP LLM Prompt Injection](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) |

## Harmless baseline markers

Start with inert values that establish whether input is reflected, stored or transformed. Examples:

- Z2R-REFLECTION-CHECK-2026
- z2r_test_'_"_<>_&
- ../../Z2R-CANARY (use only as a string in a controlled path-validation test; do not attempt to read real files)
- {{Z2R_TEMPLATE_MARKER}} (a non-sensitive template evaluation marker)
- https://example.invalid/z2r-ssrf-marker (a reserved invalid domain; use only to test parsing or controlled outbound-request handling)

Do not infer exploitability from reflection alone. Verify the relevant execution context and security boundary without accessing real secrets or causing side effects.

## Encoding and context

For each test case, record:
- Original input and any encoded form.
- Parameter, header, file or document location.
- Expected safe behavior.
- Actual response and server-side evidence where available.
- Whether the test is a harmless marker, a lab-only payload or a destructive test (destructive tests require separate authorization).

## External payload libraries

- [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

External repositories can contain high-impact or destructive examples. Review each payload, its license and its impact before using or mirroring it. Zero2Root links to upstream material rather than republishing unreviewed collections.

## Contribution format

Submit a proposed entry with category, objective, harmless/lab scope, expected behavior, remediation, official references and license. Never submit credentials, customer data or payloads that target real third-party systems.
