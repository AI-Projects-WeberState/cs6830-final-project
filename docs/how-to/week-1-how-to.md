# Week 1 Process [How To](https://docs.google.com/document/d/1LnK0TZu0Cwd2Z3uO93gVbT7UxBtRq5rEf6DML04kfdg/preview?tab=t.0)

## 1. Data Discovery (GTFS Schedule Zip Location)

[Can be found here](https://gtfsfeed.rideuta.com/GTFS.zip) which gives multiple .txt files in a zip containing agency,
calendar_dates, calendar, feed_info, shapes, stops, routes, trips, and stop_times.

## 2. Data Description (Table docs/screenshots + ERD)

[Reference of GTFS data tables here](https://gtfs.org/documentation/schedule/reference/)

- agency:

![agency](./docs/screenshots/agency.png)

- calendar_dates:

![calendar_dates](./docs/screenshots/calendar_dates.png)

- calendar:

![calendar](./docs/screenshots/calendar.png)

- feed_info:

![feed_info](./docs/screenshots/feed_info.png)

- routes:

![routes](./docs/screenshots/routes.png)

- shapes:

![shapes](./docs/screenshots/shapes.png)

- stop_times:

![stop_times](./docs/screenshots/stop_times.png)

- stops:

![stops](./docs/screenshots/stops.png)

- trips:

![trips](./docs/screenshots/trips.png)

- ERD:

![ERD](./docs/diagram/week-1-erd.png)

## 3. Data Download and Ingestion (Automation Script + AWS Setup)

1. Create an S3 bucket in AWS Management Console to store the raw GTFS Schedule data.

2. Use [Python ingest script in repo](./auto-download-script.py) to automate the download and ingestion of the GTFS data into the S3 bucket (named "final-project"). Stores archive zip and latest unzipped CSV files in their own folders.

   - Make sure to update BUCKET and CRAWLER_NAME (jump to step 4 for that) variables in the script before running.

3. Create Lambda function to trigger script on a schedule for step 5 using AWS Airflow. Can use the vscode text editor in the AWS Management Console.

   - Make sure to grant S3 read/write, CloudWatch logs, and Glue permissions to the Lambda function.
   - Set timeout to 30 seconds to make sure the CSV files are uploaded properly.

4. Setup Athena to query the data in S3.
   - Create a database named "gtfs_schedule".
   - Set the Athena query result location in S3 to store query results.

## 4. Batch Transformations (Glue Crawler Setup)

1. Create Glue Crawler for validating and adding the data to
   Athena for querying and analysis (automatically done by GTFS format and CSV defaults by AWS Glue). Set the data store to S3 and point to the S3 parent folder of the data folders. Set the IAM role to allow Glue to access S3. Run the crawler to populate the Athena database with tables (should be able to query).

## 5. Orchestration (Scheduling Setup)

### Errors Met With Permissions

**Note:** The following steps requires AWS MWAA permissions which we do not have in the current AWS account same with switching over to AWS Lambda and EventBridge for scheduling as well so we stick to Dagster with EC2.

Here are the screenshot of the errors:

![Airflow Error](./docs/screenshots/aws-mwaa-permission-error.png)

![EventBridge Error](./docs/screenshots/aws-eventbridge-permission-error.png)

### Airflow + MWAA

1. Create an Airflow environment in AWS MWAA (Managed Workflows for Apache Airflow).
   - Set the S3 bucket to the same bucket used for data storage. Make dags folder the same as the default "dags".
   - Set the execution role to allow access to S3, Lambda, and Glue.

---

### Lambda + Event Bridge

1. With AWS Lambda, we just need to ensure our previous
   lambda function has Glue and CloudWatch logs permissions.

2. Create Event Bridge Schedule to trigger the Lambda function on a schedule (e.g., daily at midnight -> 0, 0, \* , \* , ? , \*).

---

### EC2 + Dagster

1. Set up Amazon Linux EC2 Instance (t2.small) with IAM role to allow S3, and Glue access. 20 GiB storage too. Allow port 22 for SSH and 3000 for local UI web access.

2. Install core dagster packages after SSH into the instance:

```bash
# Update packages
sudo yum update -y

# Install Python and pip (if not already installed)
sudo yum install python3 -y

# Create virtual environment (to not pollute global)
mkdir ~/dagster_env
cd ~/dagster_env
python3 -m venv venv
source venv/bin/activate

# Install Dagster and AWS packages
pip install --upgrade pip

pip install dagster dagit dagster-aws boto3
```

3. Specify location dagster logs

```bash
sudo mkdir -p /mnt/dagster

# make sure ec2-user owns the folder
sudo chown -R ec2-user:ec2-user /mnt/dagster

echo "export DAGSTER_HOME=/mnt/dagster" >> ~/.bashrc
source ~/.bashrc
```

4. Create dagster project

```bash
dagster project scaffold --name gtfs_dagster_project
```

5. Replace definitions.py file in the gtfs_dagster_project/gtfs_dagster_project folder with this repo's definitions.py (see week-1/ folder in repo for code). Make sure to update Lambda function name.

6. Start dagit web server to monitor and manage jobs

```bash
# Make sure you are in the root dagster project folder
dagit -h 0.0.0.0 -p 3000

# Can access via ssh port forwarding
ssh -i your-key.pem -L 3000:localhost:3000 ec2-user@<EC2-IP>
```

7. Access dagit web UI at http://\<EC2-Public-IP\>:3000 to monitor and manage jobs.

8. Run Dagster Scheduler (note ec2 must stay running as well as ssh session). Try either systemd or nohup to remain running afterwards.

```bash
dagster-daemon run
```
