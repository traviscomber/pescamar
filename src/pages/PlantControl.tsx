import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock3,
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
        <nav className="plant-detail-toolbar" aria-label="Navegación de plantas">
          <Link to="/plantas" className="back-link">
            <ArrowLeft size={15} />
            Todas las plantas
          </Link>
          <PlantScopeSelector
            plants={plants}
            value={selected.id}
            onChange={(id) => {
              localStorage.setItem("pescamar-active-plant", id);
              navigate(`/plantas/${id}`);
            }}
          />
        </nav>
        <PlantDetail plant={selected} />
        <PlantImportModal
          open={importOpen}
          plants={configuredPlants}
          onClose={() => setImportOpen(false)}
          onPublish={publish}
        />
      </>
    );
  const linkedCount=plants.filter(isOperationalPlant).length;
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
        eyebrow="Red operacional"
        title="Plantas"
        description="Selecciona un centro para revisar su operación. La información consolidada permanece separada del trabajo por planta."
        actions={<Link className="button secondary" to="/importaciones"><FileSpreadsheet size={16}/>Gestionar fuentes</Link>}
      />
      <section className="plant-directory-summary" aria-label="Resumen de la red">
        <div><small>Centros configurados</small><b>{plants.length}</b></div>
        <div><small>Con fuente operacional</small><b>{linkedCount}</b></div>
        <div><small>Pendientes de vincular</small><b>{plants.length-linkedCount}</b></div>
        <p>Los indicadores aparecen únicamente después de publicar una fuente validada.</p>
      </section>
      <section className="plant-grid corporate-plant-grid">
        {plants.map((plant) => <PlantCard plant={plant} key={plant.id} />)}
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

function PlantCard({ plant }: { plant: PlantState }) {
  const operational = isOperationalPlant(plant);
  const progress = operational && plant.targetKg
    ? Math.min(100, Math.round((plant.productionKg / plant.targetKg) * 100))
    : null;
  return <Link className={`panel plant-card corporate-plant-card status-${operational ? plant.status : "offline"}`} to={`/plantas/${plant.id}`}>
    <header>
      <div><span className="overline">{plant.mode}</span><h2>{plant.name}</h2><small>{plant.location}</small></div>
      <span className="plant-card-actions">
        {!operational ? <Link2Off className="plant-pending-icon" size={16} aria-label="Fuente pendiente de vincular" /> : null}
        <ArrowRight size={18} />
      </span>
    </header>
    {operational ? <div className={`plant-card-state ${plant.status}`}><i/><span><b>{plant.statusLabel}</b><small>{plant.statusReason}</small></span></div> : null}
    {operational ? <div className="plant-kpis"><div><small>Producción</small><b>{kg(plant.productionKg)}</b></div><div><small>Cumplimiento</small><b>{progress}%</b></div><div><small>Alertas</small><b>{plant.alerts.length}</b></div></div> : null}
    <div className="plant-products"><small>Productos</small><p>{plant.products.slice(0,3).join(" · ")}{plant.products.length>3?` · +${plant.products.length-3}`:""}</p></div>
    <footer><span>{operational ? <><Clock3 size={13}/>{plant.updatedAt}</> : <><Link2Off size={13}/>No vinculada</>}</span><span>Abrir planta <ArrowRight size={13}/></span></footer>
  </Link>
}

function PlantScopeSelector({plants,value,onChange}:{plants:PlantState[];value:string;onChange:(id:string)=>void}) {
  return <label className="plant-scope-selector"><span>Cambiar planta</span><select aria-label="Cambiar planta" value={value} onChange={(event)=>onChange(event.target.value)}><option value="" disabled>Seleccionar planta</option>{plants.map((plant)=><option value={plant.id} key={plant.id}>{plant.name} · {plant.location}</option>)}</select></label>
}

function PlantDetail({ plant }: { plant: PlantState }) {
  if (!isOperationalPlant(plant))
    return (
      <>
        <PageHeader
          eyebrow={`${plant.mode} · ${plant.location}`}
          title={plant.name}
          description="Centro configurado, pendiente de conexión con una fuente operacional validada."
        />
        <section className="plant-activation-dashboard">
          <article className="panel plant-activation-hero">
            <span className="plant-offline-icon"><Link2Off size={24} /></span>
            <div>
              <span className="overline">Estado de datos</span>
              <h2>Planta sin fuente operacional</h2>
              <p>Asigna y publica una fuente validada para comenzar a mostrar indicadores reales de esta planta.</p>
            </div>
            <Link className="button primary" to="/importaciones">
              <FileSpreadsheet size={16} />
              Asignar fuente
            </Link>
            <div className="plant-activation-facts" aria-label="Resumen de activación">
              <div><small>Conectividad</small><b>No vinculada</b></div>
              <div><small>Productos configurados</small><b>{plant.products.length}</b></div>
              <div><small>Indicadores publicados</small><b>0</b></div>
            </div>
          </article>
          <article className="panel plant-activation-progress">
            <header className="panel-header">
              <div><span className="overline">Puesta en marcha</span><h2>Preparación operacional</h2></div>
              <span>1 de 4</span>
            </header>
            <ol>
              <li className="complete"><span><CheckCircle2 size={15}/></span><div><b>Centro configurado</b><small>Planta y catálogo disponibles</small></div></li>
              <li className="current"><span>02</span><div><b>Asignar fuente</b><small>Selecciona la planilla operacional</small></div></li>
              <li><span>03</span><div><b>Validar estructura</b><small>Revisión previa a publicación</small></div></li>
              <li><span>04</span><div><b>Publicar indicadores</b><small>Dashboard habilitado con datos reales</small></div></li>
            </ol>
          </article>
          <article className="panel plant-activation-products">
            <header className="panel-header">
              <div><span className="overline">Alcance productivo</span><h2>Productos configurados</h2></div>
              <span>{plant.products.length} categorías</span>
            </header>
            <div className="plant-product-dashboard">
              {plant.products.map((product, index) => <div key={product}><span>{String(index + 1).padStart(2, "0")}</span><b>{product}</b><small>Configuración por validar</small></div>)}
            </div>
          </article>
        </section>
      </>
    );
  const progress = Math.round((plant.productionKg / plant.targetKg) * 100);
  return (
    <>
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
