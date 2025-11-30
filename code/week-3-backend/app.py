import os
import json
import time
import threading
import boto3
from datetime import datetime, timezone
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import our new logic module
from gtfs import GTFSStaticRepository, TripEstimator

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Configuration ---
KINESIS_STREAM_NAME = os.getenv("KINESIS_STREAM_NAME", "gtfs-realtime-stream")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
GTFS_STATIC_PATH = os.getenv("GTFS_STATIC_PATH", "./data")
GTFS_URL = "https://gtfsfeed.rideuta.com/GTFS.zip"

# --- Setup ---
# 1. Load Static Data
repo = GTFSStaticRepository(GTFS_STATIC_PATH, GTFS_URL)
repo.initialize()

# 2. Initialize Logic
estimator = TripEstimator(repo)

# 3. Global State (In-Memory Cache)
LATEST_STATE = {
    "generated_at": None,
    "last_polled": None,
    "vehicles": []
}

def handle_new_data(feed_data):
    """Callback for when we get a new batch of records from Kinesis."""
    global LATEST_STATE
    
    # 1. Parse raw feed into basic vehicle objects
    raw_vehicles = []
    entities = feed_data.get('entity', [])
    
    for entity in entities:
        v = entity.get('vehicle', {})
        if not v: continue
        
        trip = v.get('trip', {})
        position = v.get('position', {})
        
        # Convert timestamp to ISO format for frontend
        ts = v.get('timestamp')
        last_update = None
        if ts:
            try:
                last_update = datetime.fromtimestamp(int(ts), timezone.utc).isoformat()
            except (ValueError, TypeError):
                last_update = None

        raw_vehicles.append({
            "vehicle_id": v.get('vehicle', {}).get('id'),
            "trip_id": trip.get('tripId'),
            "lat": position.get('latitude'),
            "lon": position.get('longitude'),
            "speed_mps": position.get('speed', 0),
            "bearing": position.get('bearing', 0),
            "timestamp": ts,
            "last_update": last_update
        })

    # 2. Enrich with Static Data & Estimates
    processed_vehicles = estimator.enrich_vehicle_data(raw_vehicles)
    
    # 3. Update State
    current_time = datetime.now(timezone.utc).isoformat()
    LATEST_STATE["generated_at"] = current_time
    LATEST_STATE["vehicles"] = processed_vehicles
    print(f"Updated {len(processed_vehicles)} vehicles at {current_time}.")

def poll_kinesis():
    """Background thread that sits in a loop and polls Kinesis for new data."""
    global LATEST_STATE
    kinesis = boto3.client('kinesis', region_name=AWS_REGION)
    print(f"Starting Kinesis polling on {KINESIS_STREAM_NAME}...")
    shard_iterator = None

    while True:
        try:
            # Update last_polled timestamp to show we are alive
            LATEST_STATE["last_polled"] = datetime.now(timezone.utc).isoformat()

            if not shard_iterator:
                response = kinesis.get_shard_iterator(
                    StreamName=KINESIS_STREAM_NAME,
                    ShardId='shardId-000000000000',
                    ShardIteratorType='LATEST'
                )
                shard_iterator = response['ShardIterator']
                print("Got new Shard Iterator.")

            record_response = kinesis.get_records(ShardIterator=shard_iterator, Limit=10)
            shard_iterator = record_response.get('NextShardIterator')
            records = record_response.get('Records', [])

            if records:
                last_record = records[-1]
                data_str = last_record['Data'].decode('utf-8')
                data_json = json.loads(data_str)
                handle_new_data(data_json)
            
            time.sleep(1)

        except Exception as e:
            print(f"Error polling Kinesis: {e}")
            shard_iterator = None
            time.sleep(5)

# 4. Start Kinesis Polling
threading.Thread(target=poll_kinesis, daemon=True).start()

# --- Routes ---

@app.get("/api/vehicles")
def get_vehicles():
    return jsonify(LATEST_STATE)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

