"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Empty } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { VetrataCard } from "@/components/vetrata-card"
import { UploadVetrataDialog } from "@/components/upload-vetrata-dialog"
import { ImageViewer } from "@/components/image-viewer"
import { ArrowLeft, Building2, MapPin, ImageIcon, SparklesIcon } from "lucide-react"
import type { Palazzo, Vetrata } from "@/lib/types"

function getCleanlinessColor(value: number): string {
  if (value <= 25) return "from-red-500 to-red-600"
  if (value <= 50) return "from-orange-400 to-orange-500"
  if (value <= 75) return "from-yellow-400 to-green-400"
  return "from-green-400 to-green-600"
}

function getCleanlinessLabel(value: number): string {
  if (value <= 25) return "Critico"
  if (value <= 50) return "Da migliorare"
  if (value <= 75) return "Buono"
  return "Eccellente"
}

function getCleanlinessTextColor(value: number): string {
  if (value <= 25) return "text-red-700 dark:text-red-300"
  if (value <= 50) return "text-orange-700 dark:text-orange-300"
  if (value <= 75) return "text-yellow-700 dark:text-yellow-300"
  return "text-green-700 dark:text-green-300"
}

function getCleanlinessBackground(value: number): string {
  if (value <= 25) return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
  if (value <= 50) return "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800"
  if (value <= 75) return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
  return "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface PalazzoDetailProps {
  palazzo: Palazzo
  onBack: () => void
}

export function PalazzoDetail({ palazzo, onBack }: PalazzoDetailProps) {
  const { data: vetrate, error, isLoading, mutate } = useSWR<Vetrata[]>(
    `/api/palazzi/${palazzo.id}/vetrate`,
    fetcher
  )
  const [selectedVetrata, setSelectedVetrata] = useState<Vetrata | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [cleanlinessLevel, setCleanlinessLevel] = useState<number | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [modelLoaded, setModelLoaded] = useState<boolean | null>(null)

  const handleCalculateCleanliness = async () => {
    setIsCalculating(true)
    setCleanlinessLevel(null)
    try {
      const res = await fetch(`/api/palazzi/${palazzo.id}/cleanliness`, {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setCleanlinessLevel(Math.round(data.average))
        setModelLoaded(data.model_loaded)
      } else {
        const err = await res.json()
        alert(err.error || "Errore nel calcolo")
      }
    } catch {
      alert("Impossibile contattare il servizio ML.")
    } finally {
      setIsCalculating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa vetrata?")) return

    await fetch(`/api/vetrate/${id}`, { method: "DELETE" })
    mutate()
  }

  const handleView = (vetrata: Vetrata) => {
    setSelectedVetrata(vetrata)
    setViewerOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{palazzo.name}</h1>
              {palazzo.address && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{palazzo.address}</span>
                </div>
              )}
            </div>
          </div>
          {palazzo.description && (
            <p className="text-muted-foreground mt-3">{palazzo.description}</p>
          )}
        </div>
        <UploadVetrataDialog palazzoId={palazzo.id} onUploaded={mutate} />
        <Button onClick={handleCalculateCleanliness} disabled={isCalculating} variant="outline">
          {isCalculating ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <SparklesIcon className="h-4 w-4 mr-2" />
          )}
          Calcola livello pulizia
        </Button>
      </div>

      {/* Cleanliness Banner */}
      {isCalculating && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-muted bg-muted/30 p-6 animate-pulse">
          <Spinner className="h-5 w-5" />
          <span className="text-sm font-medium text-muted-foreground">Analisi in corso...</span>
        </div>
      )}

      {cleanlinessLevel !== null && !isCalculating && (
        <div className={`relative overflow-hidden rounded-xl border p-6 ${getCleanlinessBackground(cleanlinessLevel)}`}>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${getCleanlinessColor(cleanlinessLevel)} text-white shadow-lg`}>
              <span className="text-2xl font-bold">{cleanlinessLevel}</span>
            </div>
            <div className="text-center sm:text-left">
              <h3 className={`text-lg font-semibold ${getCleanlinessTextColor(cleanlinessLevel)}`}>
                Livello pulizia: {getCleanlinessLabel(cleanlinessLevel)}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Il livello di pulizia delle vetrate di questo palazzo è <strong>{cleanlinessLevel}/100</strong>
              </p>
              {modelLoaded === false && (
                <p className="text-xs text-muted-foreground/70 mt-1 italic">
                  ⚠ Modello non addestrato — risultato simulato
                </p>
              )}
            </div>
            <div className="sm:ml-auto w-full sm:w-48">
              <div className="h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${getCleanlinessColor(cleanlinessLevel)} transition-all duration-700`}
                  style={{ width: `${cleanlinessLevel}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          Errore nel caricamento delle vetrate
        </div>
      ) : vetrate && vetrate.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {vetrate.map((vetrata) => (
            <VetrataCard
              key={vetrata.id}
              vetrata={vetrata}
              onDelete={() => handleDelete(vetrata.id)}
              onView={() => handleView(vetrata)}
            />
          ))}
        </div>
      ) : (
        <Empty
          icon={<ImageIcon className="h-12 w-12" />}
          title="Nessuna vetrata"
          description="Questo palazzo non ha ancora immagini di vetrate. Carica la prima!"
        />
      )}

      <ImageViewer
        vetrata={selectedVetrata}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </div>
  )
}
