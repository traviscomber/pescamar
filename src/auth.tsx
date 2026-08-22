import { createContext, useContext, type ReactNode } from "react";

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

const TEMPORARY_OPERATOR: Operator = {
  id: "1604b454-ef8a-448a-8788-136f6b224168",
  fullName: "Sebastián",
  email: "sebastian@pescamarchile.cl",
  role: "operations",
  plantIds: ["ancud", "quellon", "iquique", "piedra-azul", "aqua-austral", "natales"],
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  async function login() {
    return;
  }

  async function logout() {
    return;
  }

  return (
    <AuthContext.Provider
      value={{ operator: TEMPORARY_OPERATOR, loading: false, login, logout }}
    >
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
  return null;
}
