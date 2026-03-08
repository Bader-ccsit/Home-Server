import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Activate from './pages/Activate'
import Home from './pages/Home'
import Drive from './pages/Drive'
import BaderTube from './pages/BaderTube'
import Reset from './pages/Reset'
import './styles.css'
import { I18nProvider } from './contexts/I18nContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'

function hasToken() {
  return !!localStorage.getItem('token')
}

function RequireAuth({ children }: { children: JSX.Element }) {
  return hasToken() ? children : <Navigate to="/signin" replace />
}

function PublicOnly({ children }: { children: JSX.Element }) {
  return hasToken() ? <Navigate to="/home" replace /> : children
}

function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/signin" element={<PublicOnly><SignIn /></PublicOnly>} />
              <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
              <Route path="/activate" element={<Activate />} />
              <Route path="/reset" element={<Reset />} />
              <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
              <Route path="/drive" element={<RequireAuth><Drive /></RequireAuth>} />
              <Route path="/badertube" element={<RequireAuth><BaderTube /></RequireAuth>} />
              <Route path="/" element={<Navigate to={hasToken() ? '/home' : '/signin'} replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ThemeProvider>
    </I18nProvider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
