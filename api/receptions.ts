import { requireOperator, type SessionOperator } from "./_auth.js";
import { hasPlantAccess, normalizePlantIds } from "./_plants.js";
import { getSql } from "./_db.js";

type Request = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type Response = { status: (code: number) => Response; setHeader: (name: string, value: string) => void; json: (body: unknown) => void };
type EvidenceInput = { kind?: unknown; label?: unknown; url?: unknown; note?: unknown };
type ReceptionInput = {
  supplier?: unknown;
  species?: unknown;
  zone?: unknown;
  plantId?: unknown;
  guide?: unknown;
  guideReference?: unknown;
  gross?: unknown;
  tare?: unknown;
  drained?: unknown;
  accepted?: unknown;
  temperature?: unknown;
  occurredAt?: unknown;
  evidence?: unknown;
};

const allowedSpecies = new Set(["Erizo", "Loco", "Jaiba", "Centolla", "Pulpo", "Pescado", "Algas"]);
const evidenceKinds = new Set(["document", "photo", "certificate", "other"]);
const httpsUrlPattern = /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:[/?#][^\s]*)?$/i;
const clean=(value:unknown,max=180)=>String(value??"").trim().replace(/\s+/g," ").slice(0,max);

function normalizeEvidence(value: unknown) {
  if (!Array.isArray(value) || value.length > 6) return null;
  const result: Array<{ kind: string; label: string; url: string; note: string }> = [];
  for (const raw of value as EvidenceInput[]) {
    const kind = clean(raw?.kind,32);
    const label = clean(raw?.label,120);
    const url = String(raw?.url ?? "").trim();
    const note = clean(raw?.note,500);
    if (!evidenceKinds.has(kind) || label.length < 2 || url.length > 2048 || !httpsUrlPattern.test(url)) return null;
    result.push({ kind, label, url, note });
  }
  return result;
}

export default async function handler(request: Request, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  try {
    const operator = await requireOperator(request);
    if (!operator) return response.status(401).json({ ok: false, error: "Sesión requerida" });
    if (request.method === "GET") return await listReceptions(response, operator);
    if (request.method === "POST") {
      if (!["admin", "operations", "quality"].includes(operator.role))
        return response.status(403).json({ ok: false, error: "Tu rol no puede registrar recepciones" });
      return await createReception(request.body, response, operator);
    }
    response.setHeader("Allow", "GET, POST");
    return response.status(405).json({ ok: false, error: "Método no permitido" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const configuration = message.includes("DATABASE_URL");
    const migration = message.includes("operator_sessions") || message.includes("guide_kg") || message.includes("reception_evidence");
    return response.status(configuration || migration ? 503 : 500).json({
      ok: false,
      error: configuration
        ? "Base de datos no conectada"
        : migration
          ? "Faltan migraciones operacionales"
          : "No fue posible procesar la recepción",
    });
  }
}

async function listReceptions(response: Response, operator: SessionOperator) {
  const rows = (await getSql()`
    select r.id,r.reception_number,r.plant_id,p.legal_name as supplier,r.species,r.extraction_zone,r.source_reference,r.guide_kg,r.gross_kg,r.tare_kg,r.drained_kg,r.accepted_kg,r.temperature_c,r.quality_status,r.evidence_count,r.received_at,
      coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'label',e.label,'url',e.url,'note',e.note,'createdBy',e.created_by,'createdAt',e.created_at) order by e.created_at) from reception_evidence e where e.reception_id=r.id),'[]'::jsonb) as evidence
    from receptions r join parties p on p.id=r.supplier_id order by r.received_at desc limit 500
  `) as Array<Record<string, unknown>>;
  const visible = operator.role === "admin"
    ? rows
    : rows.filter((row) => typeof row.plant_id === "string" && hasPlantAccess(operator, row.plant_id));
  return response.status(200).json({ ok: true, receptions: visible });
}

async function createReception(body: unknown, response: Response, operator: SessionOperator) {
  const input = (body ?? {}) as ReceptionInput;
  const supplier = clean(input.supplier);
  const species = clean(input.species,80);
  const zone = clean(input.zone);
  const guideReference = clean(input.guideReference,120);
  const plantId = clean(input.plantId,80);
  const guide = Number(input.guide);
  const gross = Number(input.gross);
  const tare = Number(input.tare);
  const drained = Number(input.drained);
  const accepted = Number(input.accepted);
  const temperature = Number(input.temperature);
  const receivedAt = new Date(String(input.occurredAt ?? ""));
  const evidence = normalizeEvidence(input.evidence ?? []);
  const expectedAccepted=Math.max(0,drained-tare);
  const validReceivedAt=!Number.isNaN(receivedAt.getTime())&&receivedAt.getTime()<=Date.now()+15*60*1000;
  if (
    supplier.length < 2 ||
    zone.length < 2 ||
    guideReference.length < 2 ||
    normalizePlantIds([plantId]).length !== 1 ||
    !hasPlantAccess(operator, plantId) ||
    !allowedSpecies.has(species) ||
    !validReceivedAt ||
    ![guide, gross, tare, drained, accepted, temperature].every(Number.isFinite) ||
    guide <= 0 ||
    gross <= 0 ||
    tare < 0 ||
    drained < 0 ||
    accepted < 0 ||
    tare > gross ||
    drained > gross ||
    tare > drained ||
    accepted > gross - tare ||
    Math.abs(accepted-expectedAccepted)>0.001 ||
    temperature < -5 || temperature > 30 ||
    evidence === null
  ) return response.status(400).json({ ok: false, error: "Datos de recepción, pesos, guía o evidencia inválidos" });

  const sql=getSql();
  const rows = await sql`
    with existing_party as (
      select id from parties where kind='supplier'::party_kind and lower(legal_name)=lower(${supplier}) order by created_at limit 1
    ), inserted_party as (
      insert into parties(kind,legal_name)
      select 'supplier'::party_kind,${supplier} where not exists(select 1 from existing_party)
      on conflict(kind,legal_name) do update set updated_at=now() returning id
    ), party as (
      select id from existing_party union all select id from inserted_party limit 1
    ), reception as (
      insert into receptions(supplier_id,plant_id,species,extraction_zone,received_at,guide_kg,gross_kg,tare_kg,drained_kg,accepted_kg,temperature_c,quality_status,evidence_count,status,source,source_reference)
      select id,${plantId},${species},${zone},${receivedAt.toISOString()}::timestamptz,${guide},${gross},${tare},${drained},${accepted},${temperature},'Muestreo',${evidence.length},'pending',${operator.fullName},${guideReference} from party
      returning id,reception_number,received_at,source_reference
    ), inserted_evidence as (
      insert into reception_evidence(reception_id,kind,label,url,note,created_by)
      select r.id,e->>'kind',e->>'label',e->>'url',nullif(e->>'note',''),${operator.fullName}
      from reception r cross join jsonb_array_elements(${JSON.stringify(evidence)}::jsonb) e
      returning id
    )
    select id,reception_number,received_at,source_reference,(select count(*) from inserted_evidence) as evidence_count from reception
  `;
  return response.status(201).json({ ok: true, reception: Array.isArray(rows) ? rows[0] : null });
}
