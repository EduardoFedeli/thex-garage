import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Store, MessageCircle, ArchiveX, ShoppingBag, ChevronRight,
  PackageOpen, HelpCircle, Info, Coins, Handshake, Star, TrendingUp, Trophy,
  Bell, Sparkles, Clock,
} from 'lucide-react'
import { PlanBadge } from '@/components/ui/PlanBadge'
import { formatPrice } from '@/lib/utils'
import { CoverUploader } from '@/components/perfil/CoverUploader'
import { AvatarUploader } from '@/components/perfil/AvatarUploader'
import { getCashbackBalance } from '@/lib/cashback'
import { getUserAchievementsData } from '@/lib/actions/achievements'

export default async function VendasPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  const myId = session.user.id

  const [userData, listings, completedTxs, pendingCount, activeOrdersCount, cashbackBalanceCents, pendingOffersCount, recentOffer, achievementsData, activeLot, shopProductCount] = await Promise.all([
    db.user.findUnique({
      where: { id: myId },
      select: { 
        name: true, 
        image: true, 
        avatarUrl: true, 
        coverUrl: true, 
        reviewsReceived: { select: { rating: true } },
        subscription: {
          select: {
            plan: {
              select: {
                slug: true
              }
            }
          }
        }
      },
    }),
    db.listing.findMany({
      where: { sellerId: myId },
      select: { status: true },
    }),
    db.transaction.findMany({
      where: { sellerId: myId, status: 'COMPLETED' },
      select: { amountCents: true, commissionCents: true },
    }),
    db.transaction.count({
      where: { sellerId: myId, status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
    }),
    db.transaction.count({
      where: { buyerId: myId, status: { in: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'] } },
    }),
    getCashbackBalance(myId),
    db.offer.count({
      where: { sellerId: myId, status: 'PENDING_SELLER', expiresAt: { gt: new Date() } },
    }),
    db.offer.findFirst({
      where: { sellerId: myId, status: 'PENDING_SELLER', expiresAt: { gt: new Date() } },
      orderBy: { updatedAt: 'desc' },
      select: {
        currentPriceCents: true,
        listing: { select: { title: true } },
      },
    }),
    getUserAchievementsData(myId),
    db.proLot.findFirst({
      where: { userId: myId, status: { in: ['ANALYZING', 'ACTIVE'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        items: {
          select: {
            status: true,
            userDecision: true,
            shopProduct: { select: { id: true } },
          },
        },
      },
    }),
    db.kloopShopProduct.count({
      where: {
        isActive: true,
        lotItem: { lot: { userId: myId } },
      },
    }),
  ])

  const active = listings.filter((l) => l.status === 'ACTIVE').length
  const sold = listings.filter((l) => l.status === 'SOLD').length
  const inactive = listings.filter((l) => ['DRAFT', 'PAUSED', 'EXPIRED'].includes(l.status)).length
  const revenue = completedTxs.reduce((sum, t) => sum + t.amountCents - t.commissionCents, 0)

  const needsUserApproval = activeLot?.status === 'ACTIVE' &&
    activeLot.items.some((i) => i.status === 'APPROVED' && !i.shopProduct)
  const isAnalyzing = activeLot?.status === 'ANALYZING'

  const totalRatings = userData?.reviewsReceived.length ?? 0
  const avgRating = totalRatings > 0
    ? (userData!.reviewsReceived.reduce((s, r) => s + r.rating, 0) / totalRatings).toFixed(1)
    : null

  const displayName = userData?.name ?? session.user.name ?? 'minha lojinha'
  const avatarSrc = userData?.avatarUrl ?? userData?.image ?? session.user.image ?? null
  const coverUrl = userData?.coverUrl ?? null
  const userInitials = displayName.substring(0, 2).toUpperCase()
  
  const userPlanSlug = (userData?.subscription?.plan?.slug as "basic" | "pro" | "premium" | "enterprise") || 'basic'

  return (
    <div className="min-h-screen bg-[var(--background)] pb-32">
      <div className="md:max-w-2xl lg:max-w-5xl md:mx-auto">

        {/* ── Perfil ── */}
        <section className="relative bg-white dark:bg-[var(--color-pine)]">
          {/* Cover */}
          <div className="h-40 bg-gradient-to-br from-[var(--color-emerald)] to-[var(--color-forest)] dark:from-[var(--color-forest)] dark:to-[#040e08] w-full overflow-hidden relative">
            <CoverUploader currentCoverUrl={coverUrl} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-[var(--color-pine)] to-transparent pointer-events-none" />
          </div>

          <div className="px-4 pb-5 -mt-12 relative z-10 flex justify-between items-end">
            <div className="flex flex-col">
              {/* Avatar */}
              <AvatarUploader currentAvatarUrl={avatarSrc} initials={userInitials} size={84} />

              <div className="mt-2.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-[19px] font-black text-[var(--foreground)] tracking-tight leading-none">
                    {displayName}
                  </h1>
                  <PlanBadge plan={userPlanSlug} />
                </div>
                <Link href="/vendas/avaliacoes" className="flex items-center gap-1.5 mt-1.5 hover:opacity-70 transition-opacity">
                  <div className="flex gap-[1px]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={
                          i < Math.round(Number(avgRating ?? 0))
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-gray-200 text-gray-200 dark:fill-white/15 dark:text-white/15'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-[12px] text-gray-400 dark:text-[var(--color-sage)]">
                    {avgRating !== null
                      ? `${avgRating} · ${totalRatings} ${totalRatings === 1 ? 'avaliação' : 'avaliações'}`
                      : 'sem avaliações'}
                  </span>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/create"
                className="hidden md:flex items-center gap-2 bg-[var(--color-teal)] text-white px-5 py-2.5 rounded-full font-black text-[13px] shadow-md shadow-[var(--color-teal)]/30 hover:opacity-90 active:scale-95 transition-all"
              >
                criar anúncio
              </Link>
              <Link
                href={`/profile/${myId}`}
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-[var(--color-sage)] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                <ChevronRight size={20} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Layout duas colunas (lg+) ── */}
        <div className="lg:grid lg:grid-cols-5 lg:gap-6 lg:px-6 lg:mt-6 lg:items-start">

          {/* Coluna esquerda — financeiro */}
          <div className="lg:col-span-3 space-y-4">

            {/* KloopBank — hero financeiro */}
            <section className="px-4 mt-5 lg:mt-0 lg:px-0">
              <Link
                href="/financeiro"
                className="group block relative overflow-hidden rounded-2xl p-5 shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--color-pine) 0%, var(--color-emerald) 55%, var(--color-teal) 100%)' }}
              >
                {/* Texture orbs */}
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                <div className="absolute -left-4 -bottom-8 w-32 h-32 rounded-full bg-[var(--color-celadon)]/10 blur-2xl pointer-events-none" />
                {/* Shine line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                        <TrendingUp size={14} className="text-[var(--color-celadon)]" />
                      </div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-celadon)]">kloopbank</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="relative group/tip">
                        <Info size={14} className="text-white/40 cursor-pointer hover:text-white/70 transition-colors" />
                        <div className="absolute bottom-full right-0 mb-2 w-56 bg-[var(--color-forest)] text-white text-[11px] leading-relaxed font-medium px-3 py-2 rounded-xl shadow-xl opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity z-20 border border-white/10">
                          valor líquido de todas as vendas concluídas, após desconto da comissão.
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <ChevronRight size={16} className="text-white" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[32px] font-black text-white leading-none tracking-tight">
                    {formatPrice(revenue)}
                  </p>
                  <p className="text-[12px] text-white/50 mt-1.5">saldo disponível para saque</p>
                </div>
              </Link>
            </section>

            {/* Cashback — secundário */}
            <section className="px-4 lg:px-0">
              <Link
                href="/cashback"
                className="group block rounded-2xl bg-[var(--color-frosted)] dark:bg-[var(--color-celadon)]/8 border border-[var(--color-celadon)]/50 dark:border-[var(--color-celadon)]/15 p-5 relative overflow-hidden"
              >
                <div className="absolute right-[-16px] top-[-16px] w-24 h-24 bg-[var(--color-celadon)]/25 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Coins size={14} className="text-[var(--color-teal)] dark:text-[var(--color-celadon)]" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-teal)] dark:text-[var(--color-celadon)]">meu cashback</p>
                    </div>
                    <p className="text-[28px] font-black text-[var(--foreground)] leading-none tracking-tight">
                      {formatPrice(cashbackBalanceCents)}
                    </p>
                    <p className="text-[12px] text-gray-400 dark:text-[var(--color-sage)] mt-1">saldo disponível</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-celadon)]/20 dark:bg-[var(--color-celadon)]/10 flex items-center justify-center group-hover:bg-[var(--color-celadon)]/35 transition-colors">
                    <ChevronRight size={17} className="text-[var(--color-teal)] dark:text-[var(--color-celadon)]" />
                  </div>
                </div>
              </Link>
            </section>

            {/* Missões */}
            <section className="px-4 lg:px-0">
              {(() => {
                const completed = achievementsData.filter((a) => a.isEarned).length
                const total = achievementsData.length
                return (
                  <Link
                    href="/vendas/metas"
                    className="group block rounded-2xl bg-amber-50 dark:bg-amber-500/8 border border-amber-300/60 dark:border-amber-500/15 p-5 relative overflow-hidden"
                  >
                    <div className="absolute right-[-16px] top-[-16px] w-24 h-24 bg-amber-400/20 dark:bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Trophy size={14} className="text-amber-600 dark:text-amber-400" />
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">metas</p>
                        </div>
                        <p className="text-[28px] font-black text-[var(--foreground)] leading-none tracking-tight">
                          {completed}<span className="text-[18px] text-gray-400 dark:text-sage font-bold">/{total}</span>
                        </p>
                        <p className="text-[12px] text-gray-400 dark:text-[var(--color-sage)] mt-1">
                          {completed === total ? 'todas as metas concluídas 🎉' : 'metas concluídas'}
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-amber-200/50 dark:bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-500/20 transition-colors">
                        <ChevronRight size={17} className="text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                  </Link>
                )
              })()}
            </section>

            {/* Botão criar — tablet only */}
            <section className="px-4 md:px-0 lg:hidden">
              <Link
                href="/create"
                className="hidden md:flex items-center justify-center w-full bg-[var(--color-teal)] text-white py-4 rounded-full font-black text-[14px] shadow-md shadow-[var(--color-teal)]/25 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                criar novo anúncio
              </Link>
            </section>
          </div>

          {/* Coluna direita — métricas + ações */}
          <div className="lg:col-span-2 space-y-4">

            {/* Métricas 2×2 */}
            <section className="px-4 mt-5 lg:mt-0 lg:px-0">
              <div className="grid grid-cols-2 gap-2.5">

                <Link href="/vendas/ativos" className="group bg-white dark:bg-[var(--color-pine)] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col gap-3 hover:border-[var(--color-celadon)]/50 dark:hover:border-[var(--color-celadon)]/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <Store size={18} className="text-[var(--color-teal)] dark:text-[var(--color-celadon)]" />
                    <ChevronRight size={14} className="text-gray-300 dark:text-white/20 group-hover:text-gray-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[30px] font-black text-[var(--foreground)] leading-none">{active}</p>
                    <p className="text-[12px] text-gray-400 dark:text-[var(--color-sage)] mt-1">à venda</p>
                  </div>
                </Link>

                <Link href="/vendas/pendentes" className="group bg-white dark:bg-[var(--color-pine)] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col gap-3 hover:border-orange-200 dark:hover:border-orange-500/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <MessageCircle size={18} className="text-orange-500 dark:text-orange-400" />
                    <div className="flex items-center gap-1">
                      {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                      <ChevronRight size={14} className="text-gray-300 dark:text-white/20 group-hover:text-gray-400 transition-colors" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[30px] font-black text-[var(--foreground)] leading-none">{pendingCount}</p>
                    <p className="text-[12px] text-gray-400 dark:text-[var(--color-sage)] mt-1">pendentes</p>
                  </div>
                </Link>

                <Link href="/vendas/inativos" className="group bg-white dark:bg-[var(--color-pine)] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col gap-3 hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <ArchiveX size={18} className="text-gray-400 dark:text-[var(--color-sage)]" />
                    <ChevronRight size={14} className="text-gray-300 dark:text-white/20 group-hover:text-gray-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[30px] font-black text-[var(--foreground)] leading-none">{inactive}</p>
                    <p className="text-[12px] text-gray-400 dark:text-[var(--color-sage)] mt-1">inativos</p>
                  </div>
                </Link>

                <Link href="/vendas/historico" className="group bg-white dark:bg-[var(--color-pine)] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col gap-3 hover:border-blue-200 dark:hover:border-blue-500/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <ShoppingBag size={18} className="text-blue-500 dark:text-blue-400" />
                    <ChevronRight size={14} className="text-gray-300 dark:text-white/20 group-hover:text-gray-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-[30px] font-black text-[var(--foreground)] leading-none">{sold}</p>
                    <p className="text-[12px] text-gray-400 dark:text-[var(--color-sage)] mt-1">vendidos</p>
                  </div>
                </Link>

              </div>
            </section>

            {/* Card Kloop Shop */}
            {(needsUserApproval || isAnalyzing || shopProductCount > 0) && (
              <section className="px-4 lg:px-0">
                <Link href="/pro/dashboard">
                  {needsUserApproval ? (
                    <div className="relative rounded-2xl overflow-hidden p-5 shadow-lg"
                      style={{ background: 'linear-gradient(135deg, var(--color-pine) 0%, var(--color-emerald) 60%, var(--color-teal) 100%)' }}>
                      <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute right-4 top-4 opacity-20">
                        <Bell size={36} className="text-white" />
                      </div>
                      <div className="relative z-10">
                        <span className="inline-flex items-center gap-1 bg-[var(--color-celadon)] text-[var(--color-pine)] text-[10px] font-black px-2 py-0.5 rounded-full mb-3">
                          <Bell size={9} /> ação necessária
                        </span>
                        <p className="text-[18px] font-black text-white leading-tight mb-1">
                          terminamos as avaliações
                        </p>
                        <p className="text-[13px] text-white/70 leading-relaxed mb-4">
                          agora precisamos da sua aprovação para publicar na Kloop Shop.
                        </p>
                        <div className="flex items-center gap-2 text-white font-black text-[13px]">
                          ver minhas peças <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="relative rounded-2xl overflow-hidden p-5 bg-white dark:bg-[var(--color-pine)] border border-gray-100 dark:border-white/5 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                          <Clock size={22} className="text-violet-500 dark:text-violet-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[14px] font-black text-[var(--foreground)]">kloop shop em análise</p>
                          <p className="text-[11px] text-gray-400 dark:text-[var(--color-sage)] mt-0.5">
                            nossa equipe está avaliando suas peças
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 dark:text-white/20 flex-shrink-0" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden p-5"
                      style={{ background: 'linear-gradient(135deg, var(--color-pine) 0%, var(--color-emerald) 60%, var(--color-teal) 100%)' }}>
                      <div className="absolute right-4 top-4 opacity-15">
                        <Sparkles size={36} className="text-white" />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-celadon)] mb-2">kloop shop</p>
                        <p className="text-[26px] font-black text-white leading-none mb-1">{shopProductCount}</p>
                        <p className="text-[13px] text-white/70 mb-3">
                          {shopProductCount === 1 ? 'produto à venda' : 'produtos à venda'} na Kloop Shop
                        </p>
                        <div className="flex items-center gap-2 text-white font-black text-[13px]">
                          ver painel <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  )}
                </Link>
              </section>
            )}

            {/* Ações agrupadas */}
            <section className="px-4 lg:px-0">
              <div className="bg-white dark:bg-[var(--color-pine)] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden divide-y divide-gray-50 dark:divide-white/5">

                {/* Ofertas */}
                <Link href="/vendas/ofertas" className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <Handshake size={18} className="text-orange-500 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[var(--foreground)]">ofertas recebidas</p>
                      <p className="text-[11px] text-gray-400 dark:text-[var(--color-sage)] mt-0.5 truncate">
                        {recentOffer
                          ? `${recentOffer.listing.title.toLowerCase()} · ${formatPrice(recentOffer.currentPriceCents)}`
                          : pendingOffersCount > 0
                            ? `${pendingOffersCount} aguardando resposta`
                            : 'nenhuma pendente'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {pendingOffersCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                        {pendingOffersCount}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-gray-300 dark:text-white/20 group-hover:text-gray-400 transition-colors" />
                  </div>
                </Link>

                {/* Compras */}
                <Link href="/compras" className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag size={18} className="text-purple-500 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[var(--foreground)]">minhas compras</p>
                      <p className="text-[11px] text-gray-400 dark:text-[var(--color-sage)] mt-0.5">
                        {activeOrdersCount > 0
                          ? `${activeOrdersCount} em andamento`
                          : 'ver histórico'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeOrdersCount > 0 && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                    <ChevronRight size={16} className="text-gray-300 dark:text-white/20 group-hover:text-gray-400 transition-colors" />
                  </div>
                </Link>

                {/* Kloop Pro */}
                <Link href="/pro/dashboard" className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <PackageOpen size={18} className="text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[var(--foreground)]">painel kloop shop</p>
                      <p className="text-[11px] text-gray-400 dark:text-[var(--color-sage)] mt-0.5">lotes e vendas shop</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 dark:text-white/20 group-hover:text-gray-400 transition-colors" />
                </Link>

                {/* Ajuda */}
                <Link href="/ajuda" className="flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                      <HelpCircle size={18} className="text-sky-500 dark:text-sky-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[var(--foreground)]">central de ajuda</p>
                      <p className="text-[11px] text-gray-400 dark:text-[var(--color-sage)] mt-0.5">dúvidas sobre vendas e envios</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 dark:text-white/20 group-hover:text-gray-400 transition-colors" />
                </Link>

              </div>
            </section>

          </div>
        </div>
      </div>

      {/* FAB — mobile only */}
      <div className="md:hidden fixed bottom-[80px] left-1/2 -translate-x-1/2 z-30 w-full px-4 max-w-sm">
        <Link
          href="/create"
          className="w-full bg-[var(--color-teal)] text-white px-6 py-4 rounded-full flex items-center justify-center shadow-xl shadow-[var(--color-teal)]/35 hover:opacity-95 active:scale-[0.97] transition-all font-black text-[14px] tracking-wide"
        >
          criar novo anúncio
        </Link>
      </div>
    </div>
  )
}