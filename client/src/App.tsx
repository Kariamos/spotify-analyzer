import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, LineChart, Line, Legend,
} from 'recharts'

const API = 'http://127.0.0.1:3000'
const GREEN = '#1db954'
const BLUE = '#3b82f6'
const PURPLE = '#8b5cf6'
const AMBER = '#f59e0b'
const RED = '#ef4444'

const PALETTE = [GREEN, BLUE, PURPLE, AMBER, RED, '#1ed760', '#06b6d4', '#ec4899']
const MOOD_COLORS: Record<string, string> = {
  Energetic: AMBER, Chill: BLUE, Melancholic: PURPLE,
  Happy: GREEN, Dark: RED, Neutral: '#6b7280', Romantic: '#ec4899',
}
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface HistoryResult {
  playsByMonth: Array<{ month: string; plays: number; minutes: number }>
  contentSplit: { track: number; podcast: number; audiobook: number }
  platformBreakdown: Record<string, number>
  totalMinutes: number
  totalTracks: number
  topSkippedArtists: Array<{ artist: string; skipRate: number; total: number }>
  longestStreak: number
  currentStreak: number
}

interface MoodResult {
  moodDistribution: Array<{ mood: string; plays: number; percent: number }>
  bpmDistribution: Array<{ bucket: string; count: number }>
  keyDistribution: Array<{ key: string; count: number }>
  topTags: Array<{ tag: string; weight: number }>
}

interface EvolutionResult {
  moodEvolution: Array<{ year: string; moods: Record<string, number> }>
  tagEvolution: Array<{ year: string; topTags: Array<{ tag: string; plays: number }> }>
}

interface PatternsResult {
  heatmap: Array<{ day: number; hour: number; plays: number }>
  discoveryRate: Array<{ month: string; newArtists: number }>
  topCountries: Array<{ country: string; plays: number }>
  sessionStats: { avgSessionMinutes: number; longestSessionMinutes: number; avgTracksPerSession: number; totalSessions: number }
  artistLoyalty: Array<{ artist: string; years: number; totalPlays: number }>
}

interface EnrichmentStatus { total: number; enriched: number; pending: number; running: boolean }
interface ImportResult { imported: number; skipped: number; total: number }

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [auth, setAuth] = useState<boolean | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [history, setHistory] = useState<HistoryResult | null>(null)
  const [mood, setMood] = useState<MoodResult | null>(null)
  const [evolution, setEvolution] = useState<EvolutionResult | null>(null)
  const [patterns, setPatterns] = useState<PatternsResult | null>(null)
  const [enrichStatus, setEnrichStatus] = useState<EnrichmentStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [dataPanel, setDataPanel] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/auth/status`).then(r => r.json())
      .then(({ authenticated }) => setAuth(authenticated))
      .catch(() => setAuth(false))
  }, [])

  const loadData = useCallback(() => {
    if (!auth) return
    setLoading(true)
    Promise.all([
      fetch(`${API}/api/insights/analysis`).then(r => r.json()),
      fetch(`${API}/api/insights/history`).then(r => r.json()),
      fetch(`${API}/api/insights/mood`).then(r => r.json()),
      fetch(`${API}/api/insights/evolution`).then(r => r.json()),
      fetch(`${API}/api/insights/patterns`).then(r => r.json()),
      fetch(`${API}/api/import/enrichment-status`).then(r => r.json()),
    ]).then(([a, h, m, e, p, es]) => {
      setAnalysis(a); setHistory(h); setMood(m)
      setEvolution(e); setPatterns(p); setEnrichStatus(es)
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [auth])

  useEffect(() => { loadData() }, [loadData])

  const handleImport = async () => {
    setImporting(true); setImportMsg(null)
    try {
      const res = await fetch(`${API}/api/import/history`, { method: 'POST' })
      const data: ImportResult = await res.json()
      setImportMsg(`✓ Importati ${data.imported.toLocaleString()} ascolti su ${data.total.toLocaleString()} totali`)
      loadData()
    } catch (e: any) { setImportMsg(`✗ ${e.message}`) }
    finally { setImporting(false) }
  }

  const handleEnrich = async () => {
    setEnriching(true)
    try {
      const res = await fetch(`${API}/api/import/enrich`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setImportMsg(data.error + (data.instructions ? '\n\n' + (data.instructions as string[]).join('\n') : ''))
      } else {
        setImportMsg('✓ Enrichment avviato — aggiorna tra qualche minuto')
      }
    } catch (e: any) { setImportMsg(`✗ ${e.message}`) }
    finally { setEnriching(false) }
  }

  if (auth === null) return <Screen>Checking auth…</Screen>
  if (!auth) return (
    <Screen>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🎵</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: -1 }}>Spotify Analyzer</h1>
        <p style={{ color: '#555', marginBottom: 40, fontSize: 15 }}>Analisi profonda dei tuoi ascolti</p>
        <a href={`${API}/api/auth/login`} style={{
          background: GREEN, color: '#000', padding: '16px 44px',
          borderRadius: 50, fontWeight: 700, textDecoration: 'none', fontSize: 15,
          display: 'inline-block',
        }}>Accedi con Spotify</a>
      </div>
    </Screen>
  )
  if (loading) return <Screen><LoadSpinner /></Screen>
  if (error) return <Screen style={{ flexDirection: 'column', gap: 16 }}>
    <div style={{ color: RED, fontSize: 14 }}>Errore: {error}</div>
    <Btn onClick={loadData}>Riprova</Btn>
  </Screen>
  if (!analysis) return null

  const hasHistory = history && history.playsByMonth.length > 0
  const hasMood = mood && mood.moodDistribution.length > 0
  const hasEvolution = evolution && evolution.moodEvolution.length > 1
  const hasPatterns = patterns && patterns.heatmap.length > 0
  const enrichPct = enrichStatus && enrichStatus.total > 0
    ? Math.round((enrichStatus.enriched / enrichStatus.total) * 100)
    : 0

  const topGenres = Object.entries(analysis.genreDistribution)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  const decadeData = Object.entries(analysis.decadePreferences)
    .map(([d, c]) => ({ name: `${d}s`, count: c }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const hourData = Array.from({ length: 24 }, (_, h) => ({
    name: `${h}h`, plays: analysis.listeningPatterns[h] ?? 0,
  }))
  const peakHour = hourData.reduce((m, h) => h.plays > m.plays ? h : m, hourData[0])
  const totalHours = history ? Math.round(history.totalMinutes / 60) : 0

  const contentPie = history ? [
    { name: 'Musica', value: history.contentSplit.track, color: GREEN },
    { name: 'Podcast', value: history.contentSplit.podcast, color: BLUE },
    { name: 'Audiolibri', value: history.contentSplit.audiobook, color: AMBER },
  ].filter(d => d.value > 0) : []

  // Mood evolution — all mood keys across years
  const allMoods = hasEvolution
    ? [...new Set(evolution!.moodEvolution.flatMap(e => Object.keys(e.moods)))]
    : []
  const moodEvolData = hasEvolution
    ? evolution!.moodEvolution.map(e => ({ year: e.year, ...e.moods }))
    : []

  // Tag evolution — stacked by top 5 tags
  const topTagsGlobal = hasEvolution
    ? [...new Set(evolution!.tagEvolution.flatMap(e => e.topTags.map(t => t.tag)))].slice(0, 5)
    : []
  const tagEvolData = hasEvolution
    ? evolution!.tagEvolution.map(e => {
        const row: Record<string, unknown> = { year: e.year }
        for (const tag of topTagsGlobal) {
          row[tag] = e.topTags.find(t => t.tag === tag)?.plays ?? 0
        }
        return row
      })
    : []

  // Heatmap max for intensity scale
  const heatmapMax = hasPatterns ? Math.max(...patterns!.heatmap.map(h => h.plays), 1) : 1

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 28px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, marginBottom: 2 }}>🎵 Spotify Analyzer</h1>
            <p style={{ color: '#444', fontSize: 12 }}>
              Ultimi {analysis.totalTracksAnalyzed} ascolti · {new Date(analysis.analysisDate).toLocaleDateString('it-IT')}
              {hasHistory && ` · ${totalHours.toLocaleString()}h totali`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={loadData} secondary small>↻</Btn>
            <Btn onClick={() => setDataPanel(v => !v)} secondary small>⚙ Gestione dati</Btn>
          </div>
        </div>

        {/* ── Data management panel ── */}
        {dataPanel && (
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>Gestione dati</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: importMsg ? 12 : 0 }}>
              <Btn onClick={handleImport} disabled={importing}>
                {importing ? 'Importando…' : '📥 Importa storico (ZIP)'}
              </Btn>
              <Btn onClick={handleEnrich} disabled={enriching} secondary>
                {enriching ? 'Avviando…' : '✨ Arricchisci tracce (Last.fm)'}
              </Btn>
            </div>
            {importMsg && (
              <div style={{ fontSize: 12, color: '#888', whiteSpace: 'pre-line', marginTop: 10, lineHeight: 1.6 }}>{importMsg}</div>
            )}
          </div>
        )}

        {/* ── Enrichment progress (only when pending) ── */}
        {enrichStatus && enrichStatus.pending > 0 && (
          <div style={{ background: '#111', border: '1px solid #1a2a1a', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 11, color: '#555' }}>Enrichment</span>
            <div style={{ flex: 1, height: 3, background: '#1a1a1a', borderRadius: 2 }}>
              <div style={{ width: `${enrichPct}%`, height: '100%', background: GREEN, borderRadius: 2, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: 11, color: '#444' }}>
              {enrichStatus.enriched.toLocaleString()}/{enrichStatus.total.toLocaleString()} · {enrichPct}%
              {enrichStatus.running ? ' · in corso…' : ''}
            </span>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Tracce recenti" value={analysis.totalTracksAnalyzed} accent={GREEN} />
          <StatCard label="Artisti unici" value={analysis.uniqueArtists} accent={BLUE} />
          <StatCard label="Popularity media" value={`${analysis.avgPopularity}`} sub="/100" accent={AMBER} />
          <StatCard label="Ora di punta" value={peakHour.name} accent={PURPLE} />
          {hasHistory && <StatCard label="Ore totali" value={totalHours.toLocaleString()} sub="ore di musica" accent={GREEN} />}
          {hasHistory && <StatCard label="Tracce importate" value={history!.totalTracks.toLocaleString()} accent={BLUE} />}
          {hasHistory && <StatCard label="Record streak" value={`${history!.longestStreak}`} sub="giorni consecutivi" accent={AMBER} />}
          {patterns && <StatCard label="Sessioni totali" value={patterns.sessionStats.totalSessions.toLocaleString()} accent={PURPLE} />}
          {patterns && <StatCard label="Durata media sessione" value={`${patterns.sessionStats.avgSessionMinutes}`} sub="minuti" accent={GREEN} />}
        </div>

        {/* ── Section: Storico ── */}
        {hasHistory && (
          <>
            <SectionLabel>Storico ascolti</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {history!.playsByMonth.length > 1 && (
                <Card title="Ascolti mensili" style={{ gridColumn: 'span 2' }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={history!.playsByMonth}>
                      <defs>
                        <linearGradient id="gPlays" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GREEN} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#444' }}
                        tickFormatter={m => m.slice(2)} interval={Math.ceil(history!.playsByMonth.length / 18)} />
                      <YAxis hide />
                      <Tooltip contentStyle={tooltipStyle}
                        formatter={(v: number, n: string) => [n === 'plays' ? `${v} ascolti` : `${Math.round(v)} min`, '']}
                        labelStyle={{ color: '#666', fontSize: 11 }} />
                      <Area type="monotone" dataKey="plays" stroke={GREEN} fill="url(#gPlays)" strokeWidth={1.5} dot={false} name="plays" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}

              <Card title="Tipo di contenuto">
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <PieChart width={120} height={120}>
                    <Pie data={contentPie} cx={55} cy={55} outerRadius={50} innerRadius={28} dataKey="value" strokeWidth={0}>
                      {contentPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {contentPie.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#bbb' }}>{d.name}</span>
                        <span style={{ fontSize: 12, color: '#555', marginLeft: 'auto' }}>{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card title="Piattaforme">
                {Object.entries(history!.platformBreakdown)
                  .sort((a, b) => b[1] - a[1]).slice(0, 5)
                  .map(([name, val], i, arr) => (
                    <div key={name} style={{ marginBottom: i < arr.length - 1 ? 10 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: '#bbb', textTransform: 'capitalize' }}>{name}</span>
                        <span style={{ color: '#555' }}>{val.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2 }}>
                        <div style={{ width: `${(val / arr[0][1]) * 100}%`, height: '100%', background: PALETTE[i], borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
              </Card>

            </div>
          </>
        )}

        {/* ── Section: Artisti & Tracce ── */}
        <SectionLabel>Questo mese</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          <Card title="Top Artisti — Ultime 4 settimane">
            {analysis.topArtistsShort.slice(0, 8).map((a, i) => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 7 ? 10 : 0 }}>
                <Rank n={i + 1} />
                <Avatar src={a.imageUrl} round />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div title={a.name} style={ellipsis(13, 600)}>{a.name}</div>
                  <div title={a.genres.join(', ')} style={{ ...ellipsis(11), color: '#555' }}>{a.genres.slice(0, 2).join(', ') || '—'}</div>
                </div>
                <PopBar value={a.popularity} />
              </div>
            ))}
          </Card>

          <Card title="Top Tracce — Ultime 4 settimane">
            {analysis.topTracksShort.slice(0, 8).map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 7 ? 10 : 0 }}>
                <Rank n={i + 1} />
                <Avatar src={t.albumArt} round={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div title={t.name} style={ellipsis(13, 600)}>{t.name}</div>
                  <div style={{ ...ellipsis(11), color: '#555' }}>{t.artist}</div>
                </div>
                <PopBar value={t.popularity} />
              </div>
            ))}
          </Card>

        </div>

        {/* ── Section: Generi & Decadi ── */}
        <SectionLabel>Gusti musicali</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          <Card title="Generi (da top artisti)">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={topGenres} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {topGenres.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Preferenze per Decade">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={decadeData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {decadeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

        </div>

        {/* ── Section: Mood & Audio ── */}
        {hasMood && (
          <>
            <SectionLabel>Mood & Audio</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {mood!.moodDistribution.length > 2 ? (
                <Card title="Distribuzione Mood">
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={mood!.moodDistribution.map(m => ({ mood: m.mood, value: m.plays }))}>
                      <PolarGrid stroke="#1e1e1e" />
                      <PolarAngleAxis dataKey="mood" tick={{ fontSize: 11, fill: '#888' }} />
                      <Radar dataKey="value" stroke={GREEN} fill={GREEN} fillOpacity={0.18} />
                      <Tooltip contentStyle={tooltipStyle} />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              ) : (
                <Card title="Distribuzione Mood">
                  {mood!.moodDistribution.map((m, i) => (
                    <div key={m.mood} style={{ marginBottom: i < mood!.moodDistribution.length - 1 ? 12 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: MOOD_COLORS[m.mood] ?? '#aaa' }}>{m.mood}</span>
                        <span style={{ color: '#555' }}>{m.percent}%</span>
                      </div>
                      <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2 }}>
                        <div style={{ width: `${m.percent}%`, height: '100%', background: MOOD_COLORS[m.mood] ?? GREEN, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {mood!.bpmDistribution.length > 0 && (
                  <Card title="Distribuzione BPM">
                    <ResponsiveContainer width="100%" height={96}>
                      <BarChart data={mood!.bpmDistribution}>
                        <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: '#666' }} />
                        <YAxis hide />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" fill={PURPLE} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
                {mood!.keyDistribution.length > 0 && (
                  <Card title="Tonalità più ascoltate">
                    <ResponsiveContainer width="100%" height={96}>
                      <BarChart data={mood!.keyDistribution.slice(0, 6)} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="key" width={65} tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                          {mood!.keyDistribution.slice(0, 6).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>

            </div>
          </>
        )}

        {/* ── Tag cloud ── */}
        {hasMood && mood!.topTags.length > 0 && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Card title="Tag più frequenti (Last.fm)">
                <TagCloud tags={mood!.topTags} />
              </Card>
            </div>
          </>
        )}

        {/* ── Section: Evoluzione nel tempo ── */}
        {hasEvolution && (
          <>
            <SectionLabel>Evoluzione nel tempo</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              <Card title="Evoluzione mood per anno">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={moodEvolData}>
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: '#666' }} />
                    {allMoods.map((mood, i) => (
                      <Bar key={mood} dataKey={mood} stackId="a" fill={MOOD_COLORS[mood] ?? PALETTE[i % PALETTE.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Tag più ascoltati per anno">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tagEvolData}>
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: '#666' }} />
                    {topTagsGlobal.map((tag, i) => (
                      <Bar key={tag} dataKey={tag} stackId="a" fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>

            </div>
          </>
        )}

        {/* ── Section: Pattern comportamentali ── */}
        {hasPatterns && (
          <>
            <SectionLabel>Comportamento</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              <Card title="Heatmap ascolti (giorno × ora)" style={{ gridColumn: 'span 2' }}>
                <HeatmapGrid data={patterns!.heatmap} max={heatmapMax} />
              </Card>

              <Card title="Scoperta nuovi artisti / mese">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={patterns!.discoveryRate}>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#444' }}
                      tickFormatter={m => m.slice(2)} interval={Math.ceil(patterns!.discoveryRate.length / 14)} />
                    <YAxis hide />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(v: number) => [`${v} nuovi artisti`, '']} />
                    <Line type="monotone" dataKey="newArtists" stroke={BLUE} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Artisti più fedeli (multi-anno)">
                {patterns!.artistLoyalty.slice(0, 8).map((a, i) => (
                  <div key={a.artist} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 7 ? 8 : 0 }}>
                    <div style={{ fontSize: 11, color: GREEN, width: 28, textAlign: 'center', fontWeight: 700 }}>{a.years}y</div>
                    <div title={a.artist} style={{ ...ellipsis(12), flex: 1, color: '#ccc' }}>{a.artist}</div>
                    <div style={{ fontSize: 10, color: '#444' }}>{a.totalPlays.toLocaleString()}</div>
                  </div>
                ))}
              </Card>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {patterns!.topCountries.length > 0 && (
                <Card title="Paesi di ascolto">
                  {patterns!.topCountries.slice(0, 6).map((c, i) => (
                    <div key={c.country} style={{ marginBottom: i < 5 ? 8 : 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span style={{ color: '#bbb' }}>{c.country}</span>
                        <span style={{ color: '#555' }}>{c.plays.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2 }}>
                        <div style={{ width: `${(c.plays / patterns!.topCountries[0].plays) * 100}%`, height: '100%', background: PALETTE[i], borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              {hasHistory && history!.topSkippedArtists.length > 0 && (
                <Card title="Artisti più skippati">
                  {history!.topSkippedArtists.slice(0, 6).map((a, i) => (
                    <div key={a.artist} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 5 ? 8 : 0 }}>
                      <div title={a.artist} style={{ ...ellipsis(12), flex: 1, color: '#bbb' }}>{a.artist}</div>
                      <div style={{ fontSize: 11, color: RED, width: 34, textAlign: 'right' }}>{a.skipRate}%</div>
                      <div style={{ width: 50, height: 3, background: '#1a1a1a', borderRadius: 2 }}>
                        <div style={{ width: `${a.skipRate}%`, height: '100%', background: RED, borderRadius: 2 }} />
                      </div>
                    </div>
                  ))}
                </Card>
              )}

            </div>
          </>
        )}

        {/* ── Orario ── */}
        <SectionLabel>Quando ascolti</SectionLabel>
        <div style={{ marginBottom: 24 }}>
          <Card title="Distribuzione oraria (ultime 50 tracce)">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={hourData}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#555' }} interval={1} />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="plays" radius={[3, 3, 0, 0]}>
                  {hourData.map((d, i) => (
                    <Cell key={i} fill={d.plays === peakHour.plays ? GREEN : BLUE} opacity={0.6 + (d.plays / (peakHour.plays || 1)) * 0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeatmapGrid({ data, max }: { data: Array<{ day: number; hour: number; plays: number }>; max: number }) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const d of data) grid[d.day][d.hour] = d.plays

  return (
    <div>
      <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
        <div style={{ width: 28 }} />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ flex: 1, fontSize: 8, color: '#444', textAlign: 'center' }}>
            {h % 3 === 0 ? `${h}h` : ''}
          </div>
        ))}
      </div>
      {grid.map((row, d) => (
        <div key={d} style={{ display: 'flex', gap: 2, marginBottom: 2, alignItems: 'center' }}>
          <div style={{ width: 28, fontSize: 9, color: '#555', textAlign: 'right', paddingRight: 4 }}>{DAY_LABELS[d]}</div>
          {row.map((plays, h) => {
            const intensity = plays / max
            return (
              <div key={h} title={`${DAY_LABELS[d]} ${h}h: ${plays} ascolti`} style={{
                flex: 1, height: 14, borderRadius: 2,
                background: plays === 0
                  ? '#111'
                  : `rgba(29,185,84,${0.1 + intensity * 0.9})`,
              }} />
            )
          })}
        </div>
      ))}
    </div>
  )
}

function TagCloud({ tags }: { tags: Array<{ tag: string; weight: number }> }) {
  const max = tags[0]?.weight ?? 1
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
      {tags.map(({ tag, weight }) => {
        const size = 11 + Math.round((weight / max) * 12)
        const alpha = Math.round((0.35 + (weight / max) * 0.65) * 255).toString(16).padStart(2, '0')
        return (
          <span key={tag} style={{
            fontSize: size, color: GREEN,
            background: `${GREEN}18`, borderRadius: 6,
            padding: '2px 8px', opacity: Number(`0x${alpha}`) / 255,
          }}>{tag}</span>
        )
      })}
    </div>
  )
}

const tooltipStyle: React.CSSProperties = {
  background: '#141414', border: '1px solid #222', color: '#ccc',
  borderRadius: 8, fontSize: 12, padding: '6px 12px',
}

const ellipsis = (size: number, weight?: number): React.CSSProperties => ({
  fontSize: size, fontWeight: weight,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
})

function Rank({ n }: { n: number }) {
  return <span style={{ color: '#333', fontSize: 11, width: 16, textAlign: 'right', flexShrink: 0 }}>{n}</span>
}

function Avatar({ src, round }: { src?: string; round: boolean }) {
  const s = round ? '50%' : '5px'
  return src
    ? <img src={src} alt="" style={{ width: 36, height: 36, borderRadius: s, objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: 36, height: 36, borderRadius: s, background: '#1e1e1e', flexShrink: 0 }} />
}

function PopBar({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <div style={{ width: 44, height: 2.5, background: '#1e1e1e', borderRadius: 2 }}>
        <div style={{ width: `${value}%`, height: '100%', background: GREEN, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, color: '#444', width: 22 }}>{value}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, marginTop: 8 }}>
      <span style={{ fontSize: 11, color: '#333', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 600 }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: '#1a1a1a' }} />
    </div>
  )
}

function Screen({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', ...style }}>
      {children}
    </div>
  )
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#111', borderRadius: 14, padding: '16px 18px', ...style }}>
      <div style={{ fontSize: 10, color: '#333', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 600, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{ background: '#111', borderRadius: 12, padding: '14px 16px', borderTop: `2px solid ${accent ?? GREEN}22`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent ?? GREEN, opacity: 0.6 }} />
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>{value}<span style={{ fontSize: 12, fontWeight: 400, color: '#555', marginLeft: 2 }}>{sub}</span></div>
      <div style={{ fontSize: 10, color: '#444', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
    </div>
  )
}

function Btn({ children, onClick, disabled, secondary, small }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; secondary?: boolean; small?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: secondary ? 'transparent' : GREEN,
      color: secondary ? '#555' : '#000',
      border: secondary ? '1px solid #222' : 'none',
      borderRadius: 8, padding: small ? '6px 10px' : '8px 16px',
      fontSize: small ? 11 : 12, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
    }}>{children}</button>
  )
}

function LoadSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 32, height: 32, border: `2px solid #1a1a1a`, borderTop: `2px solid ${GREEN}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{ color: '#444', fontSize: 13 }}>Caricamento…</span>
    </div>
  )
}
