import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import type { EnrichedTrack } from '../types/spotify.types.js';

export async function getRecentlyPlayed(
  spotify: SpotifyApi,
  limit = 50
): Promise<EnrichedTrack[]> {
  const history = await spotify.player.getRecentlyPlayedTracks(limit as 50);
  const items = history.items;

  if (items.length === 0) return [];

  return items.map((item) => ({
    id: item.track.id,
    name: item.track.name,
    artist: item.track.artists[0]?.name ?? 'Unknown',
    album: item.track.album.name,
    playedAt: new Date(item.played_at),
    releaseDate: item.track.album.release_date,
    durationMs: item.track.duration_ms,
    features: null, // audio-features endpoint removed by Spotify for dev apps
  }));
}
