import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

// Auth
import LoginPage from './pages/auth/LoginPage'
import OTPPage from './pages/auth/OTPPage'
import ProfileSetupPage from './pages/auth/ProfileSetupPage'
import AdminLoginPage from './pages/auth/AdminLoginPage'

// User
import UserHome from './pages/user/UserHome'
import JoinPartyPage from './pages/user/JoinPartyPage'
import PredictPage from './pages/user/PredictPage'
import UserPartyPage from './pages/user/UserPartyPage'

// Host
import HostDashboard from './pages/host/HostDashboard'
import CreatePartyPage from './pages/host/CreatePartyPage'
import HostPartyPage from './pages/host/HostPartyPage'
import LeaderboardDisplay from './pages/host/LeaderboardDisplay'
import QRCodePage from './pages/host/QRCodePage'
import AdjustPointsPage from './pages/host/AdjustPointsPage'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminFixtures from './pages/admin/AdminFixtures'
import AdminMatchDetail from './pages/admin/AdminMatchDetail'
import AdminParties from './pages/admin/AdminParties'

function RequireAuth({ children, role }: { children: JSX.Element; role?: string }) {
  const { firebaseUser, appUser, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-ipl-orange border-t-transparent rounded-full animate-spin" /></div>
  if (!firebaseUser) return <Navigate to="/login" replace />
  if (role && appUser?.role !== role) return <Navigate to="/" replace />
  return children
}

function RoleRouter() {
  const { appUser, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-ipl-orange border-t-transparent rounded-full animate-spin" /></div>
  if (!appUser) return <Navigate to="/login" replace />
  if (appUser.role === 'admin') return <Navigate to="/admin" replace />
  if (appUser.role === 'host') return <Navigate to="/host" replace />
  return <Navigate to="/home" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" toastOptions={{ duration: 2500, style: { borderRadius: '12px', fontSize: '14px' } }} />
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RoleRouter />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/otp" element={<OTPPage />} />
        <Route path="/setup" element={<ProfileSetupPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />

        {/* Join via QR/link */}
        <Route path="/join" element={<JoinPartyPage />} />

        {/* User */}
        <Route path="/home" element={<RequireAuth><UserHome /></RequireAuth>} />
        <Route path="/party/:partyId" element={<RequireAuth><UserPartyPage /></RequireAuth>} />
        <Route path="/party/:partyId/predict" element={<RequireAuth><PredictPage /></RequireAuth>} />

        {/* Host */}
        <Route path="/host" element={<RequireAuth role="host"><HostDashboard /></RequireAuth>} />
        <Route path="/host/create" element={<RequireAuth role="host"><CreatePartyPage /></RequireAuth>} />
        <Route path="/host/party/:partyId" element={<RequireAuth role="host"><HostPartyPage /></RequireAuth>} />
        <Route path="/host/party/:partyId/leaderboard" element={<RequireAuth role="host"><LeaderboardDisplay /></RequireAuth>} />
        <Route path="/host/party/:partyId/adjust" element={<RequireAuth role="host"><AdjustPointsPage /></RequireAuth>} />
        <Route path="/host/qr" element={<RequireAuth role="host"><QRCodePage /></RequireAuth>} />

        {/* Admin */}
        <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/fixtures" element={<RequireAuth role="admin"><AdminFixtures /></RequireAuth>} />
        <Route path="/admin/fixtures/:matchId" element={<RequireAuth role="admin"><AdminMatchDetail /></RequireAuth>} />
        <Route path="/admin/parties" element={<RequireAuth role="admin"><AdminParties /></RequireAuth>} />

        {/* Leaderboard public display (for TV casting) */}
        <Route path="/display/:partyId" element={<LeaderboardDisplay />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
