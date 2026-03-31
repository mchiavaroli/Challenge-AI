"use client"

import { useState } from "react"
import useSWR from "swr"
import { PalazzoCard } from "@/components/palazzo-card"
import { CreatePalazzoDialog } from "@/components/create-palazzo-dialog"
import { CleanlinessRankingDialog } from "@/components/cleanliness-ranking-dialog"
import { PalazzoDetail } from "@/components/palazzo-detail"
import { Empty } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Building2 } from "lucide-react"
import type { Palazzo } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function Home() {
  const { data: palazzi, error, isLoading, mutate } = useSWR<Palazzo[]>("/api/palazzi", fetcher)
  const [selectedPalazzo, setSelectedPalazzo] = useState<Palazzo | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo palazzo e tutte le sue vetrate?")) return

    await fetch(`/api/palazzi/${id}`, { method: "DELETE" })
    mutate()
  }

  if (selectedPalazzo) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <PalazzoDetail
            palazzo={selectedPalazzo}
            onBack={() => setSelectedPalazzo(null)}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Le Tue Strutture</h1>
            <p className="text-muted-foreground mt-1">
              Gestione pulizia vetrate delle tue strutture
            </p>
          </div>
          <div className="flex gap-2">
            <CleanlinessRankingDialog />
            <CreatePalazzoDialog onCreated={mutate} />
          </div>
        </header>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-10 w-10" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-destructive">
            Errore nel caricamento dei palazzi
          </div>
        ) : palazzi && palazzi.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {palazzi.map((palazzo) => (
              <PalazzoCard
                key={palazzo.id}
                palazzo={palazzo}
                onClick={() => setSelectedPalazzo(palazzo)}
                onDelete={() => handleDelete(palazzo.id)}
              />
            ))}
          </div>
        ) : (
          <Empty
            icon={<Building2 className="h-12 w-12" />}
            title="Nessun palazzo"
            description="Non hai ancora creato nessun palazzo. Inizia creandone uno per organizzare le tue vetrate."
          />
        )}
      </div>
    </main>
  )
}
