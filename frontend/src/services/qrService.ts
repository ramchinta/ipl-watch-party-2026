import QRCode from 'qrcode'

const APP_BASE_URL = import.meta.env.VITE_APP_URL || window.location.origin

// Generate QR for a host (one per host, encodes host join URL)
export async function generateHostQR(
  hostId: string,
  hostName: string
): Promise<string> {
  const url = `${APP_BASE_URL}/join?host=${hostId}`
  const dataUrl = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: { dark: '#002B5C', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  })
  return dataUrl
}

// Render QR + host name onto a canvas and return PNG data URL for download
export async function generateQRCard(
  hostId: string,
  hostName: string
): Promise<string> {
  const url = `${APP_BASE_URL}/join?host=${hostId}`
  const canvas = document.createElement('canvas')
  const SIZE = 500
  canvas.width = SIZE
  canvas.height = SIZE + 100
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = '#002B5C'
  ctx.fillRect(0, 0, SIZE, SIZE + 100)

  // White card area
  ctx.fillStyle = '#FFFFFF'
  ctx.roundRect(20, 20, SIZE - 40, SIZE - 20, 16)
  ctx.fill()

  // QR code
  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, url, {
    width: SIZE - 80,
    margin: 2,
    color: { dark: '#002B5C', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  })
  ctx.drawImage(qrCanvas, 40, 30)

  // Title text
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 28px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('IPL Watch Party 2026', SIZE / 2, SIZE + 45)

  // Host name
  ctx.font = '600 22px Inter, sans-serif'
  ctx.fillStyle = '#F5A623'
  ctx.fillText(hostName, SIZE / 2, SIZE + 82)

  return canvas.toDataURL('image/png')
}

export function downloadQR(dataUrl: string, hostName: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `ipl-watchparty-${hostName.toLowerCase().replace(/\s+/g, '-')}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
