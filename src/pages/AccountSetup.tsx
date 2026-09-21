import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Compass, ArrowRight } from "lucide-react";
import { useAuth, type Operator } from "../auth";
import { canAccessPath } from "../access";
import { getOperatorExperience } from "../roleExperience";
import "./account-setup.css";

// First-login onboarding for pilot accounts: management creates identities
// with a temporary password (operators.must_change_password), so the very
// first screen after login forces a self-chosen password, followed by a
// minimal welcome that points to the role's primary paths using the existing
// roleExperience copy (no new UX text inventions).

function Welcome({ operator, onEnter }: { operator: Operator; onEnter: () => void }) {
  const experience = getOperatorExperience(operator);
  const paths = experience.primaryPaths
    .filter((path) => canAccessPath(operator.role, path))
    .slice(0, 4);
  return (
    <main className="login-shell">
      <section className="login-card panel" aria-labelledby="welcome-title">
        <div className="eyebrow">Bienvenido a Pescamar</div>
        <h1 id="welcome-title">{operator.fullName}</h1>
        <p>{experience.mission.es}</p>
        <span className="overline teal"><Compass size={13}/> Empieza por aquí</span>
        <ul className="welcome-paths">
          {paths.map((path) => (
            <li key={path}>
              <Link to={path} onClick={onEnter}><ArrowRight size={14}/>{path === "/" ? "Inicio" : path}</Link>
            </li>
          ))}
        </ul>
        <button className="button primary" type="button" onClick={onEnter}>Ir a mi espacio de trabajo</button>
      </section>
    </main>
  );
}

export function AccountSetup() {
  const { operator, revalidate } = useAuth();
  const [changed, setChanged] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!operator) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("La confirmación no coincide con la nueva contraseña");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No fue posible cambiar la contraseña");
      // No revalidar todavía: el gate de App desmontaría esta pantalla al
      // recibir mustChangePassword=false. La bienvenida se muestra primero y
      // la sesión se revalida cuando la persona entra a su espacio.
      setChanged(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible cambiar la contraseña");
    } finally {
      setBusy(false);
    }
  }

  if (changed) return <Welcome operator={operator} onEnter={() => void revalidate()} />;

  return (
    <main className="login-shell">
      <section className="login-card panel" aria-labelledby="setup-title">
        <div className="eyebrow">Primera configuración</div>
        <h1 id="setup-title">Define tu contraseña</h1>
        <p>Tu cuenta usa una contraseña temporal entregada por la administración. Elige una contraseña propia para empezar a trabajar.</p>
        <form onSubmit={submit}>
          <label>
            Contraseña temporal
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              minLength={8}
              maxLength={256}
              disabled={busy}
              autoFocus
            />
          </label>
          <label>
            Nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={12}
              maxLength={256}
              disabled={busy}
            />
          </label>
          <label>
            Confirmar nueva contraseña
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
              minLength={12}
              maxLength={256}
              disabled={busy}
            />
          </label>
          {error ? <p className="form-error" role="alert" aria-live="polite">{error}</p> : null}
          <button className="button primary" type="submit" disabled={busy}>
            <KeyRound size={16}/>{busy ? "Guardando…" : "Guardar y continuar"}
          </button>
        </form>
      </section>
    </main>
  );
}
