import { useMemo, useState } from "react";
import api from "../../api/client";
import { get_error_text } from "./helpers";
import UserFormModal from "./UserFormModal";

// Pestaña de usuarios: lista, alta, edición y habilitar/deshabilitar
export default function UsersTab({ users, drivers, current_username, on_changed }) {
  const [search, set_search] = useState("");
  const [modal, set_modal] = useState(null); // null | { user } (user undefined = alta)
  const [action_error, set_action_error] = useState("");

  const driver_user_ids = useMemo(
    () => new Set(drivers.map((d) => d.user_id)),
    [drivers]
  );

  function get_role_label(u) {
    switch (u.role) {
      case "ADMIN":
        return "Administrador";
      case "DRIVER":
        return "Conductor";
      case "AGENT":
        return "Agente";
      default:
        return "—";
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      `${u.first_name} ${u.last_name} ${u.username} ${u.email}`
        .toLowerCase()
        .includes(term)
    );
  }, [users, search]);

  async function toggle_enabled(u) {
    const action = u.is_enabled ? "deshabilitar" : "habilitar";
    if (!window.confirm(`¿Seguro que quieres ${action} a ${u.first_name} ${u.last_name}?`)) {
      return;
    }
    set_action_error("");
    try {
      await api.put(`/users/${u.user_id}`, { is_enabled: !u.is_enabled });
      await on_changed();
    } catch (err) {
      set_action_error(get_error_text(err, `No se pudo ${action} al usuario.`));
    }
  }

  return (
    <div>
      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Buscar por nombre, usuario o correo..."
          value={search}
          onChange={(e) => set_search(e.target.value)}
        />
        <button className="btn-primary" onClick={() => set_modal({})}>
          + Nuevo usuario
        </button>
      </div>

      {action_error && <div className="error">{action_error}</div>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.user_id} className="no-click">
                <td>
                  {u.first_name} {u.last_name}
                </td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.phone_number}</td>
                <td>{get_role_label(u)}</td>
                <td>
                  <span className={`badge ${u.is_enabled ? "badge-green" : "badge-gray"}`}>
                    {u.is_enabled ? "Habilitado" : "Deshabilitado"}
                  </span>
                </td>
                <td className="row-actions">
                  <button className="btn-small" onClick={() => set_modal({ user: u })}>
                    Editar
                  </button>
                  <button
                    className="btn-small btn-danger"
                    onClick={() => toggle_enabled(u)}
                    // Evita que el administrador se deshabilite a sí mismo
                    disabled={u.username === current_username}
                    title={
                      u.username === current_username
                        ? "No puedes deshabilitar tu propia cuenta"
                        : ""
                    }
                  >
                    {u.is_enabled ? "Deshabilitar" : "Habilitar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <UserFormModal
          user={modal.user}
          on_close={() => set_modal(null)}
          on_changed={on_changed}
        />
      )}
    </div>
  );
}
