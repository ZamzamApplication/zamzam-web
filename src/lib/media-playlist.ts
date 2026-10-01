import { extractYoutubePlaylistId, extractYoutubeVideoId, importYoutubePlaylist } from './youtube-playlist'
import { importSoundcloudPlaylist, normalizeSoundcloudPlaylistUrl } from './soundcloud-playlist'

export type ImportedMediaPlaylist = {
  id: string
  title: string
  episodes: { title: string; url: string }[]
}

export async function importMediaPlaylist(value: string): Promise<ImportedMediaPlaylist> {
  if (normalizeSoundcloudPlaylistUrl(value)) return importSoundcloudPlaylist(value)
  if (extractYoutubePlaylistId(value) || extractYoutubeVideoId(value)) return importYoutubePlaylist(value)
  throw new Error('invalid_media_url')
}
