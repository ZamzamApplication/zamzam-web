export type ImportedYoutubeEpisode = {
  title: string
  url: string
}

export type ImportedYoutubePlaylist = {
  id: string
  title: string
  episodes: ImportedYoutubeEpisode[]
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function extractYoutubePlaylistId(value: string): string | null {
  try {
    const url = new URL(value.trim())
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    if (hostname !== 'youtube.com' && hostname !== 'm.youtube.com' && hostname !== 'youtu.be') return null
    const id = url.searchParams.get('list')
    return id && /^[a-zA-Z0-9_-]{10,100}$/.test(id) ? id : null
  } catch {
    return null
  }
}

function extractInitialData(html: string): unknown {
  const markers = ['var ytInitialData = ', 'window["ytInitialData"] = ', 'ytInitialData = ']
  const marker = markers.map(value => ({ value, index: html.indexOf(value) })).find(entry => entry.index >= 0)
  if (!marker) throw new Error('playlist_data_missing')
  const start = html.indexOf('{', marker.index + marker.value.length)
  if (start < 0) throw new Error('playlist_data_missing')

  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < html.length; index += 1) {
    const character = html[index]
    if (inString) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') inString = true
    else if (character === '{') depth += 1
    else if (character === '}' && --depth === 0) return JSON.parse(html.slice(start, index + 1))
  }
  throw new Error('playlist_data_missing')
}

function textValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (!isRecord(value)) return ''
  if (typeof value.simpleText === 'string') return value.simpleText
  if (typeof value.content === 'string') return value.content
  if (Array.isArray(value.runs)) return value.runs.map(run => isRecord(run) && typeof run.text === 'string' ? run.text : '').join('')
  return ''
}

export function parseYoutubePlaylistHtml(html: string, playlistId: string): ImportedYoutubePlaylist {
  const data = extractInitialData(html)
  const episodes: ImportedYoutubeEpisode[] = []
  const seen = new Set<string>()
  let playlistTitle = ''

  const addEpisode = (id: unknown, title: unknown) => {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{11}$/.test(id) || seen.has(id)) return
    const parsedTitle = typeof title === 'string' ? title : textValue(title)
    if (!parsedTitle) return
    seen.add(id)
    episodes.push({
      title: parsedTitle,
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}&list=${encodeURIComponent(playlistId)}`,
    })
  }

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!isRecord(value)) return

    const metadata = value.playlistMetadataRenderer
    if (!playlistTitle && isRecord(metadata)) playlistTitle = textValue(metadata.title)

    const lockup = value.lockupViewModel
    if (isRecord(lockup) && lockup.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
      const lockupMetadata = isRecord(lockup.metadata) ? lockup.metadata.lockupMetadataViewModel : null
      const title = isRecord(lockupMetadata) ? lockupMetadata.title : null
      addEpisode(lockup.contentId, title)
    }

    const legacyVideo = value.playlistVideoRenderer
    if (isRecord(legacyVideo)) addEpisode(legacyVideo.videoId, legacyVideo.title)
    Object.values(value).forEach(visit)
  }
  visit(data)

  if (episodes.length === 0) throw new Error('playlist_empty')
  return { id: playlistId, title: playlistTitle || 'قائمة YouTube', episodes }
}

export async function importYoutubePlaylist(value: string): Promise<ImportedYoutubePlaylist> {
  const playlistId = extractYoutubePlaylistId(value)
  if (!playlistId) throw new Error('invalid_playlist_url')
  const response = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}&hl=ar&gl=EG`, {
    cache: 'no-store',
    headers: {
      'Accept-Language': 'ar-EG,ar;q=0.9,en;q=0.7',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error('playlist_fetch_failed')
  return parseYoutubePlaylistHtml(await response.text(), playlistId)
}
