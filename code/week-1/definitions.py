from gtfs_dagster_project import assets  # noqa: TID252
import boto3
from dagster import op, job, schedule, Definitions, load_assets_from_modules
import json

lambda_client = boto3.client("lambda", region_name="us-east-1")

@op
def trigger_gtfs_lambda(context):
    function_name = "uta_gtfs_schedule_ingest"

    context.log.info(f"Invoking Lambda: {function_name}")
    
    response = lambda_client.invoke(
        FunctionName=function_name,
        InvocationType="RequestResponse",
        Payload=json.dumps({}).encode("utf-8") # empty payload
    )

    payload = response["Payload"].read().decode("utf-8")
    context.log.info(f"Lambda response: {payload}")
    
    return payload

@job
def gtfs_pipeline():
    trigger_gtfs_lambda()
    
@schedule(
    cron_schedule="0 0 * * *",  # every day at 12:00 AM UTC
    job=gtfs_pipeline,
    execution_timezone="UTC"
)
def daily_gtfs_schedule(_context):
    return {}

all_assets = load_assets_from_modules([assets])

defs = Definitions(
    assets=all_assets,
    jobs=[gtfs_pipeline],
    schedules=[daily_gtfs_schedule],
)
