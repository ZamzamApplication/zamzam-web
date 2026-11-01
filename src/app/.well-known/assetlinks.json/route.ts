import { androidAssetLinks } from '@/lib/app-links'

export const dynamic = 'force-dynamic'
export function GET() {
  return Response.json(androidAssetLinks(process.env.ANDROID_APP_LINKS_SHA256_CERT_FINGERPRINTS), {
    headers: { 'Cache-Control': 'public, max-age=300', 'Content-Type': 'application/json' },
  })
}
