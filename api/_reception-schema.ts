// Legacy compatibility shim. Reception schema is owned by versioned migrations (004 and 011).
// Keep this function side-effect free while older API modules are migrated away from runtime schema checks.
export async function ensureReceptionSchema() {
  return Promise.resolve();
}
