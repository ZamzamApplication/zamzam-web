'use client'
import qrcode from 'qrcode-generator'
import { useMemo } from 'react'
export default function RegistrationQr({ url }: { url: string }) {
  const code = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(url)
    qr.make()
    return qr
  }, [url])
  const size = code.getModuleCount()
  const path: string[] = []
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++)
      if (code.isDark(row, col)) path.push(`M${col + 4},${row + 4}h1v1h-1z`)
  return (
    <svg
      role="img"
      aria-label="رمز التسجيل QR"
      viewBox={`0 0 ${size + 8} ${size + 8}`}
      className="mx-auto h-64 w-64 max-w-full"
      shapeRendering="crispEdges"
    >
      <rect width={size + 8} height={size + 8} fill="white" />
      <path d={path.join('')} fill="#102b36" />
    </svg>
  )
}
