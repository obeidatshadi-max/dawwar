import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Step1Product from './Step1Product'
import Step2Price from './Step2Price'
import Step3Media from './Step3Media'
import Step4Review from './Step4Review'

const STEPS = ['product', 'price', 'media', 'review']

export default function CreatePost() {
  const navigate = useNavigate()
  const [step, setStep] = useState('product')
  const [data, setData] = useState({})

  function handleStep1(d) { setData((p) => ({ ...p, ...d })); setStep('price') }
  function handleStep2(d) { setData((p) => ({ ...p, ...d })); setStep('media') }
  function handleStep3(d) { setData((p) => ({ ...p, ...d })); setStep('review') }
  function handleDone() { navigate('/feed', { replace: true }) }

  const progress = ((STEPS.indexOf(step) + 1) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col px-6 py-10 max-w-md mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => {
            if (step === 'product') navigate(-1)
            else setStep(STEPS[STEPS.indexOf(step) - 1])
          }}
          className="text-brand-muted"
          aria-label="رجوع"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="flex-1 bg-brand-border rounded-full h-1">
          <div
            className="bg-brand-primary h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-brand-muted text-xs">{STEPS.indexOf(step) + 1}/4</span>
      </div>

      <div className="flex-1">
        {step === 'product' && <Step1Product onNext={handleStep1} initialData={data} />}
        {step === 'price' && (
          <Step2Price
            type={data.type}
            onNext={handleStep2}
            onBack={() => setStep('product')}
            initialData={data}
          />
        )}
        {step === 'media' && (
          <Step3Media
            onNext={handleStep3}
            onBack={() => setStep('price')}
            initialData={data}
          />
        )}
        {step === 'review' && (
          <Step4Review
            data={data}
            onBack={() => setStep('media')}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  )
}
