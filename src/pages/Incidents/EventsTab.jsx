import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import Badge from "../../components/Badge";
import MapView from "../../components/MapView";
import { SEVERITY } from "../../utils/labels";
import { format_datetime, load_error_text, point_to_latlng } from "../../utils/format";

const SEVERITY_FILTERS = [
  { key: "ALL", label: "Todos" },
  { key: "DANGER", label: "Peligro" },
  { key: "WARNING", label: "Advertencia" },
  { key: "INFO", label: "Informativos" },
];


const SEVERITY_COLOR = { DANGER: "#d93c42", WARNING: "#e0a21f", INFO: "#1456a0" };


export default function EventsTab() {
  const [vehicles, set_vehicles] = useState([]);
  const [vehicle_id, set_vehicle_id] = useState("");
  const [events, set_events] = useState([]);
  const [is_loading, set_is_loading] = useState(true);
  const [is_loading_events, set_is_loading_events] = useState(false);
  const [error, set_error] = useState("");
  const [severity, set_severity] = useState("ALL");
  const [selected_id, set_selected_id] = useState(null);

  useEffect(() => {
    api
      .get("/vehicles/")
      .then(({ data }) => {
        const sorted = [...data].sort((a, b) => a.plate_number.localeCompare(b.plate_number));
        set_vehicles(sorted);
        if (sorted.length > 0) set_vehicle_id(sorted[0].vehicle_id);
      })
      .catch((err) => set_error(load_error_text(err, "los vehículos")))
      .finally(() => set_is_loading(false));
  }, []);

  useEffect(() => {
    if (!vehicle_id) return;
    set_is_loading_events(true);
    set_selected_id(null);
    api
      .get(`/vehicles/${vehicle_id}/events`)
      .then(({ data }) => {
        set_events([...data].sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at)));
        set_error("");
      })
      .catch((err) => set_error(load_error_text(err, "los eventos")))
      .finally(() => set_is_loading_events(false));
  }, [vehicle_id]);

  const counts = useMemo(() => {
    const result = { ALL: events.length };
    for (const f of SEVERITY_FILTERS.slice(1)) {
      result[f.key] = events.filter((e) => e.info?.severity === f.key).length;
    }
    return result;
  }, [events]);

  const filtered = events.filter((e) => severity === "ALL" || e.info?.severity === severity);

  const markers = filtered
    .map((e) => ({
      id: e.event_id,
      position: point_to_latlng(e.geojson),
      color: SEVERITY_COLOR[e.info?.severity],
      radius: e.event_id === selected_id ? 11 : 7,
      label: `${e.info?.description ?? e.info?.code} · ${format_datetime(e.registered_at)}`,
    }))
    .filter((m) => m.position);
  // Si hay un evento seleccionado, el mapa se centra en él
  const visible_markers = selected_id ? markers.filter((m) => m.id === selected_id) : markers;

  if (is_loading) return <p>Cargando...</p>;
  if (vehicles.length === 0 && !error) return <p className="muted">Todavía no hay vehículos registrados.</p>;

  return (
    <>
      <div className="filter-bar">
        <select
          className="select-pill"
          value={vehicle_id}
          onChange={(e) => set_vehicle_id(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.vehicle_id} value={v.vehicle_id}>
              {v.plate_number} · {v.brand} {v.model}
            </option>
          ))}
        </select>
        <div className="chip-row">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.key}
              className={severity === f.key ? "chip active" : "chip"}
              onClick={() => {
                set_severity(f.key);
                set_selected_id(null);
              }}
            >
              {f.label}
              <span className="chip-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {is_loading_events ? (
        <p>Cargando eventos...</p>
      ) : events.length === 0 ? (
        <p className="muted">Este vehículo no tiene eventos registrados.</p>
      ) : (
        <div className="locations-layout">
          <section className="card locations-map">
            {markers.length > 0 ? (
              <>
                <MapView height={480} markers={visible_markers} />
                <div className="map-legend">
                  <span><i style={{ background: SEVERITY_COLOR.DANGER }} />Peligro</span>
                  <span><i style={{ background: SEVERITY_COLOR.WARNING }} />Advertencia</span>
                  <span><i style={{ background: SEVERITY_COLOR.INFO }} />Informativo</span>
                  {selected_id && (
                    <button className="link-btn" onClick={() => set_selected_id(null)}>
                      Ver todos
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="muted">Los eventos de este filtro no tienen ubicación GPS.</p>
            )}
          </section>

          <section className="card locations-list">
            <span className="muted small">{filtered.length} eventos · del más reciente al más antiguo</span>
            {filtered.map((e) => (
              <div
                key={e.event_id}
                className={e.event_id === selected_id ? "item-card clickable highlight" : "item-card clickable"}
                onClick={() => set_selected_id(e.event_id === selected_id ? null : e.event_id)}
              >
                <div className="item-card-head">
                  <span className="item-card-title">{e.info?.description ?? e.info?.code}</span>
                  <Badge catalog={SEVERITY} value={e.info?.severity} />
                </div>
                <span className="item-card-meta">
                  <span className="mono">{e.info?.code}</span>
                  <span>{format_datetime(e.registered_at)}</span>
                  {!e.geojson && <span>Sin ubicación</span>}
                </span>
                {e.additional_data && Object.keys(e.additional_data).length > 0 && (
                  <div className="kv-list">
                    {Object.entries(e.additional_data).map(([k, v]) => (
                      <span key={k}>
                        {k}: <b>{typeof v === "object" ? JSON.stringify(v) : String(v)}</b>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      )}
    </>
  );
}
