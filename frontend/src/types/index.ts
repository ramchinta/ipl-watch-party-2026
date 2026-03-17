import { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'host' | 'user'

export interface AppUser {
  uid: string
  phone?: string
  email?: string
  name: string
  favoriteTeam?: IPLTeam
  food?: string
  role: UserRole
  joinedParties: string[]
  createdAt: Timestamp
  profileComplete: boolean
}

export type IPLTeam =
  | 'MI' | 'CSK' | 'RCB' | 'KKR' | 'SRH'
  | 'GT' | 'RR' | 'LSG' | 'DC' | 'PBKS'

export const IPL_TEAMS: { id: IPLTeam; name: string; color: string }[] = [
  { id: 'MI',   name: 'Mumbai Indians',              color: 'bg-blue-600 text-white' },
  { id: 'CSK',  name: 'Chennai Super Kings',         color: 'bg-yellow-400 text-yellow-900' },
  { id: 'RCB',  name: 'Royal Challengers Bengaluru', color: 'bg-red-600 text-white' },
  { id: 'KKR',  name: 'Kolkata Knight Riders',       color: 'bg-purple-700 text-white' },
  { id: 'SRH',  name: 'Sunrisers Hyderabad',         color: 'bg-orange-500 text-white' },
  { id: 'GT',   name: 'Gujarat Titans',              color: 'bg-cyan-600 text-white' },
  { id: 'RR',   name: 'Rajasthan Royals',            color: 'bg-pink-500 text-white' },
  { id: 'LSG',  name: 'Lucknow Super Giants',        color: 'bg-teal-500 text-white' },
  { id: 'DC',   name: 'Delhi Capitals',              color: 'bg-blue-400 text-white' },
  { id: 'PBKS', name: 'Punjab Kings',                color: 'bg-red-400 text-white' },
]

export type MatchStatus =
  | 'upcoming' | 'toss_open' | 'toss_closed'
  | 'match_open' | 'match_closed' | 'live' | 'completed'

// Question state — used for toss, match, and powerplay windows
// future    = default, not started, hidden from users
// open      = accepting predictions
// closed    = locked, waiting for result (not yet entered)
// skipped   = admin marked as won't happen — never shown to users
// completed = result entered, points scored
export type QState = 'future' | 'open' | 'closed' | 'skipped' | 'completed'

// ── Over Questions ────────────────────────────────────────────────────────────
export type Inning = 1 | 2

export interface OverQuestion {
  id: string          // e.g. "matchId_inn1_over3"
  matchId: string
  inning: Inning
  overNumber: number  // 1-20
  state: QState
  // Actual results (set by admin when completed)
  actualRuns?: number
  actualWickets?: number
  actualFours?: number
  actualSixes?: number
  createdAt?: any
  updatedAt?: any
}

export interface OverGuess {
  id: string          // e.g. "matchId_inn1_over3_userId"
  matchId: string
  partyId: string
  userId: string
  inning: Inning
  overNumber: number
  guessRuns?: number
  guessWickets?: number
  guessFours?: number
  guessSixes?: number
  // Points awarded (set when admin enters result)
  pointsRuns?: number
  pointsWickets?: number
  pointsFours?: number
  pointsSixes?: number
  totalPoints?: number
  submittedAt?: any
}

export function calcRunsPoints(guess: number, actual: number): number {
  const d = Math.abs(guess - actual)
  if (d === 0) return 10
  if (d <= 1)  return 7
  if (d <= 3)  return 5
  if (d <= 5)  return 3
  if (d <= 8)  return 1
  return 0
}
export function calcExactPoints(guess: number, actual: number, pts = 5): number {
  return guess === actual ? pts : 0
}

export interface PowerplayScores {
  team1Score?: number
  team2Score?: number
  team1State: QState
  team2State: QState
}

export interface Match {
  id: string
  matchNumber: number
  team1: IPLTeam
  team2: IPLTeam
  venue: string
  city: string
  matchDate: Timestamp
  timeIST: string
  status: MatchStatus
  tossWinner?: IPLTeam
  tossState: QState
  matchState: QState
  powerplay?: PowerplayScores
  result?: {
    winner: IPLTeam
    margin: string
  }
  phase: 1 | 2
}

export type PartyStatus = 'created' | 'active' | 'completed'

export interface WatchParty {
  id: string
  name: string
  hostId: string
  hostName: string
  matchId: string
  joinCode: string
  qrCodeUrl: string
  status: PartyStatus
  members: string[]
  createdAt: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp
}

export interface Prediction {
  id: string
  userId: string
  partyId: string
  matchId: string
  tossWinner?: IPLTeam
  matchWinner?: IPLTeam
  powerplayGuess1?: number   // user's guess for team1 powerplay score
  powerplayGuess2?: number   // user's guess for team2 powerplay score
  powerplayPoints1?: number  // calculated points for powerplay1
  powerplayPoints2?: number  // calculated points for powerplay2
  locked: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Score {
  userId: string
  partyId: string
  userName: string
  favoriteTeam?: IPLTeam
  tossPoints: number
  matchPoints: number
  powerplayPoints: number    // total powerplay points
  bonusPoints: number
  totalPoints: number
  updatedAt: Timestamp
}

export interface LeaderboardEntry extends Score {
  rank: number
}

export interface PredictionWindow {
  partyId: string
  matchId: string
  tossPredictionOpen: boolean
  tossPredictionClosedAt?: Timestamp
  matchPredictionOpen: boolean
  matchPredictionClosedAt?: Timestamp
}

// Points constants
export const POINTS = {
  TOSS_CORRECT: 10,
  MATCH_CORRECT: 20,
  POWERPLAY_EXACT: 15,    // exact score
  POWERPLAY_CLOSE_1: 10,  // within 1 run
  POWERPLAY_CLOSE_3: 7,   // within 3 runs
  POWERPLAY_CLOSE_5: 5,   // within 5 runs
  POWERPLAY_CLOSE_8: 2,   // within 8 runs
}

export function calcPowerplayPoints(guess: number, actual: number): number {
  const diff = Math.abs(guess - actual)
  if (diff === 0) return POINTS.POWERPLAY_EXACT
  if (diff <= 1)  return POINTS.POWERPLAY_CLOSE_1
  if (diff <= 3)  return POINTS.POWERPLAY_CLOSE_3
  if (diff <= 5)  return POINTS.POWERPLAY_CLOSE_5
  if (diff <= 8)  return POINTS.POWERPLAY_CLOSE_8
  return 0
}
