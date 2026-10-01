# Zamzam web

Arabic-first, RTL Next.js application for managing Qur'an memorization centers.
The production site is <https://zamzam-web.fly.dev> and uses the Zamzam API at
<https://zamzam-api.fly.dev>.

## Plan builder

Anyone can generate a plan at `/plan`, including Qur'an, books, YouTube videos
and playlists, and public SoundCloud playlists. Logging in allows users to save
named plans, edit them, track completed days, mark whole plans complete, and
archive, restore, or delete them. Saved plans belong to the individual user.

Saved plans are private by default. Owners can enable a read-only link or a link
that also allows recording daily completion without logging in. Shared progress
is saved on the same plan. Recipients cannot edit its configuration, archive it,
or delete it. Changing the sharing mode rotates the link; making a plan private
or deleting it revokes existing links. Archived plans remain readable and pause
daily progress updates until restored.

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
