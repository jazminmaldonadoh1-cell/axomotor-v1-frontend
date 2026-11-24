import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { load_lookups, resolve_trip, find_my_driver_id } from "../../api/lookups";
import Badge from "../../components/Badge";
import Notice from "../../components/Notice";
import Icon from "../../components/Icon";
import { INCIDENT_STATUS, PRIORITY } from "../../utils/labels";
import { format_short_datetime, is_missing_endpoint, load_error_text } from "../../utils/format";
import IncidentPanel from "./IncidentPanel";

const STATUS_FILTERS = [
  { key: "ALL", label: "Todas" },
  { key: "OPEN", label: "Abiertas" },
  { key: "IN_REVISION", label: "En revisión" },
  { key: "CLOSED", label: "Cerradas" },
  { key: "DISCARDED", label: "Descartadas" },
];


const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export default function IncidentsTab() {
  const { user } = useAuth();
  const is_driver = user.role === "DRIVER";

  const [incidents, set_incidents] = useState([]);
  const [lookups, set_lookups] = useState(null);
  const [trips_by_id, set_trips_by_id] = useState(new Map());
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState("");
  const [not_available, set_not_available] = useState(false);
  const [search, set_search] = useState("");
  const [status_filter, set_status_filter] = useState("ALL");
  const [priority_filter, set_priority_filter] = useState("ALL");
  const [selected_id, set_selected_id] = useState(null);

  useEffect(() => {
    async function load_data() {
      try {
        const lk = await load_lookups();
        set_lookups(lk);

       
        const trips = await api
          .get("/trips/")
          .then((r) => r.data)
          .catch(() => []);
        const trip_map = new Map(trips.map((t) => [t.trip_id, resolve_trip(t, lk)]));
        set_trips_by_id(trip_map);

        const { data } = await api.get("/incidents/");
        let list = data;

        
        if (is_driver) {
          const my_id = find_my_driver_id(lk, user.username);
          list = list.filter((i) => (i.trip ?? trip_map.get(i.trip_id))?.driver_id === my_id);
        }

        set_incidents(list);
      } catch (err) {
        if (is_missing_endpoint(err)) set_not_available(true);
        else set_error(load_error_text(err, "las incidencias"));
      } finally {
        set_is_loading(false);
      }
    }
    load_data();
  }, [is_driver, user.username]);

  
  function trip_of(incident) {
    if (!lookups) return null;
    return trip_map_get(incident, trips_by_id, lookups);
  }

  const counts = useMemo(() => {
    const result = { ALL: incidents.length };
    for (const f of STATUS_FILTERS.slice(1)) {
      result[f.key] = incidents.filter((i) => i.status === f.key).length;
    }
    return result;
  }, [incidents]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return incidents
      .filter((i) => status_filter === "ALL" || i.status === status_filter)
      .filter((i) => priority_filter === "ALL" || i.priority === priority_filter)
      .filter((i) => {
        if (!term) return true;
        const trip = lookups ? trip_map_get(i, trips_by_id, lookups) : null;
        const text = [i.info?.code, i.info?.description, i.description, trip?.vehicle?.plate_number]
          .join(" ")
          .toLowerCase();
        return text.includes(term);
      })
      .sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
          new Date(b.registered_at) - new Date(a.registered_at)
      );
  }, [incidents, status_filter, priority_filter, search, trips_by_id, lookups]);

  
  function handle_updated(updated) {
    set_incidents((prev) =>
      prev.map((i) => (i.incident_id === updated.incident_id ? { ...i, ...updated } : i))
    );
  }

  const selected = incidents.find((i) => i.incident_id === selected_id) ?? null;

  if (is_loading) return <p>Cargando...</p>;
  if (error) return <div className="error">{error}</div>;
  if (not_available) {
    return (
      <Notice icon="incidents">
        El servidor todavía no tiene el módulo de incidencias (<code>GET /api/v1/incidents</code>).
        Cuando esté disponible, aquí podrás revisar cada incidencia, cambiar su estado, ver sus
        grabaciones y dejar comentarios. Los <b>eventos de vehículos</b> ya se pueden consultar en
        la otra pestaña.
      </Notice>
    );
  }

  return (
    <>
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Buscar por código, descripción o placa"
          value={search}
          onChange={(e) => set_search(e.target.value)}
        />
        <select
          className="select-pill"
          value={priority_filter}
          onChange={(e) => set_priority_filter(e.target.value)}
        >
          <option value="ALL">Todas las prioridades</option>
          <option value="HIGH">Prioridad alta</option>
          <option value="MEDIUM">Prioridad media</option>
          <option value="LOW">Prioridad baja</option>
        </select>
      </div>
      <div className="chip-row">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            className={status_filter === f.key ? "chip active" : "chip"}
            onClick={() => set_status_filter(f.key)}
          >
            {f.label}
            <span className="chip-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {incidents.length === 0 ? (
        <p className="muted">No hay incidencias registradas.</p>
      ) : (
        <div className="split-layout">
          <div className="table-wrapper split-main">
            {filtered.length === 0 ? (
              <p className="muted" style={{ padding: 20, margin: 0 }}>
                Ninguna incidencia coincide con los filtros.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Incidencia</th>
                    <th>Vehículo</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Registrada</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => {
                    const trip = trip_of(i);
                    return (
                      <tr
                        key={i.incident_id}
                        className={i.incident_id === selected_id ? "row-selected" : ""}
                        onClick={() => set_selected_id(i.incident_id)}
                      >
                        <td style={{ whiteSpace: "normal", minWidth: 200 }}>
                          <div className="cell-title">{i.info?.description ?? i.code}</div>
                          <div className="cell-sub">
                            {i.info?.code} · {truncate(i.description, 60)}
                          </div>
                        </td>
                        <td>{trip?.vehicle?.plate_number ?? "—"}</td>
                        <td>
                          <Badge catalog={PRIORITY} value={i.priority} />
                        </td>
                        <td>
                          <Badge catalog={INCIDENT_STATUS} value={i.status} />
                        </td>
                        <td className="muted">{format_short_datetime(i.registered_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {selected ? (
            <IncidentPanel
              key={selected.incident_id}
              incident={selected}
              trip={trip_of(selected)}
              lookups={lookups}
              all_incidents={incidents}
              can_manage={!is_driver}
              on_select={set_selected_id}
              on_updated={handle_updated}
              on_close={() => set_selected_id(null)}
            />
          ) : (
            <aside className="side-panel side-panel-empty">
              <span className="access-icon">
                <Icon name="incidents" size={24} />
              </span>
              Selecciona una incidencia para ver su detalle, grabaciones y comentarios.
            </aside>
          )}
        </div>
      )}
    </>
  );
}

function trip_map_get(incident, trips_by_id, lookups) {
  if (incident.trip) return resolve_trip(incident.trip, lookups);
  return trips_by_id.get(incident.trip_id) ?? null;
}

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
