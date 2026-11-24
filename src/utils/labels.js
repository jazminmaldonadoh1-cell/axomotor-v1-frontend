// Etiquetas en español y color de badge para los enums del backend (models/enums.py)

export const TRIP_STATUS = {
  PLANNED: { label: "Programado", css: "badge-blue" },
  DELAYED: { label: "Retrasado", css: "badge-yellow" },
  ON_ROUTE: { label: "En ruta", css: "badge-green" },
  AT_BASE: { label: "En base", css: "badge-gray" },
  STOPPED: { label: "Detenido", css: "badge-yellow" },
  FINISHED: { label: "Finalizado", css: "badge-gray" },
  CANCELLED: { label: "Cancelado", css: "badge-gray" },
  ABORTED: { label: "Abortado", css: "badge-red" },
  GPS_SIGNAL_LOST: { label: "Sin señal GPS", css: "badge-red" },
};

export const VEHICLE_STATUS = {
  OPERATIVE: { label: "Operativo", css: "badge-green" },
  IN_USE: { label: "En uso", css: "badge-blue" },
  OUT_OF_SERVICE: { label: "Fuera de servicio", css: "badge-gray" },
  UNDER_MAINTENANCE: { label: "En mantenimiento", css: "badge-yellow" },
  DOCUMENTS_EXPIRED: { label: "Documentos vencidos", css: "badge-red" },
  HELD_BY_AUTHORITIES: { label: "Retenido", css: "badge-red" },
};

export const VEHICLE_TYPE = {
  PASSENGER_CAR: "Automóvil",
  PICKUP: "Pickup",
  PANEL: "Panel",
  VAN: "Van",
  BUS: "Autobús",
  TRUCK: "Camión",
};

export const INCIDENT_STATUS = {
  OPEN: { label: "Abierta", css: "badge-red" },
  IN_REVISION: { label: "En revisión", css: "badge-yellow" },
  CLOSED: { label: "Cerrada", css: "badge-green" },
  DISCARDED: { label: "Descartada", css: "badge-gray" },
};

export const PRIORITY = {
  LOW: { label: "Baja", css: "badge-gray" },
  MEDIUM: { label: "Media", css: "badge-yellow" },
  HIGH: { label: "Alta", css: "badge-red" },
};

export const SEVERITY = {
  INFO: { label: "Informativo", css: "badge-blue" },
  WARNING: { label: "Advertencia", css: "badge-yellow" },
  DANGER: { label: "Peligro", css: "badge-red" },
};

export const SERVICE_STATUS = {
  PENDING: { label: "Pendiente", css: "badge-yellow" },
  IN_PROGRESS: { label: "En proceso", css: "badge-blue" },
  COMPLETED: { label: "Completado", css: "badge-green" },
  CANCELLED: { label: "Cancelado", css: "badge-gray" },
  DISCARDED: { label: "Descartado", css: "badge-gray" },
};

export const DEVICE_TYPE = {
  HUB: "Concentrador",
  NODE: "Nodo",
};

// Devuelve { label, css } aunque el valor no esté en el catálogo
export function get_label(catalog, value) {
  return catalog[value] ?? { label: value ?? "—", css: "badge-gray" };
}
