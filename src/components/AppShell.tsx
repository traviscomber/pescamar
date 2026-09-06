import {Activity,Factory,LayoutDashboard,LogOut,Menu,Moon,Settings2,ShoppingCart,Sparkles,Sun,X} from "lucide-react";
import {NavLink,useLocation} from "react-router-dom";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {canAccessPath,canCreateReception} from "../access";
import {useAuth} from "../auth";
import {usePlatformStatus} from "../hooks/usePlatformStatus";
import {getOsModule} from "../os";
import {seafoodProduct} from "../product";
import "../navigation-groups.css";

type Workspace="today"|"operation"|"commercial"|"intelligence"|"admin";
type WorkspaceTab={to:string;label:string;step?:number};
const operationPaths=["/recepciones","/lineas","/floor","/inventario","/frio","/proceso-erizo","/pallets","/planificacion","/inventario-materiales","/etiquetas","/impresion-etiquetas","/estaciones"];
const commercialPaths=["/ordenes-venta","/proveedores-clientes","/despachos-ventas","/liquidaciones","/creditos","/costos-transformacion"];
const intelligencePaths=["/pescamar-ia","/lineage","/rentabilidad","/edgevision","/timeline"];
const workspaceForPath=(pathname:string):Workspace=>{
 if(pathname==="/"||pathname.startsWith("/inicio/"))return "today";
 if(operationPaths.some(path=>pathname===path||pathname.startsWith(`${path}/`)))return "operation";
 if(commercialPaths.some(path=>pathname===path||pathname.startsWith(`${path}/`)))return "commercial";
 if(intelligencePaths.some(path=>pathname===path||pathname.startsWith(`${path}/`)))return "intelligence";
 return "admin";
};
const workspaceTabs:Record<Exclude<Workspace,"today"|"admin">,WorkspaceTab[]>={
 operation:[
  {to:"/recepciones",label:"Recepción",step:1},
  {to:"/lineas",label:"Producción",step:2},
  {to:"/proceso-erizo",label:"Proceso",step:3},
  {to:"/floor",label:"Packing",step:4},
  {to:"/inventario",label:"Inventario",step:5},
  {to:"/frio",label:"Frío",step:6},
 ],
 commercial:[
  {to:"/ordenes-venta",label:"Órdenes"},
  {to:"/proveedores-clientes",label:"Proveedores"},
  {to:"/despachos-ventas",label:"Despachos"},
  {to:"/liquidaciones",label:"Liquidaciones"},
 ],
 intelligence:[
  {to:"/pescamar-ia",label:"Seafood AI"},
  {to:"/lineage",label:"Trazabilidad"},
  {to:"/rentabilidad",label:"Rentabilidad"},
  {to:"/edgevision",label:"EdgeVision"},
 ],
};
const roleLabels={admin:"Administrador",operations:"Gerente de Operaciones",finance:"Finanzas",quality:"Calidad",viewer:"Lectura"} as const;

export function AppShell({children,onNewReception}:{children:ReactNode;onNewReception:()=>void}){
 const [mobileOpen,setMobileOpen]=useState(false);
 const [theme,setTheme]=useState<"light"|"dark">(()=>{const saved=localStorage.getItem("pescamar-theme");if(saved==="light"||saved==="dark")return saved;return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"});
 const menuButtonRef=useRef<HTMLButtonElement>(null),drawerRef=useRef<HTMLElement>(null);
 const {operator,logout}=useAuth(),{pathname}=useLocation(),{status}=usePlatformStatus();
 const workspace=workspaceForPath(pathname);
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;localStorage.setItem("pescamar-theme",theme)},[theme]);
 useEffect(()=>{setMobileOpen(false);window.scrollTo({top:0,left:0,behavior:"auto"});document.querySelector<HTMLElement>("#main-content")?.focus({preventScroll:true})},[pathname]);
 useEffect(()=>{if(!mobileOpen)return;const previous=document.body.style.overflow,drawer=drawerRef.current;document.body.style.overflow="hidden";const focusable=()=>drawer?[...drawer.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(node=>!node.hasAttribute("aria-hidden")):[];requestAnimationFrame(()=>focusable()[0]?.focus());const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();setMobileOpen(false);return}if(event.key!=="Tab")return;const items=focusable();if(!items.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}};window.addEventListener("keydown",onKeyDown);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",onKeyDown);menuButtonRef.current?.focus()}},[mobileOpen]);
 const implementation=seafoodProduct.implementation;
 const currentModule=getOsModule(pathname),context=pathname==="/"?"Estado operativo de hoy":currentModule?.label??seafoodProduct.shortName,contextStage=pathname==="/"?`${implementation.name} · ${implementation.label}`:currentModule?.stageLabel&&currentModule.stageLabel!==context?currentModule.stageLabel:`${implementation.name} · ${implementation.label}`;
 const initials=operator?.fullName.split(" ").map(part=>part[0]).slice(0,2).join("").toUpperCase()||"PS";
 const mayCreate=operator?canCreateReception(operator.role):false,platformLabel=!status?"Verificando":status.ok?"Plataforma activa":"Revisar plataforma",databaseLabel=!status?"Sincronizando estado":status.persistence.database?`Base de Datos ${implementation.name} conectada`:`Base de Datos ${implementation.name} pendiente`;
 const showFloatingReception=mayCreate&&pathname==="/",sessionLabel=operator?`${operator.fullName} · ${roleLabels[operator.role]}`:"Sesión operativa";
 const tabs=workspace==="operation"||workspace==="commercial"||workspace==="intelligence"?(operator?workspaceTabs[workspace].filter(item=>canAccessPath(operator.role,item.to)):[]):[];
 const tabsLabel=workspace==="operation"?"Flujo operativo":`Navegación de ${workspace}`;
 return <div className="app-shell"><a className="skip-link" href="#main-content">Ir al contenido principal</a><aside ref={drawerRef} className={`sidebar ${mobileOpen?"is-open":""}`} aria-label={`Navegación de ${seafoodProduct.name}`}><div className="brand"><span className="pescamar-symbol" aria-hidden="true"><svg viewBox="0 0 52 34" role="img"><path d="M4 17c8-8 17-12 27-10 5 1 10 4 15 10-5 6-10 9-15 10-10 2-19-2-27-10Z"/><path d="M36 11c4-4 8-6 12-6-1 5-1 8 0 12-4 0-8-2-12-6Z"/><circle cx="14" cy="15" r="1.35"/><path className="brand-wave" d="M3 27c8-3 15-3 22 0s15 3 24-1"/></svg></span><div className="brand-copy" title={seafoodProduct.name}><strong className="brand-name">Seafood Intelligence OS</strong><small className="brand-product">N3uralia</small></div><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Cerrar menú"><X size={18}/></button></div><nav className="side-nav workspace-nav"><NavLink to="/" end className={workspace==="today"?"active":undefined}><LayoutDashboard size={18}/><span>Hoy</span></NavLink><NavLink to="/recepciones" className={workspace==="operation"?"active":undefined}><Factory size={18}/><span>Operación</span></NavLink>{operator&&canAccessPath(operator.role,"/ordenes-venta")?<NavLink to="/ordenes-venta" className={workspace==="commercial"?"active":undefined}><ShoppingCart size={18}/><span>Comercial</span></NavLink>:null}{operator&&canAccessPath(operator.role,"/pescamar-ia")?<NavLink to="/pescamar-ia" className={workspace==="intelligence"?"active":undefined}><Sparkles size={18}/><span>Inteligencia</span></NavLink>:null}</nav><div className="sidebar-spacer"/>{operator&&canAccessPath(operator.role,"/modulos")?<NavLink className={`settings-link ${workspace==="admin"?"active":""}`} to="/modulos"><Settings2 size={18}/><span>Administración</span></NavLink>:null}</aside>{mobileOpen?<button className="mobile-nav-backdrop" type="button" onClick={()=>setMobileOpen(false)} aria-label="Cerrar navegación"/>:null}<div className="workspace"><header className="topbar"><button ref={menuButtonRef} className="icon-btn menu-btn" onClick={()=>setMobileOpen(true)} aria-label="Abrir menú"><Menu size={20}/></button><div className="topbar-context"><span>{contextStage}</span><b>{context}</b></div><div className="topbar-actions"><button className="theme-toggle compact-control" type="button" title={theme==="dark"?"Cambiar a tema claro":"Cambiar a tema oscuro"} aria-label={theme==="dark"?"Cambiar a tema claro":"Cambiar a tema oscuro"} onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun size={15}/>:<Moon size={15}/>}</button>{operator&&canAccessPath(operator.role,"/modulos")?<NavLink className={`system-state compact-control ${status?.ok?"is-ok":"is-pending"}`} to="/modulos" title={`${platformLabel} · ${databaseLabel}`} aria-label={`${platformLabel}. ${databaseLabel}`}><Activity size={15}/></NavLink>:<div className={`system-state compact-control ${status?.ok?"is-ok":"is-pending"}`} title={`${platformLabel} · ${databaseLabel}`} aria-label={`${platformLabel}. ${databaseLabel}`}><Activity size={15}/></div>}<button className="operator-state operator-session-button compact-operator" type="button" onClick={()=>void logout()} title={`${sessionLabel} · Cerrar sesión`} aria-label={`Cerrar sesión de ${sessionLabel}`}><span>{initials}</span><LogOut size={13}/></button></div></header>{tabs.length?<nav className={`workspace-tabs ${workspace==="operation"?"operation-flow":""}`} aria-label={tabsLabel}>
 {tabs.map(item=><NavLink key={item.to} to={item.to} className={({isActive})=>isActive||pathname.startsWith(`${item.to}/`)?"active":undefined}>{item.step?<span className="workspace-step-index">{String(item.step).padStart(2,"0")}</span>:null}<span>{item.label}</span></NavLink>)}
 </nav>:null}<main id="main-content" tabIndex={-1} className="main-content">{children}</main></div>{showFloatingReception?<button className="floating-action" onClick={onNewReception}>+ Nueva recepción</button>:null}</div>
}
