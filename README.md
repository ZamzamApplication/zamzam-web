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

## Contributing

Please follow this workflow before contributing:

1. Open an issue describing the proposed change or bug fix.
2. Wait until we discuss the issue and agree on the scope and approach before
   starting implementation.
3. Open a pull request that references the agreed issue and explains what was
   changed and how it was tested.
4. Add screenshots showing the result when the change is user-facing. For
   non-visual changes, include relevant test output or other verification.
5. Address any review feedback. The maintainer will approve and merge the pull
   request once the agreed work has been verified.

## Deployment

Deployment is intentionally manual. From a clean `master` branch that exactly
matches `origin/master`, run:

```bash
./scripts/deploy.sh
```

The script deploys only the web application and checks its production endpoint.
