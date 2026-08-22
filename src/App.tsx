import { useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { canAccessPath, canCreateReception } from "./access";
import { LoginScreen, useAuth } from "./auth";
import { AppShell } from "./components/AppShell";
import { ReceptionModal } from "./components/ReceptionModal";
import { Approvals } from "./pages/Approvals";
import { Canonical2025 } from "./pages/Canonical2025";
import { Credits } from "./pages/Credits";
import { Dashboard } from "./pages/Dashboard";
import { Modules } from "./pages/Modules";
import { Imports } from "./pages/Imports";
import { PlantControl } from "./pages/PlantControl";
import { ProductionLines } from "./pages/ProductionLines";
import { Receptions } from "./pages/Receptions";
import { Settlements } from "./pages/Settlements";
import { Operators } from "./pages/Operators";
import { useLots } from "./store";

export default function App(){
  const {operator,loading:authLoading}=useAuth();
  if(authLoading)return <div className="login-shell"><div className="system-banner">Validando sesión…</div></div>;
  if(!operator)return <LoginScreen/>;
  return <AuthenticatedApp/>;
}

function AuthenticatedApp(){
  const {operator}=useAuth();
  const [modalOpen,setModalOpen]=useState(false);
  const {lots,loading,error,addLot}=useLots();
  if(!operator)return null;
  const mayCreate=canCreateReception(operator.role);
  const open=()=>{if(mayCreate)setModalOpen(true)};
  const gate=(path:string,node:ReactNode)=>canAccessPath(operator.role,path)?node:<Navigate to="/" replace/>;
  return <AppShell onNewReception={open}>
    {loading?<div className="system-banner">Sincronizando recepciones…</div>:error?<div className="system-banner error" role="alert">{error}</div>:null}
    <Routes>
      <Route path="/" element={<Dashboard lots={lots} onNewReception={open}/>}/>
      <Route path="/plantas" element={<PlantControl/>}/>
      <Route path="/plantas/:plantId" element={<PlantControl/>}/>
      <Route path="/importaciones" element={gate("/importaciones",<Imports/>)}/>
      <Route path="/operacion-2025" element={<Canonical2025/>}/>
      <Route path="/creditos" element={gate("/creditos",<Credits/>)}/>
      <Route path="/liquidaciones" element={gate("/liquidaciones",<Settlements/>)}/>
      <Route path="/aprobaciones" element={gate("/aprobaciones",<Approvals/>)}/>
      <Route path="/modulos" element={gate("/modulos",<Modules/>)}/>
      <Route path="/operadores" element={gate("/operadores",<Operators/>)}/>
      <Route path="/lineas" element={<ProductionLines/>}/>
      <Route path="/recepciones" element={<Receptions lots={lots} onNew={open}/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
    {mayCreate?<ReceptionModal open={modalOpen} onClose={()=>setModalOpen(false)} onSave={addLot}/>:null}
  </AppShell>;
}
