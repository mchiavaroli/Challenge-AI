"use client"

import { useState, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Upload, ImagePlus, X } from "lucide-react"
import Image from "next/image"
import { API_BASE } from "@/lib/api-base"

interface UploadVetrataDialogProps {
  palazzoId: string
  onUploaded: () => void
}

export function UploadVetrataDialog({ palazzoId, onUploaded }: UploadVetrataDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) return
    setFile(selectedFile)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(selectedFile)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFile(droppedFile)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const clearFile = () => {
    setFile(null)
    setPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !name.trim()) return

    setLoading(true)
    try {
      // Upload image
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) throw new Error("Upload failed")
      const { url } = await uploadRes.json()

      // Create vetrata record
      const res = await fetch(`${API_BASE}/palazzi/${palazzoId}/vetrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, image_url: url }),
      })

      if (res.ok) {
        setName("")
        setDescription("")
        clearFile()
        setOpen(false)
        onUploaded()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <ImagePlus className="h-4 w-4 mr-2" />
          Carica Vetrata
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Carica Immagine Vetrata</DialogTitle>
            <DialogDescription>
              Aggiungi una nuova immagine di vetrata a questo palazzo.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel>Immagine *</FieldLabel>
              {!preview ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Trascina un&apos;immagine qui o clicca per selezionare
                  </p>
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <Image
                      src={preview}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={clearFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="vetrata-name">Nome *</FieldLabel>
              <Input
                id="vetrata-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Vetrata nord - Sala principale"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="vetrata-description">Descrizione</FieldLabel>
              <Textarea
                id="vetrata-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dettagli sulla vetrata..."
                rows={2}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading || !file || !name.trim()}>
              {loading && <Spinner className="mr-2 h-4 w-4" />}
              Carica Vetrata
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
