import { afterEach, describe, expect, it, vi } from 'vitest'

import { importMediaPlaylist } from './media-playlist'
import { normalizeSoundcloudPlaylistUrl, parseSoundcloudPlaylistHtml } from './soundcloud-playlist'
import { generateQuranPlan, type QuranPlanTrack } from './quran-plan'

function playlistHtml(tracks: unknown[], count = tracks.length) {
  return `<script>window.__sc_hydration = ${JSON.stringify([
    { hydratable: 'user', data: { title: 'Uploader' } },
    { hydratable: 'playlist', data: { id: 123, title: 'دروس التفسير', tracks, track_count: count } },
  ])};</script>`
}

describe('SoundCloud playlist import', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('normalizes public playlist URLs and rejects other hosts and resource types', () => {
    expect(normalizeSoundcloudPlaylistUrl(' https://www.soundcloud.com/teacher/sets/lessons/?si=share ')).toBe('https://soundcloud.com/teacher/sets/lessons')
    for (const url of ['https://soundcloud.com/teacher/track', 'https://soundcloud.com.evil.test/teacher/sets/lessons', 'https://evil.test/teacher/sets/lessons', 'ftp://soundcloud.com/teacher/sets/lessons', 'https://soundcloud.com:8080/teacher/sets/lessons', 'https://user:pass@soundcloud.com/teacher/sets/lessons']) {
      expect(normalizeSoundcloudPlaylistUrl(url)).toBeNull()
    }
  })

  it('keeps all tracks in order, including duplicates and tracks without metadata', () => {
    const result = parseSoundcloudPlaylistHtml(playlistHtml([
      { id: 10, title: 'الأولى', permalink_url: 'https://soundcloud.com/teacher/first' },
      { id: 20 },
      { id: 10, title: 'الأولى', permalink_url: 'https://soundcloud.com/teacher/first' },
    ]))
    expect(result).toMatchObject({ id: '123', title: 'دروس التفسير' })
    expect(result.episodes.map(episode => episode.title)).toEqual(['الأولى', 'حلقة 2', 'الأولى'])
    expect(result.episodes[0].url).toBe('https://soundcloud.com/teacher/first')
    const player = new URL(result.episodes[1].url)
    expect(player.origin).toBe('https://w.soundcloud.com')
    expect(player.searchParams.get('url')).toBe('https://api.soundcloud.com/tracks/20')
    expect(player.searchParams.get('auto_play')).toBe('false')
  })

  it('rejects empty, missing, and incomplete playlists instead of importing a partial list', () => {
    expect(() => parseSoundcloudPlaylistHtml('<html></html>')).toThrow('playlist_data_missing')
    expect(() => parseSoundcloudPlaylistHtml(playlistHtml([]))).toThrow('playlist_empty')
    expect(() => parseSoundcloudPlaylistHtml(playlistHtml([{ id: 10 }], 100))).toThrow('playlist_incomplete')
    expect(() => parseSoundcloudPlaylistHtml(playlistHtml([{}]))).toThrow('playlist_data_missing')
  })

  it('imports SoundCloud through the shared importer and rejects unsupported URLs without fetching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(playlistHtml([{ id: 10 }]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(importMediaPlaylist('https://soundcloud.com/teacher/sets/lessons?si=share')).resolves.toMatchObject({ title: 'دروس التفسير', episodes: [{ title: 'حلقة 1' }] })
    expect(fetchMock).toHaveBeenCalledWith('https://soundcloud.com/teacher/sets/lessons', expect.objectContaining({ redirect: 'error' }))
    await expect(importMediaPlaylist('https://example.com/teacher/sets/lessons')).rejects.toThrow('invalid_media_url')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('preserves YouTube video imports through the shared importer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ title: 'درس' }))))
    await expect(importMediaPlaylist('https://youtu.be/abcdefghijk')).resolves.toMatchObject({ episodes: [{ title: 'درس', url: 'https://www.youtube.com/watch?v=abcdefghijk' }] })
  })

  it('schedules SoundCloud from the selected episode and continues into YouTube', () => {
    const playlist = parseSoundcloudPlaylistHtml(playlistHtml([{ id: 10 }, { id: 20 }, { id: 30 }]))
    const track: QuranPlanTrack = {
      id: 'lessons', name: 'استماع', enabled: true, kind: 'playlist', unit: 'ayahs', dailyAmount: 2,
      start: { surah: 1, ayah: 1 }, subject: '', quantityUnit: 'حلقة', startNumber: 1,
      items: [
        { id: 'soundcloud', name: playlist.title, url: 'https://soundcloud.com/teacher/sets/lessons', startUnit: 2, totalUnits: 3, episodes: playlist.episodes },
        { id: 'youtube', name: 'YouTube', url: 'https://youtu.be/abcdefghijk', totalUnits: 1, episodes: [{ title: 'درس', url: 'https://www.youtube.com/watch?v=abcdefghijk' }] },
      ],
    }
    const plan = generateQuranPlan({ startDate: '2026-08-16', endDate: '2026-08-18', weekdays: [0, 1, 2], tracks: [track] })
    expect(plan.days[0].assignments.lessons?.links?.map(link => link.url)).toEqual(playlist.episodes.slice(1).map(episode => episode.url))
    expect(plan.days[1].assignments.lessons?.links?.[0].url).toBe('https://www.youtube.com/watch?v=abcdefghijk')
    expect(plan.days[2].assignments.lessons).toBeNull()
  })
})
