import type { EnrichedTrack, AnalysisResult } from '../types/spotify.types.js';

const KEY_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function getMood(energy: number, valence: number): string {
  if (energy > 0.6 && valence > 0.5) return 'Upbeat';
  if (energy > 0.6 && valence <= 0.5) return 'Intense';
  if (energy <= 0.6 && valence > 0.5) return 'Chill';
  return 'Melancholic';
}

function getDecade(releaseDate: string): number {
  const year = parseInt(releaseDate?.substring(0, 4) ?? '0', 10);
  return Math.floor(year / 10) * 10;
}

export function analyze(tracks: EnrichedTrack[]): AnalysisResult {
  const withFeatures = tracks.filter((t) => t.features !== null);

  const moodDistribution: Record<string, number> = {};
  const keyPreferences: Record<string, number> = {};
  const decadePreferences: Record<number, number> = {};
  const listeningPatterns: Record<number, number> = {};
  const artistCounts: Record<string, number> = {};

  for (const track of withFeatures) {
    const f = track.features!;

    // Mood
    const mood = getMood(f.energy, f.valence);
    moodDistribution[mood] = (moodDistribution[mood] ?? 0) + 1;

    // Key
    const key = f.key >= 0 ? KEY_NAMES[f.key] : 'Unknown';
    keyPreferences[key] = (keyPreferences[key] ?? 0) + 1;

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
  }

  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist, count]) => ({ artist, count }));

  const avgEnergy =
    withFeatures.reduce((s, t) => s + t.features!.energy, 0) / (withFeatures.length || 1);
  const avgTempo =
    withFeatures.reduce((s, t) => s + t.features!.tempo, 0) / (withFeatures.length || 1);

  // Weekly energy trend (last 7 days)
  const evolutionTrend: number[] = Array(7).fill(0);
  const trendCounts: number[] = Array(7).fill(0);
  const now = Date.now();
  for (const track of withFeatures) {
    const daysAgo = Math.floor((now - track.playedAt.getTime()) / 86_400_000);
    if (daysAgo < 7) {
      evolutionTrend[daysAgo] += track.features!.energy;
      trendCounts[daysAgo]++;
    }
  }
  const normalizedTrend = evolutionTrend.map((v, i) =>
    trendCounts[i] > 0 ? v / trendCounts[i] : 0
  );

  return {
    moodDistribution,
    keyPreferences,
    decadePreferences,
    listeningPatterns,
    topArtists,
    topGenres: [],
    evolutionTrend: normalizedTrend,
    averageEnergy: avgEnergy,
    averageTempo: avgTempo,
    totalTracksAnalyzed: withFeatures.length,
    analysisDate: new Date(),
  };
}
