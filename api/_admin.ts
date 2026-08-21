declare const process: { env: Record<string, string | undefined> };

export type AuthorizedRequest = {
  headers?: Record<string, string | string[] | undefined>;
};

export function isAdminConfigured() {
  return (process.env.ADMIN_SETUP_TOKEN?.length ?? 0) >= 24;
}

export function isAdminAuthorized(request: AuthorizedRequest) {
  const expected = process.env.ADMIN_SETUP_TOKEN ?? "";
  const header = request.headers?.authorization;
  const supplied =
    (Array.isArray(header) ? header[0] : header)?.replace(/^Bearer\s+/i, "") ??
    "";
  if (expected.length < 24 || !supplied) return false;
  let difference = expected.length ^ supplied.length;
  for (let index = 0; index < expected.length; index += 1)
    difference |= expected.charCodeAt(index) ^ (supplied.charCodeAt(index) || 0);
  return difference === 0;
}
