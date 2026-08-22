import { getSql } from "./_db.js";

type Response = {
  status: (code: number) => Response;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};
declare const process: { env: Record<string, string | undefined> };

export default async function handler(_request: unknown, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  if (process.env.VERCEL_ENV !== "preview")
    return response.status(404).json({ ok: false });
  try {
    const sql = getSql();
    const [columns, tables, indexes, counts] = await Promise.all([
      sql`select table_name,column_name from information_schema.columns where table_schema='public' and (
        (table_name='receptions' and column_name='guide_kg') or
        (table_name='settlements' and column_name in ('price_per_kg_clp','credit_recovery_clp','created_by','approved_by','calculation_snapshot','updated_at')) or
        (table_name='operators' and column_name in ('password_hash','plant_ids'))
      )`,
      sql`select table_name from information_schema.tables where table_schema='public' and table_name='operator_sessions'`,
      sql`select indexname from pg_indexes where schemaname='public' and indexname in ('credit_movements_advance_request_unique','credit_movements_recovery_settlement_unique','settlements_status_created_idx','operator_sessions_operator_idx','operator_sessions_expiry_idx')`,
      sql`select
        (select count(*)::int from receptions) as receptions,
        (select count(*)::int from settlements) as settlements,
        (select count(*)::int from operators) as operators`,
    ]);
    const presentColumns = new Set(
      (columns as Array<{ table_name: string; column_name: string }>).map(
        (row) => `${row.table_name}.${row.column_name}`,
      ),
    );
    const presentIndexes = new Set(
      (indexes as Array<{ indexname: string }>).map((row) => row.indexname),
    );
    const countRow = Array.isArray(counts) ? counts[0] as Record<string, number> : {};
    const migration002 = [
      'receptions.guide_kg',
      'settlements.price_per_kg_clp',
      'settlements.credit_recovery_clp',
      'settlements.created_by',
      'settlements.approved_by',
      'settlements.calculation_snapshot',
      'settlements.updated_at',
    ].every((key) => presentColumns.has(key)) &&
      ['credit_movements_advance_request_unique','credit_movements_recovery_settlement_unique','settlements_status_created_idx'].every((key) => presentIndexes.has(key));
    const migration003 =
      presentColumns.has('operators.password_hash') &&
      presentColumns.has('operators.plant_ids') &&
      Array.isArray(tables) && tables.length === 1 &&
      ['operator_sessions_operator_idx','operator_sessions_expiry_idx'].every((key) => presentIndexes.has(key));
    return response.status(200).json({
      ok: true,
      migration002,
      migration003,
      counts: {
        receptions: Number(countRow.receptions ?? 0),
        settlements: Number(countRow.settlements ?? 0),
        operators: Number(countRow.operators ?? 0),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return response.status(500).json({
      ok: false,
      databaseConfigured: !message.includes("DATABASE_URL"),
      error: "schema_probe_failed",
    });
  }
}
