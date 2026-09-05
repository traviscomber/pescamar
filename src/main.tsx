import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import { RouteScrollReset } from './components/RouteScrollReset'
import { SeaUrchinAssistant } from './components/SeaUrchinAssistant'
import './app.css'

createRoot(document.getElementById('root')!).render(
 <StrictMode>
  <AuthProvider>
   <BrowserRouter>
    <RouteScrollReset/>
    <App />
    <SeaUrchinAssistant/>
   </BrowserRouter>
  </AuthProvider>
 </StrictMode>,
)
