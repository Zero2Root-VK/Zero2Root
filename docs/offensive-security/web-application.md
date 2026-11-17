# Web Application Security Testing

A repeatable workflow for assessing web applications within an explicitly authorized scope.

## Assessment sequence

| Area | Questions to investigate | Useful references |
|---|---|---|
| Reconnaissance | What hosts, routes, technologies and trust boundaries are in scope? | [OWASP WSTG](https://owasp.org/www-project-web-security-testing-guide/) |
| Authentication | Can identity, MFA, recovery and session lifecycle controls be bypassed? | [PortSwigger Web Security Academy](https://portswigger.net/web-security) |
| Authorization | Are object and function permissions enforced server-side for every request? | [OWASP API Security](https://owasp.org/www-project-api-security/) |
| Input handling | Are inputs safely parsed, validated, encoded and parameterized? | [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) |
| Business logic | Can workflow state, quantity, ownership or approval rules be manipulated? | [PortSwigger Business Logic](https://portswigger.net/web-security/logic-flaws) |
| File handling | Are upload type, content, storage and retrieval controls enforced? | [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) |
| Configuration | Are TLS, security headers, cookies, CORS and error handling appropriate? | [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/) |

## Evidence checklist

- Record the exact in-scope hostname, endpoint and test account.
- Preserve the original request and response with sensitive values redacted.
- Use separate accounts to validate cross-user authorization flaws.
- Use harmless markers and controlled test files.
- Confirm reproducibility and distinguish a scanner alert from a verified finding.
- Document affected roles, preconditions, steps, observed behavior and remediation.

## Reporting

Use a concise finding structure: vulnerability name, severity, CVSS version and vector, CWE, OWASP category, affected host, observation, description, recommendation and reproducible evidence where applicable.

Do not include real customer data, passwords, session tokens or unrelated records in evidence.
