import requests
import gtfs_realtime_pb2
from google.protobuf.json_format import MessageToJson
import json
import boto3
from datetime import datetime

def lambda_handler(event, context):
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

    # Convert back to JSON string for sending
    payload = json.dumps(data)

    kinesis = boto3.client("kinesis")

    response = kinesis.put_record(
        StreamName="gtfs-realtime-stream",
        Data=payload.encode('utf-8'),
        PartitionKey="default"
    )
