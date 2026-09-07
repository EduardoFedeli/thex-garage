"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, Bell, HelpCircle, ShoppingBag, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { HeaderAuth } from "./HeaderAuth"
import { usePathname } from "next/navigation"
import { GlobalSearchBar } from "../search/GlobalSearchBar"
import { AuthModal } from "@/components/auth/AuthModal"
import { useCartStore } from "@/store/cart"
import { useDragScroll } from "@/lib/hooks/useDragScroll"

// ── Static nav structure ───────────────────────────────────────────────────

interface NavCat { name: string; subcats: string[] }
interface MainDept { key: string; label: string; cats: NavCat[] }
interface OtherDept { key: string; label: string; cats: string[] }

const MAIN: MainDept[] = [
  {
    key: "mocas", label: "feminino",
    cats: [
      { name: "acessórios", subcats: ["óculos", "relógios", "jóias e bijuterias", "cachecóis", "cintos", "chapéus"] },
      { name: "roupas",     subcats: ["blusas", "calças", "vestidos", "camisas", "casacos e jaquetas", "saias", "shorts e bermudas"] },
      { name: "beleza",     subcats: ["maquiagens", "skincare", "perfumes", "cabelos", "unhas"] },
      { name: "calçados",   subcats: ["botas", "sandálias e rasteiras", "sapatilhas", "sapatos", "tênis", "chinelos"] },
      { name: "bolsas",     subcats: ["baú", "clutch", "crossbody", "mala", "mochila", "necessaire", "pochete"] },
    ],
  },
  {
    key: "rapazes", label: "masculino",
    cats: [
      { name: "acessórios", subcats: ["óculos", "relógios", "jóias e bijuterias", "cintos", "chapéus", "carteiras"] },
      { name: "roupas",     subcats: ["blusas", "calças", "camisas", "casacos e jaquetas", "shorts e bermudas", "ternos"] },
      { name: "calçados",   subcats: ["tênis", "botas", "sandálias e rasteiras", "sapatos", "chinelos"] },
      { name: "beleza",     subcats: ["perfumes", "skincare", "cabelos"] },
    ],
  },
  {
    key: "criancas", label: "infantil",
    cats: [
      { name: "roupas",               subcats: ["blusas e camisetas", "calças", "vestidos", "conjuntos", "casacos", "pijamas"] },
      { name: "calçados",             subcats: ["tênis", "sandálias", "botas", "sapatilhas"] },
      { name: "brinquedos",           subcats: ["bonecos e bonecas", "pelúcias", "educativos", "esporte e lazer"] },
      { name: "acessórios e enxoval", subcats: ["acessórios para cabelo", "jóias e bijuterias", "bolsas"] },
    ],
  },
]

const OUTROS_COLS: OtherDept[] = [
  { key: "casa-e-decor",     label: "casa & decor",      cats: ["móveis", "decoração e enfeites", "iluminação", "utensílios para cozinha", "organização", "cama, mesa e banho"] },
  { key: "eletronicos",      label: "eletrônicos",       cats: ["informática", "smartphones e acessórios", "áudio e vídeo", "videogames", "fotografia", "aparelhos inteligentes"] },
  { key: "eletrodomesticos", label: "eletrodomésticos",  cats: ["cozinha", "limpeza e organização", "ar e ventilação"] },
  { key: "pets",             label: "pets",              cats: ["caminhas e casinhas", "brinquedos", "coleiras", "roupinhas e acessórios", "higiene e cuidados"] },
]

const OUTROS_SIMPLE = [
  { key: "livros-e-papelarias", label: "livros & papelaria" },
  { key: "musica-e-tv",         label: "música e tv" },
  { key: "antiguidades",        label: "antiguidades" },
  { key: "etc-e-tal",           label: "etc & tal" },
]

// ── Props ──────────────────────────────────────────────────────────────────

interface MegaNavProps {
  brands: { mocas: string[]; rapazes: string[]; criancas: string[]; outros: string[] }
  user?: { name?: string | null; email?: string | null; image?: string | null }
  communitiesCount?: number
  unreadCount?: number
}

// ── MegaNav ────────────────────────────────────────────────────────────────

export function MegaNav({ brands, user, communitiesCount = 0, unreadCount = 0 }: MegaNavProps) {
  const pathname = usePathname()
  const cartCount = useCartStore((s) => s.items.length)
  const isHome = pathname === '/'
  const isDeptPage = ['/mocas', '/rapazes', '/kids', '/casa'].includes(pathname)
  const isComunidades = pathname.startsWith('/comunidades')
  
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const catsDrag = useDragScroll<HTMLDivElement>()

  function open(key: string) {
    if (timer.current) clearTimeout(timer.current)
    setActiveKey(key)
  }

  function scheduleClose() {
    timer.current = setTimeout(() => setActiveKey(null), 200)
  }

  function cancelClose() {
    if (timer.current) clearTimeout(timer.current)
  }

  const brandsMap: Record<string, string[]> = {
    mocas: brands.mocas,
    rapazes: brands.rapazes,
    criancas: brands.criancas,
    outros: brands.outros,
  }

  const iconCls = "p-2 rounded-full transition-colors text-gray-500 hover:text-[var(--color-teal)] hover:bg-gray-100 dark:text-sage dark:hover:text-[var(--color-celadon)] dark:hover:bg-[var(--color-emerald)]"

  if (isComunidades) return null

  return (
    <>
      <header className={cn(
        "sticky top-0 z-40 border-b transition-colors relative",
        isComunidades ? "dark bg-[#081C15] border-[#1B4332] text-white" : "bg-white dark:bg-[var(--color-pine)] border-gray-200 dark:border-forest",
        !isHome && !isDeptPage && !isComunidades && "hidden md:block"
      )}>
        {/* ── Main row ─────────────────────────────────────────────────────── */}
        <div className="max-w-screen-xl mx-auto px-4 h-[60px] flex items-center gap-3">

          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center">
            <Image src="/logo-extensa.png" alt="Kloop" width={790} height={316} priority className="h-7 w-auto" />
          </Link>

         {/* Search — desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-2">
            <GlobalSearchBar />
          </div>

          {/* ── Desktop: nav + icons ─────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-0 ml-auto">
            {/* Nav tabs */}
            <nav className="flex items-center">
              {MAIN.map((dept) => (
                <button
                  key={dept.key}
                  type="button"
                  onMouseEnter={() => open(dept.key)}
                  onMouseLeave={scheduleClose}
                  className={cn(
                    "relative px-3 py-4 text-sm font-medium transition-colors",
                    activeKey === dept.key
                      ? "text-[var(--color-teal)] dark:text-[var(--color-celadon)]"
                      : "text-gray-600 dark:text-sage hover:text-[var(--color-teal)] dark:hover:text-[var(--color-celadon)]",
                  )}
                >
                  {dept.label}
                  {activeKey === dept.key && (
                    <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[var(--color-teal)] dark:bg-[var(--color-celadon)]" />
                  )}
                </button>
              ))}
              <button
                type="button"
                onMouseEnter={() => open("outros")}
                onMouseLeave={scheduleClose}
                className={cn(
                  "relative px-3 py-4 text-sm font-medium transition-colors",
                  activeKey === "outros"
                    ? "text-[var(--color-teal)] dark:text-[var(--color-celadon)]"
                    : "text-gray-600 dark:text-sage hover:text-[var(--color-teal)] dark:hover:text-[var(--color-celadon)]",
                )}
              >
                outros
                {activeKey === "outros" && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[var(--color-teal)] dark:bg-[var(--color-celadon)]" />
                )}
              </button>
            </nav>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 dark:bg-[var(--color-emerald)] mx-2" />

            {/* Icons */}
            <div className="flex items-center">
              {communitiesCount > 0 && (() => {
                const isComunidades = pathname.startsWith("/comunidades")
                return (
                  <Link
                    href="/comunidades"
                    aria-label="Minhas comunidades"
                    className={isComunidades
                      ? "p-2 rounded-full transition-colors text-[var(--color-neon-lift)]"
                      : iconCls
                    }
                    style={isComunidades ? {
                      background: "rgba(64,145,108,0.16)",
                      border: "1px solid rgba(116,198,157,0.4)",
                    } : undefined}
                  >
                    <Building2 size={20} />
                  </Link>
                )
              })()}
              <Link href="/ajuda" aria-label="Ajuda" className={iconCls}>
                <HelpCircle size={20} />
              </Link>
              <Link href="/notificacoes" aria-label="Notificações" className={cn(iconCls, "relative")}>
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/sacola" aria-label="Sacola" className={cn(iconCls, "relative")}>
                <ShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-[var(--color-teal)] text-white text-[9px] font-black flex items-center justify-center leading-none">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 dark:bg-[var(--color-emerald)] mx-2" />

            {/* Auth */}
            <HeaderAuth user={user} />
          </div>

          {/* ── Mobile: right side ───────────────────────────────────────── */}
          <div className="md:hidden ml-auto flex items-center gap-2">
            <Link href="/search" aria-label="Buscar" className={iconCls}>
              <Search size={22} />
            </Link>
            <Link href="/notificacoes" aria-label="Notificações" className={cn(iconCls, "relative")}>
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/sacola" aria-label="Sacola" className={cn(iconCls, "relative")}>
              <ShoppingBag size={22} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-[var(--color-teal)] text-white text-[9px] font-black flex items-center justify-center leading-none">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
            <HeaderAuth user={user} />
          </div>
        </div>

        {/* ── Mobile: Scrollable Categories Row ──────────────────────────── */}
        <div
          ref={catsDrag.ref}
          onMouseDown={catsDrag.onMouseDown}
          onMouseUp={catsDrag.onMouseUp}
          onMouseLeave={catsDrag.onMouseLeave}
          onMouseMove={catsDrag.onMouseMove}
          onClickCapture={catsDrag.onClickCapture}
          className={cn("md:hidden overflow-x-auto border-t border-gray-100 dark:border-white/5", catsDrag.className)}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <ul className="flex items-center px-4 [&::-webkit-scrollbar]:hidden">
            {[
              { label: "pra você", href: "/", active: pathname === '/' },
              { label: "kloop shop", href: "/kloop-shop", active: false, requiresAuth: false },
              { label: "feminino", href: "/mocas", active: pathname === '/mocas' },
              { label: "masculino", href: "/rapazes", active: pathname === '/rapazes' },
              { label: "infantil", href: "/kids", active: pathname === '/kids' },
              { label: "casa", href: "/casa", active: pathname === '/casa' },
            ].map((item) => (
              <li key={item.label} className="flex-shrink-0">
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (item.requiresAuth && !user) {
                      e.preventDefault()
                      setIsAuthModalOpen(true)
                    }
                  }}
                  className={cn(
                    "block px-3 py-2.5 text-[14px] font-bold transition-colors border-b-2",
                    item.active
                      ? "text-[var(--color-pine)] dark:text-white border-[var(--color-pine)] dark:border-white"
                      : "text-gray-500 dark:text-sage border-transparent hover:text-[var(--color-teal)]"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Mega dropdown ────────────────────────────────────────────────── */}
        {activeKey && (
          <div
            className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-[var(--color-pine)] border-t border-gray-100 dark:border-[var(--color-forest)] shadow-2xl"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {activeKey === "outros" ? (
              <OutrosDropdown brands={brands.outros} />
            ) : (
              (() => {
                const dept = MAIN.find((d) => d.key === activeKey)
                if (!dept) return null
                return <MainDropdown dept={dept} brands={brandsMap[dept.key] ?? []} />
              })()
            )}
          </div>
        )}
      </header>

      {/* Renderização do AuthModal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  )
}

// ── Main dept dropdown ─────────────────────────────────────────────────────

function MainDropdown({ dept, brands }: { dept: MainDept; brands: string[] }) {
  return (
    <div className="max-w-screen-xl mx-auto px-8 py-8 flex gap-8">
      {brands.length > 0 && (
        <div className="w-32 flex-shrink-0 border-r border-gray-100 dark:border-[var(--color-emerald)] pr-6">
          <div className="flex flex-col gap-2">
            {brands.map((brand) => (
              <Link
                key={brand}
                href={`/search?dept=${dept.key}&brand=${encodeURIComponent(brand)}`}
                className="text-center px-2 py-1.5 bg-[var(--color-celadon)]/30 dark:bg-[var(--color-emerald)] text-[var(--color-teal)] dark:text-[var(--color-frosted)] text-xs font-semibold rounded-full hover:bg-[var(--color-celadon)]/60 dark:hover:bg-[var(--color-teal)] transition-colors truncate"
              >
                {brand}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-8 flex-1 overflow-x-auto">
        {dept.cats.map((cat) => (
          <div key={cat.name} className="min-w-[120px]">
            <Link
              href={`/search?dept=${dept.key}&cat=${encodeURIComponent(cat.name)}`}
              className="block text-sm font-bold text-gray-800 dark:text-[var(--color-frosted)] mb-3 hover:text-[var(--color-teal)] dark:hover:text-[var(--color-celadon)] transition-colors"
            >
              {cat.name}
            </Link>
            <ul className="space-y-2">
              {cat.subcats.map((sub) => (
                <li key={sub}>
                  <Link
                    href={`/search?dept=${dept.key}&cat=${encodeURIComponent(cat.name)}&sub=${encodeURIComponent(sub)}`}
                    className="text-sm text-gray-500 dark:text-sage hover:text-[var(--color-teal)] dark:hover:text-[var(--color-celadon)] transition-colors block"
                  >
                    {sub}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 pt-0.5">
        <Link
          href={`/search?dept=${dept.key}`}
          className="text-sm font-bold text-[var(--color-teal)] dark:text-[var(--color-celadon)] hover:underline underline-offset-2 whitespace-nowrap"
        >
          ver todos os itens
        </Link>
      </div>
    </div>
  )
}

// ── Outros dropdown ────────────────────────────────────────────────────────

function OutrosDropdown({ brands }: { brands: string[] }) {
  return (
    <div className="max-w-screen-xl mx-auto px-8 py-8 flex gap-8">
      {brands.length > 0 && (
        <div className="w-32 flex-shrink-0 border-r border-gray-100 dark:border-[var(--color-emerald)] pr-6">
          <div className="flex flex-col gap-2">
            {brands.map((brand) => (
              <Link
                key={brand}
                href={`/search?brand=${encodeURIComponent(brand)}`}
                className="text-center px-2 py-1.5 bg-[var(--color-celadon)]/30 dark:bg-[var(--color-emerald)] text-[var(--color-teal)] dark:text-[var(--color-frosted)] text-xs font-semibold rounded-full hover:bg-[var(--color-celadon)]/60 dark:hover:bg-[var(--color-teal)] transition-colors truncate"
              >
                {brand}
              </Link>
            ))}
          </div>
        </div>
      )}

      {OUTROS_COLS.map((dept) => (
        <div key={dept.key} className="min-w-[130px]">
          <Link
            href={`/search?dept=${dept.key}`}
            className="block text-sm font-bold text-gray-800 dark:text-[var(--color-frosted)] mb-3 hover:text-[var(--color-teal)] dark:hover:text-[var(--color-celadon)] transition-colors"
          >
            {dept.label}
          </Link>
          <ul className="space-y-2">
            {dept.cats.map((cat) => (
              <li key={cat}>
                <Link
                  href={`/search?dept=${dept.key}&cat=${encodeURIComponent(cat)}`}
                  className="text-sm text-gray-500 dark:text-sage hover:text-[var(--color-teal)] dark:hover:text-[var(--color-celadon)] transition-colors block"
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="flex flex-col gap-3 min-w-[140px] border-l border-gray-100 dark:border-[var(--color-emerald)] pl-8">
        {OUTROS_SIMPLE.map((dept) => (
          <Link
            key={dept.key}
            href={`/search?dept=${dept.key}`}
            className="text-sm font-bold text-gray-800 dark:text-[var(--color-frosted)] hover:text-[var(--color-teal)] dark:hover:text-[var(--color-celadon)] transition-colors"
          >
            {dept.label}
          </Link>
        ))}
        <div className="mt-auto pt-4">
          <Link
            href="/search"
            className="text-sm font-bold text-[var(--color-teal)] dark:text-[var(--color-celadon)] hover:underline underline-offset-2 whitespace-nowrap"
          >
            ver todos os itens
          </Link>
        </div>
      </div>
    </div>
  )
}