import { z } from "zod"

export const createListingSchema = z.object({
  title: z
    .string()
    .min(5, "Título deve ter pelo menos 5 caracteres")
    .max(45, "Título deve ter no máximo 45 caracteres"),
  description: z
    .string()
    .min(20, "Descrição deve ter pelo menos 20 caracteres")
    .max(600, "Descrição deve ter no máximo 600 caracteres"),
  priceCents: z
    .number()
    .int("Preço inválido")
    .min(500, "Preço mínimo é R$ 5,00")
    .max(10_000_000, "Preço máximo é R$ 100.000"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  brandId: z.string().max(50, "Marca deve ter no máximo 50 caracteres").optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"], {
    message: "Selecione a condição do produto",
  }),
  size: z.string().max(20, "Tamanho deve ter no máximo 20 caracteres").optional(),
  images: z
    .array(z.object({ url: z.string().url(), publicId: z.string() }))
    .min(1, "Adicione pelo menos 1 foto")
    .max(6, "Máximo de 6 fotos"),
  acceptsOffers: z.boolean(),
  acceptsDiscount: z.boolean(),
  isTurbinado: z.boolean().optional(),
  communityIds: z.array(z.string()).optional(),
})

export type CreateListingInput = z.infer<typeof createListingSchema>

export const aiListingDraftRequestSchema = z.object({
  images: z
    .array(z.object({ url: z.string().url(), publicId: z.string() }))
    .min(1, "Adicione pelo menos 1 foto")
    .max(6, "Máximo de 6 fotos"),
  note: z.string().max(200, "Descrição deve ter no máximo 200 caracteres").optional(),
})

export type AiListingDraftRequest = z.infer<typeof aiListingDraftRequestSchema>

// Mantido para updateListingAction existente
export const listingSchema = z.object({
  title: z.string().min(3, "Título deve ter pelo menos 3 caracteres").max(100, "Título muito longo"),
  description: z.string().min(10, "Descrição muito curta").max(2000, "Descrição muito longa"),
  priceCents: z.number().int("Preço inválido").positive("Preço deve ser positivo"),
  categoryId: z.string().min(1, "Categoria obrigatória"),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]),
  brand: z.string().max(50, "Marca muito longa").optional(),
  size: z.string().max(20, "Tamanho muito longo").optional(),
  imageUrls: z
    .array(z.string().url("URL de imagem inválida"))
    .min(1, "Adicione pelo menos 1 foto")
    .max(6, "Máximo 6 fotos"),
})

export type ListingFormValues = z.infer<typeof listingSchema>
