# API Security Testing

Assess APIs for broken authorization, authentication weaknesses, excessive data exposure and unsafe business logic.

## Core test areas

- **Object-level authorization (BOLA):** verify that users can access only objects they are permitted to access.
- **Function-level authorization (BFLA):** verify role and privilege checks on every sensitive operation.
- **Authentication:** review token issuance, validation, expiry, refresh, revocation and audience.
- **Property-level authorization:** check whether sensitive fields can be read or modified by unauthorized roles.
- **Resource consumption:** assess pagination, batch sizes, rate limits and expensive operations within the approved test limits.
- **Business flows:** verify transaction state, ownership, idempotency and approval controls.
- **Inventory:** identify documented and undocumented API versions, endpoints and exposed schemas.
- **Configuration:** review CORS, TLS, error handling and debug exposure.

## Safe validation workflow

1. Confirm the API host, version, test accounts and permitted methods are in scope.
2. Capture a baseline request using the account that owns the test object.
3. Repeat with a second account and a synthetic object.
4. Compare server-side authorization behavior, not only client-side UI behavior.
5. Avoid bulk enumeration or destructive state changes.
6. Preserve minimal redacted evidence and report the exact authorization boundary that failed.

## References

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
