import { useState } from "react";
import Icon from "../../components/Icon";
import TripsTab from "./TripsTab";
import LocationsTab from "./LocationsTab";
import "../../styles/modules.css";

export default function Trips() {
  const [tab, set_tab] = useState("trips");

  return (
    <div className="page">
      <div className="page-header">
        <h1>Viajes</h1>
        <p className="muted">Lista de viajes, seguimiento en mapa y ubicaciones conocidas.</p>
      </div>

      <div className="pill-tabs">
        <button
          className={tab === "trips" ? "pill-tab active" : "pill-tab"}
          onClick={() => set_tab("trips")}
        >
          <Icon name="trips" size={16} />
          Viajes
        </button>
        <button
          className={tab === "locations" ? "pill-tab active" : "pill-tab"}
          onClick={() => set_tab("locations")}
        >
          <Icon name="pin" size={16} />
          Ubicaciones conocidas
        </button>
      </div>

      {tab === "trips" ? <TripsTab /> : <LocationsTab />}
    </div>
  );
}
