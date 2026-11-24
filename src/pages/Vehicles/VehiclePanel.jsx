import { useEffect, useState } from "react";
import api from "../../api/client";
import Badge from "../../components/Badge";
import Icon from "../../components/Icon";
import MapView from "../../components/MapView";
import Notice from "../../components/Notice";
import { DEVICE_TYPE, SERVICE_STATUS, VEHICLE_STATUS, VEHICLE_TYPE } from "../../utils/labels";
import {
  format_datetime,
  format_day,
  format_number,
  is_missing_endpoint,
  point_to_latlng,
} from "../../utils/format";

const TABS = [
  { key: "info", label: "Información" },
  { key: "services", label: "Mantenimiento" },
  { key: "devices", label: "Dispositivos" },
  { key: "location", label: "Ubicación" },
];

export default function VehiclePanel({ vehicle, can_edit, on_edit, on_close }) {
  const [tab, set_tab] = useState("info");

  return (
    <aside className="side-panel">
      <div className="panel-head">
        <span className="vehicle-icon lg">
          <Icon name="vehicles" size={26} />
        </span>
        <div className="panel-head-text">
          <h2>
            {vehicle.brand} {vehicle.model} {vehicle.year}
          </h2>
          <div className="panel-head-badges">
            <span className="plate">{vehicle.plate_number}</span>
            <Badge catalog={VEHICLE_STATUS} value={vehicle.status} />
          </div>
        </div>
        <button className="panel-close" onClick={on_close} title="Cerrar">
          ✕
        </button>
      </div>

      <div className="pill-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "pill-tab active" : "pill-tab"}
            onClick={() => set_tab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && <InfoTab vehicle={vehicle} can_edit={can_edit} on_edit={on_edit} />}
      {tab === "services" && <ServicesTab vehicle_id={vehicle.vehicle_id} />}
      {tab === "devices" && <DevicesTab vehicle_id={vehicle.vehicle_id} />}
      {tab === "location" && <LocationTab vehicle_id={vehicle.vehicle_id} />}
    </aside>
  );
}

function InfoTab({ vehicle, can_edit, on_edit }) {
  return (
    <>
      <h3>Datos del vehículo</h3>
      <dl className="detail-list wide">
        <dt>Marca</dt>
        <dd>{vehicle.brand}</dd>
        <dt>Modelo</dt>
        <dd>{vehicle.model}</dd>
        <dt>Año</dt>
        <dd>{vehicle.year}</dd>
        <dt>Tipo</dt>
        <dd>{VEHICLE_TYPE[vehicle.type] ?? vehicle.type}</dd>
        <dt>Estado</dt>
        <dd>
          <Badge catalog={VEHICLE_STATUS} value={vehicle.status} />
        </dd>
      </dl>

      <h3>Documentos</h3>
      <dl className="detail-list wide">
        <dt>Placa</dt>
        <dd className="mono">{vehicle.plate_number}</dd>
        <dt>No. de registro</dt>
        <dd className="mono">{vehicle.reg_number}</dd>
        <dt>VIN (serie)</dt>
        <dd className="mono">{vehicle.series_vin}</dd>
      </dl>

      <h3>Registro</h3>
      <dl className="detail-list wide">
        <dt>Registrado</dt>
        <dd>{format_datetime(vehicle.registered_at)}</dd>
        <dt>Actualizado</dt>
        <dd>{format_datetime(vehicle.updated_at)}</dd>
      </dl>

      {can_edit && (
        <div style={{ marginTop: 18 }}>
          <button className="btn-outline" onClick={on_edit} style={{ gap: 8 }}>
            <Icon name="edit" size={16} />
            Editar vehículo
          </button>
        </div>
      )}
    </>
  );
}


function use_vehicle_list(url, vehicle_id) {
  const [items, set_items] = useState([]);
  const [state, set_state] = useState("loading"); 

  useEffect(() => {
    
    api
      .get(url, { params: { vehicle_id } })
      .then(({ data }) => {
        set_items(data.filter((x) => x.vehicle_id === vehicle_id));
        set_state("ready");
      })
      .catch((err) => set_state(is_missing_endpoint(err) ? "missing" : "error"));
  }, [url, vehicle_id]);

  return { items, state };
}

function ServicesTab({ vehicle_id }) {
  const { items, state } = use_vehicle_list("/vehicle_services/", vehicle_id);

  if (state === "loading") return <p className="muted small">Cargando mantenimiento...</p>;
  if (state === "missing") {
    return (
      <div style={{ marginTop: 14 }}>
        <Notice icon="wrench">
          El historial de mantenimiento estará disponible cuando el servidor tenga{" "}
          <code>/vehicle_services</code>.
        </Notice>
      </div>
    );
  }
  if (state === "error") return <div className="error">No se pudo cargar el mantenimiento.</div>;

  const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
  const now = new Date();
  // Próximo servicio: la fecha futura más cercana de next_service_date
  const next = items
    .map((s) => s.next_service_date)
    .filter((d) => d && new Date(d) >= now)
    .sort((a, b) => new Date(a) - new Date(b))[0];
  const pending = items.filter((s) => s.status === "PENDING" || s.status === "IN_PROGRESS").length;

  return (
    <>
      <div className="stat-row">
        <div className="stat-box">
          <span>Próximo servicio</span>
          <b>{next ? format_day(next) : "—"}</b>
        </div>
        <div className="stat-box">
          <span>Pendientes</span>
          <b>{pending}</b>
        </div>
        <div className="stat-box">
          <span>Total</span>
          <b>{items.length}</b>
        </div>
      </div>

      <h3>Historial</h3>
      {sorted.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>Este vehículo no tiene servicios registrados.</p>
      ) : (
        <div className="item-list">
          {sorted.map((s) => (
            <div key={s.service_id} className="item-card">
              <div className="item-card-head">
                <span className="item-card-title">{s.name}</span>
                <Badge catalog={SERVICE_STATUS} value={s.status} />
              </div>
              {s.description && <span className="item-card-sub">{s.description}</span>}
              <span className="item-card-meta">
                <span>Fecha: {format_day(s.date)}</span>
                {s.next_service_date && <span>Siguiente: {format_day(s.next_service_date)}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function DevicesTab({ vehicle_id }) {
  const { items, state } = use_vehicle_list("/vehicle_devices/", vehicle_id);

  if (state === "loading") return <p className="muted small">Cargando dispositivos...</p>;
  if (state === "missing") {
    return (
      <div style={{ marginTop: 14 }}>
        <Notice icon="chip">
          Los dispositivos instalados estarán disponibles cuando el servidor tenga{" "}
          <code>/vehicle_devices</code>.
        </Notice>
      </div>
    );
  }
  if (state === "error") return <div className="error">No se pudieron cargar los dispositivos.</div>;

  // El concentrador (HUB) va primero
  const sorted = [...items].sort((a, b) => (a.type === "HUB" ? -1 : 1) - (b.type === "HUB" ? -1 : 1));

  return (
    <>
      <h3>Instalados ({items.length})</h3>
      {sorted.length === 0 ? (
        <p className="muted small" style={{ margin: 0 }}>Este vehículo no tiene dispositivos instalados.</p>
      ) : (
        <div className="item-list">
          {sorted.map((d) => (
            <div key={d.device_id} className="item-card">
              <div className="item-card-head">
                <span className="item-card-title">{d.tag}</span>
                <span className="badge badge-gray">{DEVICE_TYPE[d.type] ?? d.type}</span>
              </div>
              <span className="item-card-meta">
                <span className="mono">S/N {d.serial_number}</span>
                <span>Actualizado {format_datetime(d.updated_at ?? d.registered_at)}</span>
              </span>
              <div className="panel-head-badges">
                {!d.is_enabled ? (
                  <span className="badge badge-gray">Deshabilitado</span>
                ) : d.is_active ? (
                  <span className="badge badge-green">En línea</span>
                ) : (
                  <span className="badge badge-red">Sin conexión</span>
                )}
              </div>
              {d.battery_level !== null && d.battery_level !== undefined && (
                <div className="battery">
                  Batería
                  <div className="battery-bar">
                    <span
                      className={d.battery_level < 20 ? "low" : d.battery_level < 50 ? "mid" : ""}
                      style={{ width: `${Math.max(0, Math.min(100, d.battery_level))}%` }}
                    />
                  </div>
                  {d.battery_level}%
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}


function LocationTab({ vehicle_id }) {
  const [positions, set_positions] = useState([]);
  const [state, set_state] = useState("loading");

  useEffect(() => {
    api
      .get(`/vehicles/${vehicle_id}/positions`)
      .then(({ data }) => {
        
        set_positions(data.slice(0, 50).reverse());
        set_state("ready");
      })
      .catch(() => set_state("error"));
  }, [vehicle_id]);

  if (state === "loading") return <p className="muted small">Cargando ubicación...</p>;
  if (state === "error") return <div className="error">No se pudo cargar la ubicación.</div>;
  if (positions.length === 0) {
    return (
      <p className="muted small" style={{ marginTop: 14 }}>
        Este vehículo todavía no ha enviado su ubicación.
      </p>
    );
  }

  const path = positions.map((p) => point_to_latlng(p.geojson)).filter(Boolean);
  const last = positions[positions.length - 1];
  const last_point = point_to_latlng(last.geojson);

  return (
    <>
      <div className="stat-row">
        <div className="stat-box">
          <span>Última señal</span>
          <b style={{ fontSize: 14 }}>{format_datetime(last.registered_at)}</b>
        </div>
        <div className="stat-box">
          <span>Velocidad</span>
          <b>{format_number(last.speed, "km/h")}</b>
        </div>
      </div>
      <h3>Últimas {positions.length} posiciones</h3>
      <MapView
        height={280}
        paths={path.length > 1 ? [{ id: "recent", positions: path, color: "#c77a91" }] : []}
        markers={last_point ? [{ id: "last", position: last_point, label: "Última posición", radius: 9 }] : []}
      />
    </>
  );
}
