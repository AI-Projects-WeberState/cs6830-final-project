# Week 3 Backend (Flask)

- `app.py` defines a Flask API.
 - A Python virtual environment (`venv`) was created for installing project dependencies.
 - python -m venv venv
 - source venv/bin/activate  # Linux/macOS
 - # .\venv\Scripts\activate  # Windows
 - pip install -r requirements.txt
 - python app.py 

## Configuration

1. Create a `.env` file in this directory (see `.env` for an example structure).
2. Update the values in `.env` with your AWS credentials and configuration:
   ```
   AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
   AWS_REGION=us-east-1
   KINESIS_STREAM_NAME=gtfs-realtime-stream
   GTFS_STATIC_PATH=./data
   ```
   *Note: If you already have AWS credentials configured globally (e.g. via `aws configure`), you can omit the access key and secret key.*

- `/api/vehicles` currently returns **mocked data** that matches the frontend's expected JSON shape.
- TODO:
  - Replace mock data with real-time GTFS-RT data from Kinesis (`gtfs-realtime-stream`).
  - Join with GTFS schedule data (Week 1) to compute:
    - next_stop_name
    - scheduled_arrival
    - estimated_arrival
    - delay_seconds
    - on_time_status (`ON_TIME`, `LATE`, `EARLY`)
