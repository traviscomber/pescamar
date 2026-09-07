import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import { RouteScrollReset } from './components/RouteScrollReset'
import {LocaleProvider,localeFromPath,type Locale} from './i18n'
import './app.css'

const PlantAssistant=lazy(()=>import('./components/PlantAssistant').then(module=>({default:module.PlantAssistant})))

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
     <Suspense fallback={null}><PlantAssistant/></Suspense>
    </BrowserRouter>
   </AuthProvider>
  </LocaleProvider>
 </StrictMode>,
)
