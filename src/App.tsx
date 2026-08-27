import { lazy, Suspense, useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { canAccessPath, canCreateReception } from "./access";
import { LoginScreen, useAuth } from "./auth";
import { AppShell } from "./components/AppShell";
import { CanonicalAccountEvidence } from "./components/CanonicalAccountEvidence";
import { CanonicalInventoryEvidence } from "./components/CanonicalInventoryEvidence";
import { Lot360Provider } from "./components/Lot360Context";
import { ReceptionModal } from "./components/ReceptionModal";
import { UrchinProgressRail } from "./components/UrchinProgressRail";
import { useLots } from "./store";

const Approvals=lazy(()=>import("./pages/Approvals").then(module=>({default:module.Approvals})));
const Audit=lazy(()=>import("./pages/Audit").then(module=>({default:module.Audit})));
const Commercial=lazy(()=>import("./pages/Commercial").then(module=>({default:module.Commercial})));
const Communications=lazy(()=>import("./pages/Communications").then(module=>({default:module.Communications})));
const Credits=lazy(()=>import("./pages/Credits").then(module=>({default:module.Credits})));
const DailyClose=lazy(()=>import("./pages/DailyClose").then(module=>({default:module.DailyClose})));
const Inventory=lazy(()=>import("./pages/Inventory").then(module=>({default:module.Inventory})));
const MaterialsInventory=lazy(()=>import("./pages/MaterialsInventory").then(module=>({default:module.MaterialsInventory})));
const Partners=lazy(()=>import("./pages/Partners").then(module=>({default:module.Partners})));
const Profitability=lazy(()=>import("./pages/Profitability").then(module=>({default:module.Profitability})));
const Modules=lazy(()=>import("./pages/Modules").then(module=>({default:module.Modules})));
const Imports=lazy(()=>import("./pages/Imports").then(module=>({default:module.Imports})));
const Planning=lazy(()=>import("./pages/Planning").then(module=>({default:module.Planning})));
const ProductLabels=lazy(()=>import("./pages/ProductLabels").then(module=>({default:module.ProductLabels})));
const Rollout=lazy(()=>import("./pages/Rollout").then(module=>({default:module.Rollout})));
const PlantControl=lazy(()=>import("./pages/PlantControl").then(module=>({default:module.PlantControl})));
const PlantIdentities=lazy(()=>import("./pages/PlantIdentities").then(module=>({default:module.PlantIdentities})));
const ProductionLines=lazy(()=>import("./pages/ProductionLines").then(module=>({default:module.ProductionLines})));
const Receptions=lazy(()=>import("./pages/Receptions").then(module=>({default:module.Receptions})));
const SalesOrders=lazy(()=>import("./pages/SalesOrders").then(module=>({default:module.SalesOrders})));
const SeaUrchinProcess=lazy(()=>import("./pages/SeaUrchinProcess").then(module=>({default:module.SeaUrchinProcess})));
const Settlements=lazy(()=>import("./pages/Settlements").then(module=>({default:module.Settlements})));
const TransformationCosts=lazy(()=>import("./pages/TransformationCosts").then(module=>({default:module.TransformationCosts})));
const Operators=lazy(()=>import("./pages/Operators").then(module=>({default:module.Operators})));
const Timeline=lazy(()=>import("./pages/Timeline").then(module=>({default:module.Timeline})));
function RouteFallback(){return <div className="system-banner">Cargando módulo…</div>}
export default function App(){const {operator,loading:authLoading}=useAuth();if(authLoading)return <div className="login-shell"><div className="system-banner">Validando sesión…</div></div>;if(!operator)return <LoginScreen/>;return <AuthenticatedApp/>}
function AuthenticatedApp(){const {operator}=useAuth();const [modalOpen,setModalOpen]=useState(false);const {lots,loading,error,addLot}=useLots();if(!operator)return null;const mayCreate=canCreateReception(operator.role),open=()=>{if(mayCreate)setModalOpen(true)},gate=(path:string,node:ReactNode)=>canAccessPath(operator.role,path)?node:<Navigate to="/" replace/>;return <Lot360Provider><AppShell onNewReception={open}>{loading?<div className="system-banner">Sincronizando recepciones…</div>:error?<div className="system-banner error" role="alert">{error}</div>:null}<UrchinProgressRail/><Suspense fallback={<RouteFallback/>}><Routes><Route path="/" element={<DailyClose/>}/><Route path="/timeline" element={<Timeline/>}/><Route path="/comunicaciones" element={gate("/comunicaciones",<Communications/>)}/><Route path="/auditoria" element={gate("/auditoria",<Audit/>)}/><Route path="/rollout" element={gate("/rollout",<Rollout/>)}/><Route path="/operacion-2025" element={<Navigate to="/timeline" replace/>}/><Route path="/planificacion" element={gate("/planificacion",<Planning/>)}/><Route path="/etiquetas" element={gate("/etiquetas",<ProductLabels/>)}/><Route path="/proceso-erizo" element={gate("/proceso-erizo",<SeaUrchinProcess/>)}/><Route path="/plantas" element={<PlantControl/>}/><Route path="/plantas/:plantId" element={<PlantControl/>}/><Route path="/identidades-plantas" element={gate("/identidades-plantas",<PlantIdentities/>)}/><Route path="/importaciones" element={gate("/importaciones",<Imports/>)}/><Route path="/creditos" element={gate("/creditos",<><Credits/><CanonicalAccountEvidence/></>)}/><Route path="/liquidaciones" element={gate("/liquidaciones",<Settlements/>)}/><Route path="/despachos-ventas" element={gate("/despachos-ventas",<Commercial/>)}/><Route path="/ordenes-venta" element={gate("/ordenes-venta",<SalesOrders/>)}/><Route path="/inventario" element={gate("/inventario",<><Inventory/><CanonicalInventoryEvidence/></>)}/><Route path="/inventario-materiales" element={gate("/inventario-materiales",<MaterialsInventory/>)}/><Route path="/proveedores-clientes" element={gate("/proveedores-clientes",<Partners/>)}/><Route path="/rentabilidad" element={gate("/rentabilidad",<Profitability/>)}/><Route path="/costos-transformacion" element={gate("/costos-transformacion",<TransformationCosts/>)}/><Route path="/cierre-diario" element={<Navigate to="/" replace/>}/><Route path="/aprobaciones" element={gate("/aprobaciones",<Approvals/>)}/><Route path="/modulos" element={gate("/modulos",<Modules/>)}/><Route path="/operadores" element={gate("/operadores",<Operators/>)}/><Route path="/lineas" element={<ProductionLines lots={lots}/>}/><Route path="/recepciones" element={<Receptions lots={lots} onNew={open}/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Suspense>{mayCreate?<ReceptionModal open={modalOpen} onClose={()=>setModalOpen(false)} onSave={addLot}/>:null}</AppShell></Lot360Provider>}
