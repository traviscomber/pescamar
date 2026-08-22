import {Activity,Blocks,Boxes,CheckCheck,ChevronDown,Database,Factory,FileSpreadsheet,Landmark,LayoutDashboard,LogOut,Menu,Moon,ReceiptText,Settings2,Sun,X} from "lucide-react";
import {NavLink,useLocation} from "react-router-dom";
import {useEffect,useState,type ReactNode} from "react";
import {canAccessPath,canCreateReception} from "../access";
import {useAuth} from "../auth";
import {usePlatformStatus} from "../hooks/usePlatformStatus";

const navigation=[{label:"Operación diaria",items:[
  {to:"/",label:"Operación de hoy",icon:LayoutDashboard},
  {to:"/aprobaciones",label:"Decisiones",icon:CheckCheck},
  {to:"/recepciones",label:"Recepciones",icon:Boxes},
  {to:"/creditos",label:"Créditos y anticipos",icon:Landmark},
  {to:"/liquidaciones",label:"Liquidaciones",icon:ReceiptText},
]}];
const secondaryNavigation=[
  {to:"/plantas",label:"Plantas",icon:Factory},
  {to:"/lineas",label:"Producción",icon:Blocks},
  {to:"/operacion-2025",label:"Fuente canónica 2025",icon:Database},
  {to:"/importaciones",label:"Importaciones",icon:FileSpreadsheet},
  {to:"/operadores",label:"Operadores",icon:Settings2},
];
const roleLabels={admin:"Administrador",operations:"Operaciones",finance:"Finanzas",quality:"Calidad",viewer:"Lectura"} as const;

export function AppShell({children,onNewReception}:{children:ReactNode;onNewReception:()=>void}){
  const [mobileOpen,setMobileOpen]=useState(false);
  const [theme,setTheme]=useState<"light"|"dark">(()=>{const saved=localStorage.getItem("pescamar-theme");if(saved==="light"||saved==="dark")return saved;return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"});
  const {operator,logout}=useAuth();
  const {pathname}=useLocation();
  const {status}=usePlatformStatus();
  useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;localStorage.setItem("pescamar-theme",theme)},[theme]);
  const context=pathname==="/"?"Operación de hoy":pathname.startsWith("/aprobaciones")?"Decisiones":pathname.startsWith("/recepciones")?"Recepciones":pathname.startsWith("/plantas")?"Red de plantas":pathname.startsWith("/lineas")?"Producción":pathname.startsWith("/creditos")?"Créditos y anticipos":pathname.startsWith("/liquidaciones")?"Liquidaciones":pathname.startsWith("/importaciones")?"Importaciones":pathname.startsWith("/operacion-2025")?"Fuente canónica":pathname.startsWith("/operadores")?"Operadores":"Configuración";
  const initials=operator?.fullName.split(" ").map(part=>part[0]).slice(0,2).join("").toUpperCase()||"PS";
  const visiblePrimary=operator?navigation.map(group=>({...group,items:group.items.filter(item=>canAccessPath(operator.role,item.to))})):[];
  const visibleSecondary=operator?secondaryNavigation.filter(item=>canAccessPath(operator.role,item.to)):[];
  const mayCreate=operator?canCreateReception(operator.role):false;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?"is-open":""}`}>
      <div className="brand"><span className="pescamar-symbol" aria-hidden="true"><svg viewBox="0 0 52 34" role="img"><path d="M4 17c8-8 17-12 27-10 5 1 10 4 15 10-5 6-10 9-15 10-10 2-19-2-27-10Z"/><path d="M36 11c4-4 8-6 12-6-1 5-1 8 0 12-4 0-8-2-12-6Z"/><circle cx="14" cy="15" r="1.35"/><path className="brand-wave" d="M3 27c8-3 15-3 22 0s15 3 24-1"/></svg></span><div className="brand-copy"><strong className="brand-name">Pescamar</strong><small className="brand-product">Control operacional</small></div><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú"><X size={18}/></button></div>
      <div className="plant-chip"><span className="live-dot pending"/><div><b>Red Pescamar</b><small>{operator?.role==="admin"?"Acceso a seis plantas":operator?.plantIds.length?`${operator.plantIds.length} planta${operator.plantIds.length===1?"":"s"} autorizada${operator.plantIds.length===1?"":"s"}`:"Sin plantas asignadas"}</small></div><ChevronDown size={15}/></div>
      <nav className="side-nav grouped-nav" aria-label="Navegación principal">
        {visiblePrimary.map(group=><section key={group.label}><small>{group.label}</small>{group.items.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==="/"} onClick={()=>setMobileOpen(false)}><Icon size={18}/><span>{label}</span></NavLink>)}</section>)}
        {visibleSecondary.length?<details className="nav-more"><summary><Blocks size={18}/><span>Más módulos</span><ChevronDown size={14}/></summary><div>{visibleSecondary.map(({to,label,icon:Icon})=><NavLink key={to} to={to} onClick={()=>setMobileOpen(false)}><Icon size={18}/><span>{label}</span></NavLink>)}</div></details>:null}
      </nav>
      <div className="sidebar-spacer"/>
      <div className="pilot-card"><span className="overline">Control por excepción</span><b>Operación simplificada</b><p>El sistema eleva solamente decisiones que necesitan criterio humano.</p><span className="n3-signature">N3URALIA / INTELLIGENCE SYSTEM</span></div>
      {operator&&canAccessPath(operator.role,"/modulos")?<NavLink className="settings-link" to="/modulos"><Settings2 size={18}/><span>Configuración modular</span></NavLink>:null}
    </aside>
    <div className="workspace"><header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú"><Menu size={20}/></button><div className="topbar-context"><span>Centro de control</span><b>{context}</b></div><div className="topbar-actions">
      <button className="theme-toggle" type="button" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label={`Activar modo ${theme==="dark"?"claro":"oscuro"}`} aria-pressed={theme==="dark"} title={`Modo ${theme==="dark"?"claro":"oscuro"}`}>{theme==="dark"?<Sun size={15}/>:<Moon size={15}/>}<span>{theme==="dark"?"Claro":"Oscuro"}</span></button>
      {operator&&canAccessPath(operator.role,"/modulos")?<NavLink className="system-state" to="/modulos"><Activity size={15}/><span><b>{status?.ok?"Plataforma activa":"Conexión pendiente"}</b><small>{status?.persistence.database?"Base conectada":"PostgreSQL pendiente"}</small></span></NavLink>:<div className="system-state"><Activity size={15}/><span><b>{status?.ok?"Plataforma activa":"Conexión pendiente"}</b><small>{status?.persistence.database?"Base conectada":"PostgreSQL pendiente"}</small></span></div>}
      <button className="operator-state operator-session-button" type="button" onClick={()=>void logout()} title="Cerrar sesión"><span>{initials}</span><div><b>{operator?.fullName??"Sesión operativa"}</b><small>{operator?roleLabels[operator.role]:"Operador"}</small></div><LogOut size={14}/></button>
    </div></header><main className="main-content">{children}</main></div>
    {mayCreate?<button className="floating-action" onClick={onNewReception}>+ Nueva recepción</button>:null}
  </div>;
}
