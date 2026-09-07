"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Camera, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateAvatarAction } from "@/lib/actions/profile"

interface Props {
  currentAvatarUrl: string | null
  initials: string
  size?: number
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 5 * 1024 * 1024

export function AvatarUploader({ currentAvatarUrl, initials, size = 84 }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Use JPEG, PNG ou WebP.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo muito grande. Máximo 5MB.")
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch("/api/upload/image", { method: "POST", body: formData })
      const uploadData = (await uploadRes.json()) as { url?: string; error?: string }
      if (!uploadRes.ok || !uploadData.url) {
        throw new Error(uploadData.error ?? "Erro no upload")
      }

      const result = await updateAvatarAction(uploadData.url)
      if (!result.success) throw new Error(result.error)

      setPreview(uploadData.url)
      toast.success("Foto de perfil atualizada!")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar a foto")
      setPreview(currentAvatarUrl)
    } finally {
      setIsUploading(false)
      URL.revokeObjectURL(previewUrl)
    }
  }

  return (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={isUploading}
      className="group relative rounded-full border-[3px] border-white dark:border-[var(--color-pine)] bg-[var(--color-frosted)] dark:bg-[var(--color-forest)] flex items-center justify-center overflow-hidden shadow-lg ring-4 ring-white/40 dark:ring-black/20 shrink-0"
      style={{ width: size, height: size }}
      aria-label="Alterar foto de perfil"
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Foto de perfil" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[20px] font-black text-[var(--color-teal)] dark:text-[var(--color-celadon)]">{initials}</span>
      )}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity",
          isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        {isUploading ? (
          <Loader2 size={18} className="text-white animate-spin" />
        ) : (
          <Camera size={18} className="text-white" />
        )}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </button>
  )
}
