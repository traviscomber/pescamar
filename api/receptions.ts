import { getSql } from "./_db.js";

type Request = { method?: string; body?: unknown };
type Response = {
  status: (code: number) => Response;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};
type ReceptionInput = {
  supplier?: unknown;
  species?: unknown;
  zone?: unknown;
  guide?: unknown;
  gross?: unknown;
  tare?: unknown;
  drained?: unknown;
  accepted?: unknown;
  temperature?: unknown;
  evidenceCount?: unknown;
};

const allowedSpecies = new Set([
  "Erizo",
  "Loco",
  "Jaiba",
  "Centolla",
  "Pulpo",
  "Pescado",
  "Algas",
]);

export default async function handler(request: Request, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  try {
    if (request.method === "GET") return await listReceptions(response);
    if (request.method === "POST")
      return await createReception(request.body, response);
    response.setHeader("Allow", "GET, POST");
    return response
      .status(405)
      .json({ ok: false, error: "Método no permitido" });
  } catch (error) {
    const configuration =
      error instanceof Error && error.message.includes("DATABASE_URL");
    return response
      .status(configuration ? 503 : 500)
      .json({
        ok: false,
        error: configuration
          ? "Base de datos no conectada"
          : "No fue posible procesar la recepción",
      });
  }
}

async function listReceptions(response: Response) {
  const rows = await getSql()`
    select r.id, r.reception_number, p.legal_name as supplier, r.species,
      r.extraction_zone, r.guide_kg, r.gross_kg, r.tare_kg, r.drained_kg, r.accepted_kg,
      r.temperature_c, r.quality_status, r.evidence_count, r.received_at
    from receptions r
    join parties p on p.id=r.supplier_id
    order by r.received_at desc limit 500
  `;
  return response.status(200).json({ ok: true, receptions: rows });
}

async function createReception(body: unknown, response: Response) {
  const input = (body ?? {}) as ReceptionInput;
  const supplier = String(input.supplier ?? "").trim(),
    species = String(input.species ?? "").trim(),
    zone = String(input.zone ?? "").trim();
  const guide = Number(input.guide),
    gross = Number(input.gross),
    tare = Number(input.tare),
    drained = Number(input.drained),
    accepted = Number(input.accepted);
  const temperature = Number(input.temperature),
    evidenceCount = Number(input.evidenceCount ?? 0);
  if (
    !supplier ||
    !zone ||
    !allowedSpecies.has(species) ||
    ![guide, gross, tare, drained, accepted, temperature].every(Number.isFinite) ||
    guide <= 0 ||
    gross <= 0 ||
    tare < 0 ||
    drained < 0 ||
    accepted < 0 ||
    tare > gross ||
    accepted > gross - tare ||
    !Number.isSafeInteger(evidenceCount) ||
    evidenceCount < 0
  )
    return response
      .status(400)
      .json({ ok: false, error: "Datos de recepción incompletos o inválidos" });
  const rows = await getSql()`
    with party as (
      insert into parties (kind, legal_name) values ('supplier', ${supplier})
      on conflict (kind, legal_name) do update set updated_at=now() returning id
    )
    insert into receptions (supplier_id, species, extraction_zone, received_at, guide_kg, gross_kg, tare_kg, drained_kg, accepted_kg, temperature_c, quality_status, evidence_count, status, source)
    select id, ${species}, ${zone}, now(), ${guide}, ${gross}, ${tare}, ${drained}, ${accepted}, ${temperature}, 'Muestreo', ${evidenceCount}, 'pending', 'manual' from party
    returning id, reception_number, received_at
  `;
  const reception = Array.isArray(rows) ? rows[0] : null;
  return response.status(201).json({ ok: true, reception });
}
