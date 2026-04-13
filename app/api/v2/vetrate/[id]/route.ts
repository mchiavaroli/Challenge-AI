import { deleteVetrata } from "@/lib/local-store"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  deleteVetrata(id)
  return NextResponse.json({ success: true })
}
