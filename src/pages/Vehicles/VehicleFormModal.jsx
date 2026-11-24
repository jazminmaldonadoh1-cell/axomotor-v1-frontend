import { useState } from "react";
import api from "../../api/client";
import { VEHICLE_STATUS, VEHICLE_TYPE } from "../../utils/labels";
import { get_error_text } from "../Admin/helpers";

const MAX_YEAR = new Date().getFullYear() + 2;

const EMPTY_FORM = {
  brand: "",
  model: "",
  year: String(new Date().getFullYear()),
  type: "PASSENGER_CAR",
  status: "OPERATIVE",
  plate_number: "",
  reg_number: "",
  series_vin: "",
};


function validate(form) {
  const year = Number(form.year);
  if (!Number.isInteger(year) || year <= 1900 || year > MAX_YEAR) {
    return `El año debe estar entre 1901 y ${MAX_YEAR}.`;
  }
  if (form.plate_number.length < 8 || form.plate_number.length > 12) {
    return "La placa debe tener entre 8 y 12 caracteres.";
  }
  if (form.reg_number.length < 16 || form.reg_number.length > 22) {
    return "El número de registro debe tener entre 16 y 22 caracteres.";
  }
  if (form.series_vin.length !== 17) {
    return "El VIN debe tener exactamente 17 caracteres.";
  }
  return "";
}


export default function VehicleFormModal({ vehicle, on_close, on_saved }) {
  const is_edit = Boolean(vehicle);
  const [form, set_form] = useState(
    is_edit ? { ...EMPTY_FORM, ...vehicle, year: String(vehicle.year) } : EMPTY_FORM
  );
  const [error, set_error] = useState("");
  const [is_saving, set_is_saving] = useState(false);

  function update(field, value) {
    set_form((prev) => ({ ...prev, [field]: value }));
  }

  async function handle_submit(e) {
    e.preventDefault();
    set_error("");

    const clean = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      type: form.type,
      status: form.status,
      plate_number: form.plate_number.trim().toUpperCase(),
      reg_number: form.reg_number.trim().toUpperCase(),
      series_vin: form.series_vin.trim().toUpperCase(),
    };

    const validation_error = validate(clean);
    if (validation_error) {
      set_error(validation_error);
      return;
    }

    let payload = clean;
    if (is_edit) {
      
      payload = {};
      for (const [field, value] of Object.entries(clean)) {
        if (value !== vehicle[field]) payload[field] = value;
      }
      if (Object.keys(payload).length === 0) {
        set_error("No hay cambios que guardar.");
        return;
      }
    }

    set_is_saving(true);
    try {
      const { data } = is_edit
        ? await api.put(`/vehicles/${vehicle.vehicle_id}`, payload)
        : await api.post("/vehicles/", payload);
      await on_saved(data);
      on_close();
    } catch (err) {
      set_error(
        get_error_text(
          err,
          "No se pudo guardar el vehículo.",
          "Ya existe otro vehículo con la misma placa, número de registro o VIN."
        )
      );
    } finally {
      set_is_saving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>{is_edit ? `Editar ${vehicle.plate_number}` : "Registrar vehículo"}</h2>
          <button className="modal-close" onClick={on_close} type="button">
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handle_submit}>
          <h3>Datos generales</h3>
          <div className="form-grid">
            <label>
              Marca
              <input value={form.brand} onChange={(e) => update("brand", e.target.value)} maxLength={60} required />
            </label>
            <label>
              Modelo
              <input value={form.model} onChange={(e) => update("model", e.target.value)} maxLength={60} required />
            </label>
            <label>
              Año
              <input
                type="number"
                min={1901}
                max={MAX_YEAR}
                value={form.year}
                onChange={(e) => update("year", e.target.value)}
                required
              />
            </label>
            <label>
              Tipo
              <select value={form.type} onChange={(e) => update("type", e.target.value)}>
                {Object.entries(VEHICLE_TYPE).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Estado
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                {Object.entries(VEHICLE_STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3>Documentos</h3>
          <div className="form-grid">
            <label>
              <span>
                Placa <span className="form-hint">(8 a 12 caracteres)</span>
              </span>
              <input
                value={form.plate_number}
                onChange={(e) => update("plate_number", e.target.value)}
                maxLength={12}
                required
              />
            </label>
            <label>
              <span>
                VIN <span className="form-hint">({form.series_vin.trim().length}/17)</span>
              </span>
              <input
                value={form.series_vin}
                onChange={(e) => update("series_vin", e.target.value)}
                maxLength={17}
                required
              />
            </label>
            <label className="span-2">
              <span>
                No. de registro <span className="form-hint">(16 a 22 caracteres)</span>
              </span>
              <input
                value={form.reg_number}
                onChange={(e) => update("reg_number", e.target.value)}
                maxLength={22}
                required
              />
            </label>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={on_close}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={is_saving}>
              {is_saving ? "Guardando..." : is_edit ? "Guardar cambios" : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
