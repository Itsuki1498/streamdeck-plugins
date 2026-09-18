# Security policy

## Supported versions

Security fixes are made against the `main` branch and the latest published plugin
package. Older local builds may not receive fixes.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's security
advisory reporting for this repository. Do not open a public issue when the
report contains credentials, personal data, local file paths, or an exploitable
proof of concept.

Include the affected plugin and version, reproduction steps, impact, and any
recommended mitigation. Do not include real API keys, access tokens, private
keys, Codex session files, or Stream Deck logs; redact those values first.

## Security boundaries

- This project must not contain Codex session data, Stream Deck logs, credentials,
  API keys, access tokens, private keys, or machine-specific configuration.
- Git and Codex actions are intended to operate on the local workspace selected
  by the user. Review command output before performing any write operation.
- Dependency versions are locked in `package-lock.json` and should be reviewed
  with `npm audit` before releases.
