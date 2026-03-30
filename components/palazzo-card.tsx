"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, ImageIcon, MapPin, Trash2 } from "lucide-react"
import type { Palazzo } from "@/lib/types"

interface PalazzoCardProps {
  palazzo: Palazzo
  onClick: () => void
  onDelete: () => void
}

export function PalazzoCard({ palazzo, onClick, onDelete }: PalazzoCardProps) {
  return (
    <Card 
      className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/30"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">{palazzo.name}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {palazzo.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {palazzo.description}
          </p>
        )}
        {palazzo.address && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{palazzo.address}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ImageIcon className="h-4 w-4" />
            <span>{palazzo.vetrate_count || 0} vetrate</span>
          </div>
          <span className="text-xs">
            {new Date(palazzo.created_at).toLocaleDateString("it-IT", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
