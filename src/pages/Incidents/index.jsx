import { useState } from "react";
import Icon from "../../components/Icon";
import IncidentsTab from "./IncidentsTab";
import EventsTab from "./EventsTab";
import "../../styles/modules.css";

export default function Incidents() {
  const [tab, set_tab] = useState("incidents");

  return (
    <div className="page">
      <div className="page-header">
        <h1>Incidencias y eventos</h1>
        <p className="muted">Consulta, estado, grabaciones y comentarios.</p>
      </div>

      <div className="pill-tabs">
        <button
          className={tab === "incidents" ? "pill-tab active" : "pill-tab"}
          onClick={() => set_tab("incidents")}
        >
          <Icon name="incidents" size={16} />
          Incidencias
        </button>
        <button
          className={tab === "events" ? "pill-tab active" : "pill-tab"}
          onClick={() => set_tab("events")}
        >
          <Icon name="chip" size={16} />
          Eventos de vehículos
        </button>
      </div>

      {tab === "incidents" ? <IncidentsTab /> : <EventsTab />}
    </div>
  );
}
