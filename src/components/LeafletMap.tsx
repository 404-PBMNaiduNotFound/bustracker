import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Stop } from "../types";

interface LeafletMapProps {
  currentStopLat: number;
  currentStopLng: number;
  currentStopName: string;
  activeStudentCount: number;
  stops: Stop[];
  userLat?: number | null;
  userLng?: number | null;
  isUserOnboard?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  currentStopLat,
  currentStopLng,
  currentStopName,
  activeStudentCount,
  stops,
  userLat,
  userLng,
  isUserOnboard = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const studentClusterGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentStopLat || 17.6745, currentStopLng || 83.1850],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      // CartoDB Dark Matter tile layer
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: "abcd",
        }
      ).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);
      mapRef.current = map;

      // Render Polyline for Duvvada corridor (NH-16 / Station Road)
      const routeCoords: [number, number][] = stops
        .filter((s) => s.lat && s.lng)
        .map((s) => [s.lat, s.lng]);

      if (routeCoords.length > 1) {
        L.polyline(routeCoords, {
          color: "#6C3FF5",
          weight: 5,
          opacity: 0.85,
          dashArray: "6, 10",
        }).addTo(map);
      }

      // Render Stop Markers
      stops.forEach((stop) => {
        const isDestination = stop.isDestination;
        const iconHtml = isDestination
          ? `<div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/50 animate-pulse">🎓</div>`
          : `<div class="w-4 h-4 rounded-full bg-indigo-500 border-2 border-slate-900 shadow-md"></div>`;

        const stopIcon = L.divIcon({
          html: iconHtml,
          className: "custom-stop-marker",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(map);
        marker.bindPopup(
          `<div class="text-xs font-sans font-bold text-slate-900 p-1">📍 ${stop.name}<br/><span class="text-[10px] text-slate-600">${stop.address || "Duvvada Corridor"}</span></div>`
        );
      });

      studentClusterGroupRef.current = L.layerGroup().addTo(map);

      // Primary Bus Marker
      const busIconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-10 h-10 rounded-full bg-indigo-500/30 animate-ping absolute"></div>
          <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 border-2 border-white flex items-center justify-center shadow-2xl shadow-indigo-500/80 text-white font-extrabold text-[10px]">
            38Y
          </div>
        </div>
      `;
      const busIcon = L.divIcon({
        html: busIconHtml,
        className: "custom-bus-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      busMarkerRef.current = L.marker([currentStopLat, currentStopLng], {
        icon: busIcon,
      }).addTo(map);

      // Separate User Location Marker if user is waiting at stop
      const userIconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-6 h-6 rounded-full bg-amber-400 border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold shadow-lg text-slate-950">
            📍
          </div>
        </div>
      `;
      const userIcon = L.divIcon({
        html: userIconHtml,
        className: "custom-user-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const initialUserLat = userLat || currentStopLat + 0.002;
      const initialUserLng = userLng || currentStopLng + 0.002;

      userMarkerRef.current = L.marker([initialUserLat, initialUserLng], {
        icon: userIcon,
      }).addTo(map);

      userMarkerRef.current.bindPopup(
        `<div class="text-xs font-bold text-amber-900 p-1">📍 Your Location<br/><span class="text-[10px] text-slate-700">Waiting at Stop</span></div>`
      );
    }
  }, [stops]);

  // Update Bus & User Markers dynamically
  useEffect(() => {
    if (busMarkerRef.current && mapRef.current && currentStopLat && currentStopLng) {
      const busLatLng: [number, number] = [currentStopLat, currentStopLng];
      busMarkerRef.current.setLatLng(busLatLng);
      mapRef.current.panTo(busLatLng, { animate: true, duration: 1.2 });

      if (isUserOnboard) {
        busMarkerRef.current.setPopupContent(
          `<div class="text-xs font-bold text-indigo-950 p-1">🚌 YOU ARE ON BOARD BUS 38Y<br/><span class="text-[10px] text-indigo-700 font-semibold">Location: ${currentStopName}</span><br/><span class="text-[10px] text-emerald-600 font-extrabold">${activeStudentCount} students travelling with you</span></div>`
        );
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(busLatLng);
          userMarkerRef.current.setPopupContent(
            `<div class="text-xs font-bold text-emerald-900 p-1">🚌 You are inside Bus 38Y</div>`
          );
        }
      } else {
        busMarkerRef.current.setPopupContent(
          `<div class="text-xs font-bold text-indigo-950 p-1">🚌 Bus 38Y Cluster<br/><span class="text-[10px] text-indigo-700 font-semibold">Nearest Stop: ${currentStopName}</span><br/><span class="text-[10px] text-emerald-600 font-extrabold">${activeStudentCount} active student signals</span></div>`
        );
        if (userMarkerRef.current) {
          const uLat = userLat || currentStopLat + 0.002;
          const uLng = userLng || currentStopLng + 0.002;
          userMarkerRef.current.setLatLng([uLat, uLng]);
          userMarkerRef.current.setPopupContent(
            `<div class="text-xs font-bold text-amber-900 p-1">🚏 You are Waiting at ${currentStopName} Stop</div>`
          );
        }
      }

      // Render student density cluster dots
      if (studentClusterGroupRef.current) {
        studentClusterGroupRef.current.clearLayers();
        const renderCount = Math.min(activeStudentCount, 15);
        for (let i = 0; i < renderCount; i++) {
          const offsetLat = (Math.random() - 0.5) * 0.0035;
          const offsetLng = (Math.random() - 0.5) * 0.0035;
          const studentDotIcon = L.divIcon({
            html: `<div class="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900 shadow"></div>`,
            className: "student-dot",
            iconSize: [10, 10],
            iconAnchor: [5, 5],
          });
          L.marker([currentStopLat + offsetLat, currentStopLng + offsetLng], {
            icon: studentDotIcon,
          }).addTo(studentClusterGroupRef.current);
        }
      }
    }
  }, [currentStopLat, currentStopLng, currentStopName, activeStudentCount, userLat, userLng, isUserOnboard]);

  return (
    <div className="relative w-full h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden border border-indigo-500/40 shadow-xl">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute top-2 left-2 z-10 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-xl border border-indigo-500/30 text-[10px] font-extrabold text-indigo-300 flex items-center gap-1.5 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>
          {isUserOnboard ? "🚌 On Board Bus 38Y Radar" : "🚏 User at Stop Radar"}
        </span>
      </div>
    </div>
  );
};
