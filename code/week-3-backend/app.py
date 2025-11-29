from datetime import datetime, timezone
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allow requests from your Vite frontend during dev


@app.get("/api/vehicles")
def get_vehicles():
    """
    Temporary mock implementation so the frontend has real-looking data.
    We should later replace the body of this function to:
      - Read latest JSON from Kinesis (gtfs-realtime-stream)
      - Join with schedule data from Week 1
      - Compute on-time performance, ETA, etc.
    """
    now = datetime.now(timezone.utc).isoformat()

    # This shape matches what your React dashboard expects.
    mock_response = {
        "generated_at": now,
        "vehicles": [
            {
                "vehicle_id": "V123",
                "route_id": "F850",
                "route_short_name": "F850",
                "headsign": "Salt Lake Central",
                "trip_id": "TRIP_001",
                "lat": 40.760412,
                "lon": -111.888153,
                "speed_mps": 6.3,
                "last_update": now,
                "next_stop_id": "STOP_1001",
                "next_stop_name": "Downtown Ogden Station",
                "scheduled_arrival": "2025-11-29T18:05:00Z",
                "estimated_arrival": "2025-11-29T18:06:30Z",
                "delay_seconds": 90,
                "on_time_status": "LATE",  # or ON_TIME / EARLY
            },
            {
                "vehicle_id": "V456",
                "route_id": "612",
                "route_short_name": "612",
                "headsign": "Ogden",
                "trip_id": "TRIP_002",
                "lat": 41.223,
                "lon": -111.973,
                "speed_mps": 4.1,
                "last_update": now,
                "next_stop_id": "STOP_2002",
                "next_stop_name": "Main St & 25th",
                "scheduled_arrival": "2025-11-29T18:10:00Z",
                "estimated_arrival": "2025-11-29T18:09:30Z",
                "delay_seconds": -30,
                "on_time_status": "EARLY",
            },
        ],
    }

    return jsonify(mock_response)


if __name__ == "__main__":
    # For local dev only. In prod you'd use gunicorn or similar.
    app.run(host="0.0.0.0", port=5000, debug=True)
