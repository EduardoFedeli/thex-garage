"use client"

import { useState } from "react"
import Link from "next/link"
import { AuthModal } from "@/components/auth/AuthModal"
import { signOut } from "next-auth/react"
import { User, LogOut, Settings, Package, ChevronDown, Crown, Monitor } from "lucide-react"

interface HeaderAuthProps {
  user?: {
    id?: string | null
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function HeaderAuth({ user }: HeaderAuthProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  function closeMenu() {
    setIsMenuOpen(false)
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-full border border-airforce px-4 py-2 text-sm font-bold text-airforce transition-colors hover:bg-airforce hover:text-white"
          >
            Entrar
          </button>
          {/* Transformado em botão para abrir o modal de login */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-full bg-teal px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-airforce"
          >
            Vender
          </button>
        </div>
        <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    )
  }

  // Usuário logado
  const initials = user.name?.substring(0, 2).toUpperCase() || "US"

  return (
    <div className="relative flex items-center gap-3">
      <Link
        href="/create"
        className="hidden sm:block rounded-full bg-teal px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-airforce"
      >
        Vender
      </Link>

      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 rounded-full border border-gray-200 p-1 pr-2 transition-colors hover:bg-gray-50"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt={user.name || "Avatar"} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">
            {initials}
          </div>
        )}
        <ChevronDown className="h-4 w-4 text-airforce" />
      </button>

      {isMenuOpen && (
        <>
          {/* Overlay para fechar ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeMenu}
            aria-hidden="true"
          />

          <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
            <div className="px-4 py-2 border-b border-gray-50 mb-1">
              <p className="text-sm font-bold text-airforce truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>

            <Link
              href="/perfil/perfil"
              onClick={closeMenu}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-airforce hover:bg-gray-50"
            >
              <User className="h-4 w-4" /> Meu perfil
            </Link>
            <Link
              href={`/profile/${user?.id}`}
              onClick={closeMenu}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-airforce hover:bg-gray-50"
            >
              <Package className="h-4 w-4" /> Minha loja
            </Link>
            <Link
              href="/assinatura"
              onClick={closeMenu}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-airforce hover:bg-gray-50"
            >
              <Crown className="h-4 w-4" /> Minha assinatura
            </Link>
            <Link
              href="/dashboard"
              onClick={closeMenu}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-airforce hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" /> Configurações
            </Link>

            <Link
              href="/totem-access"
              onClick={closeMenu}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-airforce hover:bg-gray-50"
            >
              <Monitor className="h-4 w-4" /> Acesso ao totem
            </Link>

            <div className="my-1 h-px bg-gray-100" />

            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </>
      )}
    </div>
  )
}