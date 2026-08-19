import { Bell, Blocks, Boxes, CheckCheck, ChevronDown, Database, Factory, Landmark, LayoutDashboard, Menu, Settings2, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState, type ReactNode } from 'react'

const navigation = [
  { to:'/', label:'Control de plantas', icon:LayoutDashboard },
  { to:'/operacion-2025', label:'Operación 2025', icon:Database },
  { to:'/creditos', label:'Créditos y anticipos', icon:Landmark },
  { to:'/aprobaciones', label:'Aprobaciones', icon:CheckCheck },
  { to:'/recepciones', label:'Recepciones', icon:Boxes },
  { to:'/lineas', label:'Producción', icon:Factory },
  { to:'/modulos', label:'Módulos', icon:Blocks }
]

export function AppShell({ children, onNewReception }:{ children:ReactNode; onNewReception:()=>void }) {
  const [mobileOpen,setMobileOpen]=useState(false)
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?'is-open':''}`}>
      <div className="brand"><span className="brand-mark">N3</span><div><strong>Pescamar ERP</strong><small>Operado por N3uralia</small></div><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú"><X size={18}/></button></div>
      <div className="plant-chip"><span className="live-dot"/><div><b>Planta Ancud</b><small>Operación en línea</small></div><ChevronDown size={15}/></div>
      <nav className="side-nav" aria-label="Navegación principal">{navigation.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/'} onClick={()=>setMobileOpen(false)}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="pilot-card"><span className="overline">Control por excepción</span><b>Operación simplificada</b><p>El sistema eleva solamente decisiones que necesitan criterio humano.</p></div>
      <NavLink className="settings-link" to="/modulos"><Settings2 size={18}/><span>Configuración modular</span></NavLink>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú"><Menu size={20}/></button><div className="topbar-context"><span>Centro de control</span><b>6 plantas conectadas por planillas</b></div><div className="topbar-actions"><button className="icon-btn notification" aria-label="Notificaciones"><Bell size={19}/></button><button className="user-menu"><span>PS</span><div><b>Sesión ejecutiva</b><small>Vista multiplanta</small></div><ChevronDown size={15}/></button></div></header>
      <main className="main-content">{children}</main>
    </div>
    <button className="floating-action" onClick={onNewReception}>+ Nueva recepción</button>
  </div>
}
