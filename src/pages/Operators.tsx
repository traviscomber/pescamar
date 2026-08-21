import { KeyRound, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";

type Role = "admin" | "operations" | "finance" | "quality" | "viewer";
type Operator = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
};
const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  operations: "Operaciones",
  finance: "Finanzas",
  quality: "Calidad",
  viewer: "Lectura",
};

export function Operators() {
  const [token, setToken] = useState(""),
    [unlocked, setUnlocked] = useState(false),
    [operators, setOperators] = useState<Operator[]>([]);
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [role, setRole] = useState<Role>("operations"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = async (method: string, body?: unknown) => {
    const response = await fetch("/api/operators", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json()) as {
      operators?: Operator[];
      operator?: Operator;
      error?: string;
    };
    if (!response.ok)
      throw new Error(payload.error ?? "No fue posible abrir el panel");
    return payload;
  };
  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = await request("GET");
      setOperators(payload.operators ?? []);
      setUnlocked(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible abrir el panel",
      );
    } finally {
      setBusy(false);
    }
  };
  const add = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = await request("POST", { name, email, role });
      if (payload.operator)
        setOperators((current) => [
          payload.operator!,
          ...current.filter((item) => item.id !== payload.operator!.id),
        ]);
      setName("");
      setEmail("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible agregar el operador",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Operadores y permisos"
        description="Una lista cerrada para las cinco personas que administran la operación, sin contraseñas almacenadas en Pescamar."
      />
      {!unlocked ? (
        <section className="panel operator-unlock">
          <KeyRound />
          <div>
            <h2>Acceso administrativo</h2>
            <p>
              La clave se valida en el servidor y permanece únicamente en esta
              sesión; nunca se guarda en el navegador.
            </p>
          </div>
          <form onSubmit={unlock}>
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Clave de administración"
              autoComplete="off"
              required
            />
            <button className="button primary" disabled={busy}>
              {busy ? "Validando…" : "Abrir panel"}
            </button>
          </form>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      ) : (
        <>
          <section className="operator-layout">
            <form className="panel operator-form" onSubmit={add}>
              <span className="overline teal">Nueva autorización</span>
              <h2>Agregar operador</h2>
              <label>
                Nombre completo
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Correo
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  maxLength={254}
                />
              </label>
              <label>
                Rol
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {error ? (
                <p className="form-error" role="alert">
                  {error}
                </p>
              ) : null}
              <button className="button primary" disabled={busy}>
                <UserPlus size={16} />
                {busy ? "Guardando…" : "Agregar a la lista"}
              </button>
            </form>
            <section className="panel operator-list">
              <header className="panel-header">
                <div>
                  <span className="overline teal">Lista autorizada</span>
                  <h2>{operators.length} operadores</h2>
                </div>
                <Users />
              </header>
              {operators.length ? (
                operators.map((item) => (
                  <article key={item.id}>
                    <span>
                      {item.full_name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div>
                      <b>{item.full_name}</b>
                      <small>{item.email}</small>
                    </div>
                    <em>{roleLabels[item.role]}</em>
                    <i className={item.active ? "active" : ""}>
                      {item.active ? "Activo" : "Inactivo"}
                    </i>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <ShieldCheck />
                  <h3>No hay operadores autorizados</h3>
                  <p>
                    Agrega la primera persona responsable para iniciar la lista
                    cerrada.
                  </p>
                </div>
              )}
            </section>
          </section>
        </>
      )}
    </>
  );
}
