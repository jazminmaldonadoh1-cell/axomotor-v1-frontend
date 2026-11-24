import api from "./client";

// Carga los catálogos que se usan para mostrar nombres en lugar de ids.
// Si alguno falla se usa una lista vacía para no romper la pantalla.
export async function load_lookups() {
  const safe = (request) => request.then((r) => r.data).catch(() => []);

  const [vehicles, drivers, users, locations] = await Promise.all([
    safe(api.get("/vehicles/")),
    safe(api.get("/drivers/")),
    safe(api.get("/users/")),
    safe(api.get("/locations/")),
  ]);

  const users_by_id = new Map(users.map((u) => [u.user_id, u]));
  const drivers_full = drivers.map((d) => ({ ...d, user: users_by_id.get(d.user_id) ?? null }));

  return {
    vehicle_list: vehicles,
    location_list: locations,
    vehicles: new Map(vehicles.map((v) => [v.vehicle_id, v])),
    drivers: new Map(drivers_full.map((d) => [d.driver_id, d])),
    users: users_by_id,
    user_list: users,
    driver_list: drivers_full,
    locations: new Map(locations.map((l) => [l.location_id, l])),
  };
}

// driver_id del usuario con sesión (solo aplica al rol DRIVER)
export function find_my_driver_id(lookups, username) {
  const me = lookups.user_list.find((u) => u.username === username);
  if (!me) return null;
  return lookups.driver_list.find((d) => d.user_id === me.user_id)?.driver_id ?? null;
}

// Une un viaje con su vehículo, conductor y ubicaciones.
// Sirve tanto si el backend manda la respuesta simple como la extendida.
export function resolve_trip(trip, lookups) {
  if (!trip) return null;
  const vehicle = trip.vehicle ?? lookups.vehicles.get(trip.vehicle_id) ?? null;
  const driver = trip.driver ?? lookups.drivers.get(trip.driver_id) ?? null;
  const origin = trip.origin ?? lookups.locations.get(trip.origin_id) ?? null;
  const destination = trip.destination ?? lookups.locations.get(trip.destination_id) ?? null;
  return { ...trip, vehicle, driver, origin, destination };
}

export function driver_name(driver) {
  if (!driver?.user) return "—";
  return `${driver.user.first_name} ${driver.user.last_name}`;
}

export function vehicle_name(vehicle) {
  if (!vehicle) return "—";
  return `${vehicle.brand} ${vehicle.model}`;
}
