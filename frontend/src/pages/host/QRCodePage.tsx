import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { generateQRCard, downloadQR } from '../../services/qrService'
import { PageHeader } from '../../components/shared'
import { copyToClipboard } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function QRCodePage() {
  const { appUser } = useAuth()
  const navigate = useNavigate()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin
  const joinUrl = appUser ? `${appUrl}/join?host=${appUser.uid}` : ''

  useEffect(() => {
    if (!appUser) return
    generateQRCard(appUser.uid, appUser.name)
      .then(setQrDataUrl)
      .finally(() => setLoading(false))
  }, [appUser])

  function handleDownload() {
    if (!qrDataUrl || !appUser) return
    downloadQR(qrDataUrl, appUser.name)
    toast.success('QR downloaded!')
  }

  async function handleCopyLink() {
    await copyToClipboard(joinUrl)
    toast.success('Link copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="My QR Code" subtitle="Share with guests" onBack={() => navigate('/host')} />

      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
        {/* QR Card */}
        <div className="card p-6 flex flex-col items-center">
          {loading ? (
            <div className="w-64 h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-ipl-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : qrDataUrl ? (
            <>
              <img
                src={qrDataUrl}
                alt="Watch Party QR Code"
                className="w-64 h-auto rounded-xl shadow-sm"
              />
              <div className="mt-4 text-center">
                <div className="font-bold text-ipl-blue text-lg">{appUser?.name}</div>
                <div className="text-gray-500 text-sm">IPL Watch Party 2026</div>
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-sm">Failed to generate QR</div>
          )}
        </div>

        {/* Info */}
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            About this QR
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            This QR is <strong>unique to you</strong> and covers all your watch parties.
            Guests scan it once and can join any of your active parties.
            You can share it as an image, print it, or display it on your TV.
          </p>
        </div>

        {/* Join URL */}
        <div className="card p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Join Link
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 break-all mb-3">
            {joinUrl}
          </div>
          <button onClick={handleCopyLink} className="btn-secondary w-full text-sm">
            Copy Link
          </button>
        </div>

        {/* Download */}
        <button
          onClick={handleDownload}
          disabled={!qrDataUrl}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          ⬇ Download QR (PNG)
        </button>
      </div>
    </div>
  )
}
