#!/usr/bin/env node
// Respaldo lógico manual de la base de datos Pescamar (Neon, PostgreSQL 18).
//
// Uso:
//   DATABASE_URL=... npm run db:backup              → respaldo completo (esquema + datos)
//   DATABASE_URL=... npm run db:backup -- --schema-only
//   DATABASE_URL=... npm run db:backup -- --out /ruta/a/backups
//
// Requisitos:
//   - pg_dump en el PATH, versión 18.x (debe coincidir con el servidor Neon;
//     https://www.postgresql.org/download/ o `choco install postgresql18 --params '--exclude-components server'`).
//   - DATABASE_URL en el entorno. NUNCA se imprime ni se persiste.
//
// Salida: <outDir>/pescamar-backup-<YYYYMMDD-HHmmss>.sql.gz  (outDir por defecto ./backups, gitignored)
// Estrategia: pg_dump --no-owner --no-privileges, comprimido con gzip. Ver docs/RUNBOOK.md §6.

import { spawn } from "node:child_process";
import { createGzip } from "node:zlib";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const schemaOnly = args.includes("--schema-only");
const outIndex = args.indexOf("--out");
const outDir = resolve(outIndex >= 0 ? args[outIndex + 1] : "backups");

const usage = `Respaldo lógico manual (pg_dump) — Seafood Intelligence OS / Pescamar

Uso:
  DATABASE_URL=... node scripts/db-backup.mjs [--schema-only] [--out <dir>]

Opciones:
  --schema-only   Solo el esquema (sin datos).
  --out <dir>     Directorio de salida (por defecto ./backups, gitignored).

Requisitos:
  - pg_dump 18.x en el PATH (debe coincidir con el servidor PostgreSQL 18 de Neon).
  - DATABASE_URL definida en el entorno (no se imprime nunca).`;

const fail = (message) => {
  console.error(`\ndb-backup FAILED · ${message}\n`);
  console.error(usage + "\n");
  process.exit(1);
};

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) fail("DATABASE_URL no está definida en el entorno.");

const probe = spawn("pg_dump", ["--version"], { stdio: "pipe" });
const probeTimeout = setTimeout(() => probe.kill(), 10_000);
const probeOutput = await new Promise((resolveProbe) => {
  let output = "";
  probe.stdout.on("data", (chunk) => (output += chunk));
  probe.stderr.on("data", (chunk) => (output += chunk));
  probe.on("error", () => resolveProbe(null));
  probe.on("close", () => resolveProbe(output));
});
clearTimeout(probeTimeout);
const versionMatch = probeOutput?.match(/pg_dump \(PostgreSQL\) (\d+)/);
if (!versionMatch) {
  fail("pg_dump no está instalado o no está en el PATH. Instala PostgreSQL 18 client tools (https://www.postgresql.org/download/).");
}
if (Number(versionMatch[1]) !== 18) {
  fail(`pg_dump es versión ${versionMatch[1]}.x; el servidor Neon es PostgreSQL 18 y pg_dump debe coincidir con la versión mayor del servidor.`);
}

await mkdir(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-").slice(0, 15);
const file = join(outDir, `pescamar-backup-${stamp}${schemaOnly ? "-schema" : ""}.sql.gz`);

const dumpArgs = ["--no-owner", "--no-privileges", "--format=plain"];
if (schemaOnly) dumpArgs.push("--schema-only");
dumpArgs.push(databaseUrl);

const dump = spawn("pg_dump", dumpArgs, { stdio: ["ignore", "pipe", "pipe"] });
const gzip = createGzip({ level: 9 });
const target = createWriteStream(file);
const stderr = [];
dump.stderr.on("data", (chunk) => stderr.push(String(chunk)));

dump.stdout.pipe(gzip).pipe(target);

const code = await new Promise((resolveCode) => {
  dump.on("error", (error) => {
    stderr.push(String(error.message || error));
    resolveCode(-1);
  });
  dump.on("close", resolveCode);
});

if (code !== 0) {
  const detail = stderr.join("").trim();
  fail(`pg_dump terminó con código ${code}.${detail ? ` Detalle: ${detail.replace(databaseUrl, "[REDACTED]")}` : ""}`);
}

await new Promise((resolveFinish, rejectFinish) => {
  target.on("finish", resolveFinish);
  target.on("error", rejectFinish);
});
console.log(`db-backup OK · ${file}${schemaOnly ? " (schema-only)" : ""}`);
