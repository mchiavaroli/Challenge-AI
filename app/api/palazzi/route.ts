import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  const { data: palazzi, error } = await supabase
    .from("palazzi")
    .select(`
      *,
      vetrate:vetrate(count)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transform data to include vetrate count
  const palazziWithCount = palazzi.map((palazzo) => ({
    ...palazzo,
    vetrate_count: palazzo.vetrate?.[0]?.count || 0,
  }))

  return NextResponse.json(palazziWithCount)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("palazzi")
    .insert({
      name: body.name,
      description: body.description || null,
      address: body.address || null,
    })
    .select()
    .single()

  if (error) {
    console.error("POST /api/palazzi error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
