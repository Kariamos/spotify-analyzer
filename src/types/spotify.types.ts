export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  playedAt: Date;
  releaseDate: string;
  durationMs: number;
}

export interface AudioFeatures {
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  loudness: number;
  tempo: number;
  key: number;
  mode: number;
  timeSignature: number;
}

export interface EnrichedTrack extends SpotifyTrack {
  features: AudioFeatures | null;
}

export interface MoodCluster {
  name: string;
  energy: number;
  valence: number;
  count: number;
}

export interface AnalysisResult {
  moodDistribution: Record<string, number>;
  keyPreferences: Record<string, number>;
  decadePreferences: Record<number, number>;
  listeningPatterns: Record<number, number>;
  topArtists: Array<{ artist: string; count: number }>;
  topGenres: Array<{ genre: string; count: number }>;
  evolutionTrend: number[];
  averageEnergy: number;
  averageTempo: number;
  totalTracksAnalyzed: number;
  analysisDate: Date;
}

export interface SyncLog {
  syncId: string;
  startedAt: Date;
  completedAt?: Date;
  tracksProcessed: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
}
