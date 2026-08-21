import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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
import { Operators } from "./pages/Operators";
import { useLots } from "./store";
export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const { lots, loading, error, addLot } = useLots();
  const open = () => setModalOpen(true);
  return (
    <AppShell onNewReception={open}>
      {loading ? (
        <div className="system-banner">Sincronizando recepciones…</div>
      ) : error ? (
        <div className="system-banner error" role="alert">
          {error}
        </div>
      ) : null}
      <Routes>
        <Route
          path="/"
          element={<Dashboard lots={lots} onNewReception={open} />}
        />
        <Route path="/plantas" element={<PlantControl />} />
        <Route path="/plantas/:plantId" element={<PlantControl />} />
        <Route path="/importaciones" element={<Imports />} />
        <Route path="/operacion-2025" element={<Canonical2025 />} />
        <Route path="/creditos" element={<Credits />} />
        <Route path="/aprobaciones" element={<Approvals />} />
        <Route path="/modulos" element={<Modules />} />
        <Route path="/operadores" element={<Operators />} />
        <Route path="/lineas" element={<ProductionLines />} />
        <Route
          path="/recepciones"
          element={<Receptions lots={lots} onNew={open} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ReceptionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={addLot}
      />
    </AppShell>
  );
}
