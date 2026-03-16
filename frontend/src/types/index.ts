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
  { id: 'MI',   name: 'Mumbai Indians',          color: 'bg-blue-600 text-white' },
  { id: 'CSK',  name: 'Chennai Super Kings',     color: 'bg-yellow-400 text-yellow-900' },
  { id: 'RCB',  name: 'Royal Challengers Bengaluru', color: 'bg-red-600 text-white' },
  { id: 'KKR',  name: 'Kolkata Knight Riders',   color: 'bg-purple-700 text-white' },
  { id: 'SRH',  name: 'Sunrisers Hyderabad',     color: 'bg-orange-500 text-white' },
  { id: 'GT',   name: 'Gujarat Titans',          color: 'bg-cyan-600 text-white' },
  { id: 'RR',   name: 'Rajasthan Royals',        color: 'bg-pink-500 text-white' },
  { id: 'LSG',  name: 'Lucknow Super Giants',    color: 'bg-teal-500 text-white' },
  { id: 'DC',   name: 'Delhi Capitals',          color: 'bg-blue-400 text-white' },
  { id: 'PBKS', name: 'Punjab Kings',            color: 'bg-red-400 text-white' },
]

export type MatchStatus = 'upcoming' | 'toss_open' | 'toss_closed' | 'match_open' | 'match_closed' | 'live' | 'completed'

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
  tossPredictionOpen: boolean
  matchPredictionOpen: boolean
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
  joinCode: string       // 6-char alphanumeric, per party
  qrCodeUrl: string      // host-level QR, per host
  status: PartyStatus
  members: string[]      // user UIDs
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
  bonusPoints: number    // host-awarded manual points
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
}
