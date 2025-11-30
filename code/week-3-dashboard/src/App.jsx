import { useEffect, useState } from 'react';
import './App.css';
import { BACKEND_BASE_URL } from './config';
import VehicleMap from './VehicleMap';

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'map'

  const fetchVehicles = async () => {
    try {
      setError(null);
      const response = await fetch(`${BACKEND_BASE_URL}/api/vehicles`);
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
      setGeneratedAt(data.generated_at || null);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setError(err.message || 'Unknown error');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchVehicles();
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Unique route options
  const routeOptions = Array.from(
    new Set(vehicles.map((v) => v.route_id || v.route_short_name))
  ).filter(Boolean);

  // Filter by selected route
  const filteredVehiclesRaw =
    selectedRoute === 'ALL'
      ? vehicles
      : vehicles.filter(
          (v) =>
            v.route_id === selectedRoute || v.route_short_name === selectedRoute
        );

  // Sort by delay (most late first)
  const filteredVehicles = [...filteredVehiclesRaw].sort((a, b) => {
    const da = typeof a.delay_seconds === 'number' ? a.delay_seconds : 0;
    const db = typeof b.delay_seconds === 'number' ? b.delay_seconds : 0;
    return db - da;
  });

  // Summary stats
  const total = filteredVehicles.length;
  const onTimeCount = filteredVehicles.filter(
    (v) => v.on_time_status === 'ON_TIME'
  ).length;
  const lateCount = filteredVehicles.filter(
    (v) => v.on_time_status === 'LATE'
  ).length;
  const earlyCount = filteredVehicles.filter(
    (v) => v.on_time_status === 'EARLY'
  ).length;

  const formatEta = (estimatedArrival) => {
    if (!estimatedArrival) return '-';
    const etaDate = new Date(estimatedArrival);
    const now = new Date();
    const diffMinutes = Math.round((etaDate - now) / 60000);

    const timePart = etaDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (!Number.isFinite(diffMinutes)) return timePart;

    if (diffMinutes > 0) {
      return `${timePart} (in ${diffMinutes} min)`;
    }
    if (diffMinutes < 0) {
      return `${timePart} (${Math.abs(diffMinutes)} min ago)`;
    }
    return `${timePart} (now)`;
  };

  const formatDelay = (delaySeconds, status) => {
    if (typeof delaySeconds !== 'number') {
      if (status === 'ON_TIME') return 'On time';
      return '-';
    }
    const mins = Math.round(delaySeconds / 60);
    if (mins === 0) return 'On time';
    if (mins > 0) return `+${mins} min`;
    return `${mins} min`;
  };

  return (
    <div className="app">
      <div className="app-inner">
        <header className="app-header">
          <h1>UTA Real-Time Dashboard</h1>
          <p className="subtitle">
            Check current vehicle status, next stop arrival, and on-time
            performance.
          </p>
        </header>

        <section className="controls">
          <div className="controls-left">
            <label className="control-label">
              Route:
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
              >
                <option value="ALL">All routes</option>
                {routeOptions.map((route) => (
                  <option key={route} value={route}>
                    {route}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="controls-right">
            <button onClick={fetchVehicles} className="refresh-button">
              Refresh now
            </button>
            {generatedAt && (
              <span className="timestamp">
                Last updated:{' '}
                {new Date(generatedAt).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
          </div>
        </section>

        {/* Summary cards */}
        {!loading && !error && (
          <section className="summary">
            <div className="summary-card">
              <div className="summary-label">Total vehicles</div>
              <div className="summary-value">{total}</div>
            </div>
            <div className="summary-card summary-on-time">
              <div className="summary-label">On time</div>
              <div className="summary-value">{onTimeCount}</div>
            </div>
            <div className="summary-card summary-late">
              <div className="summary-label">Late</div>
              <div className="summary-value">{lateCount}</div>
            </div>
            <div className="summary-card summary-early">
              <div className="summary-label">Early</div>
              <div className="summary-value">{earlyCount}</div>
            </div>
          </section>
        )}

        {/* View toggle */}
        {!loading && !error && total > 0 && (
          <div className="view-toggle">
            <button
              className={
                viewMode === 'table'
                  ? 'view-button view-button-active'
                  : 'view-button'
              }
              onClick={() => setViewMode('table')}
            >
              Table view
            </button>
            <button
              className={
                viewMode === 'map'
                  ? 'view-button view-button-active'
                  : 'view-button'
              }
              onClick={() => setViewMode('map')}
            >
              Map view
            </button>
          </div>
        )}

        {loading && <div className="status status-loading">Loading data…</div>}

        {error && (
          <div className="status status-error">
            Failed to load data: {error}
          </div>
        )}

        {!loading && !error && filteredVehicles.length === 0 && (
          <div className="status status-empty">
            No vehicles available for the current selection.
          </div>
        )}

        {!loading && !error && filteredVehicles.length > 0 && (
          <>
            {viewMode === 'table' && (
              <section className="table-section">
                <table className="vehicles-table">
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Direction</th>
                      <th>Next stop</th>
                      <th>ETA</th>
                      <th>Delay</th>
                      <th>Status</th>
                      <th>Last update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map((v) => {
                      const status = v.on_time_status || 'UNKNOWN';
                      const statusClass =
                        status === 'ON_TIME'
                          ? 'status-on-time'
                          : status === 'LATE'
                          ? 'status-late'
                          : status === 'EARLY'
                          ? 'status-early'
                          : 'status-unknown';

                      return (
                        <tr
                          key={
                            v.vehicle_id || `${v.route_id}-${v.trip_id || ''}`
                          }
                        >
                          <td>{v.route_short_name || v.route_id || '-'}</td>
                          <td>{v.headsign || v.trip_headsign || '-'}</td>
                          <td>{v.next_stop_name || '-'}</td>
                          <td>{formatEta(v.estimated_arrival)}</td>
                          <td>{formatDelay(v.delay_seconds, status)}</td>
                          <td>
                            <span className={`status-pill ${statusClass}`}>
                              {status}
                            </span>
                          </td>
                          <td>
                            {v.last_update
                              ? new Date(v.last_update).toLocaleTimeString(
                                  undefined,
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }
                                )
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}

            {viewMode === 'map' && (
              <VehicleMap vehicles={filteredVehicles} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;