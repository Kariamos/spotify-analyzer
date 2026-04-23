import { Router } from "express";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { env } from "../config/env.js";

export const authRouter = Router();

// In-memory token store (single user, personal tool)
export let userSpotify: SpotifyApi | null = null;

authRouter.get("/login", (_req, res) => {
  const params = new URLSearchParams({
    client_id: env.spotify.clientId,
    response_type: "code",
    redirect_uri: env.spotify.redirectUri,
    scope: [
      "user-read-private",
      "user-read-email",
      "user-read-recently-played",
      "user-top-read",
    ].join(" "),
  });

  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

authRouter.get("/callback", async (req, res) => {
  const code = req.query["code"] as string | undefined;
  const error = req.query["error"] as string | undefined;

  if (error || !code) {
    res.status(400).json({ error: error ?? "No code received" });
    return;
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${env.spotify.clientId}:${env.spotify.clientSecret}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.spotify.redirectUri,
      }),
    });

    const token = (await tokenRes.json()) as {
      access_token: string;
      token_type: string;
      scope: string;
      expires_in: number;
      refresh_token: string;
    };

    userSpotify = SpotifyApi.withAccessToken(env.spotify.clientId, {
      access_token: token.access_token,
      token_type: token.token_type,
      expires_in: token.expires_in,
      refresh_token: token.refresh_token,
    });

    // Redirect to dashboard
    res.redirect("http://localhost:5173");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

authRouter.get("/status", (_req, res) => {
  res.json({ authenticated: userSpotify !== null });
});
