import { getSql } from "./_db.js";

type Request = { method?: string; body?: unknown };
type Response = {
  status: (code: number) => Response;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};
type ImportBatch = {
  id: string;
  fileName: string;
  periods: string[];
  plantIds: string[];
  rowCount: number;
  publishedAt: string;
  publishedBy: string;
  previousPlants: unknown[];
  resultingPlants: unknown[];
};

const isBatch = (value: unknown): value is ImportBatch => {
  if (!value || typeof value !== "object") return false;
  const batch = value as Partial<ImportBatch>;
  return (
    typeof batch.id === "string" &&
    batch.id.length <= 80 &&
    typeof batch.fileName === "string" &&
    batch.fileName.length <= 255 &&
    Array.isArray(batch.periods) &&
    Array.isArray(batch.plantIds) &&
    Number.isInteger(batch.rowCount) &&
    Number(batch.rowCount) > 0 &&
    typeof batch.publishedAt === "string" &&
    !Number.isNaN(Date.parse(batch.publishedAt)) &&
    typeof batch.publishedBy === "string" &&
    batch.publishedBy.trim().length > 0 &&
    Array.isArray(batch.previousPlants) &&
    Array.isArray(batch.resultingPlants)
  );
};

export default async function handler(request: Request, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  try {
    const sql = getSql();
    if (request.method === "GET") {
      const [state, history] = await Promise.all([
        sql`select plants, updated_at from plant_current_state where state_key='current'`,
        sql`select id,file_name,periods,plant_ids,row_count,published_at,published_by,previous_plants,resulting_plants,reverted_at from plant_import_batches order by published_at desc limit 10`,
      ]);
      const stateRows = state as Array<Record<string, unknown>>;
      const historyRows = history as Array<Record<string, unknown>>;
      return response.status(200).json({
        ok: true,
        plants: stateRows[0]?.plants ?? null,
        updatedAt: stateRows[0]?.updated_at ?? null,
        history: historyRows.map((row) => ({
          id: row.id,
          fileName: row.file_name,
          periods: row.periods,
          plantIds: row.plant_ids,
          rowCount: row.row_count,
          publishedAt: row.published_at,
          publishedBy: row.published_by,
          previousPlants: row.previous_plants,
          resultingPlants: row.resulting_plants,
          revertedAt: row.reverted_at ?? undefined,
        })),
      });
    }
    if (request.method === "POST") {
      const batch = (request.body as { batch?: unknown } | undefined)?.batch;
      if (!isBatch(batch))
        return response
          .status(400)
          .json({ ok: false, error: "Lote de importación inválido" });
      await sql.transaction([
        sql`insert into plant_import_batches (id,file_name,periods,plant_ids,row_count,published_at,published_by,previous_plants,resulting_plants) values (${batch.id},${batch.fileName},${batch.periods},${batch.plantIds},${batch.rowCount},${batch.publishedAt},${batch.publishedBy},${JSON.stringify(batch.previousPlants)},${JSON.stringify(batch.resultingPlants)})`,
        sql`insert into plant_current_state (state_key,plants,latest_batch_id,updated_at) values ('current',${JSON.stringify(batch.resultingPlants)},${batch.id},now()) on conflict (state_key) do update set plants=excluded.plants,latest_batch_id=excluded.latest_batch_id,updated_at=now()`,
      ]);
      return response.status(201).json({ ok: true, batchId: batch.id });
    }
    if (request.method === "PATCH") {
      const batchId = (request.body as { batchId?: unknown } | undefined)
        ?.batchId;
      if (typeof batchId !== "string" || !batchId)
        return response.status(400).json({ ok: false, error: "Lote inválido" });
      const result =
        await sql`with reverted as (update plant_import_batches set reverted_at=now() where id=${batchId} and reverted_at is null returning previous_plants) insert into plant_current_state (state_key,plants,latest_batch_id,updated_at) select 'current',previous_plants,null,now() from reverted on conflict (state_key) do update set plants=excluded.plants,latest_batch_id=null,updated_at=now() returning plants`;
      const rows = result as Array<Record<string, unknown>>;
      if (!rows.length)
        return response
          .status(409)
          .json({ ok: false, error: "La publicación ya no se puede revertir" });
      return response.status(200).json({ ok: true, plants: rows[0].plants });
    }
    response.setHeader("Allow", "GET, POST, PATCH");
    return response
      .status(405)
      .json({ ok: false, error: "Método no permitido" });
  } catch (error) {
    const configuration =
      error instanceof Error && error.message.includes("DATABASE_URL");
    return response.status(configuration ? 503 : 500).json({
      ok: false,
      error: configuration
        ? "Base de datos no conectada"
        : "No fue posible persistir el estado de plantas",
    });
  }
}
