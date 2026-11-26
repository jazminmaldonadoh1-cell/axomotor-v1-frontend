// Etiquetas en español para los roles del backend
export const ROLE_LABELS = {
  ADMIN: "Administrador",
  DRIVER: "Conductor",
  AGENT: "Agente",
};

// Valores de LicenseClass del backend
export const LICENSE_CLASSES = ["A", "A1", "A2", "B", "C", "D", "E"];

// Formato del diccionario de datos: +XX XXX-XXX-XXXX
export const PHONE_REGEX = /^\+\d{1,2} \d{3}-\d{3}-\d{3,4}$/;
export const USERNAME_REGEX = /^[\d\w._]+$/;

// Convierte "2027-03-15" en fecha local (evita desfase por zona horaria)
function parse_date(value) {
  return new Date(`${value}T00:00:00`);
}

export function format_date(value) {
  return parse_date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Estado de vigencia de una licencia
export function get_license_status(exp_date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days_left = Math.round(
    (parse_date(exp_date) - today) / (1000 * 60 * 60 * 24)
  );
  if (days_left < 0) return { label: "Vencida", css: "badge-red" };
  if (days_left <= 30) return { label: "Por vencer", css: "badge-yellow" };
  return { label: "Vigente", css: "badge-green" };
}

// Convierte el error del backend en un texto en español
export function get_error_text(err, fallback, conflict_text) {
  if (!err.response) return "No se pudo conectar con el servidor.";
  const { status, data } = err.response;
  if (status === 409) return conflict_text ?? "Ya existe un registro con esos datos.";
  if (status === 422) {
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      const fields = data.detail.map((d) => d.loc?.[d.loc.length - 1]).join(", ");
      return `Revisa estos campos: ${fields}.`;
    }
    return "Los datos enviados no son válidos.";
  }
  if (status === 403 && data?.detail === "User must be registered as driver") {
    return "El usuario debe tener el rol de conductor.";
  }
  return fallback;
}
