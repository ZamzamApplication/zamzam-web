export const ANDROID_PACKAGE = 'com.zamzammobile'
export const PUBLIC_WEB_ORIGIN = 'https://zamzam-web.fly.dev'

export function appIntent(kind: 'invite' | 'register', token: string): string | null {
  if (!/^[A-Za-z0-9_-]{16,500}$/.test(token)) return null
  const route = `${kind}/${token}`
  const fallback = encodeURIComponent(`${PUBLIC_WEB_ORIGIN}/${route}`)
  return `intent://${route}#Intent;scheme=zamzam;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`
}

export function androidAssetLinks(value = '') {
  const fingerprints = [...new Set(value.split(',').map(item => item.trim().toUpperCase()))]
  if (!fingerprints.length || fingerprints.some(item => !/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(item))) return []
  return [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints },
  }]
}
