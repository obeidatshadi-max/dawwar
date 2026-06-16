import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVoiceRecorder } from './useVoiceRecorder'

function makeMockRecorder() {
  const recorder = {
    start: vi.fn(),
    stop: vi.fn(() => recorder.onstop?.()),
    ondataavailable: null,
    onstop: null,
  }
  return recorder
}

function setupMediaMocks(recorderInstance) {
  const mockStream = { getTracks: vi.fn(() => [{ stop: vi.fn() }]) }
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(mockStream) },
  })

  // A regular function constructor that returns recorderInstance explicitly.
  // When a constructor returns a non-null object, `new` uses that object —
  // so hook property assignments (ondataavailable, onstop) land on the same
  // object the test holds a reference to.
  function MockMediaRecorder() {
    return recorderInstance
  }
  MockMediaRecorder.isTypeSupported = vi.fn(() => true)

  vi.stubGlobal('MediaRecorder', MockMediaRecorder)
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:fake-audio'),
    revokeObjectURL: vi.fn(),
  })
}

describe('useVoiceRecorder', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('initial state is idle', () => {
    const { result } = renderHook(() => useVoiceRecorder())
    expect(result.current.status).toBe('idle')
    expect(result.current.audioBlob).toBeNull()
  })

  it('startRecording sets status to recording', async () => {
    const rec = makeMockRecorder()
    setupMediaMocks(rec)
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => { await result.current.startRecording() })
    expect(result.current.status).toBe('recording')
    expect(rec.start).toHaveBeenCalledWith(250)
  })

  it('stopRecording transitions to recorded with blob', async () => {
    const rec = makeMockRecorder()
    setupMediaMocks(rec)
    rec.stop = vi.fn(() => {
      rec.ondataavailable?.({ data: new Blob(['audio'], { type: 'audio/webm' }) })
      rec.onstop?.()
    })
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => { await result.current.startRecording() })
    await act(async () => { result.current.stopRecording() })
    expect(result.current.status).toBe('recorded')
    expect(result.current.audioBlob).toBeInstanceOf(Blob)
    expect(result.current.audioUrl).toBe('blob:fake-audio')
  })

  it('clearRecording resets to idle', async () => {
    const rec = makeMockRecorder()
    setupMediaMocks(rec)
    rec.stop = vi.fn(() => {
      rec.ondataavailable?.({ data: new Blob(['x']) })
      rec.onstop?.()
    })
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => { await result.current.startRecording() })
    await act(async () => { result.current.stopRecording() })
    act(() => { result.current.clearRecording() })
    expect(result.current.status).toBe('idle')
    expect(result.current.audioBlob).toBeNull()
  })

  it('getUserMedia failure sets error', async () => {
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
    })
    vi.stubGlobal('MediaRecorder', Object.assign(vi.fn(), { isTypeSupported: vi.fn() }))
    const { result } = renderHook(() => useVoiceRecorder())
    await act(async () => { await result.current.startRecording() })
    expect(result.current.error).toBe('Permission denied')
    expect(result.current.status).toBe('idle')
  })
})
