import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const API = 'http://127.0.0.1:3000'

interface AnalysisResult {
  decadePreferences: Record<number, number>
  listeningPatterns: Record<number, number>
  topArtists: Array<{ artist: string; count: number }>
  topTracks: Array<{ name: string; artist: string; count: number }>
  totalTracksAnalyzed: number
  uniqueArtists: number
  analysisDate: string
}

const COLORS = ['#1db954', '#1ed760', '#17a349', '#148a3e', '#117a36', '#0e6a2e']

export default function App() {
  const [auth, setAuth] = useState<boolean | null>(null)
  const [data, setData] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/auth/status`)
      .then(r => r.json())
      .then(({ authenticated }) => setAuth(authenticated))
      .catch(() => setAuth(false))
  }, [])

  useEffect(() => {
    if (!auth) return
    setLoading(true)
    fetch(`${API}/api/insights/analysis`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [auth])

  if (auth === null) return <Screen>Checking auth…</Screen>

  if (!auth) {
    return (
      <Screen>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
          <h1 style={{ fontSize: 28, marginBottom: 8, fontWeight: 700 }}>Spotify Analyzer</h1>
          <p style={{ color: '#aaa', marginBottom: 32 }}>Analisi dei tuoi ascolti recenti</p>
          <a
            href={`${API}/api/auth/login`}
            style={{
              background: '#1db954', color: '#000', padding: '14px 36px',
              borderRadius: 24, fontWeight: 700, textDecoration: 'none', fontSize: 16,
            }}
          >
            Login with Spotify
          </a>
        </div>
      </Screen>
    )
  }

  if (loading) return <Screen>Caricamento dati Spotify…</Screen>
  if (error) return <Screen style={{ color: '#ef4444' }}>Errore: {error}</Screen>
  if (!data) return null

  const decadeData = Object.entries(data.decadePreferences)
    .map(([decade, count]) => ({ name: `${decade}s`, count }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const hourData = Array.from({ length: 24 }, (_, h) => ({
    name: `${h}h`,
    plays: data.listeningPatterns[h] ?? 0,
  }))

  const peakHour = hourData.reduce((max, h) => h.plays > max.plays ? h : max, hourData[0])

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '24px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🎵 Spotify Analyzer</h1>
        <p style={{ color: '#666', marginBottom: 32, fontSize: 13 }}>
          Ultimi {data.totalTracksAnalyzed} ascolti · {new Date(data.analysisDate).toLocaleDateString('it-IT')}
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          <Stat label="Tracce analizzate" value={data.totalTracksAnalyzed} />
          <Stat label="Artisti unici" value={data.uniqueArtists} />
          <Stat label="Ora di punta" value={peakHour.name} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Top artists */}
          <Card title="Top Artisti">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.topArtists.slice(0, 8)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="artist" width={120} tick={{ fontSize: 12, fill: '#ccc' }} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff', borderRadius: 8 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {data.topArtists.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Top tracks */}
          <Card title="Tracce più ascoltate">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.topTracks.slice(0, 7).map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#555', fontSize: 12, width: 16, textAlign: 'right' }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{t.artist}</div>
                  </div>
                  <span style={{ fontSize: 12, color: '#1db954', fontWeight: 700 }}>{t.count}×</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Decade preferences */}
          <Card title="Preferenze per Decade">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={decadeData}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#ccc' }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Listening by hour */}
          <Card title="Quando ascolti">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourData}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} interval={3} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff', borderRadius: 8 }} />
                <Bar dataKey="plays" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

        </div>

        <p style={{ marginTop: 24, color: '#444', fontSize: 12, textAlign: 'center' }}>
          ⚠️ Audio features (mood, tonalità, energia) non disponibili — Spotify ha rimosso l'endpoint per app in Development Mode
        </p>
      </div>
    </div>
  )
}

function Screen({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#0f0f0f', minHeight: '100vh', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', ...style,
    }}>
      {children}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#161616', borderRadius: 16, padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 13, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</h3>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: '#161616', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 30, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  )
}
