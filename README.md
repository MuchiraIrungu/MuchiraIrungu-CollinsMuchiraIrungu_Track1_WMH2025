# LindaMisitu – Protect the Forests 🌳

**Real-time forest monitoring using satellite data, IoT sensors, and anonymous blockchain reporting.**  
Built for **Wangari Maathai Hackathon 2025 – Forest Protection Track**

---

## Live Demo Video
Watch the 2-minute demo: [Link will be added after upload]

---

## Key Features
- **Live Sentinel-2 NDVI monitoring** using public tiles + custom Google Earth Engine dashboard  
- **Deforestation hotspot detection** with red markers (NDVI < 0.2)  
- **Simulated IoT sensors** (temperature & humidity) for fire risk  
- **Fully anonymous reporting** powered by Hedera Consensus Service (testnet)  
- One-tap **“Back to Home”** after successful report  
- Dark-mode and culturally relevant Swahili-named UI  

---

## Tech Stack
- **Frontend / Mobile:** React Native + Expo, react-native-maps, react-native-webview  
- **Backend / API:** Node.js + Express  
- **Satellite Data:** Sentinel Hub API + Google Earth Engine (custom app: [GEE Dashboard](https://numeric-trilogy-445606-m8.projects.earthengine.app/view/lindamisitu))  
- **Blockchain Reporting:** Hedera Consensus Service (testnet)  
- **Public Tile Fallbacks:** EOX Sentinel-2 cloudless mosaic + ArcGIS NDVI layer  
- **Polygon Data:** Official Eastern Mau Forest boundaries (0°15′–0°40′S, 35°40′–36°10′E)  

---

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/lindamisitu.git
cd lindamisitu
```
Create a .env file in the backend folder and add your API keys or tokens, for example:

SENTINEL_HUB_TOKEN=your_sentinel_hub_api_token
PORT=3000

Frontend Setup
cd linda-frontend
npm install

Start Frontend
expo start


Scan the QR code using Expo Go on your phone.

4. Backend Setup
cd ../backend
npm install

Start Backend
node server.js
node try.js


Make sure the backend is running before using the frontend. It handles satellite data, IoT alerts, and blockchain reporting.

Project Structure
lindamisitu/
├── backend/          # Node.js API for satellite and IoT data
├── linda-frontend/   # React Native mobile app
├── README.md

Contribution

Fork the repository

Create a feature branch (git checkout -b feature-name)

Commit changes (git commit -m 'Add new feature')

Push to branch (git push origin feature-name)

Open a pull request

License

MIT License – Free to use for non-commercial hackathon projects

Acknowledgements

Wangari Maathai Hackathon 2025

Google Earth Engine

Sentinel Hub API

Hedera Consensus Service
