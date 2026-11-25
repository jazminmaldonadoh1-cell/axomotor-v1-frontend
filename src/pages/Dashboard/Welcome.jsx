import { Link } from "react-router-dom";
import Icon from "../../components/Icon";

const ALL_ROLES = ["ADMIN", "AGENT", "DRIVER"];

const ROLE_LABELS = {
  ADMIN: "Administrador",
  DRIVER: "Conductor",
  AGENT: "Agente",
};

// Tarjetas de acceso y los roles que pueden verlas
const ACCESS_CARDS = [
  { to: "/trips", icon: "trips", title: "Viajes", text: "Consulta los viajes y su recorrido.", roles: ALL_ROLES },
  { to: "/incidents", icon: "incidents", title: "Incidencias y eventos", text: "Revisa las alertas y los eventos registrados.", roles: ALL_ROLES },
  { to: "/vehicles", icon: "vehicles", title: "Vehículos", text: "Consulta los vehículos del sistema.", roles: ["ADMIN", "AGENT"] },
  { to: "/drivers", icon: "drivers", title: "Conductores", text: "Información de conductores y sus licencias.", roles: ["ADMIN", "AGENT"] },
  { to: "/admin", icon: "admin", title: "Administración", text: "Gestiona usuarios y conductores.", roles: ["ADMIN"] },
  { to: "/account", icon: "account", title: "Mi cuenta", text: "Actualiza tus datos y tu contraseña.", roles: ALL_ROLES },
];

// Banner de bienvenida
export function WelcomeBanner({ user }) {
  return (
    <section className="hero">
      <div className="hero-text">
        <span className="hero-pill">{ROLE_LABELS[user.role] ?? user.role}</span>
        <h1>Hola, {user.username}</h1>
        <p>Bienvenido a AxoMotor. Desde aquí puedes ir a cada sección de la plataforma.</p>
      </div>
      <div className="hero-icon">
        <Icon name="vehicles" size={40} />
      </div>
    </section>
  );
}

// Tarjetas con acceso directo a cada sección permitida para el rol
export function AccessCards({ role }) {
  return (
    <div className="access-grid">
      {ACCESS_CARDS.filter((c) => c.roles.includes(role)).map((c) => (
        <Link key={c.to} to={c.to} className="access-card">
          <span className="access-icon">
            <Icon name={c.icon} size={24} />
          </span>
          <span className="access-title">{c.title}</span>
          <span className="access-text">{c.text}</span>
          <span className="access-go">
            <Icon name="arrow" size={18} />
          </span>
        </Link>
      ))}
    </div>
  );
}