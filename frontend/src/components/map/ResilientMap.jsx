import { useEffect } from 'react'
import { MapContainer, TileLayer, Popup, Polyline, CircleMarker, LayerGroup, LayersControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const CENTERS = {
  hti: [18.9712, -72.2852],
  cod: [-4.0383, 21.7587],
}

const ZOOM = { hti: 8, cod: 6 }

const IPC_COLORS = { 1: '#a3e635', 2: '#fde68a', 3: '#fb923c', 4: '#ef4444', 5: '#7c3aed' }

function FlyTo({ center, zoom }) {
  const map = useMap()
  useEffect(() => { if (center) map.flyTo(center, zoom || 8, { duration: 1.5 }) }, [center])
  return null
}

function MapClickHandler({ onMapClick }) {
  const map = useMap()
  useEffect(() => {
    map.on('click', (e) => onMapClick(e.latlng))
    return () => map.off('click')
  }, [map, onMapClick])
  return null
}

export default function ResilientMap({
  country = 'hti',
  vendors = [],
  farmers = [],
  markets = [],
  places = [],
  hotspots = [],
  routeGeoJSON = null,
  onMapClick = null,
  routeSource = null,
  routeDest = null,
}) {
  const center = CENTERS[country] || CENTERS.hti
  const zoom   = ZOOM[country] || 8

  return (
    <MapContainer
      center={center} zoom={zoom}
      style={{ width: '100%', height: '100%', minHeight: 400 }}
      zoomControl
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <FlyTo center={center} zoom={zoom} />

      {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

      <LayersControl position="topright">
        {/* Vendors */}
        <LayersControl.Overlay name="Vendors (RootNet)" checked>
          <LayerGroup>
            {vendors.map((v, i) => (
              <CircleMarker key={i}
                center={[v.lat || v.location?.coordinates?.[1], v.lon || v.location?.coordinates?.[0]]}
                radius={8}
                pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.75, weight: 2 }}
              >
                <Popup>
                  <strong>{v.name}</strong>
                  {v.foodTypes?.length > 0 && <p>{v.foodTypes.join(', ')}</p>}
                  <p>Capacity: {v.dailyCapacityKg} kg/day</p>
                  {v.crisisActive && <p style={{ color: '#ef4444', fontWeight: 700 }}>● Crisis mode</p>}
                </Popup>
              </CircleMarker>
            ))}
          </LayerGroup>
        </LayersControl.Overlay>

        {/* Farmers */}
        <LayersControl.Overlay name="Farmers (SowSafe)" checked>
          <LayerGroup>
            {farmers.map((f, i) => (
              <CircleMarker key={i}
                center={[f.lat || f.location?.coordinates?.[1], f.lon || f.location?.coordinates?.[0]]}
                radius={7}
                pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.75, weight: 2 }}
              >
                <Popup>
                  <strong>{f.name}</strong>
                  <p>{f.cropType} — {f.pledgedKg} kg pledged</p>
                  <p>Season: {f.plantingSeason}</p>
                </Popup>
              </CircleMarker>
            ))}
          </LayerGroup>
        </LayersControl.Overlay>

        {/* Markets */}
        <LayersControl.Overlay name="Markets" checked>
          <LayerGroup>
            {markets.map((m, i) => (
              <CircleMarker key={i}
                center={[m.lat || m.location?.coordinates?.[1], m.lon || m.location?.coordinates?.[0]]}
                radius={10}
                pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.8, weight: 2 }}
              >
                <Popup>
                  <strong>{m.name || m.market}</strong>
                  <p>Market</p>
                  {m.priceVolatility > 0 && (
                    <p style={{ color: '#fb923c' }}>Price volatility: {Math.round(m.priceVolatility * 100)}%</p>
                  )}
                </Popup>
              </CircleMarker>
            ))}
          </LayerGroup>
        </LayersControl.Overlay>

        {/* Populated Places */}
        <LayersControl.Overlay name="Populated Places">
          <LayerGroup>
            {places.map((p, i) => {
              const isFlagged = p.flagged
              return (
                <CircleMarker key={i}
                  center={[p.lat || p.location?.coordinates?.[1], p.lon || p.location?.coordinates?.[0]]}
                  radius={isFlagged ? 9 : 5}
                  pathOptions={{
                    color: isFlagged ? '#ef4444' : '#94a3b8',
                    fillColor: isFlagged ? '#ef4444' : '#94a3b8',
                    fillOpacity: isFlagged ? 0.75 : 0.6,
                    weight: isFlagged ? 2 : 1,
                  }}
                >
                  <Popup>
                    <strong>{p.name}</strong>
                    {isFlagged && <p style={{ color: '#ef4444' }}>⚠ Underserved: {p.flagReason || p.reason}</p>}
                    {p.distanceToMarket && <p>{p.distanceToMarket} km to nearest market</p>}
                    {p.ipcPhase && <p style={{ color: IPC_COLORS[p.ipcPhase] }}>IPC Phase {p.ipcPhase}</p>}
                  </Popup>
                </CircleMarker>
              )
            })}
          </LayerGroup>
        </LayersControl.Overlay>

        {/* UN Hotspots */}
        <LayersControl.Overlay name="UN Hotspots" checked>
          <LayerGroup>
            {hotspots.map((h, i) => {
              const HOTSPOT_COLORS = { food: '#10b981', shelter: '#3b82f6', medical: '#ec4899', water: '#06b6d4', fuel: '#f59e0b' }
              const color = HOTSPOT_COLORS[h.category] || '#94a3b8'
              return (
                <CircleMarker key={i}
                  center={[h.lat, h.lon]}
                  radius={12}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 3 }}
                >
                  <Popup>
                    <strong>{h.name}</strong>
                    <p style={{ textTransform: 'capitalize' }}>{h.category} · {h.agency}</p>
                    <p>{h.inventory}</p>
                    <p>Capacity: {h.capacity}</p>
                    {h.isMock && <p style={{ color: '#f59e0b' }}>Sample data</p>}
                  </Popup>
                </CircleMarker>
              )
            })}
          </LayerGroup>
        </LayersControl.Overlay>
      </LayersControl>

      {/* Route overlay */}
      {routeGeoJSON?.coordinates?.length > 1 && (
        <Polyline
          positions={routeGeoJSON.coordinates.map(c => [c[1], c[0]])}
          pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.95, dashArray: '8 4' }}
        />
      )}

      {/* Route endpoints */}
      {routeSource && (
        <CircleMarker center={[routeSource.lat, routeSource.lon]} radius={10}
          pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 1, weight: 3 }}>
          <Popup><strong>Start</strong><p>{routeSource.label}</p></Popup>
        </CircleMarker>
      )}
      {routeDest && (
        <CircleMarker center={[routeDest.lat, routeDest.lon]} radius={10}
          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1, weight: 3 }}>
          <Popup><strong>End</strong><p>{routeDest.label}</p></Popup>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
