"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Expand } from "lucide-react"
import type { Vetrata } from "@/lib/types"
import Image from "next/image"

interface VetrataCardProps {
  vetrata: Vetrata
  onDelete: () => void
  onView: () => void
}

export function VetrataCard({ vetrata, onDelete, onView }: VetrataCardProps) {
  return (
    <Card className="group overflow-hidden">
      <div className="relative aspect-square">
        <Image
          src={vetrata.image_url}
          alt={vetrata.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={onView}
          >
            <Expand className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm truncate">{vetrata.name}</h3>
        {vetrata.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
            {vetrata.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(vetrata.created_at).toLocaleDateString("it-IT", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          {new Date(vetrata.created_at).toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      </CardContent>
    </Card>
  )
}
