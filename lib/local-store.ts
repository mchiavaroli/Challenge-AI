import type { Palazzo, Vetrata } from "./types"

// Use globalThis to ensure a single shared store across all Next.js route modules
const g = globalThis as unknown as {
  __localPalazzi?: Map<string, Palazzo>
  __localVetrate?: Map<string, Vetrata>
  __localUploads?: Map<string, { buffer: Buffer; contentType: string }>
}

if (!g.__localPalazzi) g.__localPalazzi = new Map()
if (!g.__localVetrate) g.__localVetrate = new Map()
if (!g.__localUploads) g.__localUploads = new Map()

const palazzi = g.__localPalazzi
const vetrate = g.__localVetrate

// Simple UUID v4 generator (no crypto dependency needed)
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ── Palazzi ──────────────────────────────────────────────

export function getAllPalazzi(): (Palazzo & { vetrate_count: number })[] {
  return Array.from(palazzi.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((p) => ({
      ...p,
      vetrate_count: Array.from(vetrate.values()).filter((v) => v.palazzo_id === p.id).length,
    }))
}

export function getPalazzo(id: string): Palazzo | undefined {
  return palazzi.get(id)
}

export function createPalazzo(data: { name: string; description?: string | null; address?: string | null }): Palazzo {
  const now = new Date().toISOString()
  const palazzo: Palazzo = {
    id: uuid(),
    name: data.name,
    description: data.description || null,
    address: data.address || null,
    created_at: now,
    updated_at: now,
  }
  palazzi.set(palazzo.id, palazzo)
  return palazzo
}

export function updatePalazzo(
  id: string,
  data: { name?: string; description?: string | null; address?: string | null }
): Palazzo | null {
  const existing = palazzi.get(id)
  if (!existing) return null
  const updated: Palazzo = {
    ...existing,
    name: data.name ?? existing.name,
    description: data.description !== undefined ? data.description : existing.description,
    address: data.address !== undefined ? data.address : existing.address,
    updated_at: new Date().toISOString(),
  }
  palazzi.set(id, updated)
  return updated
}

export function deletePalazzo(id: string): boolean {
  // Cascade delete vetrate
  for (const [vid, v] of vetrate) {
    if (v.palazzo_id === id) vetrate.delete(vid)
  }
  return palazzi.delete(id)
}

// ── Vetrate ──────────────────────────────────────────────

export function getVetrateByPalazzo(palazzoId: string): Vetrata[] {
  return Array.from(vetrate.values())
    .filter((v) => v.palazzo_id === palazzoId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function createVetrata(data: {
  palazzo_id: string
  name: string
  description?: string | null
  image_url: string
}): Vetrata {
  const vetrata: Vetrata = {
    id: uuid(),
    palazzo_id: data.palazzo_id,
    name: data.name,
    description: data.description || null,
    image_url: data.image_url,
    created_at: new Date().toISOString(),
  }
  vetrate.set(vetrata.id, vetrata)
  return vetrata
}

export function deleteVetrata(id: string): boolean {
  return vetrate.delete(id)
}

// ── Helpers for cleanliness routes ───────────────────────

export function getPalazziWithVetrate(): { id: string; name: string; address: string | null; vetrate: { id: string; image_url: string }[] }[] {
  return Array.from(palazzi.values())
    .map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      vetrate: Array.from(vetrate.values())
        .filter((v) => v.palazzo_id === p.id)
        .map((v) => ({ id: v.id, image_url: v.image_url })),
    }))
    .filter((p) => p.vetrate.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── Upload store (keeps file bytes in memory) ────────────

const uploads = g.__localUploads!

export function storeUpload(fileName: string, buffer: Buffer, contentType: string): string {
  uploads.set(fileName, { buffer, contentType })
  return `/api/v2/uploads/${fileName}`
}

export function getUpload(fileName: string): { buffer: Buffer; contentType: string } | undefined {
  return uploads.get(fileName)
}
