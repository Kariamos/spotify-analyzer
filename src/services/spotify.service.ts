import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import type { EnrichedTrack } from '../types/spotify.types.js';

export async function getRecentlyPlayed(
  spotify: SpotifyApi,
  limit = 50
): Promise<EnrichedTrack[]> {
  const history = await spotify.player.getRecentlyPlayedTracks(limit as 50);
  const items = history.items;

  if (items.length === 0) return [];

  const trackIds = items.map((i) => i.track.id);

  // Batch audio features (max 100 per call)
  const features = await spotify.tracks.audioFeatures(trackIds);

  return items.map((item, idx) => {
    const feat = features[idx];
    return {
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists[0]?.name ?? 'Unknown',
      album: item.track.album.name,
      playedAt: new Date(item.played_at),
      releaseDate: item.track.album.release_date,
      durationMs: item.track.duration_ms,
      features: feat
        ? {
            energy: feat.energy,
            danceability: feat.danceability,
            valence: feat.valence,
            acousticness: feat.acousticness,
            instrumentalness: feat.instrumentalness,
            speechiness: feat.speechiness,
            liveness: feat.liveness,
            loudness: feat.loudness,
            tempo: feat.tempo,
            key: feat.key,
            mode: feat.mode,
            timeSignature: feat.time_signature,
          }
        : null,
    };
  });
}
