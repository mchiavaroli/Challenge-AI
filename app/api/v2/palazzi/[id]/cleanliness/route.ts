import { getVetrateByPalazzo } from "@/lib/local-store"
import { NextResponse } from "next/server"
import { headers } from "next/headers"

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000"

function makeAbsolute(url: string, origin: string): string {
  if (url.startsWith("http")) return url
  return `${origin}${url}`
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const vetrate = getVetrateByPalazzo(id)

  if (vetrate.length === 0) {
    return NextResponse.json(
      { error: "Nessuna vetrata trovata per questo palazzo" },
      { status: 404 }
    )
  }

  const hdrs = await headers()
  const host = hdrs.get("host") || "localhost:3000"
  const proto = hdrs.get("x-forwarded-proto") || "http"
  const origin = `${proto}://${host}`

  const imageUrls = vetrate.map((v) => makeAbsolute(v.image_url, origin))

  try {
    const response = await fetch(`${PYTHON_API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_urls: imageUrls }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      return NextResponse.json(
        { error: `ML service error: ${errBody}` },
        { status: 502 }
      )
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: "Impossibile contattare il servizio ML. Assicurati che il server Python sia in esecuzione." },
      { status: 503 }
    )
  }
}
