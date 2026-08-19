import { Bell, Blocks, Boxes, ChartNoAxesCombined, CheckCheck, ChevronDown, Factory, Gauge, Menu, Settings2, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState, type ReactNode } from 'react'

const navigation = [
  { to:'/', label:'Centro de control', icon:Gauge },
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
      <div className="pilot-card"><span className="overline">Control por excepción</span><b>5 responsables activos</b><p>El sistema automatiza el flujo y eleva solamente decisiones que necesitan criterio humano.</p><div className="pilot-stat"><ChartNoAxesCombined size={16}/><span><strong>3</strong> aprobaciones pendientes</span></div></div>
      <NavLink className="settings-link" to="/configuracion"><Settings2 size={18}/><span>Configuración</span></NavLink>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú"><Menu size={20}/></button><div className="topbar-context"><span>Operación</span><b>Miércoles, 19 agosto 2026</b></div><div className="topbar-actions"><button className="icon-btn notification" aria-label="Notificaciones"><Bell size={19}/><i>3</i></button><button className="user-menu"><span>TC</span><div><b>Travis Comber</b><small>Administrador</small></div><ChevronDown size={15}/></button></div></header>
      <main className="main-content">{children}</main>
    </div>
    <button className="floating-action" onClick={onNewReception}>+ Nueva recepción</button>
  </div>
}
