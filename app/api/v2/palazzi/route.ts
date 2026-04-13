import { getAllPalazzi, createPalazzo } from "@/lib/local-store"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(getAllPalazzi())
}

export async function POST(request: Request) {
  const body = await request.json()
  const palazzo = createPalazzo({
    name: body.name,
    description: body.description || null,
    address: body.address || null,
  })
  return NextResponse.json(palazzo)
}
