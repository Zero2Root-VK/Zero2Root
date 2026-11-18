# Offensive Security Skills

A structured field guide to practical offensive-security work, from scoping and reconnaissance through validation and reporting.

## Skill collections

| Collection | Coverage |
|---|---|
| [Web application security](web-application.md) | Authentication, authorization, input handling, sessions, business logic and OWASP testing |
| [API security](api-security.md) | Object-level authorization, function-level authorization, tokens, rate limits and API schemas |
| [Infrastructure security](infrastructure.md) | Asset discovery, service enumeration, network segmentation and configuration review |
| [Source-code review](source-code-review.md) | Trust boundaries, data flow, dangerous sinks, dependency and secret review |
| [AI / LLM security](../ai-security/index.md) | Prompt injection, RAG, agent tools and model-serving attack surface |

## Standard skill page format

Each technique should document:

1. **Objective** — what security property is being assessed.
2. **Scope and prerequisites** — required authorization, test account, environment and access.
3. **Methodology** — repeatable steps and decision points.
4. **Evidence** — requests, responses, logs or code references to preserve.
5. **Impact validation** — prove the issue without accessing unrelated data or causing disruption.
6. **Remediation** — actionable defensive guidance.
7. **References** — OWASP, vendor documentation, standards and relevant research.

## Engagement safety

Only test systems you own or have explicit permission to assess. Follow the written scope, rate limits, data-handling rules and disclosure policy. Use a lab when a technique could affect availability, integrity or third-party data.

This collection is educational material, not authorization to test any public target.
