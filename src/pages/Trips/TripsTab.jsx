import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import {
  load_lookups,
  resolve_trip,
  find_my_driver_id,
  driver_name,
  vehicle_name,
} from "../../api/lookups";
import Badge from "../../components/Badge";
import Notice from "../../components/Notice";
import Icon from "../../components/Icon";
import { TRIP_STATUS } from "../../utils/labels";
import { format_short_datetime, is_missing_endpoint, load_error_text } from "../../utils/format";
import TripPanel from "./TripPanel";


const FILTERS = [
  { key: "ALL", label: "Todos", statuses: null },
  { key: "ACTIVE", label: "En ruta", statuses: ["ON_ROUTE"] },
  { key: "PLANNED", label: "Programados", statuses: ["PLANNED"] },
  { key: "ISSUES", label: "Con problema", statuses: ["DELAYED", "STOPPED", "ABORTED", "GPS_SIGNAL_LOST"] },
  { key: "DONE", label: "Terminados", statuses: ["FINISHED", "AT_BASE", "CANCELLED"] },
];

export default function TripsTab() {
  const { user } = useAuth();
  const is_driver = user.role === "DRIVER";

  const [trips, set_trips] = useState([]);
  const [lookups, set_lookups] = useState(null);
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState("");
  const [not_available, set_not_available] = useState(false);
  const [search, set_search] = useState("");
  const [filter, set_filter] = useState("ALL");
  const [selected_id, set_selected_id] = useState(null);

  useEffect(() => {
    async function load_data() {
      try {
        const lk = await load_lookups();
        set_lookups(lk);
        const { data } = await api.get("/trips/");
        let list = data.map((t) => resolve_trip(t, lk));

        // Un conductor solo ve sus propios viajes
        if (is_driver) {
          const my_id = find_my_driver_id(lk, user.username);
          list = list.filter((t) => t.driver_id === my_id);
        }

        list.sort((a, b) => new Date(b.departure_date) - new Date(a.departure_date));
        set_trips(list);
      } catch (err) {
        if (is_missing_endpoint(err)) set_not_available(true);
        else set_error(load_error_text(err, "la lista de viajes"));
      } finally {
        set_is_loading(false);
      }
    }
    load_data();
  }, [is_driver, user.username]);

  
  const counts = useMemo(() => {
    const result = {};
    for (const f of FILTERS) {
      result[f.key] = f.statuses ? trips.filter((t) => f.statuses.includes(t.status)).length : trips.length;
    }
    return result;
  }, [trips]);

  const filtered = useMemo(() => {
    const group = FILTERS.find((f) => f.key === filter);
    const term = search.trim().toLowerCase();
    return trips.filter((t) => {
      if (group.statuses && !group.statuses.includes(t.status)) return false;
      if (!term) return true;
      const text = [
        t.vehicle?.plate_number,
        vehicle_name(t.vehicle),
        driver_name(t.driver),
        t.origin?.name,
        t.destination?.name,
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(term);
    });
  }, [trips, filter, search]);

  const selected = trips.find((t) => t.trip_id === selected_id) ?? null;

  if (is_loading) return <p>Cargando...</p>;
  if (error) return <div className="error">{error}</div>;
  if (not_available) {
    return (
      <Notice icon="trips">
        El servidor todavía no tiene el módulo de viajes (<code>GET /api/v1/trips</code>). En cuanto
        esté disponible, aquí aparecerá la lista con su recorrido en el mapa. Mientras tanto puedes
        consultar las <b>ubicaciones conocidas</b> en la otra pestaña.
      </Notice>
    );
  }

  return (
    <>
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Buscar por placa, conductor, origen o destino"
          value={search}
          onChange={(e) => set_search(e.target.value)}
        />
        <div className="chip-row">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={filter === f.key ? "chip active" : "chip"}
              onClick={() => set_filter(f.key)}
            >
              {f.label}
              <span className="chip-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {trips.length === 0 ? (
        <p className="muted">
          {is_driver ? "No tienes viajes asignados." : "Todavía no hay viajes registrados."}
        </p>
      ) : (
        <div className="split-layout">
          <div className="table-wrapper split-main">
            {filtered.length === 0 ? (
              <p className="muted" style={{ padding: 20, margin: 0 }}>
                Ningún viaje coincide con los filtros.
              </p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehículo</th>
                    {!is_driver && <th>Conductor</th>}
                    <th>Ruta</th>
                    <th>Salida</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.trip_id}
                      className={t.trip_id === selected_id ? "row-selected" : ""}
                      onClick={() => set_selected_id(t.trip_id)}
                    >
                      <td>
                        <div className="cell-title">{t.vehicle?.plate_number ?? "—"}</div>
                        <div className="cell-sub">{vehicle_name(t.vehicle)}</div>
                      </td>
                      {!is_driver && <td>{driver_name(t.driver)}</td>}
                      <td>
                        <div className="route">
                          <span className="route-line">
                            <span className="route-dot" />
                            {t.origin?.name ?? "—"}
                          </span>
                          <span className="route-line">
                            <span className="route-dot end" />
                            {t.destination?.name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="muted">{format_short_datetime(t.departure_date)}</td>
                      <td>
                        <Badge catalog={TRIP_STATUS} value={t.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selected ? (
            <TripPanel
              key={selected.trip_id}
              trip={selected}
              lookups={lookups}
              on_close={() => set_selected_id(null)}
            />
          ) : (
            <aside className="side-panel side-panel-empty">
              <span className="access-icon">
                <Icon name="map" size={24} />
              </span>
              Selecciona un viaje para ver su recorrido en el mapa.
            </aside>
          )}
        </div>
      )}
    </>
  );
}
