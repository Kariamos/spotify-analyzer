import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const API = 'http://127.0.0.1:3000'

interface TopArtist { id: string; name: string; genres: string[]; popularity: number; imageUrl?: string }
interface TopTrack { id: string; name: string; artist: string; albumArt?: string; popularity: number; releaseDate: string }

interface AnalysisResult {
  decadePreferences: Record<number, number>
  listeningPatterns: Record<number, number>
  recentTopArtists: Array<{ artist: string; count: number }>
  recentTopTracks: Array<{ name: string; artist: string; count: number; albumArt?: string }>
  topArtistsShort: TopArtist[]
  topArtistsMedium: TopArtist[]
  topTracksShort: TopTrack[]
  genreDistribution: Record<string, number>
  avgPopularity: number
  totalTracksAnalyzed: number
  uniqueArtists: number
  analysisDate: string
}

const GREEN = '#1db954'
const COLORS = [GREEN, '#1ed760', '#17a349', '#148a3e', '#0e6a2e', '#3b82f6', '#8b5cf6', '#f59e0b']

export default function App() {
  const [auth, setAuth] = useState<boolean | null>(null)
  const [data, setData] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/auth/status`).then(r => r.json())
      .then(({ authenticated }) => setAuth(authenticated))
      .catch(() => setAuth(false))
  }, [])

  useEffect(() => {
    if (!auth) return
    setLoading(true)
    fetch(`${API}/api/insights/analysis`).then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [auth])

  if (auth === null) return <Screen>Checking auth…</Screen>
  if (!auth) return (
    <Screen>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎵</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Spotify Analyzer</h1>
        <p style={{ color: '#777', marginBottom: 32 }}>Analisi dei tuoi ascolti</p>
        <a href={`${API}/api/auth/login`} style={{
          background: GREEN, color: '#000', padding: '14px 36px',
          borderRadius: 24, fontWeight: 700, textDecoration: 'none', fontSize: 16,
        }}>Login with Spotify</a>
      </div>
    </Screen>
  )
  if (loading) return <Screen>Caricamento dati…</Screen>
  if (error) return <Screen>Errore: {error}</Screen>
  if (!data) return null

  const topGenres = Object.entries(data.genreDistribution)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, value]) => ({ name, value }))

  const decadeData = Object.entries(data.decadePreferences)
    .map(([d, c]) => ({ name: `${d}s`, count: c }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const hourData = Array.from({ length: 24 }, (_, h) => ({
    name: `${h}h`, plays: data.listeningPatterns[h] ?? 0,
  }))

  const peakHour = hourData.reduce((m, h) => h.plays > m.plays ? h : m, hourData[0])

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🎵 Spotify Analyzer</h1>
        <p style={{ color: '#555', fontSize: 13, marginBottom: 28 }}>
          Ultimi {data.totalTracksAnalyzed} ascolti · {new Date(data.analysisDate).toLocaleDateString('it-IT')}
        </p>

        {/* Stat bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
          <Stat label="Tracce recenti" value={data.totalTracksAnalyzed} />
          <Stat label="Artisti unici" value={data.uniqueArtists} />
          <Stat label="Popularity media" value={`${data.avgPopularity}/100`} />
          <Stat label="Ora di punta" value={peakHour.name} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>

          {/* Top artists (short term) with photos */}
          <Card title="Top Artisti — Ultime 4 settimane">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.topArtistsShort.slice(0, 8).map((a, i) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#444', fontSize: 12, width: 18, textAlign: 'right' }}>{i + 1}</span>
                  {a.imageUrl
                    ? <img src={a.imageUrl} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#2a2a2a' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.genres.slice(0, 2).join(', ') || '—'}
                    </div>
                  </div>
                  <PopBar value={a.popularity} />
                </div>
              ))}
            </div>
          </Card>

          {/* Top tracks with album art */}
          <Card title="Top Tracce — Ultime 4 settimane">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.topTracksShort.slice(0, 8).map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#444', fontSize: 12, width: 18, textAlign: 'right' }}>{i + 1}</span>
                  {t.albumArt
                    ? <img src={t.albumArt} alt="" style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover' }} />
                    : <div style={{ width: 38, height: 38, borderRadius: 6, background: '#2a2a2a' }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#666' }}>{t.artist}</div>
                  </div>
                  <PopBar value={t.popularity} />
                </div>
              ))}
            </div>
          </Card>

          {/* Genre distribution */}
          <Card title="Generi (da top artisti)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topGenres} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#ccc' }} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {topGenres.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Decade */}
          <Card title="Preferenze per Decade">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={decadeData}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#ccc' }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Hourly pattern — full width */}
          <Card title="Quando ascolti (ultime 50 tracce)" style={{ gridColumn: 'span 2' }}>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#666' }} interval={1} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff', borderRadius: 8 }} />
                <Bar dataKey="plays" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

        </div>
      </div>
    </div>
  )
}

function PopBar({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 48, height: 3, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: GREEN, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, color: '#555', width: 24 }}>{value}</span>
    </div>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      {children}
    </div>
  )
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#161616', borderRadius: 16, padding: 20, ...style }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 12, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</h3>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: '#161616', borderRadius: 12, padding: '14px 18px' }}>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{label}</div>
    </div>
  )
}
