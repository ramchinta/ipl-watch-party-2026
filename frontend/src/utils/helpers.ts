import { Timestamp } from 'firebase/firestore'
import { format, formatDistanceToNow } from 'date-fns'
import { IPL_TEAMS, type IPLTeam } from '../types'

export function formatMatchDate(ts: Timestamp): string {
  return format(ts.toDate(), 'EEE, d MMM yyyy')
}

export function formatMatchTime(ts: Timestamp): string {
  return format(ts.toDate(), 'h:mm a') + ' IST'
}

export function formatRelative(ts: Timestamp): string {
  return formatDistanceToNow(ts.toDate(), { addSuffix: true })
}

export function getTeamName(id: IPLTeam): string {
  return IPL_TEAMS.find(t => t.id === id)?.name ?? id
}

export function getTeamColor(id: IPLTeam): string {
  return IPL_TEAMS.find(t => t.id === id)?.color ?? 'bg-gray-400 text-white'
}

export function rankEmoji(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export function formatPoints(pts: number): string {
  return pts >= 0 ? `+${pts}` : `${pts}`
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
