import { get_label } from "../utils/labels";

// Etiqueta de color para un valor de un catálogo (ver utils/labels.js)
export default function Badge({ catalog, value }) {
  const { label, css } = get_label(catalog, value);
  return <span className={`badge ${css}`}>{label}</span>;
}
