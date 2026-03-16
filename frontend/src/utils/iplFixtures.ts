import { Timestamp } from 'firebase/firestore'
import type { Match } from '../types'

// Helper: IST offset is UTC+5:30
function ist(dateStr: string, timeStr: string): Timestamp {
  // dateStr: 'YYYY-MM-DD', timeStr: '19:30' or '15:30'
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  // Convert IST to UTC: subtract 5h30m
  const utcMs = Date.UTC(y, mo - 1, d, h - 5, mi - 30)
  return Timestamp.fromMillis(utcMs)
}

export const IPL_2026_FIXTURES: Omit<Match, 'id'>[] & { id: string }[] = [
  // ── PHASE 1 (official BCCI announcement) ──────────────────────────────
  {
    id: 'M01', matchNumber: 1,
    team1: 'RCB', team2: 'SRH',
    venue: 'M. Chinnaswamy Stadium', city: 'Bengaluru',
    matchDate: ist('2026-03-28', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M02', matchNumber: 2,
    team1: 'MI', team2: 'KKR',
    venue: 'Wankhede Stadium', city: 'Mumbai',
    matchDate: ist('2026-03-29', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M03', matchNumber: 3,
    team1: 'RR', team2: 'CSK',
    venue: 'Barsapara Cricket Stadium', city: 'Guwahati',
    matchDate: ist('2026-03-30', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M04', matchNumber: 4,
    team1: 'PBKS', team2: 'GT',
    venue: 'PCA Stadium', city: 'New Chandigarh',
    matchDate: ist('2026-03-31', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M05', matchNumber: 5,
    team1: 'LSG', team2: 'DC',
    venue: 'BRSABV Ekana Cricket Stadium', city: 'Lucknow',
    matchDate: ist('2026-04-01', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M06', matchNumber: 6,
    team1: 'KKR', team2: 'RCB',
    venue: 'Eden Gardens', city: 'Kolkata',
    matchDate: ist('2026-04-02', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M07', matchNumber: 7,
    team1: 'CSK', team2: 'MI',
    venue: 'MA Chidambaram Stadium', city: 'Chennai',
    matchDate: ist('2026-04-03', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  // Double header April 4
  {
    id: 'M08', matchNumber: 8,
    team1: 'DC', team2: 'MI',
    venue: 'Arun Jaitley Stadium', city: 'Delhi',
    matchDate: ist('2026-04-04', '15:30'), timeIST: '3:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M09', matchNumber: 9,
    team1: 'GT', team2: 'RR',
    venue: 'Narendra Modi Stadium', city: 'Ahmedabad',
    matchDate: ist('2026-04-04', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M10', matchNumber: 10,
    team1: 'SRH', team2: 'PBKS',
    venue: 'Rajiv Gandhi International Cricket Stadium', city: 'Hyderabad',
    matchDate: ist('2026-04-05', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M11', matchNumber: 11,
    team1: 'RCB', team2: 'LSG',
    venue: 'M. Chinnaswamy Stadium', city: 'Bengaluru',
    matchDate: ist('2026-04-06', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M12', matchNumber: 12,
    team1: 'RR', team2: 'MI',
    venue: 'Barsapara Cricket Stadium', city: 'Guwahati',
    matchDate: ist('2026-04-07', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M13', matchNumber: 13,
    team1: 'KKR', team2: 'CSK',
    venue: 'Eden Gardens', city: 'Kolkata',
    matchDate: ist('2026-04-08', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  // Double header April 9
  {
    id: 'M14', matchNumber: 14,
    team1: 'PBKS', team2: 'DC',
    venue: 'PCA Stadium', city: 'New Chandigarh',
    matchDate: ist('2026-04-09', '15:30'), timeIST: '3:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M15', matchNumber: 15,
    team1: 'SRH', team2: 'GT',
    venue: 'Rajiv Gandhi International Cricket Stadium', city: 'Hyderabad',
    matchDate: ist('2026-04-09', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M16', matchNumber: 16,
    team1: 'LSG', team2: 'KKR',
    venue: 'BRSABV Ekana Cricket Stadium', city: 'Lucknow',
    matchDate: ist('2026-04-10', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M17', matchNumber: 17,
    team1: 'MI', team2: 'RCB',
    venue: 'Wankhede Stadium', city: 'Mumbai',
    matchDate: ist('2026-04-11', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  // Double header April 12
  {
    id: 'M18', matchNumber: 18,
    team1: 'CSK', team2: 'RR',
    venue: 'MA Chidambaram Stadium', city: 'Chennai',
    matchDate: ist('2026-04-12', '15:30'), timeIST: '3:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M19', matchNumber: 19,
    team1: 'GT', team2: 'LSG',
    venue: 'Narendra Modi Stadium', city: 'Ahmedabad',
    matchDate: ist('2026-04-12', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  {
    id: 'M20', matchNumber: 20,
    team1: 'DC', team2: 'SRH',
    venue: 'Arun Jaitley Stadium', city: 'Delhi',
    matchDate: ist('2026-04-13', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 1,
  },
  // ── PHASE 2 (placeholder — admin updates when BCCI releases) ──────────
  // Add more matches here after BCCI announces Phase 2 schedule
  // Playoffs
  {
    id: 'Q1', matchNumber: 69,
    team1: 'TBD' as any, team2: 'TBD' as any,
    venue: 'TBD', city: 'TBD',
    matchDate: ist('2026-05-26', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 2,
  },
  {
    id: 'E1', matchNumber: 70,
    team1: 'TBD' as any, team2: 'TBD' as any,
    venue: 'TBD', city: 'TBD',
    matchDate: ist('2026-05-27', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 2,
  },
  {
    id: 'Q2', matchNumber: 71,
    team1: 'TBD' as any, team2: 'TBD' as any,
    venue: 'TBD', city: 'TBD',
    matchDate: ist('2026-05-29', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 2,
  },
  {
    id: 'FINAL', matchNumber: 84,
    team1: 'TBD' as any, team2: 'TBD' as any,
    venue: 'M. Chinnaswamy Stadium', city: 'Bengaluru',
    matchDate: ist('2026-05-31', '19:30'), timeIST: '7:30 PM IST',
    status: 'upcoming', tossPredictionOpen: false, matchPredictionOpen: false, phase: 2,
  },
]
