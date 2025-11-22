import boto3
import urllib.request
import datetime
import io
import zipfile

s3 = boto3.client('s3')
glue = boto3.client('glue')

def lambda_handler(event, context):
    
    BUCKET = "cs6830-final-project"
    CRAWLER_NAME = "gtfs-schedule-crawler-new"
    
    # Today's date for folder structure
    today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    
    # GTFS Schedule URL
    url = "https://gtfsfeed.rideuta.com/GTFS.zip"

    # Download the zip in memory
    with urllib.request.urlopen(url) as response:
        zip_content = response.read()
        
    uploaded_files = []

    # Upload the original zip to S3 followed by date
    archive_key = f"gtfs-schedule-data/archive/{today}.zip"
    s3.put_object(Bucket=BUCKET, Key=archive_key, Body=zip_content)
    uploaded_files.append(f"s3://{BUCKET}/{archive_key}")

    # Process zip in memory
    zip_file = zipfile.ZipFile(io.BytesIO(zip_content))

    for file_name in zip_file.namelist():
        # Read each file as bytes
        file_content = zip_file.read(file_name)
        
        # Upload each CSV to S3 in latest folder for AWS Glue
        s3_key = f"gtfs-schedule-data/latest/{file_name.replace('.txt', '')}/{file_name.replace('.txt', '.csv')}"
        s3.put_object(Bucket=BUCKET, Key=s3_key, Body=file_content)
        
        uploaded_files.append(f"s3://{BUCKET}/{s3_key}")
    
    # Start crawler with error handling
    try:
        glue.start_crawler(Name=CRAWLER_NAME)
        crawler_status = "started"
    except glue.exceptions.CrawlerRunningException:
        crawler_status = "already running"
    except Exception as e:
        crawler_status = f"error: {str(e)}"
    
    return {
        "status": "success",
        "processed_files": uploaded_files,
        "crawler_status": crawler_status
    }
