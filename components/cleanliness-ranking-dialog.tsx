"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Trophy, Medal, MapPin, ImageIcon } from "lucide-react"
import { API_BASE } from "@/lib/api-base"

interface RankingItem {
  id: string
  name: string
  address: string | null
  score: number
  vetrate_count: number
  model_loaded: boolean
}

function getScoreColor(score: number): string {
  if (score < 0) return "text-muted-foreground"
  if (score <= 25) return "text-red-600 dark:text-red-400"
  if (score <= 50) return "text-orange-600 dark:text-orange-400"
  if (score <= 75) return "text-yellow-600 dark:text-yellow-400"
  return "text-green-600 dark:text-green-400"
}

function getBarColor(score: number): string {
  if (score <= 25) return "bg-red-500"
  if (score <= 50) return "bg-orange-500"
  if (score <= 75) return "bg-yellow-500"
  return "bg-green-500"
}

function getMedalColor(position: number): string {
  if (position === 0) return "text-yellow-500"
  if (position === 1) return "text-gray-400"
  if (position === 2) return "text-amber-700"
  return "text-muted-foreground"
}

export function CleanlinessRankingDialog() {
  const [open, setOpen] = useState(false)
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    setIsLoading(true)
    setError(null)
    setRanking([])
    try {
      const res = await fetch(`${API_BASE}/palazzi/cleanliness`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setRanking(data)
      } else {
        const err = await res.json()
        setError(err.error || "Errore nel calcolo")
      }
    } catch {
      setError("Impossibile contattare il servizio ML.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      handleCalculate()
    }
  }

  const hasModelWarning = ranking.some((r) => r.model_loaded === false && r.score >= 0)

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Trophy className="h-4 w-4 mr-2" />
          Classifica Pulizia
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Classifica Pulizia Strutture
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Analisi di tutte le strutture in corso...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleCalculate}>
              Riprova
            </Button>
          </div>
        )}

        {!isLoading && !error && ranking.length > 0 && (
          <div className="space-y-3">
            {ranking.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                {/* Position */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  {index < 3 ? (
                    <Medal className={`h-6 w-6 ${getMedalColor(index)}`} />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {item.address && (
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {item.address}
                      </span>
                    )}
                    <span className="flex items-center gap-1 shrink-0">
                      <ImageIcon className="h-3 w-3" />
                      {item.vetrate_count}
                    </span>
                  </div>
                  {/* Progress bar */}
                  {item.score >= 0 && (
                    <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getBarColor(item.score)} transition-all duration-700`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Score */}
                <div className={`text-right shrink-0 ${getScoreColor(item.score)}`}>
                  {item.score >= 0 ? (
                    <span className="text-lg font-bold">{item.score}</span>
                  ) : (
                    <span className="text-xs">Errore</span>
                  )}
                </div>
              </div>
            ))}

            {hasModelWarning && (
              <p className="text-xs text-muted-foreground/70 italic text-center pt-2">
                ⚠ Modello non addestrato — risultati simulati
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
