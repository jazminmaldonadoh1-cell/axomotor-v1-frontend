import { useEffect, useState } from "react";
import api from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Icon from "../../components/Icon";

// Formato del diccionario de datos: +XX XXX-XXX-XXXX
const PHONE_REGEX = /^\+\d{1,2} \d{3}-\d{3}-\d{3,4}$/;
const USERNAME_REGEX = /^[\d\w._]+$/;

const ROLE_LABELS = {
  ADMIN: "Administrador",
  DRIVER: "Conductor",
  AGENT: "Agente",
};

// Convierte el error del backend en un texto en español para el usuario
function get_error_text(err, fallback) {
  if (!err.response) return "No se pudo conectar con el servidor.";
  const { status, data } = err.response;
  if (status === 409) return "El correo o el teléfono ya están registrados en otra cuenta.";
  if (status === 422) {
    // FastAPI regresa una lista de errores de validación
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      const fields = data.detail.map((d) => d.loc?.[d.loc.length - 1]).join(", ");
      return `Revisa estos campos: ${fields}.`;
    }
    return "Los datos enviados no son válidos.";
  }
  return fallback;
}

// Campo con ícono a la izquierda
function Field({ label, icon, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="input-icon">
        <Icon name={icon} size={18} />
        {children}
      </span>
    </label>
  );
}

// Encabezado de cada tarjeta: ícono, título y descripción
function CardHead({ icon, title, text }) {
  return (
    <div className="form-card-head">
      <span className="form-card-icon">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

export default function Account() {
  const { user } = useAuth();

  const [profile, set_profile] = useState(null);
  const [is_loading, set_is_loading] = useState(true);
  const [load_error, set_load_error] = useState("");

  // Formulario de correo y teléfono
  const [username, set_username] = useState("");
  const [email, set_email] = useState("");
  const [phone_number, set_phone_number] = useState("");
  const [contact_msg, set_contact_msg] = useState(null);
  const [is_saving_contact, set_is_saving_contact] = useState(false);

  // Formulario de contraseña
  const [current_password, set_current_password] = useState("");
  const [new_password, set_new_password] = useState("");
  const [confirm_password, set_confirm_password] = useState("");
  const [show_passwords, set_show_passwords] = useState(false);
  const [password_msg, set_password_msg] = useState(null);
  const [is_saving_password, set_is_saving_password] = useState(false);

  // Carga los datos del usuario con sesión (el token solo trae el username)
  useEffect(() => {
    async function load_profile() {
      try {
        const user_res = await api.get("/users/me");
        const me = user_res.data

        set_profile(me);
        set_email(me.email);
        set_username(me.username);
        set_phone_number(me.phone_number);
      } catch (err) {
        set_load_error(get_error_text(err, "No se pudo cargar tu cuenta."));
      } finally {
        set_is_loading(false);
      }
    }
    load_profile();
  }, [user.username]);

  async function handle_contact_submit(e) {
    e.preventDefault();
    set_contact_msg(null);

    // Valida el formato del nombre de usuario
    if (!USERNAME_REGEX.test(username.trim())) {
      set_contact_msg({
        type: "error",
        text: "El nombre de usuario solo admite letras, números, puntos y guiones bajos.",
      });
      return;
    }

    // Valida el formato del teléfono
    if (!PHONE_REGEX.test(phone_number.trim())) {
      set_contact_msg({
        type: "error",
        text: "El teléfono debe tener el formato +52 664-123-4567.",
      });
      return;
    }

    // Solo se envían los campos que cambiaron
    const changes = {};
    if (username.trim() !== profile.username) changes.username = username.trim();
    if (email.trim() !== profile.email) changes.email = email.trim();
    if (phone_number.trim() !== profile.phone_number)
      changes.phone_number = phone_number.trim();

    if (Object.keys(changes).length === 0) {
      set_contact_msg({ type: "error", text: "No hay cambios que guardar." });
      return;
    }

    set_is_saving_contact(true);
    try {
      const { data } = await api.put(`/users/${profile.user_id}`, changes);
      set_profile(data);
      set_contact_msg({ type: "ok", text: "Datos actualizados correctamente." });
    } catch (err) {
      set_contact_msg({
        type: "error",
        text: get_error_text(err, "No se pudieron guardar los cambios."),
      });
    } finally {
      set_is_saving_contact(false);
    }
  }

  async function handle_password_submit(e) {
    e.preventDefault();
    set_password_msg(null);

    if (new_password.length < 8) {
      set_password_msg({
        type: "error",
        text: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }
    if (new_password.length > 120) {
      set_password_msg({
        type: "error",
        text: "La nueva contraseña no puede tener más de 120 caracteres.",
      });
      return;
    }
    if (new_password !== confirm_password) {
      set_password_msg({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }

    set_is_saving_password(true);
    try {
      await api.put(`/auth/change_password`, {
        current_password,
        new_password,
      });
      set_current_password("");
      set_new_password("");
      set_confirm_password("");
      set_password_msg({ type: "ok", text: "Contraseña actualizada correctamente." });
    } catch (err) {
      // El backend responde 404 cuando la contraseña actual no coincide
      const text =
        err.response?.status === 404
          ? "La contraseña actual es incorrecta."
          : get_error_text(err, "No se pudo cambiar la contraseña.");
      set_password_msg({ type: "error", text });
    } finally {
      set_is_saving_password(false);
    }
  }

  if (is_loading) return <p>Cargando...</p>;
  if (load_error) return <div className="error">{load_error}</div>;

  // Requisitos de la nueva contraseña (solo orientativos, el backend valida)
  const rules = [
    { ok: new_password.length >= 8, text: "Mínimo 8 caracteres" },
    { ok: /[a-z]/.test(new_password) && /[A-Z]/.test(new_password), text: "Mayúsculas y minúsculas" },
    { ok: /\d/.test(new_password), text: "Al menos un número" },
    { ok: new_password.length > 0 && new_password === confirm_password, text: "Las contraseñas coinciden" },
  ];
  // El medidor cuenta solo las tres primeras reglas
  const score = rules.slice(0, 3).filter((r) => r.ok).length;
  const strength_label = ["", "Débil", "Media", "Fuerte"][score];
  const password_type = show_passwords ? "text" : "password";

  const initials = `${profile.first_name.charAt(0)}${profile.last_name?.charAt(0) ?? ''}`.trimEnd().toUpperCase();

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cuenta</h1>
        <p className="muted">Administra tus datos de contacto y la seguridad de tu cuenta.</p>
      </div>

      {/* Banner con los datos principales */}
      <section className="account-hero">
        <div className="account-hero-main">
          <span className="account-hero-avatar">{initials}</span>
          <div>
            <h2>
              {profile.first_name} {profile.last_name}
            </h2>
            <span className="account-hero-user">@{profile.username}</span>
            <div className="account-hero-pills">
              <span>{ROLE_LABELS[user.role] ?? user.role}</span>
              <span>{profile.is_enabled ? "Cuenta habilitada" : "Cuenta deshabilitada"}</span>
            </div>
          </div>
        </div>
        <div className="account-hero-stats">
          <div>
            <span>Correo</span>
            <b>{profile.email}</b>
          </div>
          <div>
            <span>Teléfono</span>
            <b>{profile.phone_number}</b>
          </div>
        </div>
      </section>

      <div className="account-grid">
        <form className="form-card" onSubmit={handle_contact_submit}>
          <CardHead
            icon="mail"
            title="Datos de contacto"
            text="Los usamos para avisarte de alertas y recuperar tu cuenta."
          />
          <Field label="Nombre de usuario" icon="account">
            <input
              value={username}
              onChange={(e) => set_username(e.target.value)}
              maxLength={16}
              required
            />
          </Field>
          <Field label="Correo electrónico" icon="mail">
            <input
              type="email"
              value={email}
              onChange={(e) => set_email(e.target.value)}
              maxLength={120}
              required
            />
          </Field>
          <Field label="Número de teléfono" icon="phone">
            <input
              value={phone_number}
              onChange={(e) => set_phone_number(e.target.value)}
              placeholder="+52 664-123-4567"
              maxLength={16}
              required
            />
          </Field>
          <span className="field-hint">Formato: +52 664-123-4567</span>
          {contact_msg && (
            <div className={contact_msg.type === "ok" ? "success" : "error"}>
              {contact_msg.text}
            </div>
          )}
          <div className="form-card-actions">
            <button className="btn-primary" type="submit" disabled={is_saving_contact}>
              {is_saving_contact ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        <form className="form-card" onSubmit={handle_password_submit}>
          <CardHead
            icon="lock"
            title="Cambiar contraseña"
            text="Usa una contraseña que no hayas usado en otro sitio."
          />
          <Field label="Contraseña actual" icon="lock">
            <input
              type={password_type}
              value={current_password}
              onChange={(e) => set_current_password(e.target.value)}
              required
            />
          </Field>
          <Field label="Nueva contraseña" icon="lock">
            <input
              type={password_type}
              value={new_password}
              onChange={(e) => set_new_password(e.target.value)}
              minLength={8}
              maxLength={120}
              required
            />
          </Field>
          <Field label="Confirmar nueva contraseña" icon="lock">
            <input
              type={password_type}
              value={confirm_password}
              onChange={(e) => set_confirm_password(e.target.value)}
              required
            />
          </Field>

          {new_password.length > 0 && (
            <>
              <div className="strength">
                <div className={`strength-bars strength-${score}`}>
                  <span />
                  <span />
                  <span />
                </div>
                <b>{strength_label}</b>
              </div>
              <ul className="checklist">
                {rules.map((r) => (
                  <li key={r.text} className={r.ok ? "ok" : ""}>
                    <Icon name="check" size={14} />
                    {r.text}
                  </li>
                ))}
              </ul>
            </>
          )}

          {password_msg && (
            <div className={password_msg.type === "ok" ? "success" : "error"}>
              {password_msg.text}
            </div>
          )}
          <div className="form-card-actions between">
            <label className="check-inline">
              <input
                type="checkbox"
                checked={show_passwords}
                onChange={(e) => set_show_passwords(e.target.checked)}
              />
              Mostrar contraseñas
            </label>
            <button className="btn-primary" type="submit" disabled={is_saving_password}>
              {is_saving_password ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </div>

      <section className="form-card">
        <CardHead
          icon="admin"
          title="Consejos de seguridad"
          text="Pequeños hábitos que protegen tu cuenta."
        />
        <ul className="tips-list">
          <li>No compartas tu contraseña con nadie.</li>
          <li>Cierra sesión al usar un equipo compartido.</li>
          <li>Si te llega una alerta que no reconoces, avisa a un administrador.</li>
        </ul>
      </section>
    </div>
  );
}
