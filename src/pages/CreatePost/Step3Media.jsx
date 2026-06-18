import { useRef, useState, useMemo, useEffect } from 'react'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'
import VoicePlayer from '../../components/VoicePlayer'

const MAX_IMAGES = 5

export default function Step3Media({ onNext, onBack, initialData = {} }) {
  const [images, setImages] = useState(initialData.images ?? [])
  const [description, setDescription] = useState(initialData.description ?? '')
  const fileInputRef = useRef(null)
  const boxCameraRef = useRef(null)
  const { status, audioBlob, audioUrl, error: recError, startRecording, stopRecording, clearRecording } = useVoiceRecorder()

  const previewUrls = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images])
  useEffect(() => () => previewUrls.forEach((u) => URL.revokeObjectURL(u)), [previewUrls])

  function handleFileChange(e) {
    const files = Array.from(e.target.files ?? [])
    setImages((prev) => [...prev, ...files].slice(0, MAX_IMAGES))
    e.target.value = ''
  }

  function removeImage(i) {
    setImages((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleNext() {
    onNext({
      images,
      audioBlob: audioBlob ?? null,
      description: description.trim() || null,
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-brand-text text-xl font-bold">الصور والصوت</h2>

      <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-3">
        <p className="text-brand-text text-sm font-medium mb-1">📦 صورة علبة الدواء (اختياري)</p>
        <p className="text-brand-muted text-xs mb-3 leading-relaxed">
          صوّر العلبة بحيث يظهر تاريخ الانتهاء بوضوح — يزيد ثقة المشتري
        </p>
        <button
          type="button"
          onClick={() => boxCameraRef.current?.click()}
          disabled={images.length >= MAX_IMAGES}
          className="w-full py-2.5 bg-brand-primary text-white rounded-lg text-sm font-semibold disabled:opacity-40"
        >
          📷 التقاط صورة العلبة
        </button>
        <input
          ref={boxCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
          aria-label="التقاط صورة علبة الدواء"
        />
      </div>

      <div>
        <label className="text-brand-muted text-sm mb-2 block">
          الصور ({images.length}/{MAX_IMAGES})
        </label>
        <div className="flex flex-wrap gap-2">
          {images.map((file, i) => (
            <div key={i} className="relative w-20 h-20">
              <img
                src={previewUrls[i]}
                alt={`صورة ${i + 1}`}
                className="w-20 h-20 rounded-xl object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-brand-offer rounded-full text-white text-xs flex items-center justify-center"
                aria-label="حذف الصورة"
              >×</button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-brand-border flex items-center justify-center text-brand-muted text-2xl"
              aria-label="إضافة صورة"
            >+</button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          aria-label="رفع صورة"
        />
      </div>

      <div>
        <label className="text-brand-muted text-sm mb-2 block">ملاحظة صوتية (اختياري — حتى ٦٠ ث)</label>
        {status === 'idle' && (
          <button
            onClick={startRecording}
            className="w-full py-3 border border-brand-border rounded-xl text-brand-muted flex items-center justify-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-brand-offer" />
            تسجيل ملاحظة صوتية
          </button>
        )}
        {status === 'recording' && (
          <button
            onClick={stopRecording}
            className="w-full py-3 border border-brand-offer rounded-xl text-brand-offer flex items-center justify-center gap-2 animate-pulse"
          >
            <span className="w-3 h-3 rounded-full bg-brand-offer" />
            إيقاف التسجيل
          </button>
        )}
        {status === 'recorded' && audioUrl && (
          <div className="flex flex-col gap-2">
            <VoicePlayer url={audioUrl} />
            <button onClick={clearRecording} className="text-brand-muted text-xs text-center">
              حذف التسجيل
            </button>
          </div>
        )}
        {recError && <p className="text-brand-error text-sm mt-1">{recError}</p>}
      </div>

      <div>
        <label className="text-brand-muted text-sm mb-1 block">وصف إضافي (اختياري)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="أي تفاصيل إضافية..."
          className="w-full bg-brand-card border border-brand-border rounded-xl px-4 py-3 text-brand-text placeholder:text-brand-muted outline-none focus:border-brand-primary resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 border border-brand-border text-brand-muted rounded-xl">
          رجوع
        </button>
        <button onClick={handleNext} className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-semibold">
          التالي
        </button>
      </div>
    </div>
  )
}
