import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  FileSpreadsheet,
  Link2Off,
  PackageCheck,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PlantImportModal } from "../components/PlantImportModal";
import { PageHeader } from "../components/PageHeader";
import {
  fetchSharedPlantState,
  publishSharedPlantState,
} from "../plantApi";
import {
  createImportBatch,
  isOperationalPlant,
  type PlantState,
  type ValidatedImport,
} from "../plantImport";
import {
  plants as configuredPlants,
  type Plant,
} from "../plants";

const kg = (value: number) => `${value.toLocaleString("es-CL")} kg`;
export function PlantControl() {
  const { plantId } = useParams();
  const navigate = useNavigate();
  const [plants, setPlants] = useState<PlantState[]>(configuredPlants);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetchSharedPlantState()
      .then((state) => {
        if (!active) return;
        setPlants(state.plants ?? configuredPlants);
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "No fue posible sincronizar plantas",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const publish = async (rows: ValidatedImport[]) => {
    const operator = import.meta.env.VITE_OPERATOR_NAME?.trim();
    if (!operator)
      throw new Error("Falta configurar la identidad del operador");
    const batch = createImportBatch(plants, rows, operator);
    await publishSharedPlantState(batch);
    setPlants(batch.resultingPlants);
    setError("");
  };
  const selected = plants.find((plant) => plant.id === plantId);
  if (selected)
    return (
      <>
        <PlantScopeSelector
          plants={plants}
          value={selected.id}
          onChange={(id) => {
            localStorage.setItem("pescamar-active-plant", id);
            navigate(`/plantas/${id}`);
          }}
        />
        <PlantDetail plant={selected} />
        <PlantImportModal
          open={importOpen}
          plants={configuredPlants}
          onClose={() => setImportOpen(false)}
          onPublish={publish}
        />
      </>
    );
  return (
    <>
      {loading ? (
        <div className="system-banner">Sincronizando plantas…</div>
      ) : null}
      {error ? (
        <div className="system-banner error" role="alert">
          {error}
        </div>
      ) : null}
      <PageHeader
        eyebrow="Contexto de trabajo"
        title="Selecciona tu planta"
        description="La aplicación mostrará únicamente la operación del centro seleccionado. Puedes cambiarlo si tu perfil tiene acceso a más de uno."
      />
      <section className="panel plant-scope-gate">
        <PlantScopeSelector plants={plants} value="" onChange={(id) => {
          localStorage.setItem("pescamar-active-plant", id);
          navigate(`/plantas/${id}`);
        }} />
        <div>
          <span className="overline teal">Acceso corporativo</span>
          <h2>Una operación a la vez</h2>
          <p>El alcance definitivo quedará ligado al operador autenticado. La vista consolidada se reserva para Gerencia.</p>
        </div>
        <Link className="button secondary" to="/importaciones"><FileSpreadsheet size={16}/>Administrar fuentes</Link>
      </section>
      <PlantImportModal
        open={importOpen}
        plants={configuredPlants}
        onClose={() => setImportOpen(false)}
        onPublish={publish}
      />
    </>
  );
}

function PlantScopeSelector({plants,value,onChange}:{plants:PlantState[];value:string;onChange:(id:string)=>void}) {
  return <label className="plant-scope-selector"><span>Centro operativo</span><select value={value} onChange={(event)=>onChange(event.target.value)}><option value="" disabled>Seleccionar planta</option>{plants.map((plant)=><option value={plant.id} key={plant.id}>{plant.name} · {plant.location}</option>)}</select></label>
}

function PlantDetail({ plant }: { plant: PlantState }) {
  if (!isOperationalPlant(plant))
    return (
      <>
        <Link to="/" className="back-link">
          <ArrowLeft size={15} />
          Volver al centro de control
        </Link>
        <PageHeader
          eyebrow={`${plant.mode} · ${plant.location}`}
          title={plant.name}
          description="Esta planta está configurada, pero todavía no tiene una fuente operacional validada."
          actions={
            <Link className="button primary" to="/importaciones">
              <FileSpreadsheet size={16} />
              Asignar planilla
            </Link>
          }
        />
        <section className="plant-detail-banner offline">
          <div className="plant-signal offline">
            <span />
          </div>
          <div>
            <small>Estado de datos</small>
            <b>Sin fuente asignada</b>
            <p>
              No se muestran indicadores hasta publicar una importación válida.
            </p>
          </div>
        </section>
        <section className="plant-detail-grid">
          <ProductCatalog plant={plant} />
          <article className="panel plant-empty">
            <Link2Off size={30} />
            <b>Indicadores bloqueados</b>
            <span>
              Asigna y publica una fuente válida para habilitar los KPI.
            </span>
          </article>
        </section>
      </>
    );
  const progress = Math.round((plant.productionKg / plant.targetKg) * 100);
  return (
    <>
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        Volver al centro de control
      </Link>
      <PageHeader
        eyebrow={`${plant.mode} · ${plant.location}`}
        title={plant.name}
        description={plant.statusReason}
        actions={
          <Link className="button secondary" to="/importaciones">
            <FileSpreadsheet size={16} />
            Ver importaciones
          </Link>
        }
      />
      <section className={`plant-detail-banner ${plant.status}`}>
        <div className={`plant-signal ${plant.status}`}>
          <span />
        </div>
        <div>
          <small>Estado actual</small>
          <b>{plant.statusLabel}</b>
          <p>{plant.statusReason}</p>
        </div>
        <div>
          <small>Última actualización</small>
          <b>{plant.updatedAt}</b>
          <span>{plant.source}</span>
        </div>
      </section>
      <section className="metric-grid">
        <DetailMetric
          icon={<TrendingUp />}
          label="Producción"
          value={kg(plant.productionKg)}
          note={`Meta ${kg(plant.targetKg)}`}
        />
        <DetailMetric
          icon={<CheckCircle2 />}
          label="Cumplimiento"
          value={`${progress}%`}
          note={progress >= 95 ? "Dentro de rango" : "Bajo objetivo"}
        />
        <DetailMetric
          icon={<Boxes />}
          label="Inventario total"
          value={kg(plant.inventoryKg)}
          note="Último archivo publicado"
        />
        <DetailMetric
          icon={<PackageCheck />}
          label="Producto terminado"
          value={kg(plant.inventoryFinishedKg)}
          note={
            plant.inventoryKg
              ? `${Math.round((plant.inventoryFinishedKg / plant.inventoryKg) * 100)}% del inventario`
              : "Sin inventario"
          }
        />
      </section>
      <section className="plant-detail-grid">
        <ProductCatalog plant={plant} />
        <article className="panel">
          <header className="panel-header">
            <h2>Alertas y observaciones</h2>
            <span>{plant.alerts.length} registradas</span>
          </header>
          {plant.alerts.length ? (
            <div className="detail-alerts">
              {plant.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={alert.severity === "Crítica" ? "critical" : ""}
                >
                  <AlertTriangle size={17} />
                  <span>
                    <b>{alert.title}</b>
                    <small>{alert.detail}</small>
                  </span>
                  <em>{alert.severity}</em>
                </div>
              ))}
            </div>
          ) : (
            <div className="plant-empty">
              <CheckCircle2 size={27} />
              <b>Sin alertas abiertas</b>
              <span>
                La operación informada se encuentra dentro de los rangos
                definidos.
              </span>
            </div>
          )}
        </article>
      </section>
    </>
  );
}

function ProductCatalog({ plant }: { plant: Plant }) {
  return (
    <article className="panel">
      <header className="panel-header">
        <h2>Catálogo de productos</h2>
        <span>{plant.products.length} categorías</span>
      </header>
      <div className="product-list">
        {plant.products.map((product, index) => (
          <div key={product}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <b>{product}</b>
            <em>
              {isOperationalPlant(plant)
                ? "Incluido en última planilla"
                : "Configuración por validar"}
            </em>
          </div>
        ))}
      </div>
    </article>
  );
}
function DetailMetric({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="metric">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
