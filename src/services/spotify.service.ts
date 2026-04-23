import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import type { EnrichedTrack, TopArtist, TopTrack } from '../types/spotify.types.js';

export async function getRecentlyPlayed(
  spotify: SpotifyApi,
  limit = 50
): Promise<EnrichedTrack[]> {
  const history = await spotify.player.getRecentlyPlayedTracks(limit as 50);

  return history.items.map((item) => ({
    id: item.track.id,
    name: item.track.name,
    artist: item.track.artists[0]?.name ?? 'Unknown',
    album: item.track.album.name,
    albumArt: item.track.album.images[0]?.url,
    playedAt: new Date(item.played_at),
    releaseDate: item.track.album.release_date,
    durationMs: item.track.duration_ms,
    popularity: item.track.popularity,
    features: null,
  }));
}

export async function getTopArtists(
  spotify: SpotifyApi,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'short_term',
  limit = 20
): Promise<TopArtist[]> {
  const res = await spotify.currentUser.topItems('artists', timeRange, limit as 20);

  return res.items.map((a) => ({
    id: a.id,
    name: a.name,
    genres: a.genres ?? [],
    popularity: a.popularity,
    imageUrl: a.images[0]?.url,
  }));
}

export async function getTopTracks(
  spotify: SpotifyApi,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'short_term',
  limit = 20
): Promise<TopTrack[]> {
  const res = await spotify.currentUser.topItems('tracks', timeRange, limit as 20);

  return res.items.map((t) => ({
    id: t.id,
    name: t.name,
    artist: t.artists[0]?.name ?? 'Unknown',
    albumArt: t.album.images[0]?.url,
    popularity: t.popularity,
    releaseDate: t.album.release_date,
  }));
}
