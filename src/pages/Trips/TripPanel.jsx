import { useCallback, useEffect, useState } from "react";
import api from "../../api/client";
import { driver_name, vehicle_name } from "../../api/lookups";
import Badge from "../../components/Badge";
import MapView from "../../components/MapView";
import { TRIP_STATUS } from "../../utils/labels";
import {
  format_datetime,
  format_number,
  is_missing_endpoint,
  point_to_latlng,
  polygon_to_latlngs,
} from "../../utils/format";


const REFRESH_MS = 15000;

async function fetch_trip_positions(trip) {
  try {
    const { data } = await api.get(`/trips/${trip.trip_id}/positions`);
    return data;
  } catch (err) {
    if (!is_missing_endpoint(err)) throw err;
    const { data } = await api.get(`/vehicles/${trip.vehicle_id}/positions`);
    return data.filter((p) => p.trip_id === trip.trip_id);
  }
}

export default function TripPanel({ trip, lookups, on_close }) {
  const [positions, set_positions] = useState([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState("");
  const [updated_at, set_updated_at] = useState(null);

  const is_live = trip.status === "ON_ROUTE";

  const load_positions = useCallback(async () => {
    try {
      const data = await fetch_trip_positions(trip);
      
      const sorted = [...data].sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at));
      set_positions(sorted);
      set_updated_at(new Date());
      set_error("");
    } catch (err) {
      set_error(err.response ? "No se pudo cargar el recorrido." : "No se pudo conectar con el servidor.");
    } finally {
      set_is_loading(false);
    }
  }, [trip]);

  useEffect(() => {
    load_positions();
    if (!is_live) return undefined;
    const timer = setInterval(load_positions, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load_positions, is_live]);

  const path = positions.map((p) => point_to_latlng(p.geojson)).filter(Boolean);
  const last = positions[positions.length - 1];

 
  const origin_area = polygon_to_latlngs(lookups?.locations.get(trip.origin_id)?.geojson);
  const destination_area = polygon_to_latlngs(lookups?.locations.get(trip.destination_id)?.geojson);

  const markers = [];
  if (path.length > 0) {
    markers.push({ id: "start", position: path[0], color: "#c77a91", radius: 6, label: "Inicio del recorrido" });
    markers.push({
      id: "last",
      position: path[path.length - 1],
      radius: 9,
      label: is_live ? "Ubicación actual" : "Última posición",
    });
  }

  const polygons = [];
  if (origin_area.length) polygons.push({ id: "o", positions: origin_area, label: `Origen: ${trip.origin?.name}` });
  if (destination_area.length) {
    polygons.push({ id: "d", positions: destination_area, label: `Destino: ${trip.destination?.name}`, active: true });
  }

  return (
    <aside className="side-panel">
      <div className="panel-head">
        <div className="panel-head-text">
          <h2>
            {trip.origin?.name ?? "—"} → {trip.destination?.name ?? "—"}
          </h2>
          <span className="muted small">
            {trip.vehicle?.plate_number ?? "—"} · {vehicle_name(trip.vehicle)}
          </span>
          <div className="panel-head-badges">
            <Badge catalog={TRIP_STATUS} value={trip.status} />
            {is_live && <span className="live-pill">En vivo</span>}
          </div>
        </div>
        <button className="panel-close" onClick={on_close} title="Cerrar">
          ✕
        </button>
      </div>

      <div className="stat-row">
        <div className="stat-box">
          <span>Distancia</span>
          <b>{format_number(trip.distance, "km")}</b>
        </div>
        <div className="stat-box">
          <span>Vel. promedio</span>
          <b>{format_number(trip.average_speed, "km/h")}</b>
        </div>
        <div className="stat-box">
          <span>Vel. actual</span>
          <b>{last ? format_number(last.speed, "km/h") : "—"}</b>
        </div>
      </div>

      <h3>Recorrido</h3>
      {is_loading ? (
        <p className="muted small">Cargando recorrido...</p>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <MapView
            height={280}
            paths={path.length > 1 ? [{ id: "route", positions: path }] : []}
            markers={markers}
            polygons={polygons}
          />
          <div className="map-legend">
            <span>
              <i style={{ background: "#c77a91" }} />
              Inicio
            </span>
            <span>
              <i style={{ background: "#6e0f2b" }} />
              {is_live ? "Ubicación actual" : "Última posición"}
            </span>
            <span>{positions.length} puntos registrados</span>
            {is_live && updated_at && (
              <span>Actualizado {updated_at.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
          {path.length === 0 && (
            <p className="muted small">Este viaje todavía no tiene posiciones registradas.</p>
          )}
        </>
      )}

      <h3>Detalles</h3>
      <dl className="detail-list wide">
        <dt>Conductor</dt>
        <dd>{driver_name(trip.driver)}</dd>
        <dt>Origen</dt>
        <dd>
          {trip.origin?.name ?? "—"}
          {trip.origin?.address && <div className="cell-sub">{trip.origin.address}</div>}
        </dd>
        <dt>Destino</dt>
        <dd>
          {trip.destination?.name ?? "—"}
          {trip.destination?.address && <div className="cell-sub">{trip.destination.address}</div>}
        </dd>
        <dt>Salida programada</dt>
        <dd>{format_datetime(trip.departure_date)}</dd>
        <dt>Llegada estimada</dt>
        <dd>{format_datetime(trip.arrive_date)}</dd>
        <dt>Inició</dt>
        <dd>{format_datetime(trip.started_at)}</dd>
        <dt>Terminó</dt>
        <dd>{format_datetime(trip.finished_at)}</dd>
      </dl>
    </aside>
  );
}
