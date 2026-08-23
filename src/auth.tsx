import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";

type Operator = {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "operations" | "finance" | "quality" | "viewer";
  plantIds: string[];
};

type AuthContextValue = {
  operator: Operator | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

type AuthPayload = {
  ok?: boolean;
  operator?: Operator;
  error?: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function authRequest(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    credentials: "same-origin",
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

  useEffect(() => {
    let active = true;
    void authRequest("/api/auth")
      .then(({ response, payload }) => {
        if (!active) return;
        setOperator(response.ok && payload.operator ? payload.operator : null);
      })
      .catch(() => {
        if (active) setOperator(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { response, payload } = await authRequest("/api/auth", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok || !payload.operator) {
      throw new Error(payload.error || "No fue posible iniciar sesión");
    }
    setOperator(payload.operator);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authRequest("/api/auth", { method: "DELETE" });
    } finally {
      setOperator(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ operator, loading, login, logout }}>
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
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••••"
              required
              minLength={12}
              maxLength={256}
              disabled={submitting}
            />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button primary" type="submit" disabled={submitting || !email || password.length < 12}>
            {submitting ? "Validando…" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
