import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Activate from './pages/Activate'
import Home from './pages/Home'
import Drive from './pages/Drive'
import BaderTube from './pages/BaderTube'
import Aflami from './pages/Aflami'
import AflamiManage from './pages/AflamiManage'
import AflamiView from './pages/AflamiView'
import AflamiManageMovie from './pages/AflamiManageMovie'
import Hmlny from './pages/Hmlny'
import ShoppingCart from './pages/ShoppingCart'
import Al3abi from './pages/Al3abi'
import Al3abiRetro from './pages/Al3abiRetro'
import Al3abiFamily from './pages/Al3abiFamily'
import Al3abiGameView from './pages/Al3abiGameView'
import Al3abiManage from './pages/Al3abiManage'
import Al3abiManageGame from './pages/Al3abiManageGame'
import Al3abiFamilyLocalGame from './pages/Al3abiFamilyLocalGame'
import PasteMe from './pages/PasteMe'
import SecretsVerify from './pages/SecretsVerify'
import Secrets from './pages/Secrets'
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
              <Route path="/aflami" element={<RequireAuth><Aflami /></RequireAuth>} />
              <Route path="/aflami/:id" element={<RequireAuth><AflamiView /></RequireAuth>} />
              <Route path="/aflami/manage" element={<RequireAuth><AflamiManage /></RequireAuth>} />
              <Route path="/aflami/manage/:id" element={<RequireAuth><AflamiManageMovie /></RequireAuth>} />
              <Route path="/7mlny" element={<RequireAuth><Hmlny /></RequireAuth>} />
              <Route path="/shopping-cart" element={<RequireAuth><ShoppingCart /></RequireAuth>} />
              <Route path="/pasteme" element={<RequireAuth><PasteMe /></RequireAuth>} />
              <Route path="/al3abi" element={<RequireAuth><Al3abi /></RequireAuth>} />
              <Route path="/al3abi/retro" element={<RequireAuth><Al3abiRetro /></RequireAuth>} />
              <Route path="/al3abi/family" element={<RequireAuth><Al3abiFamily /></RequireAuth>} />
              <Route path="/al3abi/family/local/:slug" element={<RequireAuth><Al3abiFamilyLocalGame /></RequireAuth>} />
              <Route path="/al3abi/game/:id" element={<RequireAuth><Al3abiGameView /></RequireAuth>} />
              <Route path="/al3abi/manage" element={<RequireAuth><Al3abiManage /></RequireAuth>} />
              <Route path="/al3abi/manage/:id" element={<RequireAuth><Al3abiManageGame /></RequireAuth>} />
              <Route path="/secrets/verify" element={<RequireAuth><SecretsVerify /></RequireAuth>} />
              <Route path="/secrets" element={<RequireAuth><Secrets /></RequireAuth>} />
              <Route path="/" element={<Navigate to={hasToken() ? '/home' : '/signin'} replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ThemeProvider>
    </I18nProvider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
