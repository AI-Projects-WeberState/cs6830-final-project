import { useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function getCenterFromVehicles(vehicles) {
  if (!vehicles || vehicles.length === 0) {
    // Default center – roughly Salt Lake City
    return [40.7608, -111.891];
  }
  const valid = vehicles.filter(
    (v) => typeof v.lat === 'number' && typeof v.lon === 'number'
  );
  if (valid.length === 0) {
    return [40.7608, -111.891];
  }
  const latSum = valid.reduce((sum, v) => sum + v.lat, 0);
  const lonSum = valid.reduce((sum, v) => sum + v.lon, 0);
  return [latSum / valid.length, lonSum / valid.length];
}

function createIcon(status, headingDeg) {
  const normalizedHeading = Number.isFinite(headingDeg) ? headingDeg : 0;

  const statusClass =
    status === 'LATE'
      ? 'vehicle-marker-late'
      : status === 'EARLY'
      ? 'vehicle-marker-early'
      : status === 'ON_TIME'
      ? 'vehicle-marker-on-time'
      : 'vehicle-marker-unknown';

  // Outer div gets positioned by Leaflet; inner arrow rotates by heading
  const html = `
    <div class="vehicle-marker ${statusClass}">
      <div class="vehicle-arrow" style="transform: rotate(${normalizedHeading}deg);"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: '', // use only our custom classes
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

export default function VehicleMap({ vehicles }) {
  const center = getCenterFromVehicles(vehicles);

  // Pre-compute marker props for performance
  const markers = useMemo(
    () =>
      vehicles
        .filter((v) => typeof v.lat === 'number' && typeof v.lon === 'number')
        .map((v) => {
          const heading = v.bearing ?? v.heading ?? 0; // backend can provide bearing/heading if available
          const status = v.on_time_status || 'UNKNOWN';
          return {
            key: v.vehicle_id || `${v.route_id}-${v.trip_id || ''}`,
            position: [v.lat, v.lon],
            icon: createIcon(status, heading),
            vehicle: v,
          };
        }),
    [vehicles]
  );

  return (
    <section className="content-panel map-section">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={true}
        className="vehicle-map-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map(({ key, position, icon, vehicle: v }) => (
          <Marker key={key} position={position} icon={icon}>
            <Popup>
              <div style={{ fontSize: '0.85rem' }}>
                <div>
                  <strong>{v.route_short_name || v.route_id || 'Route'}</strong>{' '}
                  – {v.headsign || v.trip_headsign || 'Unknown direction'}
                </div>
                <div>
                  <strong>Next stop:</strong> {v.next_stop_name || '-'}
                </div>
                <div>
                  <strong>Status:</strong> {v.on_time_status || 'UNKNOWN'}
                </div>
                {v.estimated_arrival && (
                  <div>
                    <strong>ETA:</strong>{' '}
                    {new Date(v.estimated_arrival).toLocaleTimeString(
                      undefined,
                      {
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </div>
                )}
                {v.last_update && (
                  <div>
                    <strong>Last update:</strong>{' '}
                    {new Date(v.last_update).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </section>
  );
}