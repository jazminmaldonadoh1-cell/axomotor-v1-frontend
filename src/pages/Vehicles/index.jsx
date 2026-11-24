import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import { VEHICLE_STATUS, VEHICLE_TYPE } from "../../utils/labels";
import { load_error_text } from "../../utils/format";
import VehiclePanel from "./VehiclePanel";
import VehicleFormModal from "./VehicleFormModal";
import "../../styles/modules.css";


const EDIT_ROLES = ["ADMIN"];

export default function Vehicles() {
  const { user } = useAuth();
  const can_edit = EDIT_ROLES.includes(user.role);

  const [vehicles, set_vehicles] = useState([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState("");
  const [search, set_search] = useState("");
  const [status_filter, set_status_filter] = useState("ALL");
  const [type_filter, set_type_filter] = useState("ALL");
  const [selected_id, set_selected_id] = useState(null);
  // null = cerrada, "new" = alta, objeto = edición
  const [form_vehicle, set_form_vehicle] = useState(null);

  const load_vehicles = useCallback(async () => {
    try {
      const { data } = await api.get("/vehicles/");
      set_vehicles([...data].sort((a, b) => a.plate_number.localeCompare(b.plate_number)));
      set_error("");
    } catch (err) {
      set_error(load_error_text(err, "la lista de vehículos"));
    } finally {
      set_is_loading(false);
    }
  }, []);

  useEffect(() => {
    load_vehicles();
  }, [load_vehicles]);

  
  const status_counts = useMemo(() => {
    const result = {};
    for (const v of vehicles) result[v.status] = (result[v.status] ?? 0) + 1;
    return result;
  }, [vehicles]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (status_filter !== "ALL" && v.status !== status_filter) return false;
      if (type_filter !== "ALL" && v.type !== type_filter) return false;
      if (!term) return true;
      return `${v.plate_number} ${v.brand} ${v.model} ${v.series_vin} ${v.reg_number} ${v.year}`
        .toLowerCase()
        .includes(term);
    });
  }, [vehicles, search, status_filter, type_filter]);

  const selected = vehicles.find((v) => v.vehicle_id === selected_id) ?? null;

  async function handle_saved(saved) {
    await load_vehicles();
    set_selected_id(saved.vehicle_id);
  }

  if (is_loading) return <p>Cargando...</p>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="page">
      <div className="page-header-row">
        <div className="page-header">
          <h1>Vehículos</h1>
          <p className="muted">Información, mantenimiento y dispositivos instalados.</p>
        </div>
        {can_edit && (
          <button className="btn-primary" onClick={() => set_form_vehicle("new")}>
            <Icon name="plus" size={16} />
            Registrar vehículo
          </button>
        )}
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Buscar por placa, marca, modelo o VIN"
          value={search}
          onChange={(e) => set_search(e.target.value)}
        />
        <select className="select-pill" value={type_filter} onChange={(e) => set_type_filter(e.target.value)}>
          <option value="ALL">Todos los tipos</option>
          {Object.entries(VEHICLE_TYPE).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="chip-row">
        <button
          className={status_filter === "ALL" ? "chip active" : "chip"}
          onClick={() => set_status_filter("ALL")}
        >
          Todos <span className="chip-count">{vehicles.length}</span>
        </button>
        {Object.entries(VEHICLE_STATUS)
          .filter(([value]) => status_counts[value])
          .map(([value, { label }]) => (
            <button
              key={value}
              className={status_filter === value ? "chip active" : "chip"}
              onClick={() => set_status_filter(value)}
            >
              {label} <span className="chip-count">{status_counts[value]}</span>
            </button>
          ))}
      </div>

      {vehicles.length === 0 ? (
        <p className="muted">
          Todavía no hay vehículos registrados.
          {can_edit && " Usa el botón «Registrar vehículo» para agregar el primero."}
        </p>
      ) : (
        <div className="split-layout">
          <div className="table-wrapper split-main">
            {filtered.length === 0 ? (
              <p className="muted" style={{ padding: 20, margin: 0 }}>
                Ningún vehículo coincide con los filtros.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    <th>Placa</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr
                      key={v.vehicle_id}
                      className={v.vehicle_id === selected_id ? "row-selected" : ""}
                      onClick={() => set_selected_id(v.vehicle_id)}
                    >
                      <td>
                        <div className="vehicle-cell">
                          <span className="vehicle-icon">
                            <Icon name="vehicles" size={18} />
                          </span>
                          <div>
                            <div className="cell-title">
                              {v.brand} {v.model}
                            </div>
                            <div className="cell-sub">{v.year}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="plate">{v.plate_number}</span>
                      </td>
                      <td>{VEHICLE_TYPE[v.type] ?? v.type}</td>
                      <td>
                        <Badge catalog={VEHICLE_STATUS} value={v.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selected ? (
            <VehiclePanel
              key={selected.vehicle_id}
              vehicle={selected}
              can_edit={can_edit}
              on_edit={() => set_form_vehicle(selected)}
              on_close={() => set_selected_id(null)}
            />
          ) : (
            <aside className="side-panel side-panel-empty">
              <span className="access-icon">
                <Icon name="vehicles" size={24} />
              </span>
              Selecciona un vehículo para ver su información, mantenimiento, dispositivos y ubicación.
            </aside>
          )}
        </div>
      )}

      {form_vehicle && (
        <VehicleFormModal
          vehicle={form_vehicle === "new" ? null : form_vehicle}
          on_close={() => set_form_vehicle(null)}
          on_saved={handle_saved}
        />
      )}
    </div>
  );
}
