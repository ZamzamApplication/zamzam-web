# Zamzam web

Arabic-first, RTL Next.js application for managing Qur'an memorization centers.
The production site is <https://zamzam-web.fly.dev> and uses the Zamzam API at
<https://zamzam-api.fly.dev>.

## Development

```bash
npm ci
npm run dev
```

Validate changes with:

```bash
npm run typecheck
npm run build
```

## Deployment

Deployment is intentionally manual. From a clean `master` branch that exactly
matches `origin/master`, run:

```bash
./scripts/deploy.sh
```

The script deploys only the web application and checks its production endpoint.

