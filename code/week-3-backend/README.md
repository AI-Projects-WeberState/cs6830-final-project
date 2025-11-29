# Week 3 Backend (Flask)

- `app.py` defines a Flask API.
 - A Python virtual environment (`venv`) was created for installing project dependencies.
 - python -m venv venv
 - venv\Scripts\activate
 - pip install -r requirements.txt
 - python app.py 

- `/api/vehicles` currently returns **mocked data** that matches the frontend's expected JSON shape.
- TODO:
  - Replace mock data with real-time GTFS-RT data from Kinesis (`gtfs-realtime-stream`).
  - Join with GTFS schedule data (Week 1) to compute:
    - next_stop_name
    - scheduled_arrival
    - estimated_arrival
    - delay_seconds
    - on_time_status (`ON_TIME`, `LATE`, `EARLY`)
