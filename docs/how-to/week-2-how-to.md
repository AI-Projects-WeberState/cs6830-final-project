# Week 2 Process [How To](https://docs.google.com/document/d/1RnOCta8YvmlvGfzT_V_sh46nenPVOM7rK3vzOkU-UOQ/preview)

## 1. Data Description

- [Data](https://apps.rideuta.com/tms/gtfs/Vehicle): Vehicle positions in Protobuf format like location, traffic status, seat availability, stop status, and attributes of vehicles.

- [Schema](https://gtfs.org/documentation/realtime/gtfs-realtime.proto): Hierarchy of data fields and types of the Protobuf data to work with. Allows for the creation of libraries to make the binary data usable in the programming language of choice. This ensures the vehicle feed is correct.

## 2. Polling

- Download schema file so protobuffer knows how to interpret incoming binary data: https://gtfs.org/documentation/realtime/gtfs-realtime.proto


- Compile downloaded schema file using protoc (need to install protobuf compiler separately)

```sh
# Invoke compiler using the downloaded schema file and generate Python library in current directory
protoc --python_out=. gtfs-realtime.proto
```

- Create aws lambda folder and adding ingest-realtime.py and the generated gtfs_realtime_pb2.py file into it.
    - Make sure to set the StreamName kwarg in ingest-realtime.py to the name of the Kinesis stream you will create later.

```sh
mkdir aws-lambda
cp ingest-realtime.py gtfs_realtime_pb2.py aws-lambda/
```

- Install dependencies into aws-lambda folder

```sh
# Get libraries to help read realtime data for the lambda function
pip install --target ./aws-lambda protobuf requests
```

- Zip the directory contents to upload to AWS Lambda (next step)

```sh
cd aws-lambda
zip -r ../aws-lambda.zip .
```

## 3. Ingest Real-time Data

- Create a Kinesis Data Stream to receive the data.
    - Name
    - Provisioned
        - Number of shards: 1

- Create AWS Lambda function, by copying the zipped aws-lambda.zip into the Lambda console.
    - Python 3.14
    - Create or update an IAM role for the Lambda function with permissions to write to Kinesis Data Stream and CloudWatch Logs (Kinesis and CloudWatch Full Access).
    - Upload the zip file created earlier.
        - Either rename ingest-realtime.py to lambda_function.py or set the handler to ingest-realtime.lambda_handler in Runtime settings in Code tab so AWS Lambda knows starting point.

- Create an EventBridge Schedule that triggers the Lambda every minute (* * * * ? *)

- Create Firehouse Stream to see data landing in S3 bucket for verification. Can also check Kinesis Data Viewer to see records as well.
