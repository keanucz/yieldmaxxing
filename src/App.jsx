import { useState } from "react";
import FieldMap from "./components/FieldMap";
import FieldOverview from "./components/FieldOverview";
import PrescriptionPanel from "./components/PrescriptionMap";
import ROISummary from "./components/ROISummary";
import { FIELDS, FIELD_COUNT, TOTAL_ACRES } from "./data/fields";
import "./App.css";

const VIEWS = {
  HOME: "home",
  OVERVIEW: "overview",
  PRESCRIPTION: "prescription",
  ROI: "roi",
};

function TopBar() {
  return (
    <div className="cg-topbar">
      <div className="cg-logo">
        <span style={{ fontSize: 16 }}>🌾</span>
        <span>CropGuard</span>
      </div>
      <div className="cg-search">
        <span style={{ color: "#555", fontSize: 13 }}>⌕</span>
        <span style={{ color: "#666", fontSize: 13 }}>
          Search fields, crops, regions…
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#555" }}>fabian@rootglobal.io</div>
    </div>
  );
}

function HomeBottomBar() {
  return (
    <div className="cg-bottombar">
      <div>
        <span style={{ color: "#fff", fontWeight: 600 }}>{FIELD_COUNT} fields</span>
        <span style={{ color: "#444", margin: "0 10px" }}>·</span>
        <span style={{ color: "#fff", fontWeight: 600 }}>{TOTAL_ACRES.toLocaleString()} acres</span>
        <span style={{ color: "#888" }}> total</span>
      </div>
      <div style={{ color: "#666", fontSize: 13 }}>
        Last scan: 7 May 2026
      </div>
    </div>
  );
}

function HormuzBanner() {
  return (
    <div className="cg-banner">
      <div style={{ fontSize: 11, fontWeight: 700, color: "#eab308", letterSpacing: 0.6 }}>
        ⚠ HORMUZ CRISIS
      </div>
      <div style={{ fontSize: 12, color: "#bbb", marginTop: 4, lineHeight: 1.5 }}>
        Urea at <span style={{ color: "#fff", fontWeight: 600 }}>$680/ton</span> — up 43% since the Strait of Hormuz closure.
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState(VIEWS.HOME);
  const [selectedField, setSelectedField] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);

  const handleFieldClick = (field) => {
    setSelectedField(field);
    setSelectedZone(null);
    setView(VIEWS.OVERVIEW);
  };

  const handleBackToHome = () => {
    setView(VIEWS.HOME);
    setSelectedField(null);
    setSelectedZone(null);
  };

  if (view === VIEWS.ROI && selectedField) {
    return (
      <ROISummary
        field={selectedField}
        onBack={() => setView(VIEWS.PRESCRIPTION)}
      />
    );
  }

  const showSidebar = view === VIEWS.OVERVIEW || view === VIEWS.PRESCRIPTION;

  return (
    <div className="cg-app">
      <TopBar />
      <div className="cg-main">
        {showSidebar && selectedField && (
          <aside className="cg-sidebar">
            {view === VIEWS.OVERVIEW && (
              <FieldOverview
                field={selectedField}
                selectedZone={selectedZone}
                onContinue={() => {
                  setSelectedZone(null);
                  setView(VIEWS.PRESCRIPTION);
                }}
                onBack={handleBackToHome}
              />
            )}
            {view === VIEWS.PRESCRIPTION && (
              <PrescriptionPanel
                field={selectedField}
                selectedZone={selectedZone}
                onContinue={() => setView(VIEWS.ROI)}
                onBack={() => {
                  setSelectedZone(null);
                  setView(VIEWS.OVERVIEW);
                }}
              />
            )}
          </aside>
        )}
        <div className="cg-mapwrap">
          <FieldMap
            mode={
              view === VIEWS.HOME
                ? "home"
                : view === VIEWS.PRESCRIPTION
                ? "prescription"
                : "ndvi"
            }
            selectedField={selectedField}
            onFieldClick={handleFieldClick}
            selectedZone={selectedZone}
            onZoneClick={(z) => setSelectedZone(z)}
          />
          {view === VIEWS.HOME && (
            <>
              <HormuzBanner />
              <HomeBottomBar />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
