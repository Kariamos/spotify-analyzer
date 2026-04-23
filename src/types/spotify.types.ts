export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt?: string;
  playedAt: Date;
  releaseDate: string;
  durationMs: number;
  popularity?: number;
}

export interface TopArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  imageUrl?: string;
}

export interface TopTrack {
  id: string;
  name: string;
  artist: string;
  albumArt?: string;
  popularity: number;
  releaseDate: string;
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
  decadePreferences: Record<number, number>;
  listeningPatterns: Record<number, number>;
  recentTopArtists: Array<{ artist: string; count: number }>;
  recentTopTracks: Array<{ name: string; artist: string; count: number; albumArt?: string }>;
  topArtistsShort: TopArtist[];
  topArtistsMedium: TopArtist[];
  topTracksShort: TopTrack[];
  genreDistribution: Record<string, number>;
  avgPopularity: number;
  totalTracksAnalyzed: number;
  uniqueArtists: number;
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
