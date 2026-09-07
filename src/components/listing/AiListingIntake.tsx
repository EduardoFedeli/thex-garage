"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageUploader, type UploadedImage } from "@/components/create/ImageUploader"
import type { AiListingDraft } from "@/app/api/listings/ai-draft/route"

interface AiListingIntakeProps {
  onBack: () => void
  onComplete: (draft: AiListingDraft, images: UploadedImage[]) => void
}

export function AiListingIntake({ onBack, onComplete }: AiListingIntakeProps) {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const canSubmit = images.length > 0 && !loading

  async function handleGenerate() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/listings/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, note: note || undefined }),
      })
      const draft = (await res.json()) as AiListingDraft
      if (!draft.ok) {
        setError(draft.error ?? "Não foi possível gerar sugestões agora. Você pode preencher manualmente.")
      }
      onComplete(draft, images)
    } catch {
      onComplete({ ok: false, error: "Erro de conexão" }, images)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-12 mt-2">
      <div className="flex items-center gap-4 mb-2 pl-2">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-[var(--color-pine)] shadow-sm text-[var(--foreground)] hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-black text-[var(--foreground)] text-[20px]">criar com IA</h2>
      </div>

      <div className="bg-white dark:bg-[var(--color-pine)] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
        <p className="text-[15px] font-bold text-[var(--foreground)]">Fotos do produto *</p>
        <ImageUploader onChange={setImages} />
      </div>

      <div className="bg-white dark:bg-[var(--color-pine)] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm space-y-3">
        <p className="text-[15px] font-bold text-[var(--foreground)]">O que você descreveria que não está nas fotos?</p>
        <textarea
          rows={3}
          maxLength={200}
          placeholder="Ex: jaqueta branca nike M"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-transparent border border-gray-200 dark:border-white/20 rounded-xl px-4 py-3.5 text-[14px] text-[var(--foreground)] outline-none focus:border-[var(--color-teal)] resize-none transition-colors"
        />
        <p className="text-[12px] text-gray-400 dark:text-sage">
          A IA vai preencher título, descrição, marca, categoria, condição e uma sugestão de preço, além disso, você pode editar tudo antes de publicar.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-5 py-4 text-[14px] font-medium text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleGenerate}
        className={cn(
          "w-full flex items-center justify-center gap-2 font-black py-4 rounded-full transition-opacity text-[16px] shadow-lg shadow-[var(--color-pine)]/20",
          canSubmit
            ? "bg-[var(--color-pine)] dark:bg-[var(--color-celadon)] text-white dark:text-[var(--color-pine)] hover:opacity-90"
            : "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-sage cursor-not-allowed shadow-none",
        )}
      >
        <Sparkles size={18} strokeWidth={2.5} />
        {loading ? "Analisando fotos..." : "Gerar com IA"}
      </button>
    </div>
  )
}
