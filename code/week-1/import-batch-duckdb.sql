-- Create GTFS tables directly from CSVs
CREATE TABLE agency AS
SELECT * FROM read_csv_auto('agency.txt');

CREATE TABLE stops AS
SELECT * FROM read_csv_auto('stops.txt');

CREATE TABLE routes AS
SELECT * FROM read_csv_auto('routes.txt');

CREATE TABLE trips AS
SELECT * FROM read_csv_auto('trips.txt');

CREATE TABLE stop_times AS
SELECT * FROM read_csv_auto('stop_times.txt');

CREATE TABLE calendar AS
SELECT * FROM read_csv_auto('calendar.txt');

CREATE TABLE calendar_dates AS
SELECT * FROM read_csv_auto('calendar_dates.txt');

CREATE TABLE shapes AS
SELECT * FROM read_csv_auto('shapes.txt');

CREATE TABLE feed_info AS
SELECT * FROM read_csv_auto('feed_info.txt');