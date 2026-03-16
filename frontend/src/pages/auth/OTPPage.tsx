import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyOTP } from '../../services/authService'
import toast from 'react-hot-toast'

export default function OTPPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const phone = params.get('phone') || ''
  const redirect = params.get('redirect') || ''
  const host = params.get('host') || ''

  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => { inputs.current[0]?.focus() }, [])

  function handleChange(idx: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) inputs.current[idx + 1]?.focus()
    if (next.every(d => d !== '') && next.join('').length === 6) {
      verify(next.join(''))
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  async function verify(code: string) {
    setLoading(true)
    try {
      const { isNewUser } = await verifyOTP(code)
      if (isNewUser) {
        navigate(`/setup?redirect=${redirect}&host=${host}`)
      } else {
        if (redirect) navigate(redirect)
        else if (host) navigate(`/join?host=${host}`)
        else navigate('/')
      }
    } catch (e: any) {
      toast.error('Invalid OTP — please try again')
      setOtp(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ipl-blue flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-ipl-orange rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">IPL</span>
          </div>
          <h1 className="text-white text-xl font-bold">Verify OTP</h1>
          <p className="text-white/60 text-sm mt-1">Sent to {phone}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <p className="text-gray-600 text-sm text-center mb-6">Enter the 6-digit code</p>

          <div className="flex gap-2 justify-center mb-6">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { inputs.current[idx] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className="w-11 h-12 text-center text-xl font-bold border-2 border-gray-200 rounded-xl
                           focus:border-ipl-orange focus:ring-2 focus:ring-ipl-orange/20 transition-all"
              />
            ))}
          </div>

          <button
            onClick={() => verify(otp.join(''))}
            disabled={loading || otp.some(d => !d)}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Verify'
            }
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}
