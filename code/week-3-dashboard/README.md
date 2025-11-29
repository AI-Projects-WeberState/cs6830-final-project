# Week 3 – Real-Time Dashboard (Frontend)

This folder contains the React + Vite dashboard for the CS6830 Final Project (Week 3).  
The dashboard displays real-time UTA vehicle information including:

- Route & direction (headsign)  
- Next stop  
- Estimated arrival time (ETA)  
- Delay / on-time performance  
- Last update timestamp  
- **Interactive map view with directional, animated vehicle markers**  
- **Sortable table view**

The dashboard is designed to work with any backend that exposes the `/api/vehicles` endpoint following the agreed JSON contract.

---

## Features

### **1. Two Main Views**

#### **Table View**
- Sorted by delay (late vehicles appear first)
- Clean rider-friendly format
- ETA displayed as:
  - `11:05 AM (in 3 min)`
  - `11:12 AM (2 min ago)`
- Color-coded status indicators:
  - **ON_TIME** – green  
  - **LATE** – red  
  - **EARLY** – blue  

#### **Map View**
- Built using **react-leaflet**
- Vehicles displayed as **directional arrow markers**
- Arrows rotate based on heading/bearing
- Marker color reflects on-time status
- Smooth animation when vehicle positions update
- Popup with route info, next stop, ETA, last update

---

## Folder Structure
week-3-dashboard/
├── public/
├── src/
│ ├── App.jsx
│ ├── App.css
│ ├── VehicleMap.jsx
│ ├── config.js
│ ├── main.jsx
│ ├── index.css
│ └── assets/
├── package.json
├── vite.config.js
└── README.md

## Running the Dashboard (Local Development)
From inside week-3-dashboard: npm install
Start the development server: npm run dev

Backend Endpoint
The dashboard expects data from:
http://localhost:5000/api/vehicles

Configured in: src/config.js