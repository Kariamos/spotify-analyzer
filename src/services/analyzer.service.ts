import type { EnrichedTrack, AnalysisResult } from '../types/spotify.types.js';

function getDecade(releaseDate: string): number {
  const year = parseInt(releaseDate?.substring(0, 4) ?? '0', 10);
  return Math.floor(year / 10) * 10;
}

export function analyze(tracks: EnrichedTrack[]): AnalysisResult {
  const decadePreferences: Record<number, number> = {};
  const listeningPatterns: Record<number, number> = {};
  const artistCounts: Record<string, number> = {};
  const trackCounts: Record<string, { name: string; artist: string; count: number }> = {};

  for (const track of tracks) {
    // Decade
    const decade = getDecade(track.releaseDate);
    if (decade > 0) {
      decadePreferences[decade] = (decadePreferences[decade] ?? 0) + 1;
    }

    // Hour of day
    const hour = track.playedAt.getHours();
    listeningPatterns[hour] = (listeningPatterns[hour] ?? 0) + 1;

    // Artist
    artistCounts[track.artist] = (artistCounts[track.artist] ?? 0) + 1;

    // Track
    const key = `${track.id}`;
    if (trackCounts[key]) {
      trackCounts[key].count++;
    } else {
      trackCounts[key] = { name: track.name, artist: track.artist, count: 1 };
    }
  }

  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist, count]) => ({ artist, count }));

  const topTracks = Object.values(trackCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    decadePreferences,
    listeningPatterns,
    topArtists,
    topTracks,
    totalTracksAnalyzed: tracks.length,
    uniqueArtists: Object.keys(artistCounts).length,
    analysisDate: new Date(),
  };
}
