import { describe, expect, it } from 'vitest'
import { androidAssetLinks, appIntent } from './app-links'

describe('public app links', () => {
  const token = 'aBc123_-'.repeat(5)
  it.each(['invite', 'register'] as const)('opens %s with the same safe website fallback', kind => {
    const link = appIntent(kind, token)!
    expect(link).toContain(`intent://${kind}/${token}#Intent;scheme=zamzam;package=com.zamzammobile;`)
    expect(link).toContain(`S.browser_fallback_url=${encodeURIComponent(`https://zamzam-web.fly.dev/${kind}/${token}`)};end`)
  })
  it('rejects intent injection and invalid tokens', () => {
    for (const token of ['short', 'a'.repeat(501), 'a'.repeat(16) + '#Intent;package=evil', '../invite/other']) expect(appIntent('invite', token)).toBeNull()
  })
  it('does not grant domain trust before a valid release certificate is configured', () => {
    expect(androidAssetLinks()).toEqual([])
    expect(androidAssetLinks('invalid')).toEqual([])
    const cert = Array(32).fill('AB').join(':')
    expect(androidAssetLinks(cert + ',' + cert)[0].target.sha256_cert_fingerprints).toEqual([cert])
    expect(androidAssetLinks(cert + ',invalid')).toEqual([])
  })
})
