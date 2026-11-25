import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import RoleRoute from "./auth/RoleRoute.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard";
import Trips from "./pages/Trips";
import Incidents from "./pages/Incidents";
import Drivers from "./pages/Drivers";
import Vehicles from "./pages/Vehicles";
import Admin from "./pages/Admin";
import Account from "./pages/Account";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Rutas que requieren sesión iniciada */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/incidents" element={<Incidents />} />
          
          <Route path="/account" element={<Account />} />

          {/* Solo administradores y agentes */}
          <Route element={<RoleRoute roles={["ADMIN", "AGENT"]} />}>
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/vehicles" element={<Vehicles />} />
          </Route>

          {/* Solo administradores */}
          <Route element={<RoleRoute roles={["ADMIN"]} />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}