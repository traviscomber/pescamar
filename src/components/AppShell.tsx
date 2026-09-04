import {Activity,Blocks,Boxes,CheckCheck,CircleDollarSign,ClipboardList,Factory,FileSpreadsheet,FlaskConical,History,Landmark,LayoutDashboard,LogOut,Menu,MessageCircleMore,Moon,PackageSearch,ReceiptText,Settings2,ShoppingCart,Sparkles,Sun,Tag,Target,X} from "lucide-react";
import {NavLink,useLocation} from "react-router-dom";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {canAccessPath,canCreateReception} from "../access";
import {useAuth} from "../auth";
import {usePlatformStatus} from "../hooks/usePlatformStatus";
import {getOsModule} from "../os";
import {seafoodProduct} from "../product";

const primaryNavigation=[
 {to:"/",label:"Hoy",icon:LayoutDashboard},
 {to:"/pescamar-ia",label:"Pescamar IA",icon:Sparkles},
 {to:"/plantas",label:"Plantas",icon:Factory},
 {to:"/recepciones",label:"Recepciones",icon:Boxes},
 {to:"/inventario",label:"Inventario",icon:PackageSearch},
 {to:"/ordenes-venta",label:"Comercial",icon:ShoppingCart},
];
const workflowGroups=[
 {label:"Operación",icon:Factory,items:[
  {to:"/planificacion",label:"Planificación",icon:Target},
  {to:"/lineas",label:"Producción",icon:Blocks},
  {to:"/proceso-erizo",label:"Proceso erizo",icon:FlaskConical},
  {to:"/floor",label:"Piso / packing",icon:Factory},
  {to:"/etiquetas",label:"Etiquetas",icon:Tag},
  {to:"/impresion-etiquetas",label:"Impresión etiquetas",icon:Tag},
  {to:"/pallets",label:"Pallets",icon:Boxes},
  {to:"/frio",label:"Cadena de frío",icon:Activity},
  {to:"/control-regulatorio",label:"Control regulatorio",icon:CheckCheck},
  {to:"/inventario-materiales",label:"Materias e insumos",icon:PackageSearch},
 ]},
 {label:"Comercial y finanzas",icon:CircleDollarSign,items:[
  {to:"/proveedores-clientes",label:"Proveedores y clientes",icon:Landmark},
  {to:"/rentabilidad",label:"Rentabilidad",icon:CircleDollarSign},
  {to:"/despachos-ventas",label:"Despachos y ventas",icon:ShoppingCart},
  {to:"/aprobaciones",label:"Decisiones",icon:CheckCheck},
  {to:"/costos-transformacion",label:"Costos",icon:CircleDollarSign},
  {to:"/creditos",label:"Créditos y anticipos",icon:Landmark},
  {to:"/liquidaciones",label:"Liquidaciones",icon:ReceiptText},
 ]},
 {label:"Trazabilidad y gestión",icon:Settings2,items:[
  {to:"/comunicaciones",label:"Comunicaciones",icon:MessageCircleMore},
  {to:"/timeline",label:"Línea de tiempo",icon:History},
  {to:"/auditoria",label:"Auditoría operacional",icon:ClipboardList},
  {to:"/observabilidad",label:"Observabilidad",icon:Activity},
  {to:"/identidades-plantas",label:"Identidades históricas",icon:History},
  {to:"/importaciones",label:"Importaciones",icon:FileSpreadsheet},
  {to:"/estaciones",label:"Estaciones y dispositivos",icon:Factory},
  {to:"/operadores",label:"Operadores",icon:Settings2},
 ]},
];
const roleLabels={admin:"Administrador",operations:"Gerente de Operaciones",finance:"Finanzas",quality:"Calidad",viewer:"Lectura"} as const;

export function AppShell({children,onNewReception}:{children:ReactNode;onNewReception:()=>void}){
 const [mobileOpen,setMobileOpen]=useState(false);
 const [theme,setTheme]=useState<"light"|"dark">(()=>{const saved=localStorage.getItem("pescamar-theme");if(saved==="light"||saved==="dark")return saved;return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"});
 const menuButtonRef=useRef<HTMLButtonElement>(null),drawerRef=useRef<HTMLElement>(null);
 const {operator,logout}=useAuth(),{pathname}=useLocation(),{status}=usePlatformStatus();
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;localStorage.setItem("pescamar-theme",theme)},[theme]);
 useEffect(()=>{
  setMobileOpen(false);
  window.scrollTo({top:0,left:0,behavior:"auto"});
  document.querySelector<HTMLElement>("#main-content")?.focus({preventScroll:true});
 },[pathname]);
 useEffect(()=>{if(!mobileOpen)return;const previous=document.body.style.overflow,drawer=drawerRef.current;document.body.style.overflow="hidden";const focusable=()=>drawer?[...drawer.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')].filter(node=>!node.hasAttribute("aria-hidden")):[];requestAnimationFrame(()=>focusable()[0]?.focus());const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();setMobileOpen(false);return}if(event.key!=="Tab")return;const items=focusable();if(!items.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}};window.addEventListener("keydown",onKeyDown);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",onKeyDown);menuButtonRef.current?.focus()}},[mobileOpen]);
 const implementation=seafoodProduct.implementation;
 const currentModule=getOsModule(pathname),context=pathname==="/"?"Estado operativo de hoy":currentModule?.label??seafoodProduct.shortName,contextStage=currentModule?.stageLabel&&currentModule.stageLabel!==context?currentModule.stageLabel:implementation.name;
 const initials=operator?.fullName.split(" ").map(part=>part[0]).slice(0,2).join("").toUpperCase()||"PS";
 const visiblePrimary=operator?primaryNavigation.filter(item=>canAccessPath(operator.role,item.to)):[];
 const visibleGroups=operator?workflowGroups.map(group=>({...group,items:group.items.filter(item=>canAccessPath(operator.role,item.to))})).filter(group=>group.items.length):[];
 const mayCreate=operator?canCreateReception(operator.role):false,platformLabel=!status?"Verificando":status.ok?"Plataforma activa":"Revisar plataforma",databaseLabel=!status?"Sincronizando estado":status.persistence.database?`Base de Datos ${implementation.name} conectada`:`Base de Datos ${implementation.name} pendiente`;
 const showFloatingReception=mayCreate&&pathname==="/";
 return <div className="app-shell"><a className="skip-link" href="#main-content">Ir al contenido principal</a><aside ref={drawerRef} className={`sidebar ${mobileOpen?"is-open":""}`} aria-label={`Navegación de ${seafoodProduct.name}`}><div className="brand"><span className="pescamar-symbol" aria-hidden="true"><svg viewBox="0 0 52 34" role="img"><path d="M4 17c8-8 17-12 27-10 5 1 10 4 15 10-5 6-10 9-15 10-10 2-19-2-27-10Z"/><path d="M36 11c4-4 8-6 12-6-1 5-1 8 0 12-4 0-8-2-12-6Z"/><circle cx="14" cy="15" r="1.35"/><path className="brand-wave" d="M3 27c8-3 15-3 22 0s15 3 24-1"/></svg></span><div className="brand-copy" title={seafoodProduct.name}><strong className="brand-name">Seafood Intelligence</strong><small className="brand-product">OS · N3uralia</small></div><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú"><X size={18}/></button></div><div className="plant-chip"><span className="live-dot pending"/><div><b>{implementation.label} · {implementation.name}</b><small>{operator?.role==="admin"?"Cobertura corporativa":operator?.plantIds.length?`${operator.plantIds.length} planta${operator.plantIds.length===1?"":"s"} bajo tu alcance`:"Sin plantas asignadas"}</small></div></div><nav className="side-nav grouped-nav"><section><small>Trabajo diario</small>{visiblePrimary.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==="/"}><Icon size={18}/><span>{label}</span></NavLink>)}</section>{visibleGroups.map(({label,icon:GroupIcon,items})=><details className="nav-more" key={label} open={items.some(item=>pathname.startsWith(item.to))}><summary><GroupIcon size={18}/><span>{label}</span></summary><div>{items.map(({to,label:itemLabel,icon:Icon})=><NavLink key={to} to={to}><Icon size={18}/><span>{itemLabel}</span></NavLink>)}</div></details>)}</nav><div className="sidebar-spacer"/>{operator&&canAccessPath(operator.role,"/modulos")?<NavLink className="settings-link" to="/modulos"><Settings2 size={18}/><span>Mapa del OS</span></NavLink>:null}</aside>{mobileOpen?<button className="mobile-nav-backdrop" type="button" onClick={()=>setMobileOpen(false)} aria-label="Cerrar navegación"/>:null}<div className="workspace"><header className="topbar"><button ref={menuButtonRef} className="icon-btn menu-btn" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú"><Menu size={20}/></button><div className="topbar-context"><span>{contextStage}</span><b>{context}</b></div><div className="topbar-actions"><button className="theme-toggle" type="button" aria-label={theme==="dark"?"Cambiar a tema claro":"Cambiar a tema oscuro"} onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun size={15}/>:<Moon size={15}/>}<span>{theme==="dark"?"Claro":"Oscuro"}</span></button>{operator&&canAccessPath(operator.role,"/modulos")?<NavLink className="system-state" to="/modulos" title={databaseLabel}><Activity size={15}/><span><b>{platformLabel}</b><small>{databaseLabel}</small></span></NavLink>:<div className="system-state" title={databaseLabel}><Activity size={15}/><span><b>{platformLabel}</b><small>{databaseLabel}</small></span></div>}<button className="operator-state operator-session-button" type="button" onClick={()=>void logout()}><span>{initials}</span><div><b>{operator?.fullName??"Sesión operativa"}</b><small>{operator?roleLabels[operator.role]:"Operador"}</small></div><LogOut size={14}/></button></div></header><main id="main-content" tabIndex={-1} className="main-content">{children}</main></div>{showFloatingReception?<button className="floating-action" onClick={onNewReception}>+ Nueva recepción</button>:null}</div>
}
