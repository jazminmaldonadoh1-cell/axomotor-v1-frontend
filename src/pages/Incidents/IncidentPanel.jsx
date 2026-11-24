import { useEffect, useState } from "react";
import api from "../../api/client";
import { driver_name } from "../../api/lookups";
import Badge from "../../components/Badge";
import MapView from "../../components/MapView";
import Notice from "../../components/Notice";
import { INCIDENT_STATUS, PRIORITY, SEVERITY } from "../../utils/labels";
import { format_datetime, is_missing_endpoint, point_to_latlng } from "../../utils/format";
import { get_error_text } from "../Admin/helpers";

const MAX_COMMENT = 500;

export default function IncidentPanel({
  incident,
  trip,
  lookups,
  all_incidents,
  can_manage,
  on_select,
  on_updated,
  on_close,
}) {
  const position = point_to_latlng(incident.geojson);
  const related = all_incidents.find((i) => i.incident_id === incident.related_incident_id);
  // Incidencias que apuntan a esta como "relacionada"
  const followups = all_incidents.filter((i) => i.related_incident_id === incident.incident_id);

  const user_name = (id) => {
    const u = id ? lookups?.users.get(id) : null;
    return u ? `${u.first_name} ${u.last_name}` : "—";
  };

  return (
    <aside className="side-panel">
      <div className="panel-head">
        <div className="panel-head-text">
          <h2>{incident.info?.description ?? incident.code}</h2>
          <span className="muted small mono">{incident.info?.code}</span>
          <div className="panel-head-badges">
            <Badge catalog={INCIDENT_STATUS} value={incident.status} />
            <Badge catalog={PRIORITY} value={incident.priority} />
            {incident.info?.severity && <Badge catalog={SEVERITY} value={incident.info.severity} />}
          </div>
        </div>
        <button className="panel-close" onClick={on_close} title="Cerrar">
          ✕
        </button>
      </div>

      <h3>Descripción</h3>
      <p style={{ margin: 0, fontSize: 14 }}>{incident.description}</p>

      {position && (
        <>
          <h3>Ubicación</h3>
          <MapView height={200} markers={[{ id: "inc", position, label: "Lugar de la incidencia" }]} />
        </>
      )}

      <h3>Viaje</h3>
      <dl className="detail-list wide">
        <dt>Ruta</dt>
        <dd>
          {trip ? `${trip.origin?.name ?? "—"} → ${trip.destination?.name ?? "—"}` : "—"}
        </dd>
        <dt>Vehículo</dt>
        <dd>{trip?.vehicle ? `${trip.vehicle.plate_number} · ${trip.vehicle.brand} ${trip.vehicle.model}` : "—"}</dd>
        <dt>Conductor</dt>
        <dd>{driver_name(trip?.driver)}</dd>
      </dl>

      <h3>Seguimiento</h3>
      <dl className="detail-list wide">
        <dt>Registrada</dt>
        <dd>{format_datetime(incident.registered_at)}</dd>
        <dt>Reportó</dt>
        {/* Sin created_by_id significa que la generó el dispositivo del vehículo */}
        <dd>{incident.created_by_id ? user_name(incident.created_by_id) : "Dispositivo del vehículo"}</dd>
        <dt>Revisada</dt>
        <dd>
          {format_datetime(incident.reviewed_at)}
          {incident.reviewed_by_id && <div className="cell-sub">por {user_name(incident.reviewed_by_id)}</div>}
        </dd>
        <dt>Cerrada</dt>
        <dd>{format_datetime(incident.closed_at)}</dd>
        {related && (
          <>
            <dt>Relacionada con</dt>
            <dd>
              <button className="link-btn" onClick={() => on_select(related.incident_id)}>
                {related.info?.description ?? related.code}
              </button>
            </dd>
          </>
        )}
        {followups.length > 0 && (
          <>
            <dt>Seguimientos</dt>
            <dd>
              {followups.map((f) => (
                <div key={f.incident_id}>
                  <button className="link-btn" onClick={() => on_select(f.incident_id)}>
                    {f.info?.description ?? f.code}
                  </button>
                </div>
              ))}
            </dd>
          </>
        )}
      </dl>

      <h3>Grabaciones</h3>
      <MediaGallery incident_id={incident.incident_id} />

      <h3>Comentarios</h3>
      {can_manage ? (
        <ManageForm incident={incident} on_updated={on_updated} />
      ) : incident.comments ? (
        <div className="comment-box">{incident.comments}</div>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>Sin comentarios.</p>
      )}
    </aside>
  );
}


function MediaGallery({ incident_id }) {
  const [media, set_media] = useState([]);
  const [state, set_state] = useState("loading"); 

  useEffect(() => {
    api
      .get(`/incidents/${incident_id}/media`)
      .then(({ data }) => {
        set_media([...data].sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at)));
        set_state("ready");
      })
      // FastAPI responde 404 "Not Found" cuando la ruta no existe todavía
      .catch((err) => set_state(is_missing_endpoint(err) && err.response?.data?.detail === "Not Found" ? "missing" : "error"));
  }, [incident_id]);

  if (state === "loading") return <p className="muted small">Cargando grabaciones...</p>;
  if (state === "missing") {
    return (
      <Notice icon="camera">
        Las grabaciones estarán disponibles cuando el servidor tenga <code>/incidents/&#123;id&#125;/media</code>.
      </Notice>
    );
  }
  if (state === "error") return <div className="error">No se pudieron cargar las grabaciones.</div>;
  if (media.length === 0) return <p className="muted small" style={{ margin: 0 }}>Esta incidencia no tiene grabaciones.</p>;

  return (
    <div className="media-grid">
      {media.map((m) => (
        <a key={m.media_id} className="media-item" href={m.file_url} target="_blank" rel="noreferrer">
          {m.type === "VIDEO" ? (
            <video src={m.file_url} controls preload="metadata" onClick={(e) => e.preventDefault()} />
          ) : (
            <img src={m.file_url} alt="Captura de la incidencia" loading="lazy" />
          )}
          <span>
            {m.type === "VIDEO" ? "Video" : "Foto"} · {format_datetime(m.captured_at)}
          </span>
        </a>
      ))}
    </div>
  );
}


function ManageForm({ incident, on_updated }) {
  const [form, set_form] = useState({
    status: incident.status,
    priority: incident.priority,
    comments: incident.comments ?? "",
  });
  const [error, set_error] = useState("");
  const [success, set_success] = useState("");
  const [is_saving, set_is_saving] = useState(false);

  function update(field, value) {
    set_form((prev) => ({ ...prev, [field]: value }));
    set_success("");
  }

  async function handle_submit(e) {
    e.preventDefault();
    set_error("");
    set_success("");

    
    const changes = {};
    if (form.status !== incident.status) changes.status = form.status;
    if (form.priority !== incident.priority) changes.priority = form.priority;
    const comments = form.comments.trim();
    if (comments !== (incident.comments ?? "")) {
      if (comments.length < 2) {
        set_error("El comentario debe tener al menos 2 caracteres.");
        return;
      }
      changes.comments = comments;
    }
    if (Object.keys(changes).length === 0) {
      set_error("No hay cambios que guardar.");
      return;
    }

    set_is_saving(true);
    try {
      const { data } = await api.put(`/incidents/${incident.incident_id}`, changes);
      on_updated(data);
      set_success("Cambios guardados.");
    } catch (err) {
      set_error(get_error_text(err, "No se pudieron guardar los cambios."));
    } finally {
      set_is_saving(false);
    }
  }

  return (
    <form className="manage-box" onSubmit={handle_submit}>
      <div className="manage-row">
        <label>
          Estado
          <select value={form.status} onChange={(e) => update("status", e.target.value)}>
            {Object.entries(INCIDENT_STATUS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prioridad
          <select value={form.priority} onChange={(e) => update("priority", e.target.value)}>
            {Object.entries(PRIORITY).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>
          Comentarios <span className="char-count">({form.comments.length}/{MAX_COMMENT})</span>
        </span>
        <textarea
          value={form.comments}
          maxLength={MAX_COMMENT}
          placeholder="Escribe lo que se revisó o las acciones tomadas..."
          onChange={(e) => update("comments", e.target.value)}
        />
      </label>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="manage-actions">
        <span className="char-count">Los cambios quedan registrados en la incidencia.</span>
        <button type="submit" className="btn-primary" disabled={is_saving}>
          {is_saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
