import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import MapView from "../../components/MapView";
import { format_day, load_error_text, polygon_to_latlngs } from "../../utils/format";


export default function LocationsTab() {
  const [locations, set_locations] = useState([]);
  const [is_loading, set_is_loading] = useState(true);
  const [error, set_error] = useState("");
  const [search, set_search] = useState("");
  const [selected_id, set_selected_id] = useState(null);

  useEffect(() => {
    api
      .get("/locations/")
      .then(({ data }) => set_locations([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch((err) => set_error(load_error_text(err, "las ubicaciones")))
      .finally(() => set_is_loading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return locations;
    return locations.filter((l) =>
      `${l.name} ${l.type ?? ""} ${l.address}`.toLowerCase().includes(term)
    );
  }, [locations, search]);

  
  const visible = selected_id ? filtered.filter((l) => l.location_id === selected_id) : filtered;
  const polygons = visible.map((l) => ({
    id: l.location_id,
    positions: polygon_to_latlngs(l.geojson),
    label: l.name,
    active: l.location_id === selected_id,
    on_click: () => set_selected_id(l.location_id),
  }));

  if (is_loading) return <p>Cargando...</p>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div className="filter-bar">
        <input
          className="search-input"
          placeholder="Buscar por nombre, tipo o dirección"
          value={search}
          onChange={(e) => {
            set_search(e.target.value);
            set_selected_id(null);
          }}
        />
        {selected_id && (
          <button className="btn-outline" onClick={() => set_selected_id(null)}>
            Ver todas en el mapa
          </button>
        )}
      </div>

      {locations.length === 0 ? (
        <p className="muted">Todavía no hay ubicaciones conocidas registradas.</p>
      ) : (
        <div className="locations-layout">
          <section className="card locations-map">
            <MapView height={520} polygons={polygons} />
          </section>

          <section className="card locations-list">
            <span className="muted small">
              {filtered.length} de {locations.length} ubicaciones
            </span>
            {filtered.map((l) => (
              <div
                key={l.location_id}
                className={l.location_id === selected_id ? "item-card clickable highlight" : "item-card clickable"}
                onClick={() => set_selected_id(l.location_id === selected_id ? null : l.location_id)}
              >
                <div className="item-card-head">
                  <span className="item-card-title">{l.name}</span>
                  {l.type && <span className="badge badge-gray">{l.type}</span>}
                </div>
                <span className="item-card-sub">{l.address}</span>
                <span className="item-card-meta">Registrada el {format_day(l.registered_at)}</span>
              </div>
            ))}
          </section>
        </div>
      )}
    </>
  );
}
