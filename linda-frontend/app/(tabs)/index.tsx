import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import MapView, { UrlTile, Polygon, Marker } from 'react-native-maps';
import { WebView } from 'react-native-webview';

type Layer = 'satellite' | 'ndvi' | 'terrain';
type Point = { latitude: number; longitude: number };

interface AlertData {
  meanNdvi: number;
  threatsDetected: boolean;
  severity: string;
  recommendation: string;
}

interface SensorData {
  latitude: number;
  longitude: number;
  temp: number;
  humidity: number;
  status: string;
}

const BACKEND_URL = 'http://192.168.0.101:3000'; // Update with your backend URL

export default function ForestMonitorApp() {
  const [activeLayer, setActiveLayer] = useState<Layer>('satellite');
  const [sourceInfo, setSourceInfo] = useState<string>('Loading LindaMisitu data...');
  const [loading, setLoading] = useState<boolean>(true);
  const [tilesLoading, setTilesLoading] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<AlertData | null>(null);
  const [deforestPoints, setDeforestPoints] = useState<Point[]>([]);
  const [showGEE, setShowGEE] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [satelliteImage, setSatelliteImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Your LindaMisitu GEE app
  const LINDA_MISITU_LINK = 'https://code.earthengine.google.com/9a26c78dd3f6cf8622b8e531b8b08698';

  // Eastern Mau polygon coordinates
  const EASTERN_MAU_POLYGON = [
    { latitude: -0.25, longitude: 35.6667 },
    { latitude: -0.25, longitude: 36.1667 },
    { latitude: -0.6667, longitude: 36.1667 },
    { latitude: -0.6667, longitude: 35.6667 },
    { latitude: -0.25, longitude: 35.6667 },
  ];

  // Mock IoT sensors for ground-truth validation
  const iotSensors: SensorData[] = [
    { latitude: -0.38, longitude: 35.82, temp: 18.4, humidity: 72, status: 'normal' },
    { latitude: -0.52, longitude: 35.95, temp: 24.1, humidity: 41, status: 'high fire risk' },
    { latitude: -0.45, longitude: 36.05, temp: 16.8, humidity: 88, status: 'normal' },
  ];

  // Generate dynamic tile URL based on layer
  const getTileUrl = (): string => {
    if (activeLayer === 'terrain') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
    }
    if (activeLayer === 'ndvi') {
      return 'https://sentinel.arcgis.com/arcgis/rest/services/Sentinel2/ImageServer/tile/{z}/{y}/{x}';
    }
    return 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.png';
  };

  // Fetch satellite image from backend
  const fetchSatelliteImage = async () => {
    try {
      setImageLoading(true);
      const imageType = activeLayer === 'ndvi' ? 'ndvi-colored' : activeLayer === 'satellite' ? 'rgb' : 'rgb';
      const toDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      const response = await fetch(`${BACKEND_URL}/api/satellite/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageType: imageType,
          region: 'eastern_mau',
          fromDate: fromDate.toISOString().split('T')[0],
          toDate: toDate.toISOString().split('T')[0],
          width: 512,
          height: 512,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setSatelliteImage(reader.result as string);
      };
      reader.readAsDataURL(blob);

      setSourceInfo(`${imageType.toUpperCase()} imagery from ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Error fetching satellite image:', error);
      setSourceInfo('Failed to fetch satellite image. Using fallback tiles.');
    } finally {
      setImageLoading(false);
    }
  };

  // Fetch deforestation alerts and hotspots
  const checkDeforestationAlerts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/satellite/deforestation-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          region: 'eastern_mau',
          ndviThreshold: 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      setAlerts(data);

      if (data.threatsDetected) {
        Alert.alert(
          '🌲 LindaMisitu Critical Alert!',
          `NDVI: ${data.meanNdvi}\nSeverity: ${data.severity}\n\n${data.recommendation}`,
          [
            {
              text: 'View Details',
              onPress: () => setShowStats(true),
            },
            { text: 'OK' },
          ]
        );
      }

      // Simulate deforestation points based on alert severity
      if (data.threatsDetected) {
        setDeforestPoints([
          { latitude: -0.35, longitude: 35.85 },
          { latitude: -0.48, longitude: 36.02 },
          { latitude: -0.42, longitude: 35.88 },
        ]);
      } else {
        setDeforestPoints([]);
      }
    } catch (error) {
      console.error('Error checking alerts:', error);
      Alert.alert('Error', 'Failed to fetch deforestation alerts');
    }
  };

  
  const loadData = async () => {
    try {
      setLoading(true);
      await checkDeforestationAlerts();
      await fetchSatelliteImage();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Initial load on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Reload image when layer changes
  useEffect(() => {
    fetchSatelliteImage();
  }, [activeLayer]);

  const getLayerDescription = (): string => {
    switch (activeLayer) {
      case 'ndvi':
        return 'NDVI (Normalized Difference Vegetation Index) shows forest health. Red = threats (low vegetation). Green = healthy forest. Powered by Sentinel-2 satellite data.';
      case 'terrain':
        return 'Terrain/Topography view shows elevation and landform context for understanding erosion risks and landscape changes.';
      default:
        return 'True-color satellite imagery for visual inspection and direct change detection in Eastern Mau Forest.';
    }
  };

  const switchLayer = (layer: Layer) => {
    setTilesLoading(true);
    setActiveLayer(layer);
    setTimeout(() => setTilesLoading(false), 1500);
  };

  {/*const reportThreat = () => {
    Alert.alert(
      'Threat Report',
      'Submit anonymous ground-truth observation?',
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Report',
          onPress: () => {
            Alert.alert('Submitted', 'Your observation has been recorded and validated against satellite data.', [
              { text: 'OK' },
            ]);
          },
        },
      ]
    );
  }; */}

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: -0.4583,
          longitude: 35.9167,
          latitudeDelta: 0.55,
          longitudeDelta: 0.55,
        }}
        mapType="none"
        minZoomLevel={6}
        maxZoomLevel={18}
      >
        {/* Dynamic tile layer */}
        <UrlTile urlTemplate={getTileUrl()} zIndex={1} tileSize={256} />

        {/* Eastern Mau forest boundary */}
        <Polygon
          coordinates={EASTERN_MAU_POLYGON}
          strokeColor="#00ff00"
          fillColor="rgba(0,255,0,0.2)"
          strokeWidth={4}
        />

        {/* Deforestation hotspots */}
        {activeLayer === 'ndvi' &&
          deforestPoints.map((p, i) => (
            <Marker
              key={`deforest-${i}`}
              coordinate={p}
              pinColor="red"
              title="Deforestation Hotspot"
              description={`NDVI < 0.2 – Threat detected by LindaMisitu`}
            />
          ))}

        {/* IoT Sensors */}
        {iotSensors.map((s, i) => (
          <Marker
            key={`iot-${i}`}
            coordinate={{ latitude: s.latitude, longitude: s.longitude }}
            pinColor={s.status === 'high fire risk' ? 'orange' : 'blue'}
            title={`IoT Sensor ${i + 1}`}
            description={`Temp: ${s.temp}°C | Humidity: ${s.humidity}%`}
          />
        ))}
      </MapView>

      {/* Loading overlay */}
      {(tilesLoading || imageLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>
            Loading {activeLayer.toUpperCase()}...
          </Text>
        </View>
      )}

      {/* Main overlay with controls */}
      <ScrollView
        style={styles.overlay}
        scrollEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>🌳 Eastern Mau Forest Watch</Text>
        <Text style={styles.subtitle}>LindaMisitu Monitoring System</Text>

        {/* Layer selection buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.btn, activeLayer === 'satellite' && styles.active]}
            onPress={() => switchLayer('satellite')}
          >
            <Text style={[styles.btnText, activeLayer === 'satellite' && styles.activeText]}>
              Satellite
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, activeLayer === 'ndvi' && styles.active]}
            onPress={() => switchLayer('ndvi')}
          >
            <Text style={[styles.btnText, activeLayer === 'ndvi' && styles.activeText]}>
              NDVI Health
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, activeLayer === 'terrain' && styles.active]}
            onPress={() => switchLayer('terrain')}
          >
            <Text style={[styles.btnText, activeLayer === 'terrain' && styles.activeText]}>
              Terrain
            </Text>
          </TouchableOpacity>
        </View>

        {/* Refresh button */}
        <TouchableOpacity
          style={[styles.refresh, loading && styles.disabled]}
          onPress={loadData}
          disabled={loading}
        >
          <Text style={styles.refreshText}>
            {loading ? ' Analyzing...' : 'Refresh & Check Alerts'}
          </Text>
        </TouchableOpacity>

        {/* Alert status panel 
        {alerts && (
          <View
            style={[
              styles.alertPanel,
              alerts.threatsDetected ? styles.alertPanelWarning : styles.alertPanelSafe,
            ]}
          >
            <Text style={styles.alertTitle}>
              {alerts.threatsDetected ? ' THREAT DETECTED' : '✓ FOREST HEALTHY'}
            </Text>
            <Text style={styles.alertText}>NDVI: {alerts.meanNdvi}</Text>
            <Text style={styles.alertText}>Severity: {alerts.severity}</Text>
            <Text style={styles.alertRecommendation}>{alerts.recommendation}</Text>
          </View>
        )}*/}

        {/* GEE Dashboard button */}
        <TouchableOpacity style={styles.geeBtn} onPress={() => setShowGEE(true)}>
          <Text style={styles.geeText}>Open GEE Dashboard</Text>
        </TouchableOpacity>


        {/* Layer information
        <View style={styles.info}>
          <Text style={styles.desc}>{getLayerDescription()}</Text>
          <Text style={styles.source}>{sourceInfo}</Text>
        </View>
         */}
        {/* Sensor status 
        <View style={styles.sensorPanel}>
          <Text style={styles.panelTitle}>IoT Sensors ({iotSensors.length})</Text>
          {iotSensors.map((sensor, idx) => (
            <View key={idx} style={styles.sensorItem}>
              <Text style={styles.sensorStatus}>
                Sensor {idx + 1}: {sensor.status === 'high fire risk' ? '🔴' : '🟢'} {sensor.status}
              </Text>
              <Text style={styles.sensorDetails}>
                Temp: {sensor.temp}°C | Humidity: {sensor.humidity}%
              </Text>
            </View>
          ))}
        </View>*/}

        {/* Stats modal trigger */}
        {alerts && (
          <TouchableOpacity style={styles.statsBtn} onPress={() => setShowStats(true)}>
            <Text style={styles.statsBtnText}>📊 View Detailed Stats</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* GEE Dashboard Modal */}
      <Modal visible={showGEE} animationType="slide" onRequestClose={() => setShowGEE(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>LindaMisitu GEE Dashboard</Text>
          <TouchableOpacity onPress={() => setShowGEE(false)}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <WebView source={{ uri: LINDA_MISITU_LINK }} style={{ flex: 1 }} />
      </Modal>

      {/* Statistics Modal */}
      <Modal visible={showStats} animationType="fade" transparent onRequestClose={() => setShowStats(false)}>
        <View style={styles.statsModalOverlay}>
          <View style={styles.statsModal}>
            <Text style={styles.statsTitle}>Forest Health Statistics</Text>

            {alerts && (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Mean NDVI:</Text>
                  <Text style={styles.statValue}>{alerts.meanNdvi}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Status:</Text>
                  <Text style={[styles.statValue, { color: alerts.threatsDetected ? '#ff5252' : '#4caf50' }]}>
                    {alerts.severity}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Assessment:</Text>
                  <Text style={styles.statDescription}>{alerts.recommendation}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Region:</Text>
                  <Text style={styles.statValue}>Eastern Mau Forest</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Data Source:</Text>
                  <Text style={styles.statValue}>Sentinel-2 L2A</Text>
                </View>
              </>
            )}

            <TouchableOpacity style={styles.statsCloseBtn} onPress={() => setShowStats(false)}>
              <Text style={styles.statsCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingText: { marginTop: 10, color: '#fff', fontSize: 16, fontWeight: '600' },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    maxHeight: '60%',
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#4caf50', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 12, color: '#bbb', textAlign: 'center', marginBottom: 15 },
  buttons: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15, gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#4caf50',
    alignItems: 'center',
  },
  active: { backgroundColor: '#4caf50', borderColor: '#388e3c' },
  btnText: { fontWeight: 'bold', color: '#fff', fontSize: 11 },
  activeText: { color: '#121212' },
  refresh: {
    backgroundColor: '#4caf50',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabled: { opacity: 0.6 },
  refreshText: { color: '#121212', fontWeight: 'bold', fontSize: 16 },
  alertPanel: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  alertPanelWarning: { borderLeftColor: '#ff5252', backgroundColor: '#3e2723' },
  alertPanelSafe: { borderLeftColor: '#4caf50', backgroundColor: '#1b5e20' },
  alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  alertText: { fontSize: 12, color: '#bbb', marginBottom: 3 },
  alertRecommendation: { fontSize: 11, color: '#ffeb3b', marginTop: 5, fontStyle: 'italic' },
  geeBtn: { backgroundColor: '#2196f3', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  geeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  blockchainBtn: { backgroundColor: '#ff9800', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  blockchainText: { color: '#121212', fontWeight: 'bold', fontSize: 16 },
  info: { backgroundColor: '#333', padding: 12, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#4caf50', marginBottom: 15 },
  desc: { fontSize: 13, color: '#fff', marginBottom: 5 },
  source: { fontSize: 11, color: '#bbb', fontStyle: 'italic' },
  sensorPanel: { backgroundColor: '#333', padding: 12, borderRadius: 10, marginBottom: 15 },
  panelTitle: { fontSize: 13, fontWeight: 'bold', color: '#4caf50', marginBottom: 8 },
  sensorItem: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#555' },
  sensorStatus: { fontSize: 12, color: '#fff', fontWeight: '600' },
  sensorDetails: { fontSize: 11, color: '#bbb', marginTop: 3 },
  statsBtn: { backgroundColor: '#2196f3', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  statsBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  statsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statsModal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#4caf50',
    maxWidth: '90%',
  },
  statsTitle: { fontSize: 20, fontWeight: 'bold', color: '#4caf50', marginBottom: 15 },
  statRow: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  statLabel: { fontSize: 12, color: '#bbb', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  statDescription: { fontSize: 12, color: '#ffeb3b' },
  statsCloseBtn: { backgroundColor: '#4caf50', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  statsCloseBtnText: { color: '#121212', fontWeight: 'bold', fontSize: 14 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#4caf50',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#4caf50' },
  closeBtn: { fontSize: 28, color: '#fff', fontWeight: 'bold' },
});