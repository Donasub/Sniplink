'use client'

import { useEffect, useRef, useState } from 'react'

/* ── types ─────────────────────────────────────────── */
interface Link {
  id?: string
  code: string
  long_url: string
  clicks: number
  created_at?: string
}

type Tab = 'shorten' | 'qr' | 'history'

/* ── helpers ────────────────────────────────────────── */
function shortURL(code: string) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/${code}`
}

/* ── component ──────────────────────────────────────── */
export default function Home() {
  const [tab, setTab] = useState<Tab>('shorten')
  const [longURL, setLongURL] = useState('')
  const [result, setResult] = useState<{ code: string; reused: boolean } | null>(null)
  const [urlError, setUrlError] = useState('')
  const [loading, setLoading] = useState(false)

  const [qrURL, setQrURL] = useState('')
  const [qrGenerated, setQrGenerated] = useState(false)
  const [qrError, setQrError] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)
  const qrInstance = useRef<unknown>(null)

  const [links, setLinks] = useState<Link[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* load QRCode.js once */
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    document.body.appendChild(script)
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2500)
  }

  /* ── shorten ──────────────────────────────────────── */
  async function handleShorten() {
    setUrlError('')
    if (!longURL.trim()) { setUrlError('Please enter a URL'); return }
    setLoading(true)

    const res = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: longURL.trim() }),
    })

    const data = await res.json()
    setLoading(false)

    if (data.error) { setUrlError(data.error); return }

    setResult(data)
    showToast(data.reused ? 'Already shortened — here it is!' : '✓ Link shortened!')
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    showToast('Copied to clipboard!')
  }

  /* ── qr ───────────────────────────────────────────── */
  function handleGenerateQR() {
    setQrError('')
    const val = qrURL.trim()
    if (!val) { setQrError('Please enter a URL'); return }

    let url = val
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    if (!qrRef.current) return

    // Clear previous QR
    qrRef.current.innerHTML = ''
    qrInstance.current = null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QRCode = (window as any).QRCode
    if (!QRCode) { setQrError('QR library not loaded yet — try again'); return }

    qrInstance.current = new QRCode(qrRef.current, {
      text: url,
      width: 220,
      height: 220,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    })

    setQrGenerated(true)
    showToast('✓ QR code generated!')
  }

  function downloadQR() {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) { showToast('Generate a QR code first'); return }
    const a = document.createElement('a')
    a.download = 'sniplink-qr.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
    showToast('Downloading…')
  }

  function makeQRFromResult() {
    if (!result) return
    setQrURL(shortURL(result.code))
    setTab('qr')
    setQrGenerated(false)
    setTimeout(handleGenerateQR, 100)
  }

  /* ── history ──────────────────────────────────────── */
  async function loadHistory() {
    setHistoryLoading(true)
    const res = await fetch('/api/links')
    const data = await res.json()
    if (!data.error) setLinks(data.links ?? [])
    setHistoryLoading(false)
  }

  useEffect(() => {
    if (tab === 'history') loadHistory()
  }, [tab])

  /* ── stats ────────────────────────────────────────── */
  const totalClicks = links.reduce((a, l) => a + (l.clicks ?? 0), 0)
  const today = Date.now() - 86400000
  const todayCount = links.filter(l => l.created_at && new Date(l.created_at).getTime() > today).length

  /* ── render ───────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        .app { max-width: 740px; margin: 0 auto; padding: 2rem 1.25rem 5rem; }
        .header { text-align: center; margin-bottom: 2.5rem; }
        .logo { display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:6px; }
        .logo-icon { width:38px;height:38px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px; }
        h1 { font-family:'Syne',sans-serif; font-size:2rem; font-weight:800; letter-spacing:-0.03em; }
        .tagline { font-size:0.8rem; color:var(--muted); letter-spacing:0.05em; margin-top:4px; }
        .tabs { display:flex; background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:4px; gap:4px; margin-bottom:1.5rem; }
        .tab { flex:1; padding:10px; background:transparent; border:none; color:var(--muted); font-family:'DM Mono',monospace; font-size:0.8rem; border-radius:8px; cursor:pointer; transition:all 0.2s; }
        .tab.active { background:var(--accent); color:#fff; }
        .tab:hover:not(.active) { background:var(--surface2); color:var(--text); }
        .card { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:1.5rem; margin-bottom:1rem; }
        .label { font-size:0.7rem; letter-spacing:0.1em; color:var(--muted); text-transform:uppercase; margin-bottom:0.75rem; }
        .row { display:flex; gap:8px; margin-bottom:0.75rem; }
        input[type=text] { flex:1; background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:12px 16px; color:var(--text); font-family:'DM Mono',monospace; font-size:0.85rem; outline:none; transition:border-color 0.2s; }
        input[type=text]:focus { border-color:var(--accent); }
        input[type=text]::placeholder { color:var(--muted); }
        .btn { padding:12px 20px; background:var(--accent); border:none; border-radius:10px; color:#fff; font-family:'DM Mono',monospace; font-size:0.82rem; cursor:pointer; white-space:nowrap; transition:all 0.15s; }
        .btn:hover { background:#7c74ff; transform:translateY(-1px); }
        .btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .btn-ghost { background:transparent; border:1px solid var(--border2); color:var(--muted); font-size:0.78rem; padding:8px 14px; }
        .btn-ghost:hover { background:var(--surface2); color:var(--text); border-color:var(--accent); }
        .error { color:var(--danger); font-size:0.78rem; margin-bottom:0.5rem; }
        .result-box { background:var(--surface2); border:1px solid var(--border2); border-radius:10px; padding:14px 16px; display:flex; align-items:center; gap:12px; margin-bottom:0.75rem; }
        .result-url { flex:1; font-size:0.88rem; color:var(--accent2); word-break:break-all; }
        .copy-btn { background:none; border:1px solid var(--border2); color:var(--muted); border-radius:6px; padding:5px 10px; font-size:0.75rem; cursor:pointer; font-family:'DM Mono',monospace; white-space:nowrap; transition:all 0.15s; flex-shrink:0; }
        .copy-btn:hover, .copy-btn.copied { color:var(--success); border-color:var(--success); }
        .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:1rem; }
        .stat { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px; text-align:center; }
        .stat-num { font-family:'Syne',sans-serif; font-size:1.5rem; font-weight:700; color:var(--accent2); }
        .stat-lbl { font-size:0.68rem; color:var(--muted); letter-spacing:0.06em; text-transform:uppercase; margin-top:2px; }
        .history-item { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 14px; display:flex; align-items:center; gap:12px; margin-bottom:8px; }
        .hi-content { flex:1; min-width:0; }
        .hi-short { font-size:0.84rem; color:var(--accent2); font-weight:500; margin-bottom:2px; }
        .hi-long { font-size:0.73rem; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .hi-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .clicks-badge { font-size:0.68rem; color:var(--muted); }
        .icon-btn { background:none; border:none; color:var(--muted); cursor:pointer; padding:4px 7px; border-radius:6px; font-size:0.8rem; transition:all 0.15s; }
        .icon-btn:hover { background:var(--border); color:var(--text); }
        .empty { text-align:center; padding:2rem; color:var(--muted); font-size:0.82rem; }
        .divider { height:1px; background:var(--border); margin:1rem 0; }
        .qr-area { text-align:center; }
        .qr-wrap { background:#fff; border-radius:12px; display:inline-block; padding:16px; margin:1rem auto; }
        .qr-actions { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
        .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(60px); background:var(--success); color:#062b1e; font-family:'DM Mono',monospace; font-size:0.8rem; font-weight:500; padding:10px 22px; border-radius:8px; transition:transform 0.3s; z-index:999; pointer-events:none; }
        .toast.show { transform:translateX(-50%) translateY(0); }
        .tip-card { background:rgba(108,99,255,0.04); border-color:rgba(108,99,255,0.2); }
        .tip-text { font-size:0.8rem; color:var(--muted); line-height:1.7; }
      `}</style>

      <div className="app">

        {/* Header */}
        <div className="header">
          <div className="logo">
            <div className="logo-icon">🔗</div>
            <h1>sniplink</h1>
          </div>
          <p className="tagline">url shortener + qr code generator · free for everyone</p>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {(['shorten', 'qr', 'history'] as Tab[]).map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'shorten' ? '✂️ Shorten' : t === 'qr' ? '◼ QR Code' : '📋 History'}
            </button>
          ))}
        </div>

        {/* ── SHORTEN TAB ── */}
        {tab === 'shorten' && (
          <>
            <div className="stats">
              <div className="stat"><div className="stat-num">{links.length}</div><div className="stat-lbl">links</div></div>
              <div className="stat"><div className="stat-num">{todayCount}</div><div className="stat-lbl">today</div></div>
              <div className="stat"><div className="stat-num">{totalClicks}</div><div className="stat-lbl">clicks</div></div>
            </div>

            <div className="card">
              <p className="label">paste your long url</p>
              <div className="row">
                <input
                  type="text"
                  placeholder="https://your-very-long-url.com/..."
                  value={longURL}
                  onChange={e => setLongURL(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleShorten()}
                />
                <button className="btn" onClick={handleShorten} disabled={loading}>
                  {loading ? '…' : 'Shorten →'}
                </button>
              </div>
              {urlError && <p className="error">{urlError}</p>}

              {result && (
                <>
                  <div className="result-box">
                    <span className="result-url">{shortURL(result.code)}</span>
                    <button className="copy-btn" onClick={() => copyToClipboard(shortURL(result.code))}>copy</button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={makeQRFromResult}>📷 Generate QR</button>
                    <button className="btn btn-ghost" onClick={() => copyToClipboard(shortURL(result.code))}>⧉ Copy link</button>
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <p className="label">recent links</p>
              {links.length === 0
                ? <div className="empty">no links yet — shorten your first url above</div>
                : links.slice(0, 5).map(l => (
                  <div key={l.code} className="history-item">
                    <div className="hi-content">
                      <div className="hi-short">{shortURL(l.code)}</div>
                      <div className="hi-long">{l.long_url}</div>
                    </div>
                    <div className="hi-actions">
                      <span className="clicks-badge">{l.clicks} click{l.clicks !== 1 ? 's' : ''}</span>
                      <button className="icon-btn" title="Copy" onClick={() => copyToClipboard(shortURL(l.code))}>⧉</button>
                      <button className="icon-btn" title="QR" onClick={() => { setQrURL(shortURL(l.code)); setTab('qr'); setQrGenerated(false) }}>◼</button>
                    </div>
                  </div>
                ))
              }
            </div>
          </>
        )}

        {/* ── QR TAB ── */}
        {tab === 'qr' && (
          <>
            <div className="card">
              <p className="label">enter url for qr code</p>
              <div className="row">
                <input
                  type="text"
                  placeholder="https://... or paste a sniplink short url"
                  value={qrURL}
                  onChange={e => setQrURL(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerateQR()}
                />
                <button className="btn" onClick={handleGenerateQR}>Generate</button>
              </div>
              {qrError && <p className="error">{qrError}</p>}

              {qrGenerated && (
                <div className="qr-area">
                  <div className="divider" />
                  <p className="label" style={{ textAlign: 'center' }}>
                    {qrURL.length > 50 ? qrURL.slice(0, 50) + '…' : qrURL}
                  </p>
                  <div className="qr-wrap">
                    <div ref={qrRef} />
                  </div>
                  <div className="qr-actions">
                    <button className="btn" onClick={downloadQR}>⬇ Download PNG</button>
                    <button className="btn btn-ghost" onClick={() => { setQrGenerated(false); setQrURL('') }}>Clear</button>
                  </div>
                </div>
              )}

              {!qrGenerated && (
                <div ref={qrRef} style={{ display: 'none' }} />
              )}
            </div>

            <div className="card tip-card">
              <p className="label">tip</p>
              <p className="tip-text">
                Works great for event flyers, pitch decks, packaging, and print materials.
                Generate a QR for any shortened link and download as PNG — ready to use anywhere.
              </p>
            </div>
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p className="label" style={{ margin: 0 }}>all shortened links</p>
              <button className="btn btn-ghost" onClick={loadHistory} style={{ fontSize: '0.75rem' }}>↻ Refresh</button>
            </div>

            {historyLoading
              ? <div className="empty">loading…</div>
              : links.length === 0
                ? <div className="empty">no links yet — start shortening!</div>
                : links.map(l => (
                  <div key={l.code} className="history-item">
                    <div className="hi-content">
                      <div className="hi-short">{shortURL(l.code)}</div>
                      <div className="hi-long">{l.long_url}</div>
                    </div>
                    <div className="hi-actions">
                      <span className="clicks-badge">{l.clicks} click{l.clicks !== 1 ? 's' : ''}</span>
                      <button className="icon-btn" title="Copy" onClick={() => copyToClipboard(shortURL(l.code))}>⧉</button>
                      <button className="icon-btn" title="QR" onClick={() => { setQrURL(shortURL(l.code)); setTab('qr'); setQrGenerated(false) }}>◼</button>
                      <a
                        href={l.long_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-btn"
                        title="Open original"
                        style={{ textDecoration: 'none' }}
                      >↗</a>
                    </div>
                  </div>
                ))
            }
          </div>
        )}
      </div>

      {/* Toast */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </>
  )
}
