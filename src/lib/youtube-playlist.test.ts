import { afterEach, describe, expect, it, vi } from 'vitest'

import { extractYoutubePlaylistId, extractYoutubeVideoId, importYoutubePlaylist, parseYoutubePlaylistHtml } from './youtube-playlist'

describe('YouTube playlist import', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('accepts YouTube playlist and watch URLs only', () => {
    expect(extractYoutubePlaylistId('https://www.youtube.com/playlist?list=PL1234567890')).toBe('PL1234567890')
    expect(extractYoutubePlaylistId('https://youtu.be/abcdefghijk?list=PLabcdefghij')).toBe('PLabcdefghij')
    expect(extractYoutubePlaylistId('https://example.com/playlist?list=PL1234567890')).toBeNull()
  })

  it('accepts individual YouTube watch, short, embed, and youtu.be URLs', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=abcdefghijk')).toBe('abcdefghijk')
    expect(extractYoutubeVideoId('https://youtu.be/abcdefghijk')).toBe('abcdefghijk')
    expect(extractYoutubeVideoId('https://www.youtube.com/shorts/abcdefghijk')).toBe('abcdefghijk')
    expect(extractYoutubeVideoId('https://www.youtube.com/embed/abcdefghijk')).toBe('abcdefghijk')
    expect(extractYoutubeVideoId('https://example.com/watch?v=abcdefghijk')).toBeNull()
  })

  it('imports an individual video as a one-item collection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ title: 'درس مستقل' }), { status: 200 })))
    await expect(importYoutubePlaylist('https://youtu.be/abcdefghijk')).resolves.toEqual({
      id: 'abcdefghijk',
      title: 'درس مستقل',
      episodes: [{ title: 'درس مستقل', url: 'https://www.youtube.com/watch?v=abcdefghijk' }],
    })
  })

  it('extracts current and legacy playlist video entries in order', () => {
    const initialData = {
      metadata: { playlistMetadataRenderer: { title: 'دروس السيرة' } },
      contents: [
        { lockupViewModel: { contentId: 'abcdefghijk', contentType: 'LOCKUP_CONTENT_TYPE_VIDEO', metadata: { lockupMetadataViewModel: { title: { content: 'الدرس الأول' } } } } },
        { playlistVideoRenderer: { videoId: 'lmnopqrstuv', title: { runs: [{ text: 'الدرس الثاني' }] } } },
      ],
    }
    const result = parseYoutubePlaylistHtml(`<script>var ytInitialData = ${JSON.stringify(initialData)};</script>`, 'PL1234567890')
    expect(result.title).toBe('دروس السيرة')
    expect(result.episodes).toEqual([
      { title: 'الدرس الأول', url: 'https://www.youtube.com/watch?v=abcdefghijk&list=PL1234567890' },
      { title: 'الدرس الثاني', url: 'https://www.youtube.com/watch?v=lmnopqrstuv&list=PL1234567890' },
    ])
  })
})
