import {
  createContext,
  useContext,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import "./auth.css";

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

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth")
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { operator: Operator };
        setOperator(data.operator);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await response.json()) as { operator?: Operator; error?: string };
    if (!response.ok || !data.operator)
      throw new Error(data.error ?? "No fue posible iniciar sesión");
    setOperator(data.operator);
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setOperator(null);
  }

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No fue posible iniciar sesión",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="panel login-card">
        <span className="overline teal">Pescamar ERP</span>
        <h1>Acceso operacional</h1>
        <p>
          Ingresa con tu identidad individual. Las decisiones y movimientos quedan
          asociados a tu cuenta.
        </p>
        <form onSubmit={submit}>
          <label>
            Correo
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={12}
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button primary full" disabled={busy}>
            {busy ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
