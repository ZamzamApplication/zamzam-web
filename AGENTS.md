# Zamzam Web Agent Guide

Zamzam Web is the Arabic-first, RTL Next.js client for Qur'an memorization
centers. Preserve Arabic copy, responsive mobile layouts, touch targets, dark
mode, accessibility, and tenant-aware behavior.

- Reuse components and styles already present under `src/`.
- Keep API contracts aligned with `ZamzamApplication/zamzam-api`.
- Do not weaken authentication, authorization, session confirmation, or signed
  media handling.
- Preserve unrelated work in dirty worktrees.
- Validate with `npm run typecheck` and `npm run build`.
- Do not deploy automatically. Production deployment is explicitly authorized
  and performed with `./scripts/deploy.sh` only from clean, synchronized master.

