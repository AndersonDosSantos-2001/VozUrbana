import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Ícone vetorial customizado nas cores oficiais (Coral Cívico #EA580C + Borda Branca)
const iconePinoCoral = L.divIcon({
  className: 'voz-urbana-custom-pin',
  html: `
    <div style="
      width: 34px;
      height: 34px;
      background-color: #EA580C;
      border: 3px solid #FFFFFF;
      border-radius: 9999px 9999px 9999px 0;
      transform: rotate(-45deg);
      box-shadow: 0 6px 14px rgba(15, 23, 42, 0.38);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background-color: #FFFFFF;
        border-radius: 9999px;
      "></div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

function SincronizadorCentroMapa({ latitude, longitude }) {
  const map = useMap();

  useEffect(() => {
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      map.setView([latitude, longitude], map.getZoom(), { animate: true });
    }
  }, [latitude, longitude, map]);

  return null;
}

function CapturadorCliqueMapa({ interativo, aoSelecionarCoordenada }) {
  useMapEvents({
    click(e) {
      if (!interativo || !aoSelecionarCoordenada) return;
      const lat = Number(e.latlng.lat.toFixed(7));
      const lng = Number(e.latlng.lng.toFixed(7));
      aoSelecionarCoordenada(lat, lng);
    },
  });

  return null;
}

/**
 * Mini-mapa interativo Leaflet para confirmação visual ou ajuste manual do pino da denúncia.
 */
export function MapaSeletor({
  latitude,
  longitude,
  aoAlterarCoordenadas,
  interativo = true,
  alturaClasse = 'h-48',
}) {
  const markerRef = useRef(null);

  const latValida = Number.isFinite(Number(latitude)) ? Number(latitude) : -8.112345;
  const lngValida = Number.isFinite(Number(longitude)) ? Number(longitude) : -35.015432;

  const handlersMarcador = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker && aoAlterarCoordenadas) {
          const pos = marker.getLatLng();
          aoAlterarCoordenadas(
            Number(pos.lat.toFixed(7)),
            Number(pos.lng.toFixed(7))
          );
        }
      },
    }),
    [aoAlterarCoordenadas]
  );

  return (
    <div
      className={`w-full ${alturaClasse} rounded-xl overflow-hidden border border-superficie-borda relative z-10 shadow-2xs`}
    >
      <MapContainer
        center={[latValida, lngValida]}
        zoom={17}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SincronizadorCentroMapa latitude={latValida} longitude={lngValida} />

        <CapturadorCliqueMapa
          interativo={interativo}
          aoSelecionarCoordenada={aoAlterarCoordenadas}
        />

        <Marker
          draggable={interativo}
          eventHandlers={handlersMarcador}
          position={[latValida, lngValida]}
          ref={markerRef}
          icon={iconePinoCoral}
        />
      </MapContainer>
    </div>
  );
}

export default MapaSeletor;
