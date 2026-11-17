# AI & LLM Application Security

A practical knowledge base for testing applications that integrate large language models, retrieval systems, agents and external tools.

> **Testing boundary:** use a model or application you own, an explicitly authorized assessment target, or a controlled lab. Use synthetic secrets and mock tools. Do not use jailbreak prompts to obtain access to unrelated services or real user data.

## Main testing areas

| Area | What to assess |
|---|---|
| Prompt injection | Whether untrusted user or retrieved content changes intended model behavior |
| Indirect prompt injection | Whether instructions embedded in web pages, files, tickets or code are treated as trusted |
| Sensitive information disclosure | Whether dummy secrets or restricted test records can be exposed |
| RAG security | Tenant isolation, document permissions, retrieval poisoning and citation integrity |
| Agent and tool security | Tool authorization, argument validation, least privilege and action approval |
| MCP security | Tool discovery, server trust, permission boundaries and untrusted tool output |
| Model/API security | Authentication, quotas, logging, model configuration and exposed endpoints |
| Output handling | Unsafe HTML/Markdown rendering, code execution, SQL construction and downstream injection |

## Safe prompt-injection test cases

Use a dedicated test application with a harmless marker such as Z2R_CANARY_7F31 in a protected test-only context.

1. **Direct instruction conflict:** ask the model to ignore the task's original constraints and reveal the dummy marker. Record whether the marker is disclosed.
2. **Indirect content injection:** place a conflicting instruction in a test document and ask the application to summarize that document. Verify whether document text is treated as untrusted data.
3. **Tool authorization:** configure a mock tool that can read or change only dummy records. Test whether injected content can trigger an action that the user did not request.
4. **RAG access control:** create two synthetic tenants and test whether retrieval for one tenant can return the other tenant's documents.
5. **Output safety:** submit harmless HTML/Markdown markers and verify that the application safely renders or encodes the result.

Record the input channel, model/version, tool configuration, expected policy, observed output, tool-call log and whether the result is reproducible. A refusal in the final answer does not prove that a tool action was blocked.

## Defensive controls to verify

- Keep trusted instructions separate from untrusted documents and tool output.
- Enforce authorization and parameter validation in application code, not only in prompts.
- Apply least privilege to tools, data sources and service identities.
- Require explicit human approval for sensitive or irreversible actions.
- Treat model output as untrusted before rendering or passing it to another system.
- Use tenant-aware retrieval filters and test them independently.
- Log security-relevant metadata without storing credentials or unnecessary sensitive prompt content.
- Test both attack cases and benign controls to measure false positives.

## Useful references

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [OWASP Prompt Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)
- [OWASP MCP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/MCP_Security_Cheat_Sheet.html)
- [OWASP AI Testing Guide](https://owasp.org/www-project-ai-testing-guide/)
- [PortSwigger Web LLM Attacks](https://portswigger.net/web-security/llm-attacks)

## Jailbreak research policy

The library may document jailbreak *families*, test objectives, lab examples and defensive lessons. Any prompt collection must be tied to an identified model/version and controlled evaluation context. We will not publish claims that a prompt universally bypasses current commercial safeguards.
