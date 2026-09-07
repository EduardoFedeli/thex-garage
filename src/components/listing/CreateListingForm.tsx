"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils"
import { createListingSchema, type CreateListingInput } from "@/lib/validators/listing"
import { ImageUploader, type UploadedImage } from "@/components/create/ImageUploader"
import { CategoryPicker } from "@/components/create/CategoryPicker"
import { AiListingIntake } from "@/components/listing/AiListingIntake"
import type { AiListingDraft } from "@/app/api/listings/ai-draft/route"
import Link from "next/link"
import { Check, Camera, Package, Sparkles } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string
  name: string
  parentId: string | null
}

interface CreateListingFormProps {
  activeCount: number
  maxListings: number
  planName: string
  categories: Category[]
}

interface Brand {
  id: string
  name: string
}


interface UserCommunityOption {
  id: string
  name: string
  unitNumber: string | null
}

interface CreateListingFormProps {
  activeCount: number
  maxListings: number
  planName: string
  categories: Category[]
  brands: Brand[]
  userCommunities?: UserCommunityOption[]
}
// ─── Static data ──────────────────────────────────────────────────────────────



const CONDITIONS = [
  { value: "NEW" as const, label: "Novo", desc: "Com etiqueta, nunca usado" },
  { value: "LIKE_NEW" as const, label: "Seminovo", desc: "Usado poucas vezes, sem defeitos" },
  { value: "GOOD" as const, label: "Bom estado", desc: "Pequenos sinais de uso" },
  { value: "FAIR" as const, label: "Usado", desc: "Sinais de uso visíveis" },
]

const WEIGHTS = [
  "0,5 kg", "1,0 kg", "2,0 kg",
  "3,0 kg", "4,0 kg", "5,0 kg", "6,0 kg", "Acima de 6 kg",
]

// ─── Size helpers ─────────────────────────────────────────────────────────────

const ADULT_CLOTHING = ["PP", "P", "M", "G", "GG", "XG", "XGG", "Único"]
const ADULT_SHOES = Array.from({ length: 14 }, (_, i) => String(33 + i))
const KIDS_CLOTHING = [
  "RN", "0–3m", "3–6m", "6–9m", "9–12m",
  "1 ano", "2 anos", "4 anos", "6 anos", "8 anos", "10 anos", "12 anos", "14 anos",
]
const KIDS_SHOES = Array.from({ length: 22 }, (_, i) => String(14 + i))

type SizeContext = { show: false } | { show: true; label: string; options: string[] }

function getSizeContext(deptName: string, catName: string): SizeContext {
  const dept = deptName.toLowerCase()
  const cat = catName.toLowerCase()
  if (dept === "moças" || dept === "rapazes") {
    if (cat === "roupas") return { show: true, label: "Tamanho", options: ADULT_CLOTHING }
    if (cat === "calçados") return { show: true, label: "Número", options: ADULT_SHOES }
  }
  if (dept === "crianças") {
    if (cat === "meninas" || cat === "meninos") return { show: true, label: "Tamanho", options: KIDS_CLOTHING }
    if (cat === "calçados") return { show: true, label: "Número", options: KIDS_SHOES }
  }
  return { show: false }
}

// ─── Price helpers ────────────────────────────────────────────────────────────

const COMMISSION_RATE = 0.14
const FIXED_FEE = 7.5

function fmtBRL(val: number): string {
  return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function SectionCard({ title, action, children }: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-[var(--color-pine)] rounded-2xl p-5 border border-gray-100 dark:border-white/5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-bold text-[var(--foreground)]">{title}</p>
        {action}
      </div>
      {children}
    </div>
  )
}

function SelectField({ placeholder, value, options, onChange }: {
  placeholder: string; value: string; options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full bg-transparent border rounded-xl px-4 py-3.5 text-[14px] text-[var(--foreground)] outline-none focus:border-[var(--color-teal)] transition-colors appearance-none cursor-pointer",
          !value ? "border-gray-200 dark:border-white/20 text-gray-400 dark:text-sage" : "border-gray-200 dark:border-white/20",
        )}
      >
        <option value="" disabled className="bg-white dark:bg-[var(--color-pine)] text-gray-400">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-white dark:bg-[var(--color-pine)] text-[var(--foreground)]">{opt}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400 dark:text-sage">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

function Toggle({ label, desc, checked, onChange }: {
  label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="py-1">
      <button type="button" onClick={() => onChange(!checked)} className="flex items-center justify-between w-full text-left">
        <span className="text-[14px] font-bold text-[var(--foreground)]">{label}</span>
        <div className={cn("relative w-12 h-7 rounded-full transition-colors flex-shrink-0", checked ? "bg-[var(--color-pine)] dark:bg-[var(--color-celadon)]" : "bg-gray-200 dark:bg-white/10")}>
          <div className={cn("absolute top-1 w-5 h-5 bg-white dark:bg-[var(--color-forest)] rounded-full shadow transition-all", checked ? "left-6" : "left-1")} />
        </div>
      </button>
      {desc && checked && <p className="text-[13px] text-gray-500 dark:text-sage mt-2 leading-relaxed pr-8">{desc}</p>}
    </div>
  )
}

function BrandInput({ value, onChange, disabled, availableBrands }: { value: string; onChange: (v: string) => void; disabled: boolean, availableBrands: Brand[] }) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(() => {
    // Inicializa o input visual com o nome da marca caso estejamos editando
    const b = availableBrands.find(b => b.id === value)
    return b ? b.name : ""
  })

  // Filtra pelo nome digitado
  const filtered = searchTerm.length > 0 
    ? availableBrands.filter((b) => b.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5) 
    : []

  return (
    <div className="relative">
      <input
        type="text"
        disabled={disabled}
        placeholder={disabled ? "Sem marca" : "Ex: Nike, Zara, Farm..."}
        value={disabled ? "" : searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          onChange("") // Limpa o ID se o usuário voltar a digitar
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={cn(
          "w-full bg-transparent border rounded-xl px-4 py-3.5 text-[14px] outline-none transition-colors",
          disabled ? "bg-gray-50 dark:bg-white/5 text-gray-400 cursor-not-allowed border-gray-200 dark:border-white/10" : "border-gray-200 dark:border-white/20 focus:border-[var(--color-teal)] text-[var(--foreground)]",
        )}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 w-full bg-white dark:bg-[var(--color-pine)] border border-gray-100 dark:border-white/20 rounded-xl mt-2 shadow-xl max-h-48 overflow-y-auto overflow-hidden">
          {filtered.map((brand) => (
            <li 
              key={brand.id} 
              onMouseDown={() => { 
                onChange(brand.id) // Salva o ID no formulário
                setSearchTerm(brand.name) // Mostra o nome pro usuário
                setOpen(false) 
              }} 
              className="px-4 py-3 text-[14px] text-[var(--foreground)] hover:bg-gray-50 dark:hover:bg-white/10 cursor-pointer transition-colors border-b border-gray-50 dark:border-white/5 last:border-0"
            >
              {brand.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ConditionCards({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {CONDITIONS.map((c) => {
          const isSelected = value === c.value
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onChange(c.value)}
              className={cn(
                "text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden",
                isSelected ? "border-[var(--color-pine)] dark:border-[var(--color-celadon)] bg-[var(--color-teal)]/5 dark:bg-white/5" : "border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20",
              )}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 text-[var(--color-pine)] dark:text-[var(--color-celadon)]">
                  <Check size={16} strokeWidth={3} />
                </div>
              )}
              <p className={cn("text-[14px] font-bold mb-1", isSelected ? "text-[var(--color-pine)] dark:text-[var(--color-celadon)]" : "text-[var(--foreground)]")}>{c.label}</p>
              <p className="text-[12px] text-gray-500 dark:text-sage pr-4 leading-relaxed">{c.desc}</p>
            </button>
          )
        })}
      </div>
      {error && <p className="text-[12px] text-red-500 pl-1 font-medium">{error}</p>}
    </div>
  )
}

function ModeCards({ value, onChange }: { value: string; onChange: (v: "classico" | "turbinado") => void }) {
  const modes = [
    { key: "classico" as const, label: "Clássico", desc: "Anúncio padrão gratuito", icon: "☁️" },
    { key: "turbinado" as const, label: "Combo", desc: "Desconto automático para quem leva mais de uma peça sua", icon: "⚡" },
  ]
  return (
    <div className="grid grid-cols-2 gap-3">
      {modes.map((m) => {
        const isSelected = value === m.key
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            className={cn(
              "relative text-left p-4 rounded-xl border-2 transition-all",
              isSelected
                ? "border-[var(--color-pine)] dark:border-[var(--color-celadon)] bg-[var(--color-teal)]/5 dark:bg-white/5"
                : "border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20",
            )}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 text-[var(--color-pine)] dark:text-[var(--color-celadon)]">
                <Check size={16} strokeWidth={3} />
              </div>
            )}
            <span className="text-2xl mb-2 block">{m.icon}</span>
            <p className={cn("text-[14px] font-bold mb-1", isSelected ? "text-[var(--color-pine)] dark:text-[var(--color-celadon)]" : "text-[var(--foreground)]")}>
              {m.label}
            </p>
            <p className="text-[12px] text-gray-500 dark:text-sage leading-tight pr-6">{m.desc}</p>
          </button>
        )
      })}
    </div>
  )
}

function Toast({ message }: { message: string }) {
  if (!message) return null
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[var(--color-pine)] dark:bg-[var(--color-celadon)] text-white dark:text-[var(--color-pine)] text-[14px] font-bold px-6 py-3.5 rounded-full shadow-2xl z-50 animate-in fade-in slide-in-from-top-4 duration-300 whitespace-nowrap">
      {message}
    </div>
  )
}

function ValorAReceberModal({ priceCents, onClose }: { priceCents: number; onClose: () => void }) {
  const priceNum = priceCents / 100
  const commission = priceNum * COMMISSION_RATE
  const received = Math.max(0, priceNum - commission - FIXED_FEE)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0" onClick={onClose}>
      <div className="bg-white dark:bg-[var(--color-forest)] rounded-3xl w-full sm:max-w-sm p-6 space-y-6 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <p className="font-black text-[var(--foreground)] text-[18px]">valor a receber</p>
          <p className="text-[13px] text-gray-500 dark:text-sage mt-1">Transparência nas taxas do seu plano</p>
        </div>
        <div className="space-y-3 text-[14px]">
          <div className="flex justify-between text-[var(--foreground)]"><span>valor do produto</span><span className="font-bold">R$ {fmtBRL(priceNum)}</span></div>
          <div className="flex justify-between text-gray-500 dark:text-sage"><span>comissão ({Math.round(COMMISSION_RATE * 100)}%)</span><span className="text-red-500 font-medium">- R$ {fmtBRL(commission)}</span></div>
          <div className="flex justify-between text-gray-500 dark:text-sage"><span>tarifa fixa</span><span className="text-red-500 font-medium">- R$ {fmtBRL(FIXED_FEE)}</span></div>
          <hr className="border-gray-200 dark:border-white/10 my-4" />
          <div className="flex justify-between font-black text-[var(--color-pine)] dark:text-[var(--color-celadon)] text-[16px]"><span>receba até</span><span>R$ {fmtBRL(received)}</span></div>
        </div>
        <p className="text-[12px] text-gray-400 dark:text-sage/70 text-center leading-relaxed px-4">o valor a receber pode mudar caso você faça negociações, aceite ofertas ou ofereça descontos.</p>
        <button type="button" onClick={onClose} className="w-full border-2 border-[var(--color-pine)] dark:border-[var(--color-celadon)] text-[var(--color-pine)] dark:text-[var(--color-celadon)] font-bold py-3.5 rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-[14px]">ok, entendi</button>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function CreateListingForm({ activeCount, maxListings, planName, categories, brands, userCommunities = [] }: CreateListingFormProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | "ai" | 2>(1)
  const [toast, setToast] = useState("")
  const [serverError, setServerError] = useState("")
  const [showValorModal, setShowValorModal] = useState(false)

  // UI-only state not part of the validated schema
  const [priceDisplay, setPriceDisplay] = useState("")
  const [noBrand, setNoBrand] = useState(false)
  const [acceptsOffers, setAcceptsOffers] = useState(false)
  const [acceptsDiscount, setAcceptsDiscount] = useState(false)
  const [mode, setMode] = useState<"classico" | "turbinado">("classico")
  const [weight, setWeight] = useState("")
  const [size, setSize] = useState("")
  const [sizeCtx, setSizeCtx] = useState<SizeContext>({ show: false })
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>([])
  const [aiImages, setAiImages] = useState<UploadedImage[]>([])
  const [aiPriceSuggestion, setAiPriceSuggestion] = useState<{ minCents: number; maxCents: number } | null>(null)

  const hasReachedLimit = maxListings !== -1 && activeCount >= maxListings

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: "",
      description: "",
      priceCents: 0,
      categoryId: "",
      brandId: "",
      condition: undefined,
      size: "",
      images: [],
      acceptsOffers: false,
      acceptsDiscount: false,
      isTurbinado: false,
    },
  })

  const watchedTitle = watch("title")
  const watchedDescription = watch("description")
  const watchedCondition = watch("condition")
  const watchedCategoryId = watch("categoryId")
  const watchedPriceCents = watch("priceCents")

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 3500)
  }

  const handlePriceInput = (raw: string) => {
    const digits = raw.replace(/\D/g, "")
    if (!digits) {
      setPriceDisplay("")
      setValue("priceCents", 0, { shouldValidate: true })
      return
    }
    const cents = parseInt(digits, 10)
    const formatted = (cents / 100).toFixed(2).replace(".", ",")
    setPriceDisplay(formatted)
    setValue("priceCents", cents, { shouldValidate: true })
  }

  const handleCategoryChange = useCallback(
    (categoryId: string, deptName: string, catName: string) => {
      setValue("categoryId", categoryId, { shouldValidate: true })
      setSizeCtx(getSizeContext(deptName, catName))
      setSize("")
      setValue("size", "")
    },
    [setValue],
  )

  function resolveSizeContextForCategory(categoryId: string): SizeContext {
    const byId = new Map(categories.map((c) => [c.id, c]))
    const chain: Category[] = []
    let current = byId.get(categoryId)
    while (current) {
      chain.unshift(current)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return getSizeContext(chain[0]?.name ?? "", chain[1]?.name ?? "")
  }

  function handleAiComplete(draft: AiListingDraft, images: UploadedImage[]) {
    setAiImages(images)
    setValue("images", images, { shouldValidate: true })
    if (draft.title) setValue("title", draft.title, { shouldValidate: true })
    if (draft.description) setValue("description", draft.description, { shouldValidate: true })
    if (draft.brandId) setValue("brandId", draft.brandId, { shouldValidate: true })
    if (draft.condition) setValue("condition", draft.condition, { shouldValidate: true })
    if (draft.categoryId) {
      setValue("categoryId", draft.categoryId, { shouldValidate: true })
      const ctx = resolveSizeContextForCategory(draft.categoryId)
      setSizeCtx(ctx)
      if (draft.sizeGuess && ctx.show) {
        const match = ctx.options.find((o) => o.toLowerCase() === draft.sizeGuess?.toLowerCase())
        if (match) {
          setSize(match)
          setValue("size", match)
        }
      }
    }
    setAiPriceSuggestion(draft.priceSuggestion ?? null)
    if (!draft.ok) {
      showToast(draft.error ?? "Não foi possível gerar sugestões. Preencha os campos manualmente.")
    }
    setStep(2)
  }

  const onSubmit = async (data: CreateListingInput) => {
    setServerError("")
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          size: sizeCtx.show ? size : undefined,
          acceptsOffers,
          acceptsDiscount,
          isTurbinado: mode === "turbinado",
          communityIds: selectedCommunityIds,
        }),
      })
      const json = (await res.json()) as { slug?: string; error?: string }
      if (!res.ok) {
        setServerError(json.error ?? "Erro ao criar anúncio")
        return
      }
      if (json.slug) {
        router.push(`/listing/${json.slug}`)
      }
    } catch {
      setServerError("Erro de conexão. Tente novamente.")
    }
  }

  // ── Step 1: Choose action ─────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="max-w-xl mx-auto space-y-4 mt-2">
        <Toast message={toast} />
        <button
          type="button"
          onClick={() => {
            if (hasReachedLimit) {
              showToast(`Você atingiu o limite de ${maxListings} anúncios do plano ${planName}.`)
              return
            }
            setStep(2)
          }}
          className="w-full bg-white dark:bg-[var(--color-pine)] border-2 border-transparent hover:border-[var(--color-teal)] dark:hover:border-[var(--color-celadon)] rounded-3xl p-6 text-left transition-all shadow-sm group"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-teal)]/10 dark:bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-teal)]/20 transition-colors">
              <Camera className="w-7 h-7 text-[var(--color-teal)] dark:text-[var(--color-celadon)]" strokeWidth={2} />
            </div>
            <div>
              <p className="font-black text-[var(--foreground)] text-[18px]">criar anúncio</p>
              <p className="text-[14px] text-gray-500 dark:text-sage mt-1">Desapegue de um produto do seu armário</p>
              {maxListings !== -1 && (
                <p className="text-[12px] text-[var(--color-teal)] dark:text-[var(--color-celadon)] font-bold mt-2">
                  {activeCount} de {maxListings} anúncios ativos no plano {planName}
                </p>
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (hasReachedLimit) {
              showToast(`Você atingiu o limite de ${maxListings} anúncios do plano ${planName}.`)
              return
            }
            setStep("ai")
          }}
          className="w-full bg-white dark:bg-[var(--color-pine)] border-2 border-transparent hover:border-[var(--color-teal)] dark:hover:border-[var(--color-celadon)] rounded-3xl p-6 text-left transition-all shadow-sm group"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-teal)]/10 dark:bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-teal)]/20 transition-colors">
              <Sparkles className="w-7 h-7 text-[var(--color-teal)] dark:text-[var(--color-celadon)]" strokeWidth={2} />
            </div>
            <div>
              <p className="font-black text-[var(--foreground)] text-[18px]">criar com IA</p>
              <p className="text-[14px] text-gray-500 dark:text-sage mt-1">Suba as fotos e a IA sugere título, descrição e mais</p>
            </div>
          </div>
        </button>

        <Link
          href="/pro"
          className="w-full bg-white dark:bg-[var(--color-pine)] border-2 border-transparent hover:border-[var(--color-teal)] dark:hover:border-[var(--color-celadon)] rounded-3xl p-6 text-left transition-all shadow-sm group block"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-teal)]/10 dark:bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-teal)]/20 transition-colors">
              <Package className="w-7 h-7 text-[var(--color-teal)] dark:text-[var(--color-celadon)]" strokeWidth={2} />
            </div>
            <div>
              <p className="font-black text-[var(--foreground)] text-[18px]">kloop shop</p>
              <p className="text-[14px] text-gray-500 dark:text-sage mt-1">Envie uma sacola e a gente vende por você</p>
            </div>
          </div>
        </Link>
      </div>
    )
  }

  // ── Step "ai": AI-assisted intake ─────────────────────────────────────────
  if (step === "ai") {
    return (
      <>
        <Toast message={toast} />
        <AiListingIntake onBack={() => setStep(1)} onComplete={handleAiComplete} />
      </>
    )
  }

  // ── Step 2: Listing form ──────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-5 pb-12 mt-2">
      <Toast message={toast} />

      {showValorModal && (
        <ValorAReceberModal priceCents={watchedPriceCents} onClose={() => setShowValorModal(false)} />
      )}

      <div className="flex items-center gap-4 mb-2 pl-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-[var(--color-pine)] shadow-sm text-[var(--foreground)] hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-black text-[var(--foreground)] text-[20px]">detalhes do produto</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

        {/* Photos */}
        <SectionCard title="Fotos *">
          <Controller
            name="images"
            control={control}
            render={({ field, fieldState }) => (
              <ImageUploader
                onChange={field.onChange}
                error={fieldState.error?.message}
                initialImages={aiImages.length > 0 ? aiImages : undefined}
              />
            )}
          />
        </SectionCard>

        {/* Title */}
        <SectionCard title="Título *">
          <div className="relative">
            <input
              type="text"
              maxLength={45}
              placeholder="Ex: Jaqueta jeans vintage azul escuro..."
              {...register("title")}
              className={cn(
                "w-full bg-transparent border rounded-xl px-4 py-3.5 text-[14px] text-[var(--foreground)] outline-none focus:border-[var(--color-teal)] pr-14 transition-colors",
                errors.title ? "border-red-400" : "border-gray-200 dark:border-white/20",
              )}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-gray-400 dark:text-sage font-medium">
              {watchedTitle.length}/45
            </span>
          </div>
          {errors.title && (
            <p className="text-[12px] text-red-500 pl-1 font-medium">{errors.title.message}</p>
          )}
        </SectionCard>

        {/* Description */}
        <SectionCard title="Descrição *">
          <div className="relative">
            <textarea
              rows={5}
              maxLength={600}
              placeholder="Conte todos os detalhes da peça. Qual é o tecido? Tem alguma avaria? Como fica no corpo?"
              {...register("description")}
              className={cn(
                "w-full bg-transparent border rounded-xl px-4 py-3.5 text-[14px] text-[var(--foreground)] outline-none focus:border-[var(--color-teal)] resize-none transition-colors",
                errors.description ? "border-red-400" : "border-gray-200 dark:border-white/20",
              )}
            />
            <span className="absolute right-4 bottom-4 text-[12px] text-gray-400 dark:text-sage font-medium bg-white dark:bg-[var(--color-pine)] px-1">
              {watchedDescription.length}/600
            </span>
          </div>
          {errors.description && (
            <p className="text-[12px] text-red-500 pl-1 font-medium">{errors.description.message}</p>
          )}
        </SectionCard>

        {/* Brand */}
        <SectionCard title="Marca">
          <BrandInput
            availableBrands={brands} // Passa as marcas recebidas da prop
            value={watch("brandId") ?? ""} // Usa brandId
            onChange={(v) => setValue("brandId", v, { shouldValidate: true })}
            disabled={noBrand}
          />
          <label className="flex items-center gap-3 mt-3 cursor-pointer p-1">
            <div className={cn("w-5 h-5 rounded border flex items-center justify-center transition-colors", noBrand ? "bg-[var(--color-pine)] dark:bg-[var(--color-celadon)] border-transparent" : "border-gray-300 dark:border-white/30")}>
              {noBrand && <Check size={14} className="text-white dark:text-[var(--color-pine)]" strokeWidth={3} />}
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={noBrand}
              onChange={(e) => {
                setNoBrand(e.target.checked)
                if (e.target.checked) {
                   setValue("brandId", "")
                }
              }}
            />
            <span className="text-[14px] text-gray-600 dark:text-sage select-none">Esta peça não possui marca</span>
          </label>
        </SectionCard>

        {/* Condition */}
        <SectionCard title="Condição *">
          <ConditionCards
            value={watchedCondition ?? ""}
            onChange={(v) => setValue("condition", v as CreateListingInput["condition"], { shouldValidate: true })}
            error={errors.condition?.message}
          />
        </SectionCard>

        {/* Category */}
        <SectionCard title="Categoria *">
          <CategoryPicker
            categories={categories}
            value={watchedCategoryId}
            onChange={handleCategoryChange}
            error={errors.categoryId?.message}
          />
        </SectionCard>

        {/* Communities — only when user is member of at least one */}
        {userCommunities.length > 0 && (
          <SectionCard title="Comunidades">
            <p className="text-[13px] text-gray-500 dark:text-sage mb-3 leading-relaxed">
              Marque as comunidades onde você quer que este anúncio apareça. Ele continua visível no feed público.
            </p>
            <div className="space-y-2">
              {userCommunities.map((c) => {
                const checked = selectedCommunityIds.includes(c.id)
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-100 dark:border-white/10 hover:border-[var(--color-teal)] dark:hover:border-[var(--color-celadon)] transition-colors"
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        checked
                          ? "bg-[var(--color-teal)] border-[var(--color-teal)]"
                          : "border-gray-300 dark:border-white/30",
                      )}
                    >
                      {checked && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={checked}
                      onChange={() =>
                        setSelectedCommunityIds((prev) =>
                          prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                        )
                      }
                    />
                    <div>
                      <p className="text-[14px] font-bold text-[var(--foreground)]">{c.name}</p>
                      {c.unitNumber && (
                        <p className="text-[12px] text-gray-400 dark:text-sage">{c.unitNumber}</p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* Size — only when category context provides options */}
        {sizeCtx.show && (
          <SectionCard title={sizeCtx.label}>
            <SelectField
              placeholder={`Selecione o ${sizeCtx.label.toLowerCase()}`}
              value={size}
              options={sizeCtx.options}
              onChange={(v) => { setSize(v); setValue("size", v) }}
            />
          </SectionCard>
        )}

        {/* Price */}
        <SectionCard
          title="Preço *"
          action={
            <button
              type="button"
              onClick={() => setShowValorModal(true)}
              className="text-[12px] font-bold text-[var(--color-teal)] dark:text-[var(--color-celadon)] hover:underline underline-offset-2"
            >
              entenda suas taxas
            </button>
          }
        >
          <div className={cn(
            "flex items-center border rounded-xl overflow-hidden focus-within:border-[var(--color-teal)] transition-colors",
            errors.priceCents ? "border-red-400" : "border-gray-200 dark:border-white/20",
          )}>
            <span className="px-4 py-3.5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-sage font-bold text-[14px] border-r border-gray-200 dark:border-white/10 select-none">
              R$
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={priceDisplay}
              onChange={(e) => handlePriceInput(e.target.value)}
              className="flex-1 px-4 py-3.5 text-[16px] outline-none font-black text-[var(--foreground)] bg-transparent"
            />
          </div>
          {errors.priceCents && (
            <p className="text-[12px] text-red-500 pl-1 font-medium">{errors.priceCents.message}</p>
          )}
          {aiPriceSuggestion && (
            <div className="flex items-center justify-between gap-3 bg-[var(--color-teal)]/8 dark:bg-[var(--color-teal)]/10 border border-[var(--color-teal)]/20 rounded-xl px-4 py-3 mt-1">
              <p className="text-[12px] text-[var(--foreground)] leading-relaxed">
                <span className="font-bold">sugestão da IA:</span>{' '}
                R$ {fmtBRL(aiPriceSuggestion.minCents / 100)} – R$ {fmtBRL(aiPriceSuggestion.maxCents / 100)}
                <br />
                <span className="text-gray-500 dark:text-sage">não é garantia de venda, ajuste como preferir.</span>
              </p>
              <button
                type="button"
                onClick={() => handlePriceInput(String(Math.round((aiPriceSuggestion.minCents + aiPriceSuggestion.maxCents) / 2)))}
                className="flex-shrink-0 text-[12px] font-bold text-[var(--color-teal)] dark:text-[var(--color-celadon)] hover:underline underline-offset-2 whitespace-nowrap"
              >
                usar valor médio
              </button>
            </div>
          )}
          {watchedPriceCents > 0 && !errors.priceCents && (
            <p className="text-[12px] text-[var(--color-teal)] dark:text-[var(--color-celadon)] font-medium mt-1 pl-1">
              você recebe até{' '}
              <span className="font-black">
                R$ {fmtBRL(Math.max(0, (watchedPriceCents / 100) * (1 - COMMISSION_RATE) - FIXED_FEE))}
              </span>
              {' '}após taxas
            </p>
          )}
          <hr className="border-gray-100 dark:border-white/5 my-2" />
          <div className="space-y-4 pt-2">
            <Toggle
              label="Topa negociar?"
              desc="Compradores poderão fazer ofertas pelo seu produto."
              checked={acceptsOffers}
              onChange={setAcceptsOffers}
            />
            <div className="py-1">
              <button type="button" onClick={() => setAcceptsDiscount(!acceptsDiscount)} className="flex items-center justify-between w-full text-left">
                <span className="text-[14px] font-bold text-[var(--foreground)]">Queda de preço progressiva</span>
                <div className={cn("relative w-12 h-7 rounded-full transition-colors flex-shrink-0", acceptsDiscount ? "bg-[var(--color-pine)] dark:bg-[var(--color-celadon)]" : "bg-gray-200 dark:bg-white/10")}>
                  <div className={cn("absolute top-1 w-5 h-5 bg-white dark:bg-[var(--color-forest)] rounded-full shadow transition-all", acceptsDiscount ? "left-6" : "left-1")} />
                </div>
              </button>
              <p className="text-[12px] text-gray-400 dark:text-sage mt-1 leading-relaxed pr-14">
                o kloop reduz o preço automaticamente conforme os dias passam sem venda.
              </p>
              {acceptsDiscount && (
                <div className="mt-3 bg-[var(--color-teal)]/8 dark:bg-[var(--color-teal)]/10 border border-[var(--color-teal)]/20 rounded-xl p-3.5">
                  <div className="grid grid-cols-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-sage/60 pb-2 border-b border-[var(--color-teal)]/15">
                    <span>período</span>
                    <span className="text-center">desconto</span>
                    <span className="text-right">você recebe</span>
                  </div>
                  {([
                    { days: '15 dias', pct: 15 },
                    { days: '22 dias', pct: 25 },
                    { days: '30 dias', pct: 32 },
                    { days: '37 dias', pct: 40 },
                  ] as const).map(({ days, pct }) => {
                    const discountedVal = watchedPriceCents > 0 ? (watchedPriceCents / 100) * (1 - pct / 100) : null
                    const sellerVal = discountedVal !== null ? Math.max(0, discountedVal * (1 - COMMISSION_RATE) - FIXED_FEE) : null
                    return (
                      <div key={days} className="grid grid-cols-3 py-2 border-b border-[var(--color-teal)]/10 last:border-0 items-center">
                        <span className="text-[11px] text-gray-500 dark:text-sage">após {days}</span>
                        <span className="text-[11px] font-black text-[var(--color-teal)] dark:text-[var(--color-celadon)] text-center">−{pct}%</span>
                        <span className="text-[11px] font-bold text-[var(--foreground)] text-right">
                          {sellerVal !== null ? `R$ ${fmtBRL(sellerVal)}` : '—'}
                        </span>
                      </div>
                    )
                  })}
                  <p className="text-[10px] text-gray-400 dark:text-sage/70 leading-relaxed mt-2.5">
                    valores já com comissão (14%) e tarifa fixa (R$ 7,50) deduzidas.
                  </p>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Mode */}
        <SectionCard title="Modo do anúncio">
          <ModeCards value={mode} onChange={setMode} />
        </SectionCard>

        {/* Delivery */}
        <SectionCard title="Envio">
          <div className="space-y-3">
            <div>
              <p className="text-[13px] text-gray-500 dark:text-sage mb-2 font-medium">Peso estimado</p>
              <SelectField placeholder="Selecione o peso" value={weight} options={WEIGHTS} onChange={setWeight} />
            </div>
            <p className="text-[12px] text-gray-400 dark:text-sage/70 leading-relaxed">
              📦 No Kloop, todas as vendas são enviadas por transportadoras parceiras. Entregas em mãos não são permitidas.
            </p>
          </div>
        </SectionCard>

        {/* Server error */}
        {serverError && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-5 py-4 text-[14px] font-medium text-red-600 dark:text-red-400">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[var(--color-pine)] dark:bg-[var(--color-celadon)] text-white dark:text-[var(--color-pine)] font-black py-4 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-[16px] mt-4 shadow-lg shadow-[var(--color-pine)]/20"
        >
          {isSubmitting ? "Publicando seu anúncio..." : "Publicar anúncio"}
        </button>
      </form>
    </div>
  )
}
