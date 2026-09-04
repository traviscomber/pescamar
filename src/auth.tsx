import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { organizationContext } from "./organization";

type Operator = {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "operations" | "finance" | "quality" | "viewer";
  plantIds: string[];
  organizationId: string;
};

type AuthOperatorPayload = Omit<Operator, "organizationId"> & { organizationId?: string };

type AuthContextValue = {
  operator: Operator | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  revalidate: () => Promise<boolean>;
};

type AuthPayload = {
  ok?: boolean;
  operator?: AuthOperatorPayload;
  error?: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_REVALIDATE_MS = 5 * 60 * 1000;

function normalizeOperator(operator: AuthOperatorPayload): Operator {
  return {
    ...operator,
    organizationId: operator.organizationId || organizationContext.organizationId,
  };
}

async function authRequest(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as AuthPayload;
  return { response, payload };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);

  const revalidate = useCallback(async () => {
    try {
      const { response, payload } = await authRequest("/api/auth");
      if (response.ok && payload.operator) {
        setOperator(normalizeOperator(payload.operator));
        return true;
      }
      if (response.status === 401) setOperator(null);
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    void revalidate().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [revalidate]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void revalidate();
    }, SESSION_REVALIDATE_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [revalidate]);

  const login = useCallback(async (email: string, password: string) => {
    const { response, payload } = await authRequest("/api/auth", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok || !payload.operator) {
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        const minutes = retryAfter > 0 ? Math.max(1, Math.ceil(retryAfter / 60)) : null;
        throw new Error(minutes ? `Demasiados intentos. Intenta nuevamente en ${minutes} min.` : payload.error || "Demasiados intentos. Intenta nuevamente más tarde.");
      }
      throw new Error(payload.error || "No fue posible iniciar sesión");
    }
    setOperator(normalizeOperator(payload.operator));
  }, []);

  const logout = useCallback(async () => {
    try {
      await authRequest("/api/auth", { method: "DELETE" });
    } finally {
      setOperator(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ operator, loading, login, logout, revalidate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider requerido");
  return value;
}

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No fue posible iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card panel" aria-labelledby="login-title">
        <div className="eyebrow">PESCAMAR · CONTROL OPERACIONAL</div>
        <h1 id="login-title">Acceso</h1>
        <p>Ingresa con tu identidad operacional. El sistema limita automáticamente la información y las acciones según tu rol y plantas autorizadas.</p>
        <form onSubmit={submit}>
          <label>
            Correo
            <input
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@pescamarchile.cl"
              required
              maxLength={254}
              disabled={submitting}
              autoFocus
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              maxLength={256}
              disabled={submitting}
            />
          </label>
          {error ? <p className="form-error" role="alert" aria-live="polite">{error}</p> : null}
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Validando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}