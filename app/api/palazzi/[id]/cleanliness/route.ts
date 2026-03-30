import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch all vetrate images for this palazzo
  const { data: vetrate, error } = await supabase
    .from("vetrate")
    .select("id, image_url")
    .eq("palazzo_id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!vetrate || vetrate.length === 0) {
    return NextResponse.json(
      { error: "Nessuna vetrata trovata per questo palazzo" },
      { status: 404 }
    )
  }

  const imageUrls = vetrate.map((v) => v.image_url)

  // Call the Python ML service
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
