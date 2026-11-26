import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";

// Convierte "2027-03-15" en una fecha local (evita desfase por zona horaria)
function parse_date(value) {
  return new Date(`${value}T00:00:00`);
}

function format_date(value) {
  return parse_date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Calcula el estado de vigencia de la licencia
function get_license_status(exp_date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = parse_date(exp_date);
  const days_left = Math.round((exp - today) / (1000 * 60 * 60 * 24));

  if (days_left < 0) return { label: "Vencida", css: "badge-red" };
  if (days_left <= 30) return { label: "Por vencer", css: "badge-yellow" };
  return { label: "Vigente", css: "badge-green" };
}

function get_error_text(err) {
  if (!err.response) return "No se pudo conectar con el servidor.";
  return "No se pudo cargar la lista de conductores.";
}

// Nombre completo e iniciales para el avatar
function get_full_name(driver) {
  return driver.user ? `${driver.user.first_name} ${driver.user.last_name ?? ''}`.trimEnd() : "—";
}

function get_initials(driver) {
  if (!driver.user) return "?";
  return `${driver.user.first_name.charAt(0)}${driver.user.last_name?.charAt(0) ?? ''}`.trimEnd().toUpperCase();
}

function StatusBadge({ driver }) {
  if (!driver.is_enabled) return <span className="badge badge-gray">Deshabilitado</span>;
  if (driver.is_active) return <span className="badge badge-green">En servicio</span>;
  return <span className="badge badge-blue">Disponible</span>;
}

export default function Drivers() {
  const [drivers, set_drivers] = useState([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState("");
  const [search, set_search] = useState("");
  const [selected, set_selected] = useState(null);

  // Carga conductores y usuarios al mismo tiempo, y los une por user_id
  useEffect(() => {
    async function load_data() {
      try {
        const drivers_res = await api.get("/drivers/")
        set_drivers(drivers_res.data);
      } catch (err) {
        set_error(get_error_text(err));
      } finally {
        set_is_loading(false);
      }
    }
    load_data();
  }, []);

  // Filtra por nombre, número de licencia o correo
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return drivers;
    return drivers.filter((d) => {
      const full_name = d.user ? `${d.user.first_name} ${d.user.last_name}` : "";
      return (
        full_name.toLowerCase().includes(term) ||
        d.license_number.toLowerCase().includes(term) ||
        (d.user?.email ?? "").toLowerCase().includes(term)
      );
    });
  }, [drivers, search]);

  if (is_loading) return <p>Cargando...</p>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Conductores</h1>
        <p className="muted">Consulta la información de los conductores registrados.</p>
      </div>

      <input
        className="search-input"
        placeholder="Buscar por nombre, licencia o correo"
        value={search}
        onChange={(e) => set_search(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="muted">
          {drivers.length === 0
            ? "Todavía no hay conductores registrados."
            : "Ningún conductor coincide con la búsqueda."}
        </p>
      ) : (
        <div className="drivers-layout">
          <div className="table-wrapper drivers-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Licencia</th>
                  <th>Clase</th>
                  <th>Vence</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const license = get_license_status(d.license_exp_date);
                  const is_selected = selected?.driver_id === d.driver_id;
                  return (
                    <tr
                      key={d.driver_id}
                      className={is_selected ? "row-selected" : ""}
                      onClick={() => set_selected(d)}
                    >
                      <td>
                        <div className="person-cell">
                          <span className="avatar-sm">{get_initials(d)}</span>
                          <strong>{get_full_name(d)}</strong>
                        </div>
                      </td>
                      <td className="mono">{d.license_number}</td>
                      <td>{d.license_class}</td>
                      <td className="muted">{format_date(d.license_exp_date)}</td>
                      <td>
                        <span className={`badge ${license.css}`}>{license.label}</span>
                      </td>
                      <td>
                        <StatusBadge driver={d} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DriverPanel driver={selected} />
        </div>
      )}
    </div>
  );
}

// Panel con la información del conductor seleccionado
function DriverPanel({ driver }) {
  if (!driver) {
    return (
      <aside className="driver-panel driver-panel-empty">
        Selecciona un conductor de la tabla para ver su información.
      </aside>
    );
  }

  const license = get_license_status(driver.license_exp_date);
  const user = driver.user;

  return (
    <aside className="driver-panel">
      <div className="driver-panel-head">
        <span className="avatar-lg">{get_initials(driver)}</span>
        <div>
          <h2>{get_full_name(driver)}</h2>
          <span className="muted small">{user?.email ?? "—"}</span>
        </div>
      </div>

      <h3>Contacto</h3>
      <dl className="detail-list">
        <dt>Teléfono</dt>
        <dd>{user?.phone_number ?? "—"}</dd>
      </dl>

      <h3>Licencia de conducir</h3>
      <dl className="detail-list">
        <dt>Número</dt>
        <dd className="mono">{driver.license_number}</dd>
        <dt>Clase</dt>
        <dd>{driver.license_class}</dd>
        <dt>Expedición</dt>
        <dd>{format_date(driver.license_iss_date)}</dd>
        <dt>Vencimiento</dt>
        <dd>
          {format_date(driver.license_exp_date)}{" "}
          <span className={`badge ${license.css}`}>{license.label}</span>
        </dd>
      </dl>

      <h3>Estado</h3>
      <dl className="detail-list">
        <dt>Cuenta</dt>
        <dd>{driver.is_enabled ? "Habilitada" : "Deshabilitada"}</dd>
        <dt>En servicio</dt>
        <dd>{driver.is_active ? "Sí" : "No"}</dd>
        <dt>Telegram</dt>
        <dd>{driver.has_linked_telegram_account ? "Vinculado" : "Sin vincular"}</dd>
        <dt>Registrado</dt>
        <dd>{format_date(driver.registered_at.slice(0, 10))}</dd>
      </dl>
    </aside>
  );
}
