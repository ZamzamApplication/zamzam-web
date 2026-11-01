# Zamzam web

Arabic-first, RTL Next.js application for managing Qur'an memorization centers.
The production site is <https://zamzam-web.fly.dev> and uses the Zamzam API at
<https://zamzam-api.fly.dev>.

## Plan builder

Anyone can generate a plan at `/plan`, including Qur'an, books, YouTube videos
and playlists, and public SoundCloud playlists. Logging in allows users to save
named plans, edit them, track completed days or individual daily items, mark whole plans complete, and
archive, restore, or delete them. Saved plans belong to the individual user.

Choose one completion checkbox for the whole day or separate checkboxes for
each assigned item. Switching modes keeps partial progress, and completing
every assigned item completes its day. The choice applies to printing too.
Editing a schedule retains progress only for assignments that have not changed.

Saved plans are private by default. Owners can enable a read-only link or a link
that also allows recording day or item completion without logging in. Shared progress
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

### Android public app links

Invitation and student registration pages offer an Android intent link to
`com.zamzammobile`, with the original website page as fallback when the app is not
installed. Other devices continue using the website.

`/.well-known/assetlinks.json` returns a Digital Asset Links statement when
`ANDROID_APP_LINKS_SHA256_CERT_FINGERPRINTS` is configured with comma-separated
SHA-256 signing certificate fingerprints (`AA:BB:…`, 32 bytes). Empty or invalid
configuration grants no domain association. Set this to the production signing
certificate; never trust the repository's public debug key. For Play installs,
use the app signing certificate from Play Console. The current internal APK's
Open-in-app button works without publishing a debug certificate. Automatic HTTPS
opening becomes available after release certificate configuration and Android
verification. No automatic browser redirect attempts are used, since Chrome can
block app launches without a user gesture.

Weekly halaqat can be configured from **إضافة حلقة → تكرار أسبوعي** or the
**الجداول الأسبوعية** section on the sessions page. Administrators select days,
dates, timezone and, in multiple-session mode, all active students, dynamic
categories, or selected students. They can edit, pause/resume, and skip untouched
upcoming occurrences. Changes affect newly generated sessions; existing sessions
remain visible. Reopening a completed session now takes one tap and remains
version-checked and audited.
