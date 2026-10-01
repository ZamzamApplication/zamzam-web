import type { ImportedMediaPlaylist } from './media-playlist'

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeSoundcloudPlaylistUrl(value: string): string | null {
  try {
    const url = new URL(value.trim())
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    if (!['http:', 'https:'].includes(url.protocol) || hostname !== 'soundcloud.com' || url.port || url.username || url.password) return null
    if (!/^\/[^/]+\/sets\/[^/]+\/?$/.test(url.pathname)) return null
    return `https://soundcloud.com${url.pathname.replace(/\/$/, '')}`
  } catch {
    return null
  }
}

export function parseSoundcloudPlaylistHtml(html: string): ImportedMediaPlaylist {
  const hydration = html.match(/window\.__sc_hydration\s*=\s*(\[.*?\]);?\s*<\/script>/s)?.[1]
  if (!hydration) throw new Error('playlist_data_missing')
  const entries: unknown = JSON.parse(hydration)
  const entry = Array.isArray(entries) ? entries.find(value => isRecord(value) && value.hydratable === 'playlist') : null
  const playlist: unknown = isRecord(entry) ? entry.data : null
  if (!isRecord(playlist) || !Array.isArray(playlist.tracks)) throw new Error('playlist_data_missing')
  if (!playlist.tracks.length) throw new Error('playlist_empty')
  if (typeof playlist.title !== 'string' || !playlist.title.trim() || !Number.isSafeInteger(playlist.id)) throw new Error('playlist_data_missing')
  if (typeof playlist.track_count === 'number' && playlist.track_count !== playlist.tracks.length) throw new Error('playlist_incomplete')

  // SoundCloud includes every track ID, but often provides metadata for only
  // the first five. Keep the remaining tracks in order with direct player links.
  const episodes = playlist.tracks.map((track: unknown, index: number) => {
    if (!isRecord(track) || !Number.isSafeInteger(track.id) || Number(track.id) <= 0) throw new Error('playlist_data_missing')
    const player = new URL('https://w.soundcloud.com/player/')
    player.searchParams.set('url', `https://api.soundcloud.com/tracks/${track.id}`)
    player.searchParams.set('auto_play', 'false')
    let url = player.toString()
    if (typeof track.permalink_url === 'string') {
      const permalink = new URL(track.permalink_url)
      if (permalink.protocol === 'https:' && permalink.hostname === 'soundcloud.com' && !permalink.username && !permalink.password && !permalink.port) url = permalink.toString()
    }
    return {
      title: typeof track.title === 'string' && track.title.trim() ? track.title.trim() : `حلقة ${index + 1}`,
      url,
    }
  })
  return { id: String(playlist.id), title: playlist.title.trim(), episodes }
}

export async function importSoundcloudPlaylist(value: string): Promise<ImportedMediaPlaylist> {
  const url = normalizeSoundcloudPlaylistUrl(value)
  if (!url) throw new Error('invalid_soundcloud_url')
  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'error',
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ar,en;q=0.8' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error('playlist_fetch_failed')
  return parseSoundcloudPlaylistHtml(await response.text())
}
