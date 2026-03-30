"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Vetrata } from "@/lib/types"
import Image from "next/image"

interface ImageViewerProps {
  vetrata: Vetrata | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageViewer({ vetrata, open, onOpenChange }: ImageViewerProps) {
  if (!vetrata) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{vetrata.name}</DialogTitle>
          {vetrata.description && (
            <p className="text-sm text-muted-foreground">{vetrata.description}</p>
          )}
        </DialogHeader>
        <div className="relative w-full aspect-[4/3] max-h-[70vh]">
          <Image
            src={vetrata.image_url}
            alt={vetrata.name}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
