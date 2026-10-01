import { NextResponse } from 'next/server'

import { importMediaPlaylist } from '@/lib/media-playlist'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get('url') || ''
  try {
    const playlist = await importMediaPlaylist(url)
    return NextResponse.json(playlist, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (reason) {
    const code = reason instanceof Error ? reason.message : 'playlist_fetch_failed'
    const status = code === 'invalid_media_url' ? 400 : code === 'playlist_empty' ? 404 : 502
    return NextResponse.json({ detail: code }, { status, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
