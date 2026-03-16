import { cn, getTeamColor } from '../../utils/helpers'
import type { IPLTeam, LeaderboardEntry, Match } from '../../types'
import { rankEmoji, formatMatchDate } from '../../utils/helpers'

// ── Back button ────────────────────────────────────────────────────────────
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  )
}

// ── Page header ────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, onBack }: {
  title: string; subtitle?: string; onBack?: () => void
}) {
  return (
    <div className="nav-header shadow-lg">
      {onBack && <BackButton onClick={onBack} />}
      <div className="flex-1">
        <div className="font-semibold text-base leading-tight">{title}</div>
        {subtitle && <div className="text-xs text-white/70">{subtitle}</div>}
      </div>
      <div className="w-8 h-8 rounded-full bg-ipl-orange flex items-center justify-center text-xs font-bold">
        IPL
      </div>
    </div>
  )
}

// ── Team badge ─────────────────────────────────────────────────────────────
export function TeamBadge({ team, size = 'sm' }: { team: IPLTeam; size?: 'xs' | 'sm' | 'md' }) {
  const sizes = { xs: 'text-xs px-1.5 py-0.5', sm: 'text-xs px-2 py-1', md: 'text-sm px-3 py-1.5' }
  return (
    <span className={cn('rounded-lg font-semibold', getTeamColor(team), sizes[size])}>
      {team}
    </span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    upcoming: 'bg-gray-100 text-gray-600',
    toss_open: 'bg-green-100 text-green-700',
    toss_closed: 'bg-yellow-100 text-yellow-700',
    match_open: 'bg-blue-100 text-blue-700',
    match_closed: 'bg-orange-100 text-orange-700',
    live: 'bg-red-100 text-red-600',
    completed: 'bg-gray-100 text-gray-500',
    created: 'bg-gray-100 text-gray-500',
    active: 'bg-green-100 text-green-700',
  }
  const label: Record<string, string> = {
    toss_open: 'Toss Open',
    toss_closed: 'Toss Closed',
    match_open: 'Match Open',
    match_closed: 'Match Closed',
  }
  return (
    <span className={cn('text-xs font-medium px-2 py-1 rounded-full', map[status] ?? 'bg-gray-100 text-gray-500')}>
      {label[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── Match card ─────────────────────────────────────────────────────────────
export function MatchCard({ match, onClick }: { match: Match; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn('card p-4 animate-slide-up', onClick && 'cursor-pointer hover:shadow-md transition-shadow')}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">Match {match.matchNumber}</span>
        <StatusBadge status={match.status} />
      </div>
      <div className="flex items-center gap-3 mb-2">
        <TeamBadge team={match.team1} size="md" />
        <span className="text-gray-300 font-medium text-sm">vs</span>
        <TeamBadge team={match.team2} size="md" />
      </div>
      <div className="text-xs text-gray-500">
        {match.venue} · {match.city}
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {formatMatchDate(match.matchDate)} · {match.timeIST}
      </div>
    </div>
  )
}

// ── Leaderboard row ────────────────────────────────────────────────────────
export function LBRow({ entry, highlight }: { entry: LeaderboardEntry; highlight?: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl transition-all',
      entry.rank === 1 && 'bg-yellow-50 border border-yellow-200',
      entry.rank === 2 && 'bg-gray-50 border border-gray-200',
      entry.rank === 3 && 'bg-orange-50 border border-orange-100',
      entry.rank > 3 && 'bg-white border border-gray-100',
      highlight && 'ring-2 ring-ipl-orange'
    )}>
      <div className="w-8 text-center text-sm font-bold">{rankEmoji(entry.rank)}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{entry.userName}</div>
        {entry.favoriteTeam && (
          <TeamBadge team={entry.favoriteTeam} size="xs" />
        )}
      </div>
      <div className="text-right">
        <div className="font-bold text-ipl-orange">{entry.totalPoints}</div>
        <div className="text-xs text-gray-400">pts</div>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }: {
  icon: string; title: string; subtitle?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="font-semibold text-gray-700 mb-1">{title}</div>
      {subtitle && <div className="text-sm text-gray-400">{subtitle}</div>}
    </div>
  )
}

// ── Loading spinner ────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-ipl-orange border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ── Prediction card ────────────────────────────────────────────────────────
export function PredCard({
  team, selected, disabled, points, onClick
}: {
  team: IPLTeam; selected: boolean; disabled: boolean; points: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full p-4 rounded-xl border-2 text-left transition-all',
        selected
          ? 'border-ipl-orange bg-ipl-orange-light'
          : 'border-gray-200 bg-white hover:border-gray-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <TeamBadge team={team} size="md" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">+{points} pts</span>
          {selected && (
            <div className="w-5 h-5 rounded-full bg-ipl-orange flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
