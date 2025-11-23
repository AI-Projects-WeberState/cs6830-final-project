import requests
import gtfs_realtime_pb2
from google.protobuf.json_format import MessageToJson
import json
from datetime import datetime
import os

def fetch_and_save():
    url = "https://apps.rideuta.com/tms/gtfs/Vehicle"
    response = requests.get(url)

    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(response.content)

    # Convert the entire feed to JSON
    json_str = MessageToJson(feed)

    # Parse back into a dict so we can add timestamp
    data = json.loads(json_str)

    # Add a timestamp (ISO 8601 format)
    data["timestamp"] = datetime.utcnow().isoformat()

    # Create local data directory if it doesn't exist
    os.makedirs("local_data", exist_ok=True)
    
    # Save to timestamped file
    filename = f"local_data/vehicle_positions_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Data saved to {filename}")
    print(f"Received {len(data.get('entity', []))} vehicle positions")

if __name__ == "__main__":
    fetch_and_save()
