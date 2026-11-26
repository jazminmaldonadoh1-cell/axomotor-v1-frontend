import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { get_error_text } from "./helpers";
import UsersTab from "./UsersTab";
import DriversTab from "./DriversTab";

export default function Admin() {
  const { user: me } = useAuth();
  const [tab, set_tab] = useState("users");
  const [users, set_users] = useState([]);
  const [drivers, set_drivers] = useState([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState("");

  // Carga usuarios y conductores, y une cada conductor con su usuario
  const load_data = useCallback(async () => {
    try {
      const [users_res, drivers_res] = await Promise.all([
        api.get("/users/"),
        api.get("/drivers/"),
      ]);
      const users_by_id = new Map(users_res.data.map((u) => [u.user_id, u]));
      set_users(users_res.data);
      set_drivers(drivers_res.data);
      set_error("");
    } catch (err) {
      set_error(get_error_text(err, "No se pudo cargar la información."));
    } finally {
      set_is_loading(false);
    }
  }, []);

  useEffect(() => {
    load_data();
  }, [load_data]);

  if (is_loading) return <p>Cargando...</p>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h1>Panel de administración</h1>
      <p className="muted">Crea, edita y deshabilita usuarios y conductores.</p>

      <div className="tabs">
        <button
          className={tab === "users" ? "tab active" : "tab"}
          onClick={() => set_tab("users")}
        >
          Usuarios
        </button>
        <button
          className={tab === "drivers" ? "tab active" : "tab"}
          onClick={() => set_tab("drivers")}
        >
          Conductores
        </button>
        <button className="tab" disabled title="Pendiente: falta el endpoint en el backend">
          Vehículos
        </button>
        <button className="tab" disabled title="Pendiente: falta el endpoint en el backend">
          Ubicaciones conocidas
        </button>
      </div>

      {tab === "users" ? (
        <UsersTab
          users={users}
          drivers={drivers}
          current_username={me.username}
          on_changed={load_data}
        />
      ) : (
        <DriversTab drivers={drivers} on_changed={load_data} />
      )}
    </div>
  );
}
