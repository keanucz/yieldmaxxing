import { useNavigate } from "react-router-dom";
import { useFarmStore } from "../store/farmStore";
import Shell from "../components/Shell";
import BaseMap from "../components/map/BaseMap";
import FieldPolygonsLayer from "../components/map/FieldPolygonsLayer";
import FieldList from "../components/controls/FieldList";

export default function FarmOverview() {
  const navigate = useNavigate();
  const farm = useFarmStore((s) => s.farm);

  if (!farm) {
    navigate("/", { replace: true });
    return null;
  }

  function open(id: string) {
    useFarmStore.getState().setSelectedField(id);
    navigate(`/field/${id}`);
  }

  // Compute farm bbox
  const bbox = farmBbox(farm);

  return (
    <Shell>
      <div className="map-page">
        <div className="sidebar">
          <div className="section-label">{farm.name}</div>
          <div className="stat-row">
            <div className="stat">
              <div className="label">Fields</div>
              <div className="value">{farm.fields.length}</div>
            </div>
            <div className="stat">
              <div className="label">Total area</div>
              <div className="value">
                {farm.fields.reduce((a, f) => a + f.areaHa, 0).toFixed(1)} ha
              </div>
            </div>
          </div>
          <div className="section-label">Your fields</div>
          <FieldList fields={farm.fields} onSelect={open} />
        </div>
        <div className="stage">
          <BaseMap
            center={farm.centroid}
            zoom={13}
            fitBounds={bbox}
          >
            <FieldPolygonsLayer fields={farm.fields} onClick={open} />
          </BaseMap>
        </div>
      </div>
    </Shell>
  );
}

function farmBbox(farm: ReturnType<typeof useFarmStore.getState>["farm"]): [number, number, number, number] {
  let west = Infinity,
    south = Infinity,
    east = -Infinity,
    north = -Infinity;
  for (const f of farm!.fields) {
    const [w, s, e, n] = f.bbox;
    if (w < west) west = w;
    if (s < south) south = s;
    if (e > east) east = e;
    if (n > north) north = n;
  }
  return [west, south, east, north];
}
