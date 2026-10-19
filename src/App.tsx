import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthProvider } from './auth/AuthProvider'
import { RequireStatus } from './auth/RequireStatus'
import { Login } from './pages/Login'
import { SignUp } from './pages/SignUp'
import { MfaSetup } from './pages/MfaSetup'
import { MfaVerify } from './pages/MfaVerify'
import { Home } from './pages/Home'
import { SetupNeeded } from './pages/SetupNeeded'

export default function App() {
  if (!isSupabaseConfigured) return <SetupNeeded />

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<RequireStatus allow={['signed-out']}><Login /></RequireStatus>} />
          <Route path="/signup" element={<RequireStatus allow={['signed-out']}><SignUp /></RequireStatus>} />
          <Route path="/mfa/setup" element={<RequireStatus allow={['needs-enroll']}><MfaSetup /></RequireStatus>} />
          <Route path="/mfa/verify" element={<RequireStatus allow={['needs-verify']}><MfaVerify /></RequireStatus>} />
          <Route path="/" element={<RequireStatus allow={['ready']}><Home /></RequireStatus>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
