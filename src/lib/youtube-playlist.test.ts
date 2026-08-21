import { describe, expect, it } from 'vitest'

import { extractYoutubePlaylistId, parseYoutubePlaylistHtml } from './youtube-playlist'

describe('YouTube playlist import', () => {
  it('accepts YouTube playlist and watch URLs only', () => {
    expect(extractYoutubePlaylistId('https://www.youtube.com/playlist?list=PL1234567890')).toBe('PL1234567890')
    expect(extractYoutubePlaylistId('https://youtu.be/abcdefghijk?list=PLabcdefghij')).toBe('PLabcdefghij')
    expect(extractYoutubePlaylistId('https://example.com/playlist?list=PL1234567890')).toBeNull()
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
