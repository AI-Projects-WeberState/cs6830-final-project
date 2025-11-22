# CS6830 Final Project

Fundamentals of Data Engineering (CS6830 Fall 2025)

In this final, you will build data pipelines to fetch and process Utah Transit Authority data on routes, schedules, and real time vehicle position. We’ll build two data paths:

- A batch data path for fetching infrequently changing data, such as schedules.

- A real-time data path to fetch rapidly changing data, such as vehicle coordinates.

You will combine the data from these two pipelines to feed dashboards that display a map of current vehicle positions, estimated arrival time at a stop, and on-time performance information.

UTA provides its data using an industry standard, General Transit Feed Specification (GTFS). The GTFS standard was originally developed at Google and is used to power a number of transit route planning and mapping applications. Incidentally, GTFS originally stood for Google Transit Feed Specification before gaining industry wide adoption.

GTFS has batch and real time parts, GTFS Schedule and GTFS RT. GTFS Schedule consists of a downloadable ZIP file containing several CSV files. GTFS RT is offered as a public API endpoint that provides data in Protobuf format. If you paste the URL https://apps.rideuta.com/tms/gtfs/Vehicle into a web browser, this should trigger a file download. If you open the file with a text editor, the data inside will appear garbled. This is because Protocol Buffers are a binary standard. Fortunately, libraries to decode the protobuf payload are available for virtually any popular programming language.

The assignment will be split into four parts, with one part due every week.

Week 1—Batch data ingestion and data discovery.
Week 2—Real-time data ingestion.
Week 3—Combining and processing real-time and batch feeds.
Week 4—dashboards.

Week 1 Detailed Description

## Week 1

1. Data Discovery: Locate, verify, and document the stable URL for the UTA GTFS Schedule .zip file. Read the GTFS documentation. Manually download the current data and load it into DuckDB. Inspect the data tables.

2. Data Description: Create an entity-relationship diagram describing the key relationships between the data files.

3. Data Download and Ingestion: Develop an automated process to download the data and load it into a database or data lake. (The loading app and database should be hosted on AWS. You could use S3 with Athena or PySpark if you go the data lake route; Postgres is a good database option. There are many other good options, but chat with us if you want to use something else.)

4. Batch Transformation: Cleanse and process the data, enforce types, run data quality checks and write final tables.

5. Orchestration: Schedule the ingestion/transformation job to run on a daily basis. (Utilize Apache Airflow or Dagster. Note that there is an AWS managed Airflow service, MWAA. This service can also be paused to save money.)

Weekly Assignment Evaluation
Your team will be evaluated on the code and documentation in your Git repo and based on a project functionality demo.

### Code and Documentation

Your code and documentation should be hosted in a public git repository, using GitHub, GitLab or some other platform that can host code publicly. Your repository should consist of two things: 1. Any code that you deploy as part of this project should be committed in your repository. 2. Detailed documentation. We don’t expect you to create all project assets using infrastructure as code tools such as Cloudformation, though are you free to try these if you wish. However, you should document every aspect of your project. Your documentation should provide enough detail that we could follow it to set up working pipelines and dashboards. Note also that you should include build files, Docker files, configuration files, etc. You could potentially include your ER diagrams in the repo.

### No credentials in Git repos!

This is especially dangerous in publicly hosted repos. Automated GitHub scrapers run constantly looking for publicly posted AWS keys and other credentials. If these are discovered, hackers will use the keys to mine bitcoin or otherwise steal resources from your account. You may lose points if we discover credentials in your repo.

### Git repo submissions

Submissions will be due on Sundays. (The code for week 1 will be due on November 16th.) Create a specific git commit with a commit message stipulating that this is for the week 1 assignment. This commit should be made on or before the due date. I would suggest committing your work in separate commits as you go along, then creating an empty commit with the assignment commit message after you’ve finished your work.

### Project Functionality Demo

The project functionality demo can be completed in class or during office hours. Since we don’t meet on Sundays, these can be completed after the code due date, but try to get them done as early as possible. Doing this early will also allow you to quickly incorporate any feedback into the next part of the assignment.

## Week 2

1. Study the GTFS Realtime Specifications
https://developers.google.com/transit/gtfs-realtime

2. Data Description: Provide a description of the data and schema.

3. Polling: Develop and deploy a polling service that reads the latest data every 30 seconds. We recommend using Python with appropriate HTTP and protobuf libraries, though you are allowed to use another programming language if you wish. (Whatever language you use, we highly recommend that you use a library rather than reinventing the wheel by writing your own code to handle HTTP and protobuf.) For a deployment environment, we recommend AWS Lambda. You can set up a timing process that triggers your lambda every 30 seconds—there are many online guides that explain how to do this.

4. Stream the Data: Your code should put the decoded data into a nice form (for example, JSON) and send it to a streaming service. We recommend using Kinesis Data Streams.

5. Testing: Ensure that you can receive and decode the data from Amazon Kinesis. Check the correctness and freshness of the data that you receive. Embedding a timestamp from the GTFS source will allow the data consumer to check how old the data is.
