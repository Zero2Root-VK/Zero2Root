# Source-Code Security Review

A practical workflow for identifying and validating security defects in application source code.

## Review workflow

- **Map the application:** identify entry points, routes, controllers, middleware, background jobs and trust boundaries.
- **Trace untrusted data:** follow request parameters, headers, files, messages and database values through the application.
- **Inspect sensitive sinks:** database queries, command execution, template rendering, file paths, deserialization, redirects and outbound network requests.
- **Review authorization:** check ownership and role enforcement at the server-side data access layer.
- **Inspect secrets and configuration:** look for credentials, debug settings, unsafe defaults and insecure deployment configuration.
- **Review dependencies:** identify vulnerable, abandoned or unpinned dependencies and verify advisories.
- **Validate findings:** build a minimal local test or trace that demonstrates reachability and impact.

## Common weakness classes

| Weakness | Review focus |
|---|---|
| CWE-89 | SQL query construction and parameterization |
| CWE-78 | OS command construction and process invocation |
| CWE-79 | Context-aware output encoding |
| CWE-22 | Canonicalization and path containment |
| CWE-918 | User-controlled outbound requests and network boundaries |
| CWE-862 / CWE-863 | Missing or incorrect authorization checks |
| CWE-798 | Hard-coded credentials and secrets |

## AI-assisted review

Use a model to summarize modules, trace data flow, suggest candidate files and explain suspicious code. Require a human to verify reachability, exploitability and remediation. Keep repositories read-only, remove secrets before inference and do not let an agent run arbitrary commands without an approval gate.

## References

- [OWASP Code Review Guide](https://owasp.org/www-project-code-review-guide/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE List](https://cwe.mitre.org/)
