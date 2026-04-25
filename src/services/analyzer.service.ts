import type { SpotifyTrack, TopArtist, TopTrack, AnalysisResult } from '../types/spotify.types.js';

function getDecade(releaseDate: string): number {
  const year = parseInt(releaseDate?.substring(0, 4) ?? '0', 10);
  return Math.floor(year / 10) * 10;
}

export function analyze(
  recent: SpotifyTrack[],
  topArtistsShort: TopArtist[],
  topArtistsMedium: TopArtist[],
  topTracksShort: TopTrack[]
): AnalysisResult {
  const decadePreferences: Record<number, number> = {};
  const listeningPatterns: Record<number, number> = {};
  const artistCounts: Record<string, number> = {};
  const trackCounts: Record<string, { name: string; artist: string; count: number; albumArt?: string }> = {};

  for (const track of recent) {
    const decade = getDecade(track.releaseDate);
    if (decade > 0) decadePreferences[decade] = (decadePreferences[decade] ?? 0) + 1;

    const hour = track.playedAt.getHours();
    listeningPatterns[hour] = (listeningPatterns[hour] ?? 0) + 1;

    artistCounts[track.artist] = (artistCounts[track.artist] ?? 0) + 1;

    if (trackCounts[track.id]) {
      trackCounts[track.id].count++;
    } else {
      trackCounts[track.id] = { name: track.name, artist: track.artist, count: 1, albumArt: track.albumArt };
    }
  }

  // Genre distribution from top artists
  const genreDistribution: Record<string, number> = {};
  for (const artist of topArtistsShort) {
    for (const genre of artist.genres) {
      genreDistribution[genre] = (genreDistribution[genre] ?? 0) + 1;
    }
  }

  const avgPopularity = topTracksShort.length
    ? Math.round(topTracksShort.reduce((s, t) => s + t.popularity, 0) / topTracksShort.length)
    : 0;

  return {
    decadePreferences,
    listeningPatterns,
    recentTopArtists: Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([artist, count]) => ({ artist, count })),
    recentTopTracks: Object.values(trackCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topArtistsShort,
    topArtistsMedium,
    topTracksShort,
    genreDistribution,
    avgPopularity,
    totalTracksAnalyzed: recent.length,
    uniqueArtists: Object.keys(artistCounts).length,
    analysisDate: new Date(),
  };
}
