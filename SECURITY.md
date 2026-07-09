# Security Policy

## Reporting a vulnerability

If you find a security issue in WP Serial Fix, please report it privately rather than opening a public issue.

Use GitHub's private vulnerability reporting on this repository: choose "Report a vulnerability" under the Security tab.

You can expect an acknowledgment within 72 hours. Please include steps to reproduce and, if you have one, a suggested fix.

## Scope

The interesting attack surface is untrusted input: serialized PHP values, repair-mode content, regex patterns, and copied output. Reports about parser hangs, misleading output, invalid serialized data marked as safe, terminal or HTML injection, or anything that could leak pasted database content are in scope.

## Supported Versions

Only the latest release is supported. The tool has zero runtime dependencies by design; if you find that no longer true, that is also a bug worth reporting.
