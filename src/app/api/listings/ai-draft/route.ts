import { NextRequest, NextResponse } from "next/server"
import { ApiError, GoogleGenAI, Type } from "@google/genai"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { aiListingDraftRequestSchema } from "@/lib/validators/listing"

interface CategoryRow {
  id: string
  name: string
  parentId: string | null
}

interface LeafCategory {
  id: string
  path: string
}

interface AiDraftResponse {
  title: string
  description: string
  brandName: string | null
  categoryPath: string | null
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR"
  sizeGuess: string | null
  priceSuggestion: { minCents: number; maxCents: number }
}

export interface AiListingDraft {
  ok: boolean
  title?: string
  description?: string
  brandId?: string
  categoryId?: string
  condition?: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR"
  sizeGuess?: string
  priceSuggestion?: { minCents: number; maxCents: number }
  error?: string
}

const CONDITION_GUIDE = `- NEW: novo, com etiqueta, nunca usado
- LIKE_NEW: seminovo, usado poucas vezes, sem defeitos visíveis
- GOOD: bom estado, pequenos sinais de uso
- FAIR: usado, sinais de uso visíveis (manchas, desgaste, bolinhas de tecido)`

const draftResponseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Título do anúncio, direto e sem emojis, até 45 caracteres" },
    description: {
      type: Type.STRING,
      description: "Descrição do produto (material, cor, estampa, estado de conservação percebido), 20 a 600 caracteres",
    },
    brandName: {
      type: Type.STRING,
      nullable: true,
      description: "Um nome EXATO da lista de marcas fornecida, ou null se não identificar com confiança",
    },
    categoryPath: {
      type: Type.STRING,
      nullable: true,
      description: "Um caminho EXATO da lista de categorias fornecida, ou null se não tiver certeza",
    },
    condition: { type: Type.STRING, enum: ["NEW", "LIKE_NEW", "GOOD", "FAIR"] },
    sizeGuess: {
      type: Type.STRING,
      nullable: true,
      description: "Tamanho ou numeração aparente nas fotos (ex: 'M', '39', '6 anos'), ou null",
    },
    priceSuggestion: {
      type: Type.OBJECT,
      properties: {
        minCents: { type: Type.INTEGER, description: "Preço mínimo sugerido, em centavos" },
        maxCents: { type: Type.INTEGER, description: "Preço máximo sugerido, em centavos" },
      },
      required: ["minCents", "maxCents"],
    },
  },
  required: ["title", "description", "condition", "priceSuggestion"],
}

function buildLeafCategoryPaths(categories: CategoryRow[]): LeafCategory[] {
  const parentIds = new Set(categories.filter((c) => c.parentId).map((c) => c.parentId as string))
  const byId = new Map(categories.map((c) => [c.id, c]))

  function pathFor(category: CategoryRow): string {
    const names = [category.name]
    let current = category
    while (current.parentId) {
      const parent = byId.get(current.parentId)
      if (!parent) break
      names.unshift(parent.name)
      current = parent
    }
    return names.join(" > ")
  }

  return categories.filter((c) => !parentIds.has(c.id)).map((c) => ({ id: c.id, path: pathFor(c) }))
}

async function imageUrlToInlineData(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const mimeType = res.headers.get("content-type") ?? "image/jpeg"
    const buffer = Buffer.from(await res.arrayBuffer())
    return { data: buffer.toString("base64"), mimeType }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = aiListingDraftRequestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json<AiListingDraft>({ ok: false, error: "IA indisponível no momento" })
  }

  const { images, note } = parsed.data

  const [categories, brands, imageParts] = await Promise.all([
    db.category.findMany({ select: { id: true, name: true, parentId: true } }),
    db.brand.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    Promise.all(images.map((img) => imageUrlToInlineData(img.url))),
  ])

  const validImageParts = imageParts.filter((p): p is { data: string; mimeType: string } => p !== null)
  if (validImageParts.length === 0) {
    return NextResponse.json<AiListingDraft>({ ok: false, error: "Não foi possível ler as fotos enviadas" })
  }

  const leafCategories = buildLeafCategoryPaths(categories)
  const categoryPaths = leafCategories.map((c) => c.path)
  const brandNames = brands.map((b) => b.name)

  const prompt = `Você é um assistente que ajuda vendedores a preencher um anúncio de produto usado (moda/desapego) no Kloop, marketplace brasileiro de seminovos.

Analise as fotos do produto e a observação do vendedor abaixo, e devolva um rascunho de anúncio em JSON.

Observação do vendedor (pode estar vazia): "${note ?? ""}"

Categorias disponíveis (escolha um valor EXATO desta lista para "categoryPath", ou null se nenhuma se encaixar com confiança):
${categoryPaths.map((p) => `- ${p}`).join("\n")}

Marcas disponíveis (escolha um valor EXATO desta lista para "brandName", ou null se não identificar a marca com confiança — NUNCA invente uma marca fora desta lista):
${brandNames.map((b) => `- ${b}`).join("\n")}

Guia de condição do produto:
${CONDITION_GUIDE}

Regras:
- title: até 45 caracteres, direto, sem emojis.
- description: entre 20 e 600 caracteres, descrevendo o que é visível nas fotos (material, cor, estampa, estado de conservação). Não invente detalhes que não dá pra ver ou que não foram ditos pelo vendedor.
- priceSuggestion: faixa de preço sugerida em CENTAVOS (ex: R$ 50,00 = 5000), baseada em categoria, marca e condição, para o mercado brasileiro de seminovos. É uma estimativa, não uma garantia.
- Se não tiver certeza de algum campo opcional, retorne null em vez de inventar.`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const model = process.env.GEMINI_MODEL || "gemini-3.6-flash"

    const requestParams = {
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            ...validImageParts.map((part) => ({ inlineData: part })),
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: draftResponseSchema,
      },
    }

    const RETRYABLE_STATUSES = new Set([429, 503])
    const maxAttempts = 3
    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | undefined
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        response = await ai.models.generateContent(requestParams)
        break
      } catch (err) {
        const isRetryable = err instanceof ApiError && RETRYABLE_STATUSES.has(err.status)
        if (!isRetryable || attempt === maxAttempts) throw err
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
    if (!response) {
      return NextResponse.json<AiListingDraft>({ ok: false, error: "A IA está sobrecarregada agora. Tente de novo em instantes." })
    }

    const text = response.text
    if (!text) {
      return NextResponse.json<AiListingDraft>({ ok: false, error: "A IA não retornou um resultado" })
    }

    const draft = JSON.parse(text) as AiDraftResponse

    const matchedCategory = draft.categoryPath
      ? leafCategories.find((c) => c.path.toLowerCase() === draft.categoryPath?.toLowerCase())
      : undefined
    const matchedBrand = draft.brandName
      ? brands.find((b) => b.name.toLowerCase() === draft.brandName?.toLowerCase())
      : undefined

    return NextResponse.json<AiListingDraft>({
      ok: true,
      title: draft.title,
      description: draft.description,
      brandId: matchedBrand?.id,
      categoryId: matchedCategory?.id,
      condition: draft.condition,
      sizeGuess: draft.sizeGuess ?? undefined,
      priceSuggestion: draft.priceSuggestion,
    })
  } catch (err) {
    console.error("Erro ao gerar rascunho de anúncio com IA", err)
    const isOverloaded = err instanceof ApiError && (err.status === 503 || err.status === 429)
    return NextResponse.json<AiListingDraft>({
      ok: false,
      error: isOverloaded
        ? "A IA está sobrecarregada agora. Tente de novo em instantes."
        : "Não foi possível gerar sugestões agora",
    })
  }
}
