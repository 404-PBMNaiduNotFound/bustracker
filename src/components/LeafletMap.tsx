import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { Stop } from "../types";

interface LeafletMapProps {
  currentStopLat: number;
  currentStopLng: number;
  currentStopName: string;
  activeStudentCount: number;
  activeRouteStops: Stop[];
  activeBusNumber?: string;
  userLat?: number | null;
  userLng?: number | null;
  isUserOnboard?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  currentStopLat,
  currentStopLng,
  currentStopName,
  activeStudentCount,
  activeRouteStops,
  activeBusNumber = "38Y",
  userLat,
  userLng,
  isUserOnboard = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const stopMarkersLayerRef = useRef<L.LayerGroup | null>(null);
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

      // Layer groups
      stopMarkersLayerRef.current = L.layerGroup().addTo(map);
      studentClusterGroupRef.current = L.layerGroup().addTo(map);

      // Primary Bus Marker
      const busIconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-10 h-10 rounded-full bg-indigo-500/30 animate-ping absolute"></div>
          <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-400 border-2 border-white flex items-center justify-center shadow-2xl shadow-indigo-500/80 text-white font-extrabold text-[10px]">
            ${activeBusNumber}
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

      // User Location Marker
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

      const uLat = userLat || currentStopLat + 0.002;
      const uLng = userLng || currentStopLng + 0.002;

      userMarkerRef.current = L.marker([uLat, uLng], { icon: userIcon }).addTo(map);
    }
  }, []);

  // Update Route Polyline & Stop Markers whenever activeRouteStops changes!
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old route polyline & stop markers
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    if (stopMarkersLayerRef.current) {
      stopMarkersLayerRef.current.clearLayers();
    }

    // 1. Filter coordinates for active route stops in exact order
    const routeCoords: [number, number][] = activeRouteStops
      .filter((s) => s.lat && s.lng)
      .map((s) => [s.lat, s.lng]);

    if (routeCoords.length > 1) {
      routePolylineRef.current = L.polyline(routeCoords, {
        color: "#6C3FF5",
        weight: 5,
        opacity: 0.9,
        dashArray: "6, 10",
      }).addTo(mapRef.current);

      // Smoothly fit map view to the exact active route polyline bounds
      mapRef.current.fitBounds(routePolylineRef.current.getBounds(), {
        padding: [30, 30],
        maxZoom: 14,
      });
    }

    // 2. Render Stop Markers ONLY for the active route
    activeRouteStops.forEach((stop, index) => {
      const isDestination = stop.isDestination || index === activeRouteStops.length - 1;
      const isOrigin = index === 0;

      const iconHtml = isDestination
        ? `<div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/50 animate-pulse">🎓</div>`
        : isOrigin
        ? `<div class="w-6 h-6 rounded-full bg-indigo-600 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md">🚩</div>`
        : `<div class="w-4 h-4 rounded-full bg-indigo-400 border-2 border-slate-900 shadow-md"></div>`;

      const stopIcon = L.divIcon({
        html: iconHtml,
        className: "custom-stop-marker",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (stopMarkersLayerRef.current) {
        const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon }).addTo(
          stopMarkersLayerRef.current
        );
        marker.bindPopup(
          `<div class="text-xs font-sans font-bold text-slate-900 p-1">📍 Stop ${index + 1}: ${stop.name}<br/><span class="text-[10px] text-slate-600">${stop.address || "Duvvada Corridor"}</span></div>`
        );
      }
    });
  }, [activeRouteStops]);

  // Update Bus & User Markers dynamically
  useEffect(() => {
    if (busMarkerRef.current && mapRef.current && currentStopLat && currentStopLng) {
      const busLatLng: [number, number] = [currentStopLat, currentStopLng];
      busMarkerRef.current.setLatLng(busLatLng);

      if (isUserOnboard) {
        busMarkerRef.current.setPopupContent(
          `<div class="text-xs font-bold text-indigo-950 p-1">🚌 YOU ARE ON BOARD BUS ${activeBusNumber}<br/><span class="text-[10px] text-indigo-700 font-semibold">Location: ${currentStopName}</span><br/><span class="text-[10px] text-emerald-600 font-extrabold">${activeStudentCount} students onboard</span></div>`
        );
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(busLatLng);
          userMarkerRef.current.setPopupContent(
            `<div class="text-xs font-bold text-emerald-900 p-1">🚌 You are inside Bus ${activeBusNumber}</div>`
          );
        }
      } else {
        busMarkerRef.current.setPopupContent(
          `<div class="text-xs font-bold text-indigo-950 p-1">🚌 Bus ${activeBusNumber} Cluster<br/><span class="text-[10px] text-indigo-700 font-semibold">Current Stop: ${currentStopName}</span><br/><span class="text-[10px] text-emerald-600 font-extrabold">${activeStudentCount} active student signals</span></div>`
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
  }, [currentStopLat, currentStopLng, currentStopName, activeStudentCount, userLat, userLng, isUserOnboard, activeBusNumber]);

  return (
    <div className="relative w-full h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden border border-indigo-500/40 shadow-xl">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute top-2 left-2 z-10 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-xl border border-indigo-500/30 text-[10px] font-extrabold text-indigo-300 flex items-center gap-1.5 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>
          {isUserOnboard ? `🚌 Bus ${activeBusNumber} Onboard Radar` : `🚏 Bus ${activeBusNumber} Route Radar`}
        </span>
      </div>
    </div>
  );
};
