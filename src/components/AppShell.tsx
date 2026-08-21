import { Activity, Blocks, Boxes, CheckCheck, ChevronDown, Database, Factory, FileSpreadsheet, Landmark, LayoutDashboard, Menu, Settings2, X } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { usePlatformStatus } from '../hooks/usePlatformStatus'

const navigation = [
  {label:'Trabajo',items:[{to:'/',label:'Operación de hoy',icon:LayoutDashboard},{to:'/aprobaciones',label:'Decisiones',icon:CheckCheck}]},
  {label:'Operación',items:[{to:'/recepciones',label:'Recepciones',icon:Boxes},{to:'/plantas',label:'Plantas',icon:Factory},{to:'/lineas',label:'Producción',icon:Blocks}]},
  {label:'Comercial',items:[{to:'/creditos',label:'Créditos y anticipos',icon:Landmark}]},
  {label:'Control',items:[{to:'/importaciones',label:'Importaciones',icon:FileSpreadsheet},{to:'/operacion-2025',label:'Fuente canónica 2025',icon:Database}]}
]

export function AppShell({ children, onNewReception }:{ children:ReactNode; onNewReception:()=>void }) {
  const [mobileOpen,setMobileOpen]=useState(false)
  const {pathname}=useLocation(),{status}=usePlatformStatus()
  const context=pathname==='/'?'Operación de hoy':pathname.startsWith('/aprobaciones')?'Decisiones':pathname.startsWith('/recepciones')?'Recepciones':pathname.startsWith('/plantas')?'Red de plantas':pathname.startsWith('/lineas')?'Producción':pathname.startsWith('/creditos')?'Créditos y anticipos':pathname.startsWith('/importaciones')?'Importaciones':pathname.startsWith('/operacion-2025')?'Fuente canónica':'Configuración'
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?'is-open':''}`}>
      <div className="brand"><span className="brand-mark">N3</span><div><strong>Pescamar ERP</strong><small>Operado por N3uralia</small></div><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú"><X size={18}/></button></div>
      <div className="plant-chip"><span className="live-dot pending"/><div><b>Red Pescamar</b><small>Fuentes por conectar</small></div><ChevronDown size={15}/></div>
      <nav className="side-nav grouped-nav" aria-label="Navegación principal">{navigation.map(group=><section key={group.label}><small>{group.label}</small>{group.items.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/'} onClick={()=>setMobileOpen(false)}><Icon size={18}/><span>{label}</span></NavLink>)}</section>)}</nav>
      <div className="sidebar-spacer"/>
      <div className="pilot-card"><span className="overline">Control por excepción</span><b>Operación simplificada</b><p>El sistema eleva solamente decisiones que necesitan criterio humano.</p></div>
      <NavLink className="settings-link" to="/modulos"><Settings2 size={18}/><span>Configuración modular</span></NavLink>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú"><Menu size={20}/></button><div className="topbar-context"><span>Centro de control</span><b>{context}</b></div><div className="topbar-actions"><NavLink className="system-state" to="/modulos"><Activity size={15}/><span><b>{status?.ok?'Plataforma activa':'Conexión pendiente'}</b><small>{status?.persistence.database?'Base conectada':'PostgreSQL pendiente'}</small></span></NavLink><div className="operator-state"><span>PS</span><div><b>Sesión operativa</b><small>Identidad por configurar</small></div></div></div></header>
      <main className="main-content">{children}</main>
    </div>
    <button className="floating-action" onClick={onNewReception}>+ Nueva recepción</button>
  </div>
}
