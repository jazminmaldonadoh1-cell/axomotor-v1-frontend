import Icon from "./Icon";

// Aviso suave: se usa cuando una parte del backend aún no está lista
export default function Notice({ children, icon = "clipboard" }) {
  return (
    <div className="notice">
      <span className="notice-icon">
        <Icon name={icon} size={18} />
      </span>
      <span>{children}</span>
    </div>
  );
}
