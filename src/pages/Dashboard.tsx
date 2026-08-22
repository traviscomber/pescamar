import {
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  FileSpreadsheet,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { usePlatformStatus } from "../hooks/usePlatformStatus";
import { canonicalExceptions, canonicalKpis } from "../canonical2025";
import type { Lot } from "../types";

export function Dashboard({
  lots,
  onNewReception,
}: {
  lots: Lot[];
  onNewReception: () => void;
}) {
  const { status, error } = usePlatformStatus();
  const pending = status?.metrics.pendingDecisions ?? 0;
  const reviewCount = lots.filter(
    (lot) => lot.status === "Revisión" || lot.status === "Alerta calibre",
  ).length;
  const connected = [
    Boolean(status?.ok),
    Boolean(status?.persistence.database),
    Boolean(status?.persistence.files),
    Boolean(status?.metrics.activeOperators),
  ].filter(Boolean).length;

  return (
    <>
      <PageHeader
        eyebrow="Centro de mando"
        title="Operación de hoy"
        description="Qué necesita atención, por qué y cuál es la siguiente decisión."
      />

      <section className="command-deck" aria-labelledby="command-title">
        <div className="command-copy">
          <span className="system-label">N3 SYS // CONTROL POR EXCEPCIÓN</span>
          <h2 id="command-title">
            {pending
              ? pending +
                (pending === 1
                  ? " decisión requiere criterio humano."
                  : " decisiones requieren criterio humano.")
              : "No hay decisiones operacionales pendientes."}
          </h2>
          <p>
            La bandeja reúne recepciones y anticipos enviados a aprobación,
            ordenados desde la solicitud más antigua.
          </p>
          <Link className="command-action" to="/aprobaciones">
            <CheckCheck size={17} />
            {pending ? "Revisar siguiente decisión" : "Abrir bandeja"}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="command-metrics" aria-label="Resumen operacional">
          <Metric label="Pendientes" value={pending} detail="Decisiones reales" />
          <Metric
            label="Recepciones"
            value={status?.metrics.receptions ?? lots.length}
            detail={reviewCount + " en revisión"}
          />
          <Metric
            label="Anticipos"
            value={status?.metrics.pendingCredits ?? 0}
            detail="Esperando decisión"
          />
        </div>
      </section>

      <section className="system-health" aria-label="Salud del sistema">
        <div>
          <span className="health-pulse" />
          <p>
            <b>{connected}/4 controles operativos</b>
            <small>Base, funciones, evidencia e identidad</small>
          </p>
        </div>
        <Health label="Funciones" ready={Boolean(status?.ok)} />
        <Health
          label="PostgreSQL"
          ready={Boolean(status?.persistence.database)}
        />
        <Health
          label="Evidencia"
          ready={Boolean(status?.persistence.files)}
        />
        <Health
          label="Operadores"
          ready={Boolean(status?.metrics.activeOperators)}
        />
        <Link to="/modulos">
          Configuración <ArrowRight size={14} />
        </Link>
      </section>
      {error ? (
        <p className="health-error" role="alert">
          No fue posible actualizar la salud de plataforma.
        </p>
      ) : null}

      <section className="panel command-queue">
        <header>
          <div>
            <span className="overline teal">Evidencia histórica</span>
            <h2>Excepciones de la fuente canónica 2025</h2>
            <p>
              {canonicalExceptions.length} hallazgos documentados sobre{" "}
              {canonicalKpis.records} registros. No representan alertas en
              tiempo real.
            </p>
          </div>
          <Link className="source-link" to="/operacion-2025">
            <FileSpreadsheet size={15} />
            Ver fuente
          </Link>
        </header>
        <div className="priority-list">
          {canonicalExceptions.map((item, index) => (
            <Link to="/operacion-2025" key={item.id}>
              <span className="queue-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={
                  item.severity === "Crítica"
                    ? "severity critical"
                    : "severity high"
                }
              >
                <AlertTriangle size={14} />
                {item.severity}
              </span>
              <span className="queue-copy">
                <b>{item.type}</b>
                <small>
                  {item.lot} · {item.detail}
                </small>
              </span>
              <span className="queue-action">
                Revisar evidencia <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="secondary-action">
        <div>
          <span className="overline">Captura operacional</span>
          <p>Registra una entrega respaldada por pesaje y evidencia real.</p>
        </div>
        <button className="button secondary" onClick={onNewReception}>
          <Plus size={15} />
          Nueva recepción
        </button>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div>
      <small>{label}</small>
      <b>{value}</b>
      <span>{detail}</span>
    </div>
  );
}

function Health({ label, ready }: { label: string; ready: boolean }) {
  return (
    <span className="health-item">
      <i className={ready ? "ready" : ""} />
      {label}
      <b>{ready ? "Activo" : "Pendiente"}</b>
    </span>
  );
}
