import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Polygon,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Centro por defecto: Tijuana
const DEFAULT_CENTER = [32.5149, -117.0382];
const GUINDA = "#6e0f2b";

// Ajusta el zoom para que se vean todos los puntos cuando cambian
function FitToPoints({ points, fit_key }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 15);
    else if (points.length > 1) map.fitBounds(points, { padding: [30, 30], maxZoom: 16 });
    // Corrige el tamaño cuando el mapa aparece dentro de un panel
    setTimeout(() => map.invalidateSize(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fit_key]);
  return null;
}

/**
 * Mapa reutilizable.
 * - paths:    [{ id, positions: [[lat, lng], ...], color? }]
 * - markers:  [{ id, position: [lat, lng], label?, color?, radius? }]
 * - polygons: [{ id, positions: [[lat, lng], ...], label?, active?, on_click? }]
 */
export default function MapView({ paths = [], markers = [], polygons = [], height = 320 }) {
  const points = [
    ...paths.flatMap((p) => p.positions),
    ...markers.map((m) => m.position),
    ...polygons.flatMap((p) => p.positions),
  ];
  // Llave corta para saber cuándo volver a encuadrar
  const fit_key = `${points.length}-${points[0] ?? ""}-${points[points.length - 1] ?? ""}`;

  return (
    <div className="map-box" style={{ height }}>
      <MapContainer center={DEFAULT_CENTER} zoom={12} scrollWheelZoom style={{ height: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {polygons.map((p) => (
          <Polygon
            key={p.id}
            positions={p.positions}
            pathOptions={{
              color: GUINDA,
              weight: p.active ? 3 : 1.5,
              fillOpacity: p.active ? 0.35 : 0.15,
            }}
            eventHandlers={p.on_click ? { click: p.on_click } : undefined}
          >
            {p.label && <Tooltip sticky>{p.label}</Tooltip>}
          </Polygon>
        ))}

        {paths.map((p) => (
          <Polyline
            key={p.id}
            positions={p.positions}
            pathOptions={{ color: p.color ?? GUINDA, weight: 4, opacity: 0.85 }}
          />
        ))}

        {markers.map((m) => (
          <CircleMarker
            key={m.id}
            center={m.position}
            radius={m.radius ?? 8}
            pathOptions={{ color: "#fff", weight: 2, fillColor: m.color ?? GUINDA, fillOpacity: 1 }}
          >
            {m.label && <Tooltip>{m.label}</Tooltip>}
          </CircleMarker>
        ))}

        <FitToPoints points={points} fit_key={fit_key} />
      </MapContainer>
    </div>
  );
}
