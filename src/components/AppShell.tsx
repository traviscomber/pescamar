import {Activity,Blocks,Boxes,CalendarCheck2,CheckCheck,CircleDollarSign,ClipboardList,Factory,FileSpreadsheet,History,Landmark,LayoutDashboard,LogOut,Menu,Moon,PackageSearch,ReceiptText,Settings2,ShoppingCart,Sun,Target,X} from "lucide-react";
import {NavLink,useLocation} from "react-router-dom";
import {useEffect,useState,type ReactNode} from "react";
import {canAccessPath,canCreateReception} from "../access";
import {useAuth} from "../auth";
import {usePlatformStatus} from "../hooks/usePlatformStatus";

const primaryNavigation=[
  {to:"/",label:"Hoy",icon:LayoutDashboard},
  {to:"/recepciones",label:"Recepciones",icon:Boxes},
  {to:"/lineas",label:"Producción",icon:Blocks},
  {to:"/inventario",label:"Inventario",icon:PackageSearch},
  {to:"/timeline",label:"Línea de tiempo",icon:History},
];
const workflowGroups=[
  {label:"Planificación y comercial",icon:Target,items:[
    {to:"/planificacion",label:"Planificación",icon:Target},
    {to:"/ordenes-venta",label:"Órdenes de venta",icon:ClipboardList},
    {to:"/despachos-ventas",label:"Despachos y ventas",icon:ShoppingCart},
  ]},
  {label:"Finanzas y control",icon:CircleDollarSign,items:[
    {to:"/aprobaciones",label:"Decisiones",icon:CheckCheck},
    {to:"/costos-transformacion",label:"Costos",icon:CircleDollarSign},
    {to:"/creditos",label:"Créditos y anticipos",icon:Landmark},
    {to:"/liquidaciones",label:"Liquidaciones",icon:ReceiptText},
    {to:"/cierre-diario",label:"Cierre diario",icon:CalendarCheck2},
  ]},
  {label:"Gestión",icon:Settings2,items:[
    {to:"/plantas",label:"Plantas",icon:Factory},
    {to:"/importaciones",label:"Importaciones",icon:FileSpreadsheet},
    {to:"/operadores",label:"Operadores",icon:Settings2},
  ]},
];
const roleLabels={admin:"Administrador",operations:"Gerente de Operaciones",finance:"Finanzas",quality:"Calidad",viewer:"Lectura"} as const;

export function AppShell({children,onNewReception}:{children:ReactNode;onNewReception:()=>void}){
  const [mobileOpen,setMobileOpen]=useState(false);
  const [theme,setTheme]=useState<"light"|"dark">(()=>{const saved=localStorage.getItem("pescamar-theme");if(saved==="light"||saved==="dark")return saved;return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"});
  const {operator,logout}=useAuth();
  const {pathname}=useLocation();
  const {status}=usePlatformStatus();
  useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;localStorage.setItem("pescamar-theme",theme)},[theme]);
  const context=pathname==="/"?"Operación de hoy":pathname.startsWith("/timeline")||pathname.startsWith("/operacion-2025")?"Línea de tiempo":pathname.startsWith("/planificacion")?"Planificación":pathname.startsWith("/aprobaciones")?"Decisiones":pathname.startsWith("/recepciones")?"Recepciones":pathname.startsWith("/inventario")?"Inventario":pathname.startsWith("/costos-transformacion")?"Costos":pathname.startsWith("/ordenes-venta")?"Órdenes de venta":pathname.startsWith("/despachos-ventas")?"Despachos y ventas":pathname.startsWith("/cierre-diario")?"Cierre diario":pathname.startsWith("/plantas")?"Plantas":pathname.startsWith("/lineas")?"Producción":pathname.startsWith("/creditos")?"Créditos y anticipos":pathname.startsWith("/liquidaciones")?"Liquidaciones":pathname.startsWith("/importaciones")?"Importaciones":pathname.startsWith("/operadores")?"Operadores":"Configuración";
  const initials=operator?.fullName.split(" ").map(part=>part[0]).slice(0,2).join("").toUpperCase()||"PS";
  const visiblePrimary=operator?primaryNavigation.filter(item=>canAccessPath(operator.role,item.to)):[];
  const visibleGroups=operator?workflowGroups.map(group=>({...group,items:group.items.filter(item=>canAccessPath(operator.role,item.to))})).filter(group=>group.items.length):[];
  const mayCreate=operator?canCreateReception(operator.role):false;
  const platformLabel=!status?"Verificando":status.ok?"Plataforma activa":"Revisar plataforma";
  const databaseLabel=!status?"Sincronizando estado":status.persistence.database?"Neon conectado":"Base pendiente";
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?"is-open":""}`}>
      <div className="brand"><span className="pescamar-symbol" aria-hidden="true"><svg viewBox="0 0 52 34" role="img"><path d="M4 17c8-8 17-12 27-10 5 1 10 4 15 10-5 6-10 9-15 10-10 2-19-2-27-10Z"/><path d="M36 11c4-4 8-6 12-6-1 5-1 8 0 12-4 0-8-2-12-6Z"/><circle cx="14" cy="15" r="1.35"/><path className="brand-wave" d="M3 27c8-3 15-3 22 0s15 3 24-1"/></svg></span><div className="brand-copy"><strong className="brand-name">Pescamar</strong><small className="brand-product">Control operacional</small></div><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú"><X size={18}/></button></div>
      <div className="plant-chip"><span className="live-dot pending"/><div><b>Red Pescamar</b><small>{operator?.role==="admin"?"Cobertura corporativa · 6 plantas":operator?.plantIds.length?`${operator.plantIds.length} planta${operator.plantIds.length===1?"":"s"} bajo tu alcance`:"Sin plantas asignadas"}</small></div></div>
      <nav className="side-nav grouped-nav" aria-label="Navegación principal">
        <section><small>Operación</small>{visiblePrimary.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==="/"} onClick={()=>setMobileOpen(false)}><Icon size={18}/><span>{label}</span></NavLink>)}</section>
        {visibleGroups.map(({label,icon:GroupIcon,items})=><details className="nav-more" key={label} open={items.some(item=>pathname.startsWith(item.to))}><summary><GroupIcon size={18}/><span>{label}</span></summary><div>{items.map(({to,label:itemLabel,icon:Icon})=><NavLink key={to} to={to} onClick={()=>setMobileOpen(false)}><Icon size={18}/><span>{itemLabel}</span></NavLink>)}</div></details>)}
      </nav>
      <div className="sidebar-spacer"/>
      <div className="pilot-card"><span className="overline">Continuidad operacional</span><b>2025 es el origen, no el límite</b><p>La fuente canónica 2025 abre la línea. Cada evento real posterior continúa el mismo sistema.</p><span className="n3-signature">PESCAMAR · CONTROL OPERACIONAL</span></div>
      {operator&&canAccessPath(operator.role,"/modulos")?<NavLink className="settings-link" to="/modulos"><Settings2 size={18}/><span>Configuración</span></NavLink>:null}
    </aside>
    <div className="workspace"><header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú"><Menu size={20}/></button><div className="topbar-context"><span>Pescamar</span><b>{context}</b></div><div className="topbar-actions">
      <button className="theme-toggle" type="button" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label={`Activar modo ${theme==="dark"?"claro":"oscuro"}`} aria-pressed={theme==="dark"} title={`Modo ${theme==="dark"?"claro":"oscuro"}`}>{theme==="dark"?<Sun size={15}/>:<Moon size={15}/>}<span>{theme==="dark"?"Claro":"Oscuro"}</span></button>
      {operator&&canAccessPath(operator.role,"/modulos")?<NavLink className="system-state" to="/modulos"><Activity size={15}/><span><b>{platformLabel}</b><small>{databaseLabel}</small></span></NavLink>:<div className="system-state"><Activity size={15}/><span><b>{platformLabel}</b><small>{databaseLabel}</small></span></div>}
      <button className="operator-state operator-session-button" type="button" onClick={()=>void logout()} title="Cerrar sesión"><span>{initials}</span><div><b>{operator?.fullName??"Sesión operativa"}</b><small>{operator?roleLabels[operator.role]:"Operador"}</small></div><LogOut size={14}/></button>
    </div></header><main className="main-content">{children}</main></div>
    {mayCreate?<button className="floating-action" onClick={onNewReception}>+ Nueva recepción</button>:null}
  </div>;
}
