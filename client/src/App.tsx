import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'

const API = 'http://127.0.0.1:3000'

interface AnalysisResult {
  moodDistribution: Record<string, number>
  keyPreferences: Record<string, number>
  decadePreferences: Record<number, number>
  listeningPatterns: Record<number, number>
  topArtists: Array<{ artist: string; count: number }>
  evolutionTrend: number[]
  averageEnergy: number
  averageTempo: number
  totalTracksAnalyzed: number
  analysisDate: string
}

function toChartData(obj: Record<string | number, number>) {
  return Object.entries(obj)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

const MOOD_COLORS: Record<string, string> = {
  Upbeat: '#22c55e',
  Intense: '#ef4444',
  Chill: '#3b82f6',
  Melancholic: '#8b5cf6',
}

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
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>🎵 Spotify Analyzer</h1>
          <p style={{ color: '#aaa', marginBottom: 24 }}>Connect your Spotify account to see insights</p>
          <a
            href={`${API}/api/auth/login`}
            style={{
              background: '#1db954', color: '#000', padding: '12px 32px',
              borderRadius: 24, fontWeight: 700, textDecoration: 'none', fontSize: 16,
            }}
          >
            Login with Spotify
          </a>
        </div>
      </Screen>
    )
  }

  if (loading) return <Screen>Analyzing your listening history…</Screen>
  if (error) return <Screen>Error: {error}</Screen>
  if (!data) return null

  const moodData = toChartData(data.moodDistribution)
  const keyData = toChartData(data.keyPreferences).slice(0, 8)
  const decadeData = toChartData(data.decadePreferences).map(d => ({ ...d, name: `${d.name}s` }))
  const hourData = Array.from({ length: 24 }, (_, h) => ({
    name: `${h}h`,
    plays: data.listeningPatterns[h] ?? 0,
  }))
  const trendData = data.evolutionTrend.map((energy, i) => ({
    name: i === 0 ? 'Today' : `${i}d ago`,
    energy: Math.round(energy * 100) / 100,
  })).reverse()

  return (
    <div style={{ background: '#0f0f0f', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>🎵 Spotify Analyzer</h1>
      <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>
        Based on last {data.totalTracksAnalyzed} tracks · {new Date(data.analysisDate).toLocaleDateString()}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <Stat label="Avg Energy" value={`${Math.round(data.averageEnergy * 100)}%`} />
        <Stat label="Avg Tempo" value={`${Math.round(data.averageTempo)} BPM`} />
        <Stat label="Tracks Analyzed" value={data.totalTracksAnalyzed} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        <Card title="Mood Distribution">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {moodData.map(({ name, value }) => (
              <div key={name} style={{
                flex: 1, minWidth: 80, background: '#1a1a1a', borderRadius: 12,
                padding: '16px 12px', textAlign: 'center',
                borderTop: `3px solid ${MOOD_COLORS[name] ?? '#888'}`,
              }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{name}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Top Artists">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.topArtists.slice(0, 6)} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="artist" width={110} tick={{ fontSize: 12, fill: '#ccc' }} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff' }} />
              <Bar dataKey="count" fill="#1db954" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Favourite Keys">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={keyData}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#ccc' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff' }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Decade Preferences">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={decadeData}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#ccc' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff' }} />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="When You Listen">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} interval={3} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff' }} />
              <Bar dataKey="plays" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Energy Trend (7 days)">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', color: '#fff' }} />
              <Line type="monotone" dataKey="energy" stroke="#1db954" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

      </div>
    </div>
  )
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0f0f0f', minHeight: '100vh', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {children}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#161616', borderRadius: 16, padding: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{title}</h3>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: '#161616', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{label}</div>
    </div>
  )
}
