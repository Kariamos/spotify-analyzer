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

export interface StreamingRecord {
  ts: string;
  ms_played: number;
  platform: string | null;
  track_name: string | null;
  artist_name: string | null;
  album_name: string | null;
  spotify_track_uri: string | null;
  episode_name: string | null;
  episode_show_name: string | null;
  reason_start: string | null;
  reason_end: string | null;
  shuffle: boolean | null;
  skipped: boolean | null;
  offline: boolean | null;
  conn_country: string | null;
  content_type: 'track' | 'podcast' | 'audiobook';
}

export interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}

export interface TrackEnrichment {
  spotify_uri: string;
  lastfm_tags: string[];
  mood: string | null;
  lastfm_listeners: number | null;
  mbid: string | null;
  bpm: number | null;
  musical_key: string | null;
  enriched_at: string;
}

export interface EnrichmentStatus {
  total: number;
  enriched: number;
  pending: number;
  running: boolean;
}

export interface HistoryResult {
  playsByMonth: Array<{ month: string; plays: number; minutes: number }>;
  contentSplit: { track: number; podcast: number; audiobook: number };
  platformBreakdown: Record<string, number>;
  totalMinutes: number;
  totalTracks: number;
  topSkippedArtists: Array<{ artist: string; skipRate: number; total: number }>;
  longestStreak: number;
  currentStreak: number;
}

export interface MoodResult {
  moodDistribution: Array<{ mood: string; plays: number; percent: number }>;
  bpmDistribution: Array<{ bucket: string; count: number }>;
  keyDistribution: Array<{ key: string; count: number }>;
  topTags: Array<{ tag: string; weight: number }>;
}

export interface EvolutionResult {
  moodEvolution: Array<{
    year: string;
    moods: Record<string, number>;
  }>;
  tagEvolution: Array<{
    year: string;
    topTags: Array<{ tag: string; plays: number }>;
  }>;
}

export interface MoodByHourResult {
  data: Array<Record<string, number> & { hour: number }>;
  moods: string[];
}

export interface PatternsResult {
  heatmap: Array<{ day: number; hour: number; plays: number }>;
  discoveryRate: Array<{ month: string; newArtists: number }>;
  topCountries: Array<{ country: string; plays: number }>;
  sessionStats: {
    avgSessionMinutes: number;
    longestSessionMinutes: number;
    avgTracksPerSession: number;
    totalSessions: number;
  };
  artistLoyalty: Array<{ artist: string; years: number; totalPlays: number }>;
}
