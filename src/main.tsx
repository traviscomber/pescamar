import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import { RouteScrollReset } from './components/RouteScrollReset'
import './app.css'

const SeaUrchinAssistant=lazy(()=>import('./components/SeaUrchinAssistant').then(module=>({default:module.SeaUrchinAssistant})))

function RouteScopedSeaUrchinAssistant(){
 const {pathname}=useLocation()
 const relevant=pathname.startsWith('/proceso-erizo')||pathname.startsWith('/erizo/')||pathname.startsWith('/lotes/')
 if(!relevant)return null
 return <Suspense fallback={null}><SeaUrchinAssistant/></Suspense>
}

createRoot(document.getElementById('root')!).render(
 <StrictMode>
  <AuthProvider>
   <BrowserRouter>
    <RouteScrollReset/>
    <App />
    <RouteScopedSeaUrchinAssistant/>
   </BrowserRouter>
  </AuthProvider>
 </StrictMode>,
)
