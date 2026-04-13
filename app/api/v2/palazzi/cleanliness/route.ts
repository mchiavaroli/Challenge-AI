import { getPalazziWithVetrate } from "@/lib/local-store"
import { NextResponse } from "next/server"
import { headers } from "next/headers"

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000"

function makeAbsolute(url: string, origin: string): string {
  if (url.startsWith("http")) return url
  return `${origin}${url}`
}

export async function POST() {
  const hdrs = await headers()
  const host = hdrs.get("host") || "localhost:3000"
  const proto = hdrs.get("x-forwarded-proto") || "http"
  const origin = `${proto}://${host}`

  const palazziWithVetrate = getPalazziWithVetrate()

  if (palazziWithVetrate.length === 0) {
    return NextResponse.json(
      { error: "Nessun palazzo con vetrate caricate" },
      { status: 404 }
    )
  }

  const results: {
    id: string
    name: string
    address: string | null
    score: number
    vetrate_count: number
    model_loaded: boolean
  }[] = []

  for (const palazzo of palazziWithVetrate) {
    const imageUrls = palazzo.vetrate.map((v) => makeAbsolute(v.image_url, origin))

    try {
      const response = await fetch(`${PYTHON_API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_urls: imageUrls }),
      })

      if (!response.ok) {
        results.push({
          id: palazzo.id,
          name: palazzo.name,
          address: palazzo.address,
          score: -1,
          vetrate_count: imageUrls.length,
          model_loaded: false,
        })
        continue
      }

      const data = await response.json()
      results.push({
        id: palazzo.id,
        name: palazzo.name,
        address: palazzo.address,
        score: Math.round(data.average),
        vetrate_count: imageUrls.length,
        model_loaded: data.model_loaded,
      })
    } catch {
      results.push({
        id: palazzo.id,
        name: palazzo.name,
        address: palazzo.address,
        score: -1,
        vetrate_count: imageUrls.length,
        model_loaded: false,
      })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return NextResponse.json(results)
}
