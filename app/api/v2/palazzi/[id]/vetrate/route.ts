import { getVetrateByPalazzo, createVetrata } from "@/lib/local-store"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return NextResponse.json(getVetrateByPalazzo(id))
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const vetrata = createVetrata({
    palazzo_id: id,
    name: body.name,
    description: body.description || null,
    image_url: body.image_url,
  })
  return NextResponse.json(vetrata)
}
