import { useState, useRef, useEffect } from 'react'

const MAX_MS = 60_000

export function useVoiceRecorder() {
  const [status, setStatus] = useState('idle') // 'idle' | 'recording' | 'recorded'
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState('')

  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const audioUrlRef = useRef(null)

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
  }, [])

  async function startRecording() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        const secs = Math.round((Date.now() - startTimeRef.current) / 1000)
        audioUrlRef.current = url
        setAudioBlob(blob)
        setAudioUrl(url)
        setDuration(secs)
        setStatus('recorded')
      }

      recorder.start(250)
      startTimeRef.current = Date.now()
      setStatus('recording')
      timerRef.current = setTimeout(() => stopRecording(), MAX_MS)
    } catch (err) {
      setError(err?.message ?? 'تعذّر الوصول إلى الميكروفون')
    }
  }

  function stopRecording() {
    clearTimeout(timerRef.current)
    recorderRef.current?.stop()
  }

  function clearRecording() {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setStatus('idle')
    setError('')
  }

  return { status, audioBlob, audioUrl, duration, error, startRecording, stopRecording, clearRecording }
}
