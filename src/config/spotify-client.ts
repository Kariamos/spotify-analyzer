import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import { env } from './env';

let spotifyClient: SpotifyApi | null = null;

export function initSpotifyClient(): SpotifyApi {
  if (!env.spotify.clientId || !env.spotify.clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  spotifyClient = SpotifyApi.withClientCredentials(
    env.spotify.clientId,
    env.spotify.clientSecret
  );

  return spotifyClient;
}

export function getSpotifyClient(): SpotifyApi {
  if (!spotifyClient) {
    throw new Error('Spotify client not initialized');
  }
  return spotifyClient;
}

export function getOAuthUrl(): string {
  return `https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: env.spotify.clientId,
    response_type: 'code',
    redirect_uri: env.spotify.redirectUri,
    scope: [
      'user-read-private',
      'user-read-email',
      'user-read-playback-history',
      'user-read-currently-playing',
      'playlist-modify-public',
      'playlist-modify-private',
    ].join(' '),
  }).toString()}`;
}
