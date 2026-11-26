import { createContext, useContext, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

// El token JWT trae el usuario (sub) y el rol dentro
function decodeToken(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function userFromToken(token) {
  const data = token && decodeToken(token);
  if (!data || data.exp * 1000 < Date.now()) return null;
  return { username: data.sub, role: data.role };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    userFromToken(localStorage.getItem("token"))
  );

  async function login(username, password) {
    // El backend espera un formulario, no JSON
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    const { data } = await api.post("/auth/token", form);
    localStorage.setItem("token", data.access_token);
    setUser(userFromToken(data.access_token));
  }

  function logout() {
    localStorage.removeItem("token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
