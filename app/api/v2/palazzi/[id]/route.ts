import { getPalazzo, deletePalazzo, updatePalazzo } from "@/lib/local-store"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const palazzo = getPalazzo(id)
  if (!palazzo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(palazzo)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  deletePalazzo(id)
  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const palazzo = updatePalazzo(id, {
    name: body.name,
    description: body.description,
    address: body.address,
  })
  if (!palazzo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(palazzo)
}
