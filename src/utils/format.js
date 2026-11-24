// Fechas, números y coordenadas con el formato que usa la plataforma

export function format_datetime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function format_short_datetime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function format_day(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// El backend manda los Decimal como texto ("12.50")
export function format_number(value, unit = "") {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("es-MX", { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`;
}

// GeoJSON usa [longitud, latitud]; Leaflet usa [latitud, longitud]
export function point_to_latlng(geojson) {
  if (!geojson || geojson.type !== "Point" || !Array.isArray(geojson.coordinates)) return null;
  const [lng, lat] = geojson.coordinates;
  return [lat, lng];
}

export function polygon_to_latlngs(geojson) {
  if (!geojson || geojson.type !== "Polygon") return [];
  return (geojson.coordinates?.[0] ?? []).map(([lng, lat]) => [lat, lng]);
}

// Un endpoint que todavía no existe en el backend responde 404 o 405
export function is_missing_endpoint(err) {
  const status = err?.response?.status;
  return status === 404 || status === 405;
}

export function load_error_text(err, what) {
  if (!err?.response) return "No se pudo conectar con el servidor.";
  return `No se pudo cargar ${what}.`;
}
