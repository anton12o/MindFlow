# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | :white_check_mark: |

## Local-First Design

MindFlow is a **local-first** application. Your data never leaves your machine.
The backend (FastAPI + SQLite) runs entirely on `localhost`.
No cloud sync, no third-party servers, no telemetry.

## Reporting a Vulnerability

Since MindFlow is local-first, most security issues are limited to
self-harm (e.g., opening a malicious .md file that renders JS in a note).

If you find a vulnerability that could affect other users (e.g., a dependency
with a known CVE, or a way to exfiltrate data from the local server):

1. **Do not** open a public GitHub issue
2. Email: antonio@mindflow.app (replace with actual email)
3. Expect a response within 7 days

## Known Security Measures

- **XSS prevention:** All note content is rendered via `RenderConteudo` component
  with DOMPurify whitelisting only KaTeX tags
- **SQL injection:** All queries use parameterized SQL (SQLModel/SQLAlchemy).
  No f-string concatenation of user input
- **HTTP headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
  applied via middleware
- **Path traversal:** Export/import paths are validated against `../` patterns
- **Dependencies:** Regularly updated via `npm audit` and `pip-audit`

## Threat Model

- **Assets:** Notes, habits, flashcards, pomodoro sessions, rotation blocks
- **Trust boundary:** The user's machine. No data crosses the network
- **Attacker model:** Local attacker with access to the user's filesystem,
  or supply-chain attack via npm/PyPI dependency
