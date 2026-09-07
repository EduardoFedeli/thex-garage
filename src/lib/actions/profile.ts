"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { profileSchema } from "@/lib/validators/profile"
import { addressSchema } from "@/lib/validators/address"
import { genderPreferenceSchema } from "@/lib/validators/auth"
import { revalidatePath } from "next/cache"

export type ProfileActionResult =
  | { success: true }
  | { success: false; error: string }

export async function updateProfileAction(formData: FormData): Promise<ProfileActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Não autenticado" }

  const rawPhone = formData.get("phone") as string
  const rawBio = formData.get("bio") as string
  const rawAvatarUrl = formData.get("avatarUrl") as string
  const rawGenderPref = formData.get("genderPreference") as string | null

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    bio: rawBio || undefined,
    phone: rawPhone || undefined,
    avatarUrl: rawAvatarUrl || undefined,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const genderPrefParsed = genderPreferenceSchema.safeParse(rawGenderPref || undefined)
  const genderPreference = genderPrefParsed.success ? (genderPrefParsed.data ?? null) : null

  const { name, bio, phone, avatarUrl } = parsed.data

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name,
      bio: bio ?? null,
      phone: phone ?? null,
      avatarUrl: avatarUrl ?? null,
      genderPreference,
    },
  })

  revalidatePath("/dashboard")
  revalidatePath(`/profile/${session.user.id}`)
  return { success: true }
}

export async function createAddressAction(formData: FormData): Promise<ProfileActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Não autenticado" }

  const rawComplement = formData.get("complement") as string

  const parsed = addressSchema.safeParse({
    label: formData.get("label"),
    street: formData.get("street"),
    number: formData.get("number"),
    complement: rawComplement || undefined,
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
    state: formData.get("state"),
    zipCode: formData.get("zipCode"),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" }
  }

  const { label, street, number, complement, neighborhood, city, state, zipCode } = parsed.data

  const existingCount = await db.address.count({ where: { userId: session.user.id } })

  await db.address.create({
    data: {
      userId: session.user.id,
      label,
      street,
      number,
      complement: complement ?? null,
      neighborhood,
      city,
      state: state.toUpperCase(),
      zipCode,
      isDefault: existingCount === 0,
    },
  })

  revalidatePath("/dashboard")
  return { success: true }
}

export async function deleteAddressAction(addressId: string): Promise<ProfileActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Não autenticado" }

  const address = await db.address.findUnique({
    where: { id: addressId },
    select: { userId: true, isDefault: true },
  })

  if (!address) return { success: false, error: "Endereço não encontrado" }
  if (address.userId !== session.user.id) return { success: false, error: "Sem permissão" }

  await db.address.delete({ where: { id: addressId } })

  // Se era o padrão, promover outro
  if (address.isDefault) {
    const first = await db.address.findFirst({ where: { userId: session.user.id } })
    if (first) {
      await db.address.update({ where: { id: first.id }, data: { isDefault: true } })
    }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function updateAvatarAction(url: string): Promise<ProfileActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Não autenticado" }
  await db.user.update({ where: { id: session.user.id }, data: { avatarUrl: url } })
  revalidatePath(`/profile/${session.user.id}`)
  revalidatePath("/vendas")
  revalidatePath("/perfil/perfil")
  return { success: true }
}

export async function updateCoverAction(url: string): Promise<ProfileActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Não autenticado" }
  await db.user.update({ where: { id: session.user.id }, data: { coverUrl: url } })
  revalidatePath(`/profile/${session.user.id}`)
  return { success: true }
}

export async function setDefaultAddressAction(addressId: string): Promise<ProfileActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Não autenticado" }

  const address = await db.address.findUnique({
    where: { id: addressId },
    select: { userId: true },
  })

  if (!address) return { success: false, error: "Endereço não encontrado" }
  if (address.userId !== session.user.id) return { success: false, error: "Sem permissão" }

  await db.$transaction([
    db.address.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } }),
    db.address.update({ where: { id: addressId }, data: { isDefault: true } }),
  ])

  revalidatePath("/dashboard")
  return { success: true }
}
