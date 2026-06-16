import { useRef, useState } from 'react'

export default function VoicePlayer({ url }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) }
  }

  function onTimeUpdate() {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress(audio.currentTime / audio.duration)
  }

  function onLoadedMetadata() {
    setDuration(Math.round(audioRef.current?.duration ?? 0))
  }

  function onEnded() {
    setPlaying(false)
    setProgress(0)
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60)
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="flex items-center gap-3 bg-brand-card rounded-xl px-3 py-2 border border-brand-border">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        aria-label="تشغيل المقطع الصوتي"
      />
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0"
        aria-label={playing ? 'إيقاف' : 'تشغيل'}
      >
        {playing ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>
      <div className="flex-1">
        <div className="w-full bg-brand-border rounded-full h-1">
          <div
            className="bg-brand-primary h-1 rounded-full transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <span className="text-brand-muted text-xs tabular-nums">{formatTime(duration)}</span>
    </div>
  )
}
