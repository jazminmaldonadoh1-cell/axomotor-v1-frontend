import { useState } from "react";
import api from "../../api/client";
import { LICENSE_CLASSES, PHONE_REGEX, ROLE_LABELS, USERNAME_REGEX, get_error_text } from "./helpers";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  username: "",
  phone_number: "",
  password: "",
  role: "DRIVER",
  license_number: "",
  license_class: "B",
  license_iss_date: "",
  license_exp_date: "",
};

// Ventana para crear o editar un usuario (y su licencia si es conductor)
export default function UserFormModal({ user, on_close, on_changed }) {
  const is_edit = Boolean(user);
  const [form, set_form] = useState(
    is_edit
      ? {
          ...EMPTY_FORM,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          username: user.username,
          phone_number: user.phone_number,
        }
      : EMPTY_FORM
  );
  const [error, set_error] = useState("");
  const [is_saving, set_is_saving] = useState(false);
  // Si el usuario se creó pero falló la licencia, se guarda su id para reintentar
  const [created_user_id, set_created_user_id] = useState(null);

  const is_driver = !is_edit && form.role === "DRIVER";

  function update(field, value) {
    set_form((prev) => ({ ...prev, [field]: value }));
  }

  function validate() {
    if (!USERNAME_REGEX.test(form.username.trim())) {
      return "El nombre de usuario solo admite letras, números, puntos y guiones bajos.";
    }
    if (!PHONE_REGEX.test(form.phone_number.trim())) {
      return "El teléfono debe tener el formato +52 664-123-4567.";
    }
    if (is_driver) {
      if (!form.license_iss_date || !form.license_exp_date) {
        return "Indica las fechas de expedición y vencimiento de la licencia.";
      }
      if (form.license_exp_date <= form.license_iss_date) {
        return "El vencimiento debe ser posterior a la expedición.";
      }
    }
    return "";
  }

  async function handle_submit(e) {
    e.preventDefault();
    set_error("");

    const validation_error = validate();
    if (validation_error) {
      set_error(validation_error);
      return;
    }

    set_is_saving(true);

    // Edición: solo se envían los campos que cambiaron
    if (is_edit) {
      const changes = {};
      for (const field of ["first_name", "last_name", "email", "username", "phone_number"]) {
        if (form[field].trim() !== user[field]) changes[field] = form[field].trim();
      }
      if (Object.keys(changes).length === 0) {
        set_error("No hay cambios que guardar.");
        set_is_saving(false);
        return;
      }
      try {
        await api.put(`/users/${user.user_id}`, changes);
        await on_changed();
        on_close();
      } catch (err) {
        set_error(
          get_error_text(
            err,
            "No se pudo guardar el usuario.",
            "El usuario, correo o teléfono ya están registrados en otra cuenta."
          )
        );
      } finally {
        set_is_saving(false);
      }
      return;
    }

    // Alta, paso 1: crear el usuario (se omite si ya se creó en un intento anterior)
    let user_id = created_user_id;
    if (!user_id) {
      try {
        const { data } = await api.post("/users/", {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          phone_number: form.phone_number.trim(),
          password: form.password,
          role: form.role,
        });
        user_id = data.user_id;
        set_created_user_id(user_id);
      } catch (err) {
        set_error(
          get_error_text(
            err,
            "No se pudo crear el usuario.",
            "Ya existe un usuario con ese nombre de usuario, correo o teléfono."
          )
        );
        set_is_saving(false);
        return;
      }
    }

    // Alta, paso 2: si es conductor, registrar su licencia
    if (form.role === "DRIVER") {
      try {
        await api.post("/drivers/", {
          user_id,
          license_number: form.license_number.trim(),
          license_class: form.license_class,
          license_iss_date: form.license_iss_date,
          license_exp_date: form.license_exp_date,
        });
      } catch (err) {
        const text = get_error_text(
          err,
          "No se pudo registrar la licencia.",
          "El número de licencia ya está registrado."
        );
        set_error(
          `El usuario se creó, pero la licencia no se pudo registrar: ${text} Corrige la licencia y vuelve a guardar.`
        );
        await on_changed();
        set_is_saving(false);
        return;
      }
    }

    await on_changed();
    set_is_saving(false);
    on_close();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2>{is_edit ? "Editar usuario" : "Nuevo usuario"}</h2>
          <button className="modal-close" onClick={on_close} type="button">
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handle_submit}>
          {/* Si el usuario ya se creó, sus datos quedan bloqueados */}
          <fieldset disabled={Boolean(created_user_id)} className="form-grid">
            <label>
              Nombre(s)
              <input
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                minLength={2}
                maxLength={60}
                required
              />
            </label>
            <label>
              Apellidos
              <input
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                minLength={2}
                maxLength={60}
                required
              />
            </label>
            <label>
              Correo electrónico
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                maxLength={120}
                required
              />
            </label>
            <label>
              Teléfono
              <input
                value={form.phone_number}
                onChange={(e) => update("phone_number", e.target.value)}
                placeholder="+52 664-123-4567"
                maxLength={16}
                required
              />
            </label>
            <label>
              Nombre de usuario
              <input
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                minLength={3}
                maxLength={16}
                required
              />
            </label>
            {!is_edit && (
              <label>
                Contraseña
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  minLength={8}
                  maxLength={120}
                  required
                />
              </label>
            )}
            {!is_edit && (
              <label>
                Rol
                <select
                  value={form.role}
                  onChange={(e) => update("role", e.target.value)}
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </fieldset>

          {is_driver && (
            <>
              <h3>Licencia de conducir</h3>
              <div className="form-grid">
                <label>
                  Número de licencia
                  <input
                    value={form.license_number}
                    onChange={(e) => update("license_number", e.target.value)}
                    maxLength={20}
                    required
                  />
                </label>
                <label>
                  Clase
                  <select
                    value={form.license_class}
                    onChange={(e) => update("license_class", e.target.value)}
                  >
                    {LICENSE_CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fecha de expedición
                  <input
                    type="date"
                    value={form.license_iss_date}
                    onChange={(e) => update("license_iss_date", e.target.value)}
                    required
                  />
                </label>
                <label>
                  Fecha de vencimiento
                  <input
                    type="date"
                    value={form.license_exp_date}
                    onChange={(e) => update("license_exp_date", e.target.value)}
                    required
                  />
                </label>
              </div>
            </>
          )}

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={on_close}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={is_saving}>
              {is_saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
