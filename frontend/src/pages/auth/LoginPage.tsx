import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { sendOTP, initRecaptcha } from '../../services/authService'
import toast from 'react-hot-toast'

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: 'India' },
  { code: '+1',  flag: '🇺🇸', label: 'US / Canada' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [countryCode, setCountryCode] = useState('+91')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  function getFullNumber() {
    return `${countryCode}${phone.replace(/\D/g, '')}`
  }

  function isValid() {
    return phone.replace(/\D/g, '').length >= 10
  }

  async function handleSend() {
    if (!isValid()) return toast.error('Enter a valid 10-digit phone number')
    setLoading(true)
    initRecaptcha('recaptcha-container')
    try {
      await sendOTP(getFullNumber())
      const redirect = params.get('redirect') || ''
      const host = params.get('host') || ''
      navigate(`/otp?phone=${encodeURIComponent(getFullNumber())}&redirect=${redirect}&host=${host}`)
    } catch (e: any) {
      const msg =
        e.code === 'auth/invalid-phone-number' ? 'Invalid phone number — check and try again'
        : e.code === 'auth/too-many-requests'   ? 'Too many attempts — wait a few minutes'
        : e.code === 'auth/billing-not-enabled'  ? 'Phone auth requires Firebase Blaze plan'
        : e.message || 'Failed to send OTP'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ipl-blue flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-ipl-orange rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">IPL</span>
          </div>
          <h1 className="text-white text-2xl font-bold">Watch Party 2026</h1>
          <p className="text-white/60 text-sm mt-1">Fantasy Cricket League</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-gray-900 font-semibold text-lg mb-1">Enter your phone</h2>
          <p className="text-gray-500 text-sm mb-5">We'll send you a one-time code</p>

          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Phone Number
          </label>

          {/* Country code select + number input side by side */}
          <div className="flex gap-2 mb-4">
            {/* Native select dropdown */}
            <select
              value={countryCode}
              onChange={e => { setCountryCode(e.target.value); setPhone('') }}
              className="flex-shrink-0 border border-gray-200 rounded-xl bg-gray-50 px-3 py-3
                         text-sm font-medium text-gray-700 focus:border-ipl-orange focus:ring-2
                         focus:ring-ipl-orange/10 outline-none cursor-pointer"
              style={{ minWidth: '110px' }}
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>

            {/* Phone number input */}
            <input
              className="input-field flex-1 text-lg tracking-wide"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder={countryCode === '+91' ? '9876543210' : '5550001234'}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              autoFocus
              maxLength={12}
              inputMode="numeric"
            />
          </div>

          {/* Preview full number */}
          {phone.length >= 5 && (
            <p className="text-xs text-gray-400 mb-4 -mt-2">
              Sending OTP to: <span className="font-mono font-semibold text-gray-600">{getFullNumber()}</span>
            </p>
          )}

          <button
            onClick={handleSend}
            disabled={loading || !isValid()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : 'Send OTP'
            }
          </button>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <button
              onClick={() => navigate('/admin-login')}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Admin / Host sign in →
            </button>
          </div>
        </div>
      </div>

      {/* Invisible reCAPTCHA */}
      <div id="recaptcha-container" />
    </div>
  )
}
