import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000"

export async function POST() {
  const supabase = await createClient()

  // Fetch all palazzi with their vetrate
  const { data: palazzi, error: palazziError } = await supabase
    .from("palazzi")
    .select(`
      id,
      name,
      address,
      vetrate:vetrate(id, image_url)
    `)
    .order("name")

  if (palazziError) {
    return NextResponse.json({ error: palazziError.message }, { status: 500 })
  }

  // Filter to only palazzi with at least one vetrata
  const palazziWithVetrate = (palazzi || []).filter(
    (p: { vetrate: unknown[] }) => p.vetrate && p.vetrate.length > 0
  )

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
    const imageUrls = (palazzo.vetrate as { id: string; image_url: string }[]).map(
      (v) => v.image_url
    )

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

  // Sort by score descending (errors at the bottom)
  results.sort((a, b) => b.score - a.score)

  return NextResponse.json(results)
}
