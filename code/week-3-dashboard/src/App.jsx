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

  // Summary stats (used only for display)
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

  const onTimePct = total ? Math.round((onTimeCount / total) * 100) : 0;
  const latePct = total ? Math.round((lateCount / total) * 100) : 0;
  const earlyPct = total ? Math.round((earlyCount / total) * 100) : 0;

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

  const routeLabel =
    selectedRoute === 'ALL' ? 'all routes' : `route ${selectedRoute}`;

  return (
    <div className="app">
      <div className="app-inner">
        {/* HEADER */}
        <header className="app-header">
          <div className="app-header-left">
            <div className="app-header-badge">UTA Transit Operations</div>
            <h1>UTA Real-Time Dashboard</h1>
            <p className="subtitle">
              Check current vehicle status, next stop arrival, and on-time
              performance.
            </p>
          </div>

          <div className="app-header-right">
            <div className="header-chip header-chip-live">
              <span className="live-dot" />
              Live feed
            </div>
            <div className="header-chip">Bus &amp; rail network</div>
          </div>
        </header>

        {/* CONTROLS */}
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

        {/* SUMMARY & PERFORMANCE */}
        {!loading && !error && (
          <>
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

            <section className="performance-overview">
              <div className="performance-text">
                <h2>Live on-time snapshot</h2>
                <p>
                  {total === 0
                    ? `No active vehicles reported on ${routeLabel}.`
                    : `${onTimePct}% of active vehicles on ${routeLabel} are on time, ${latePct}% late, and ${earlyPct}% early.`}
                </p>
              </div>

              <div className="performance-bar" aria-hidden="true">
                <div
                  className="performance-segment performance-on-time"
                  style={{ width: `${onTimePct || 0}%` }}
                />
                <div
                  className="performance-segment performance-late"
                  style={{ width: `${latePct || 0}%` }}
                />
                <div
                  className="performance-segment performance-early"
                  style={{ width: `${earlyPct || 0}%` }}
                />
              </div>

              <div className="performance-legend">
                <div className="performance-pill performance-pill-on-time">
                  <span className="pill-dot pill-dot-on-time" />
                  On time
                  <span className="pill-value">{onTimePct}%</span>
                </div>
                <div className="performance-pill performance-pill-late">
                  <span className="pill-dot pill-dot-late" />
                  Late
                  <span className="pill-value">{latePct}%</span>
                </div>
                <div className="performance-pill performance-pill-early">
                  <span className="pill-dot pill-dot-early" />
                  Early
                  <span className="pill-value">{earlyPct}%</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* VIEW TOGGLE */}
        {!loading && !error && filteredVehicles.length > 0 && (
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

        {/* TABLE + MAP */}
        {!loading && !error && filteredVehicles.length > 0 && (
          <>
            {/* helper text above panel (keep or tweak) */}
            <div className="table-meta">
              <div className="table-meta-left">
                <span className="table-meta-label">
                  Showing {filteredVehicles.length} vehicle
                  {filteredVehicles.length !== 1 ? 's' : ''} on{' '}
                  {selectedRoute === 'ALL' ? 'all routes' : `route ${selectedRoute}`}.
                </span>
              </div>
              <div className="table-meta-right">
                <span className="table-meta-note">
                  Sorted by delay (most late at the top).
                </span>
              </div>
            </div>

            {/* 🔵 ONE shared panel area for both views */}
            {viewMode === 'table' && (
              <section className="data-panel data-panel-table">
                <div className="table-scroll">
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
                            key={v.vehicle_id || `${v.route_id}-${v.trip_id || ''}`}
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
                </div>
              </section>
            )}

            {viewMode === 'map' && (
              <section className="data-panel data-panel-map">
                {/* VehicleMap just fills the panel */}
                <VehicleMap vehicles={filteredVehicles} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
