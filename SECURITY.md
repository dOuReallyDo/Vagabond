# Security Notes

## Current npm audit status
`npm audit` reports vulnerabilities in transitive dependencies pulled by `@vercel/node`.
A full fix requires `npm audit fix --force` which upgrades `@vercel/node` to a breaking major version.

## MVP decision
- Do NOT apply `npm audit fix --force` yet.
- Re-evaluate during hardening phase after staging deploy.

## Mitigations
- Minimal API surface: only POST /api/generate
- Strict input validation and strict output schema validation
- Optional rate limiting (Upstash)
- Run on Node 20 LTS in deployment
