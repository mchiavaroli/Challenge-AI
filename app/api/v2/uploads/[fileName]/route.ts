import { getUpload } from "@/lib/local-store"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileName: string }> }
) {
  const { fileName } = await params
  const upload = getUpload(fileName)

  if (!upload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return new NextResponse(upload.buffer, {
    headers: {
      "Content-Type": upload.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  })
}
