LindaMisitu – Full Technical Documentation 🌳

**Real-time Forest Monitoring & Community Protection Platform**  
Hackathon 2025 – Forest Protection Track

---

## 1. Satellite Data Sources & GIS Layers

| Layer                    | Source                                                                                 | Resolution | Update Frequency | Purpose                                  |
|--------------------------|----------------------------------------------------------------------------------------|------------|-----------------|------------------------------------------|
| True Color Satellite     | EOX Sentinel-2 Cloudless 2024                                                          | 10m        | Annual           | Visual reference                         |
| NDVI (Vegetation Health) | ArcGIS Living Atlas + Custom GEE processing                                            | 10m        | Monthly          | Deforestation & stress detection         |
| Official Forest Boundary | Eastern Mau Forest Reserve (0°15′–0°40′S, 35°40′–36°10′E) – Jaetzold et al., 2010     | Vector     | Static           | Accurate area of interest                |
| Interactive GEE Dashboard| [View Dashboard](https://numeric-trilogy-445606-m8.projects.earthengine.app/view/lindamisitu) | 10m        | Real-time        | Deep analysis & hotspot export           |

**GEE Script Logic (Public)**  
- Uses `COPERNICUS/S2_SR_HARMONIZED`  
- Filters: `<20% cloud`, last 60 days, median composite  
- NDVI = `(B8 - B4)/(B8 + B4)`  
- Red palette for NDVI < 0.2 → visible deforestation

---

## 2. IoT Sensor Simulation (Ground Truth)

```ts
const iotSensors = [
  { lat: -0.38, lon: 35.82, temp: 18.4, humidity: 72, status: "normal" },
  { lat: -0.52, lon: 35.95, temp: 24.1, humidity: 41, status: "high fire risk" },
  { lat: -0.45, lon: 36.05, temp: 16.8, humidity: 88, status: "normal" },
];
// Ready to replace with real LoRaWAN sensors in Phase 2
3. Anonymous Reporting Workflow (Blockchain)
User Flow:

User opens report modal → enters threat + coordinates → submits anonymously

POST → /api/reports/anonymous

Hedera Consensus Service (Testnet) returns transaction ID

User sees success screen → auto/manual return to home

Privacy Guarantee:

No IP logging

No device ID

No personal data stored

Immutable + timestamped on Hedera

Backend Endpoint (Node.js + Hedera SDK):

http

POST http://your-ip:3001/api/reports/anonymous

Creates temporary account → submits to HCS topic → returns transactionId

4. User Flow (Key Journey)
Open App

See live satellite + NDVI map

See red hotspots + orange fire risk sensors

Tap Report Threat

Fill form + pick location from map

Submit → Blockchain success

Auto/manual return to home

5. APIs & Endpoints
Purpose	URL / Source
Satellite Tiles (Public)	https://tiles.maps.eox.at/...
NDVI Tiles (Public)	ArcGIS Living Atlas (no key needed)
Blockchain Submit	POST http://[your-ip]:3001/api/reports/anonymous

6. Setup Instructions
1. Clone repository

git clone https://github.com/MuchiraIrungu/MuchiraIrungu-CollinsMuchiraIrungu_Track1_WMH2025.git
cd LindaMisitu

2. Install frontend
cd linda-frontend
npm install

3. Install backend
cd ../backend
npm install

4. Add .env file (backend)
MY_ACCOUNT_ID = 0.0.7158441
MY_PRIVATE_KEY = 302e020100300506032b657004220420a74c55ad501ac46d68395d278dea6e8e60177ce72cc4648da0cb823206c2e476

Replace with your actual Sentinel Hub API token.

5. Start servers
# Backend
node server.js
node try.js

# Frontend (Expo)
cd ../linda-frontend
npx expo start
# Scan QR code with Expo Go on your phone

7. References
Pitch deck: pitchdeck/LindaMisitu.pdf
Hackathon track: Wangari Maathai Hackathon 2025 – Localized forest watch and monitoring


