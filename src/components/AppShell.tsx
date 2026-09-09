import {Activity,Factory,LayoutDashboard,LogOut,Menu,Moon,Settings2,ShoppingCart,Sparkles,Sun,X} from "lucide-react";
import {NavLink,useLocation} from "react-router-dom";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {canAccessPath,canCreateReception} from "../access";
import {useAuth} from "../auth";
import {usePlatformStatus} from "../hooks/usePlatformStatus";
import {useLocale} from '../i18n';
import {getOsModule} from "../os";
import {seafoodProduct} from "../product";
import "../navigation-groups.css";

type Workspace="today"|"operation"|"commercial"|"intelligence"|"admin";
type WorkspaceTab={to:string;labelKey:'nav.overview'|'nav.reception'|'nav.production'|'nav.process'|'nav.packing'|'nav.pallets'|'nav.inventory'|'nav.cold'|'nav.orders'|'nav.dispatch'|'nav.settlement'|'nav.ask'|'nav.investigate'|'nav.decide'|'nav.history';step?:number};
const operationPaths=["/plantas","/recepciones","/lineas","/floor","/inventario","/frio","/proceso","/proceso-erizo","/pallets","/planificacion","/inventario-materiales","/etiquetas","/impresion-etiquetas","/estaciones"];
const commercialPaths=["/ordenes-venta","/proveedores-clientes","/despachos-ventas","/liquidaciones","/creditos","/costos-transformacion"];
const intelligencePaths=["/pescamar-ia","/lineage","/rentabilidad"];
const workspaceForPath=(pathname:string):Workspace=>{
 if(pathname==="/"||pathname.startsWith("/inicio/"))return "today";
 if(operationPaths.some(path=>pathname===path||pathname.startsWith(`${path}/`)))return "operation";
 if(commercialPaths.some(path=>pathname===path||pathname.startsWith(`${path}/`)))return "commercial";
 if(intelligencePaths.some(path=>pathname===path||pathname.startsWith(`${path}/`)))return "intelligence";
 return "admin";
};
const workspaceTabs:Record<Exclude<Workspace,"today"|"admin">,WorkspaceTab[]>={
 operation:[],
 commercial:[
  {to:"/ordenes-venta",labelKey:"nav.orders",step:1},
  {to:"/despachos-ventas",labelKey:"nav.dispatch",step:2},
  {to:"/liquidaciones",labelKey:"nav.settlement",step:3},
 ],
 intelligence:[
  {to:"/pescamar-ia",labelKey:"nav.ask",step:1},
  {to:"/lineage",labelKey:"nav.investigate",step:2},
  {to:"/rentabilidad",labelKey:"nav.decide",step:3},
 ],
};

export function AppShell({children,onNewReception}:{children:ReactNode;onNewReception:()=>void}){
 const [mobileOpen,setMobileOpen]=useState(false);
 const [theme,setTheme]=useState<"light"|"dark">(()=>{const saved=localStorage.getItem("pescamar-theme");if(saved==="light"||saved==="dark")return saved;return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"});
 const menuButtonRef=useRef<HTMLButtonElement>(null),drawerRef=useRef<HTMLElement>(null);
 const {operator,logout}=useAuth(),{pathname,search}=useLocation(),{status}=usePlatformStatus(),{locale,t}=useLocale();
 const routePlant=/^\/plantas\/([^/]+)$/.exec(pathname)?.[1]??'';
 const requestedPlant=new URLSearchParams(search).get('plantId')??'';
 const plantContextId=(routePlant&&!routePlant.startsWith('historico-')?decodeURIComponent(routePlant):requestedPlant)||'';
 const workspace=plantContextId?"operation":workspaceForPath(pathname);
 useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;localStorage.setItem("pescamar-theme",theme)},[theme]);
 useEffect(()=>{document.documentElement.lang=locale},[locale]);
 useEffect(()=>{setMobileOpen(false);window.scrollTo({top:0,left:0,behavior:"auto"});document.querySelector<HTMLElement>("#main-content")?.focus({preventScroll:true})},[pathname]);
 useEffect(()=>{if(!mobileOpen)return;const previous=document.body.style.overflow,drawer=drawerRef.current,menuButton=menuButtonRef.current;document.body.style.overflow="hidden";const focusable=()=>drawer?[...drawer.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(node=>!node.hasAttribute("aria-hidden")):[];requestAnimationFrame(()=>focusable()[0]?.focus());const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();setMobileOpen(false);return}if(event.key!=="Tab")return;const items=focusable();if(!items.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}};window.addEventListener("keydown",onKeyDown);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",onKeyDown);menuButton?.focus()}},[mobileOpen]);
 const implementation=seafoodProduct.implementation;
 const currentModule=getOsModule(pathname);
 const implementationLabel=locale==='en'?implementation.label:'Implementación 01';
 const plantName=plantContextId?plantContextId.split('-').map(part=>part?part[0].toUpperCase()+part.slice(1):part).join(' '):'';
 const plantContextLabel=plantName?`${locale==='en'?'Plant':'Planta'} ${plantName}`:'';
 const context=plantContextId?plantContextLabel:pathname==="/"?t('shell.todayContext'):currentModule?.label??seafoodProduct.shortName;
 const contextStage=plantContextId?t('shell.plantFlow'):pathname==="/"?`${implementation.name} · ${implementationLabel}`:currentModule?.stageLabel??`${implementation.name} · ${implementationLabel}`;
 const initials=operator?.fullName.split(" ").map(part=>part[0]).slice(0,2).join("").toUpperCase()||"PS";
 const roleKey=operator?.role?(`role.${operator.role}` as const):'role.viewer';
 const mayCreate=operator?canCreateReception(operator.role):false,platformLabel=!status?t('shell.checking'):status.ok?t('shell.active'):t('shell.review'),databaseLabel=!status?t('shell.syncing'):status.persistence.database?`${implementation.name} · ${t('shell.databaseConnected')}`:`${implementation.name} · ${t('shell.databasePending')}`;
 const showFloatingReception=mayCreate&&pathname==="/",sessionLabel=operator?`${operator.fullName} · ${t(roleKey)}`:t('shell.session');
 const plantQuery=plantContextId?`plantId=${encodeURIComponent(plantContextId)}`:'';
 const plantTabs:WorkspaceTab[]=plantContextId?[
  {to:`/plantas/${encodeURIComponent(plantContextId)}`,labelKey:'nav.overview',step:1},
  {to:`/recepciones?${plantQuery}`,labelKey:'nav.reception',step:2},
  {to:`/proceso?${plantQuery}`,labelKey:'nav.process',step:3},
  {to:`/floor?${plantQuery}`,labelKey:'nav.packing',step:4},
  {to:`/pallets?${plantQuery}`,labelKey:'nav.pallets',step:5},
  {to:`/frio?${plantQuery}`,labelKey:'nav.cold',step:6},
  {to:`/inventario?${plantQuery}`,labelKey:'nav.inventory',step:7},
  {to:`/ordenes-venta?${plantQuery}`,labelKey:'nav.orders',step:8},
  {to:`/timeline?${plantQuery}`,labelKey:'nav.history',step:9},
 ]:[];
 const tabs=workspace==="operation"?(operator?plantTabs.filter(item=>canAccessPath(operator.role,item.to.split('?')[0])):[]):workspace==="commercial"||workspace==="intelligence"?(operator?workspaceTabs[workspace].filter(item=>canAccessPath(operator.role,item.to)):[]):[];
 const tabsLabel=workspace==="operation"&&plantContextId?t('shell.plantFlow'):workspace==="operation"?t('shell.operationalFlow'):workspace==="commercial"?t('shell.commercialFlow'):workspace==="intelligence"?t('shell.intelligenceFlow'):t('shell.navigation');
 const flowClass=workspace==="operation"?"operation-flow":workspace==="commercial"?"commercial-flow":workspace==="intelligence"?"intelligence-flow":"";
 const switchLocale=()=>{const next=locale==='es'?'en':'es';window.location.assign(`/${next}${pathname==='/'?'':pathname}${window.location.search}${window.location.hash}`)};
 const themeLabel=theme==="dark"?t('shell.lightTheme'):t('shell.darkTheme');
 return <div className="app-shell"><a className="skip-link" href="#main-content">{t('shell.skip')}</a><aside ref={drawerRef} className={`sidebar ${mobileOpen?"is-open":""}`} aria-label={`${t('shell.navigation')} · ${seafoodProduct.name}`}><div className="brand"><span className="pescamar-symbol" aria-hidden="true"><svg viewBox="0 0 52 34" role="img"><path d="M4 17c8-8 17-12 27-10 5 1 10 4 15 10-5 6-10 9-15 10-10 2-19-2-27-10Z"/><path d="M36 11c4-4 8-6 12-6-1 5-1 8 0 12-4 0-8-2-12-6Z"/><circle cx="14" cy="15" r="1.35"/><path className="brand-wave" d="M3 27c8-3 15-3 22 0s15 3 24-1"/></svg></span><div className="brand-copy" title={seafoodProduct.name}><strong className="brand-name">Seafood Intelligence OS</strong><small className="brand-product">{implementation.name} · {implementationLabel}</small></div><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)} aria-label={t('shell.closeMenu')}><X size={18}/></button></div><nav className="side-nav workspace-nav"><NavLink to="/" end className={workspace==="today"?"active":undefined}><LayoutDashboard size={18}/><span>{t('nav.today')}</span></NavLink><NavLink to="/plantas" className={workspace==="operation"?"active":undefined}><Factory size={18}/><span>{t('nav.plants')}</span></NavLink>{operator&&canAccessPath(operator.role,"/ordenes-venta")?<NavLink to="/ordenes-venta" className={workspace==="commercial"?"active":undefined}><ShoppingCart size={18}/><span>{t('nav.commercial')}</span></NavLink>:null}{operator&&canAccessPath(operator.role,"/pescamar-ia")?<NavLink to="/pescamar-ia" className={workspace==="intelligence"?"active":undefined}><Sparkles size={18}/><span>{t('nav.intelligence')}</span></NavLink>:null}</nav><div className="sidebar-spacer"/>{operator&&canAccessPath(operator.role,"/modulos")?<NavLink className={`settings-link ${workspace==="admin"?"active":""}`} to="/modulos"><Settings2 size={18}/><span>{t('nav.admin')}</span></NavLink>:null}<a className="powered-by-link" href="https://www.n3uralia.com" target="_blank" rel="noreferrer">Powered by N3uralia</a></aside>{mobileOpen?<button className="mobile-nav-backdrop" type="button" onClick={()=>setMobileOpen(false)} aria-label={t('shell.closeNavigation')}/>:null}<div className="workspace"><header className="topbar"><button ref={menuButtonRef} className="icon-btn menu-btn" onClick={()=>setMobileOpen(true)} aria-label={t('shell.openMenu')}><Menu size={20}/></button><div className="topbar-context"><span>{contextStage}</span><b>{context}</b></div><div className="topbar-actions"><button className="compact-control" type="button" onClick={switchLocale} title={locale==='es'?'English':'Español'} aria-label={locale==='es'?'Switch to English':'Cambiar a español'}>{locale==='es'?'EN':'ES'}</button><button className="theme-toggle compact-control" type="button" title={themeLabel} aria-label={themeLabel} onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun size={15}/>:<Moon size={15}/>}</button>{operator&&canAccessPath(operator.role,"/modulos")?<NavLink className={`system-state compact-control ${status?.ok?"is-ok":"is-pending"}`} to="/modulos" title={`${platformLabel} · ${databaseLabel}`} aria-label={`${platformLabel}. ${databaseLabel}`}><Activity size={15}/></NavLink>:<div className={`system-state compact-control ${status?.ok?"is-ok":"is-pending"}`} title={`${platformLabel} · ${databaseLabel}`} aria-label={`${platformLabel}. ${databaseLabel}`}><Activity size={15}/></div>}<button className="operator-state operator-session-button compact-operator" type="button" onClick={()=>void logout()} title={`${sessionLabel} · ${t('shell.logout')}`} aria-label={`${t('shell.logout')} · ${sessionLabel}`}><span>{initials}</span><LogOut size={13}/></button></div></header>{tabs.length?<nav className={`workspace-tabs ${flowClass}`} aria-label={tabsLabel}>{tabs.map(item=><NavLink key={item.to} to={item.to} className={()=>pathname===item.to.split('?')[0]||pathname.startsWith(`${item.to.split('?')[0]}/`)?"active":undefined}>{item.step?<span className="workspace-step-index">{String(item.step).padStart(2,"0")}</span>:null}<span>{t(item.labelKey)}</span></NavLink>)}</nav>:null}<main id="main-content" tabIndex={-1} className="main-content">{children}</main></div>{showFloatingReception?<button className="floating-action" onClick={onNewReception}>{t('shell.newReception')}</button>:null}</div>
}
