import os
import urllib.request
import zipfile
import io
import math
import pandas as pd
from datetime import datetime, timedelta, timezone

class GTFSStaticRepository:
    """
    Handles downloading and loading the static GTFS files (stops, trips, etc) into memory.
    """
    def __init__(self, data_path, gtfs_url):
        self.data_path = data_path
        self.gtfs_url = gtfs_url
        self.stops = {}
        self.trips = {}
        self.routes = {}
        self.stop_times_df = None
        self.stops_df = None

    def initialize(self):
        self._ensure_data_exists()
        self._load_data()

    def _ensure_data_exists(self):
        """Checks if we have the GTFS zip downloaded/extracted. If not, grabs it."""
        if not os.path.exists(self.data_path):
            os.makedirs(self.data_path)
            print(f"Created directory: {self.data_path}")

        required_files = ['stops.txt', 'trips.txt', 'routes.txt', 'stop_times.txt']
        missing_files = [f for f in required_files if not os.path.exists(os.path.join(self.data_path, f))]
        
        if missing_files:
            print(f"Downloading GTFS data from {self.gtfs_url}...")
            try:
                with urllib.request.urlopen(self.gtfs_url) as response:
                    zip_content = response.read()
                    
                print("Download complete. Extracting...")
                with zipfile.ZipFile(io.BytesIO(zip_content)) as zip_ref:
                    zip_ref.extractall(self.data_path)
                    
                print(f"Successfully extracted GTFS data to {self.data_path}")
            except Exception as e:
                print(f"Error downloading data: {e}")
                raise

    def _load_data(self):
        print("Loading static GTFS data...")
        try:
            # Load the CSVs into Pandas. We force IDs to strings because Kinesis sends them as strings, and we need them to match.
            self.stops_df = pd.read_csv(
                f"{self.data_path}/stops.txt", 
                usecols=['stop_id', 'stop_name', 'stop_lat', 'stop_lon'],
                dtype={'stop_id': str}
            )
            
            trips_df = pd.read_csv(
                f"{self.data_path}/trips.txt", 
                usecols=['trip_id', 'route_id', 'trip_headsign'],
                dtype={'trip_id': str, 'route_id': str}
            )
            
            routes_df = pd.read_csv(
                f"{self.data_path}/routes.txt", 
                usecols=['route_id', 'route_short_name'],
                dtype={'route_id': str}
            )
            
            # Load stop_times
            # We sort by trip_id and stop_sequence to make lookups easier later
            self.stop_times_df = pd.read_csv(
                f"{self.data_path}/stop_times.txt", 
                usecols=['trip_id', 'stop_id', 'stop_sequence', 'arrival_time'],
                dtype={'trip_id': str, 'stop_id': str}
            ).sort_values(['trip_id', 'stop_sequence'])

            # Create optimized lookups
            self.stops = self.stops_df.set_index('stop_id').to_dict('index')
            self.trips = trips_df.set_index('trip_id').to_dict('index')
            self.routes = routes_df.set_index('route_id').to_dict('index')
            
            print("Static GTFS data loaded successfully.")
        except Exception as e:
            print(f"CRITICAL ERROR: Could not load static GTFS data: {e}")
            
    def get_trip(self, trip_id):
        return self.trips.get(trip_id)

    def get_route(self, route_id):
        return self.routes.get(route_id)

    def get_stop(self, stop_id):
        return self.stops.get(stop_id)

    def get_stop_times_for_trip(self, trip_id):
        """Returns the stop_times rows for a specific trip."""
        if self.stop_times_df is None:
            return pd.DataFrame()
        return self.stop_times_df[self.stop_times_df['trip_id'] == trip_id]


class TripEstimator:
    """
    Matches real-time vehicle positions to the static schedule to figure out if they're late.
    """
    def __init__(self, repository):
        self.repo = repository

    def enrich_vehicle_data(self, vehicle_list):
        enriched = []
        now = datetime.now(timezone.utc)
        
        for v in vehicle_list:
            enriched_v = self._process_single_vehicle(v, now)
            enriched.append(enriched_v)
        return enriched

    def _process_single_vehicle(self, v, now):
        # 1. Basic Data
        trip_id = v.get('trip_id')
        lat = v.get('lat')
        lon = v.get('lon')
        
        # 2. Static Joins (Route/Headsign)
        if trip_id:
            trip = self.repo.get_trip(trip_id)
            if trip:
                v['headsign'] = trip.get('trip_headsign')
                v['route_id'] = trip.get('route_id')
                
                route = self.repo.get_route(v['route_id'])
                if route:
                    v['route_short_name'] = route.get('route_short_name')

        # 3. Estimation Logic (The "Matcher")
        if trip_id and lat and lon:
            self._estimate_status(v, trip_id, lat, lon, now)
            
        return v

    def _estimate_status(self, v, trip_id, lat, lon, now):
        # Get all stops for this trip
        trip_stops = self.repo.get_stop_times_for_trip(trip_id)
        
        if trip_stops.empty:
            v['on_time_status'] = 'UNKNOWN'
            return

        # Core logic: find where the bus is, find the closest stop, and compare times.
        closest_stop = None
        min_dist = float('inf')
        
        for _, row in trip_stops.iterrows():
            stop_id = str(row['stop_id']) # Ensure string
            stop_info = self.repo.get_stop(stop_id)
            
            if not stop_info:
                continue
                
            dist = self._haversine_distance(lat, lon, stop_info['stop_lat'], stop_info['stop_lon'])
            
            if dist < min_dist:
                min_dist = dist
                closest_stop = {
                    'stop_name': stop_info['stop_name'],
                    'arrival_time': row['arrival_time'],
                    'stop_sequence': row['stop_sequence'],
                    'distance': dist
                }

        if closest_stop:
            v['next_stop_name'] = closest_stop['stop_name']
            
            scheduled_time_str = closest_stop['arrival_time']
            delay_seconds = self._calculate_delay(scheduled_time_str, now)
            
            v['delay_seconds'] = delay_seconds
            
            if delay_seconds is not None:
                if delay_seconds > 300: # > 5 mins late
                    v['on_time_status'] = 'LATE'
                elif delay_seconds < -120: # > 2 mins early
                    v['on_time_status'] = 'EARLY'
                else:
                    v['on_time_status'] = 'ON_TIME'
            
            # Calculate Estimated Arrival Time
            try:
                h, m, s = map(int, scheduled_time_str.split(':'))
                days_offset = 0
                if h >= 24:
                    h -= 24
                    days_offset = 1
                
                now_mountain = now - timedelta(hours=7)
                scheduled_dt = now_mountain.replace(
                    hour=h, minute=m, second=s, microsecond=0
                ) + timedelta(days=days_offset)
                
                estimated_dt = scheduled_dt + timedelta(seconds=delay_seconds)
                
                # Convert back to UTC for the frontend
                estimated_dt_utc = estimated_dt + timedelta(hours=7)
                v['estimated_arrival'] = estimated_dt_utc.isoformat()
            except Exception:
                v['estimated_arrival'] = None

    def _calculate_delay(self, scheduled_time_str, now_utc):
        try:
            # GTFS time can be 25:00:00. Handle hours >= 24
            h, m, s = map(int, scheduled_time_str.split(':'))
            days_offset = 0
            if h >= 24:
                h -= 24
                days_offset = 1
            
            # Convert UTC now to Mountain Time (approx UTC-7)
            now_mountain = now_utc - timedelta(hours=7)
            
            scheduled_dt = now_mountain.replace(
                hour=h, minute=m, second=s, microsecond=0
            ) + timedelta(days=days_offset)
            
            # If the scheduled time is very far from now (e.g. > 12 hours), 
            # we might be comparing against the wrong day.
            diff = (now_mountain - scheduled_dt).total_seconds()
            
            if abs(diff) > 43200: # 12 hours
                return 0
                
            return int(diff) # Positive = Late, Negative = Early
            
        except Exception:
            return 0

    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        # Simple distance approximation
        R = 6371000 # meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)
        
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2) * math.sin(dlambda/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
