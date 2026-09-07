import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useLocation } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import { RouteScrollReset } from './components/RouteScrollReset'
import {LocaleProvider,localeFromPath,type Locale} from './i18n'
import './app.css'

const SeaUrchinAssistant=lazy(()=>import('./components/SeaUrchinAssistant').then(module=>({default:module.SeaUrchinAssistant})))

function RouteScopedSeaUrchinAssistant(){
 const {pathname}=useLocation()
 const relevant=pathname.startsWith('/proceso-erizo')||pathname.startsWith('/erizo/')||pathname.startsWith('/lotes/')
 if(!relevant)return null
 return <Suspense fallback={null}><SeaUrchinAssistant/></Suspense>
}

let locale=localeFromPath(window.location.pathname)
if(!locale){
 const next=`/es${window.location.pathname==='/'?'':window.location.pathname}${window.location.search}${window.location.hash}`
 window.history.replaceState(null,'',next)
 locale='es'
}
document.documentElement.lang=locale

createRoot(document.getElementById('root')!).render(
 <StrictMode>
  <LocaleProvider locale={locale as Locale}>
   <AuthProvider>
    <BrowserRouter basename={`/${locale}`}>
     <RouteScrollReset/>
     <App />
     <RouteScopedSeaUrchinAssistant/>
    </BrowserRouter>
   </AuthProvider>
  </LocaleProvider>
 </StrictMode>,
)
