# AI-Assisted Security Workflows

Practical patterns for using AI as a research and analysis assistant while keeping authorization, validation and execution under human control.

## Workflow library

### 1. Reconnaissance triage

**Input:** approved asset list and passive/low-impact discovery output.

**AI assistance:** normalize hostnames, group technologies, identify duplicates, summarize changes and suggest manual verification priorities.

**Human controls:** verify scope before any active scan; enforce rate limits; do not probe third-party assets discovered incidentally.

### 2. Web and API assessment support

**Input:** authorized requests/responses, API schema and test-account roles.

**AI assistance:** map endpoints, identify likely authorization boundaries, generate test matrices and explain response differences.

**Human controls:** use synthetic accounts and objects; verify every authorization result; avoid bulk enumeration and destructive actions.

### 3. Source-code review

**Input:** read-only repository snapshot with secrets removed.

**AI assistance:** map routes, trace untrusted input, locate candidate sinks, explain code paths and draft review notes.

**Human controls:** verify reachability and exploitability; use static analysis; do not allow unreviewed code changes or arbitrary command execution.

### 4. Vulnerability localization

**Input:** repository snapshot and a defined CWE or vulnerability hypothesis.

**AI assistance:** use task-specific models such as Antares to prioritize candidate files.

**Human controls:** inspect candidate files, reproduce safely and report only confirmed findings.

### 5. Bug bounty report drafting

**Input:** verified evidence and program disclosure requirements.

**AI assistance:** structure reproduction steps, summarize impact, map CWE/CVSS candidates and improve clarity.

**Human controls:** confirm severity, remove sensitive data and ensure the report stays within the program's scope.

## Recommended agent architecture

| Component | Responsibility | Guardrail |
|---|---|---|
| Planner | Break the approved task into steps | Cannot expand scope |
| Research agent | Read documentation and local notes | Treat retrieved content as untrusted |
| Recon agent | Process approved discovery output | No active probing without scope validation |
| Code-review agent | Inspect a read-only source snapshot | No write access to source repository |
| Validator | Run approved, bounded checks | Allowlisted commands and targets |
| Reporter | Draft findings and evidence | Human verifies every claim |
| Approval gate | Review sensitive actions | Deny by default; log decisions |

## Operational rules

- Keep an explicit scope file with targets, exclusions, dates and permitted methods.
- Separate read-only analysis from active testing.
- Use allowlists for tools, commands, destinations and time limits.
- Require human approval for scans, exploit validation, file changes and external requests.
- Store evidence securely and redact credentials.
- Maintain an audit log of model version, prompt template, tool call and approval.
- Stop immediately when scope is unclear or an unexpected system is reached.

These workflows are design patterns, not autonomous authorization. An AI agent must never decide its own testing scope.
