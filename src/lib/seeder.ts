import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Stop, Route, Bus } from "../types";

export const MASTER_STOPS: Stop[] = [
  { id: "stop_rtc", name: "RTC Complex", nameTelugu: "ఆర్టీసీ కాంప్లెక్స్", lat: 17.7275, lng: 83.3032, isIntermediate: false, isDestination: false, address: "Dwaraka Nagar, Visakhapatnam" },
  { id: "stop_gurudwara", name: "Gurudwara", nameTelugu: "గురుద్వారా", lat: 17.7320, lng: 83.2950, isIntermediate: true, isDestination: false, address: "Gurudwara Junction, Visakhapatnam" },
  { id: "stop_nad", name: "NAD Junction", nameTelugu: "ఎన్ఏడి జంక్షన్", lat: 17.7391, lng: 83.2372, isIntermediate: true, isDestination: false, address: "NAD Flyover Interchange, Visakhapatnam" },
  { id: "stop_bhpv", name: "BHPV", nameTelugu: "బిహెచ్పివి", lat: 17.7120, lng: 83.2280, isIntermediate: true, isDestination: false, address: "BHPV Junction, Visakhapatnam" },
  { id: "stop_gajuwaka", name: "Old Gajuwaka", nameTelugu: "ఓల్డ్ గాజువాక", lat: 17.6896, lng: 83.2185, isIntermediate: true, isDestination: false, address: "Gajuwaka Main Center, Visakhapatnam" },
  { id: "stop_kurmannapalem", name: "Kurmannapalem", nameTelugu: "కూర్మన్నపాలెం", lat: 17.6745, lng: 83.1850, isIntermediate: true, isDestination: false, address: "Kurmannapalem Bus Bay & Steel Plant Arch" },
  { id: "stop_duvvada", name: "Duvvada Railway Station", nameTelugu: "దువ్వాడ రైల్వే స్టేషన్", lat: 17.7025, lng: 83.1580, isIntermediate: true, isDestination: false, address: "Duvvada Station Road, Visakhapatnam" },
  { id: "stop_tagarapuvalasa", name: "Tagarapuvalasa", nameTelugu: "తగరపువలస", lat: 17.9300, lng: 83.4200, isIntermediate: false, isDestination: false, address: "Tagarapuvalasa Hub, Visakhapatnam" },
  { id: "stop_madhurawada", name: "Madhurawada", nameTelugu: "మధురవాడ", lat: 17.8200, lng: 83.3500, isIntermediate: true, isDestination: false, address: "Madhurawada IT SEZ Road, Visakhapatnam" },
  { id: "stop_zoopark", name: "Zoo Park", nameTelugu: "జూ పార్క్", lat: 17.7700, lng: 83.3400, isIntermediate: true, isDestination: false, address: "Indira Gandhi Zoological Park, Visakhapatnam" },
  { id: "stop_maddilapalem", name: "Maddilapalem", nameTelugu: "మద్దిలపాలెం", lat: 17.7400, lng: 83.3200, isIntermediate: true, isDestination: false, address: "Maddilapalem Bus Station, Visakhapatnam" },
  { id: "stop_scindia", name: "Scindia", nameTelugu: "సిందియా", lat: 17.6842, lng: 83.2798, isIntermediate: true, isDestination: false, address: "Scindia Junction, Visakhapatnam Port Area" },
  { id: "stop_sabbavaram", name: "Sabbavaram", nameTelugu: "సబ్బవరం", lat: 17.8000, lng: 83.1300, isIntermediate: true, isDestination: false, address: "Sabbavaram Junction, Visakhapatnam" },
  { id: "stop_chodavaram", name: "Chodavaram", nameTelugu: "చోడవరం", lat: 17.8300, lng: 82.9300, isIntermediate: false, isDestination: false, address: "Chodavaram Bus Stand" },
  { id: "stop_gopalapatnam", name: "Gopalapatnam", nameTelugu: "గోపాలపట్నం", lat: 17.7550, lng: 83.2200, isIntermediate: true, isDestination: false, address: "Gopalapatnam Petrol Bunk, Visakhapatnam" },
  { id: "stop_simhachalam", name: "Simhachalam", nameTelugu: "సింహాచలం", lat: 17.7663, lng: 83.2421, isIntermediate: false, isDestination: false, address: "Simhachalam Bus Stand, Visakhapatnam" },
  { id: "stop_vepagunta", name: "Vepagunta", nameTelugu: "వేపగుంట", lat: 17.7900, lng: 83.2100, isIntermediate: true, isDestination: false, address: "Vepagunta Junction, Visakhapatnam" },
  { id: "stop_pendurthi", name: "Pendurthi", nameTelugu: "పెందుర్తి", lat: 17.8300, lng: 83.2000, isIntermediate: false, isDestination: false, address: "Pendurthi Junction, Visakhapatnam" },
  { id: "stop_railwaystation", name: "Visakhapatnam Railway Station", nameTelugu: "విశాఖపట్నం రైల్వే స్టేషన్", lat: 17.7200, lng: 83.2900, isIntermediate: true, isDestination: false, address: "Main Railway Station Road, Visakhapatnam" },
  { id: "stop_malkapuram", name: "Malkapuram", nameTelugu: "మల్కాపురం", lat: 17.6950, lng: 83.2500, isIntermediate: true, isDestination: false, address: "Malkapuram Market, Visakhapatnam" },
  { id: "stop_parawada", name: "Parawada", nameTelugu: "పరవాడ", lat: 17.6100, lng: 83.1200, isIntermediate: true, isDestination: false, address: "Parawada Pharma City Junction" },
  { id: "stop_achyutapuram", name: "Achyutapuram", nameTelugu: "అచ్యుతాపురం", lat: 17.5700, lng: 83.0200, isIntermediate: true, isDestination: false, address: "Achyutapuram SEZ Junction" },
  { id: "stop_yelamanchili", name: "Yelamanchili", nameTelugu: "ఎలమంచిలి", lat: 17.5500, lng: 82.8600, isIntermediate: false, isDestination: false, address: "Yelamanchili Bus Stand" },
  { id: "stop_steelplant", name: "Steel Plant Main Gate", nameTelugu: "స్టీల్ ప్లాంట్ మెయిన్ గేట్", lat: 17.6450, lng: 83.1700, isIntermediate: true, isDestination: false, address: "Steel Plant Gate, Visakhapatnam" },
  { id: "stop_aganampudi", name: "Aganampudi", nameTelugu: "అగనంపూడి", lat: 17.6300, lng: 83.1400, isIntermediate: true, isDestination: false, address: "Aganampudi Toll Gate, Visakhapatnam" },
  { id: "stop_anakapalli", name: "Anakapalli", nameTelugu: "అనకాపల్లి", lat: 17.6900, lng: 83.0000, isIntermediate: false, isDestination: false, address: "Anakapalli RTC Bus Stand" },
  { id: "stop_rajeevnagar", name: "Rajeev Nagar", nameTelugu: "రాజీవ్ నగర్", lat: 17.6500, lng: 83.1600, isIntermediate: true, isDestination: false, address: "Rajeev Nagar Sectors, Kurmannapalem Area" },
  { id: "stop_college", name: "Duvvada / Kompallaju College", nameTelugu: "దువ్వాడ / కొంపల్లజు కాలేజ్", lat: 17.7088, lng: 83.1532, isIntermediate: false, isDestination: true, address: "Kompallaju / Vignan Institute Gate, Duvvada" },
];

export const MASTER_ROUTES: Route[] = [
  {
    id: "route_38y",
    name: "38Y (RTC Complex ↔ Duvvada Railway Station)",
    busNumbers: ["38Y"],
    color: "#6C3FF5",
    isActive: true,
    stops: [
      { stopId: "stop_rtc", order: 1 },
      { stopId: "stop_gurudwara", order: 2 },
      { stopId: "stop_nad", order: 3 },
      { stopId: "stop_bhpv", order: 4 },
      { stopId: "stop_gajuwaka", order: 5 },
      { stopId: "stop_kurmannapalem", order: 6 },
      { stopId: "stop_duvvada", order: 7 },
      { stopId: "stop_college", order: 8 },
    ],
  },
  {
    id: "route_111",
    name: "111 (Tagarapuvalasa ↔ Duvvada / Kurmannapalem)",
    busNumbers: ["111"],
    color: "#06B6D4",
    isActive: true,
    stops: [
      { stopId: "stop_tagarapuvalasa", order: 1 },
      { stopId: "stop_madhurawada", order: 2 },
      { stopId: "stop_zoopark", order: 3 },
      { stopId: "stop_maddilapalem", order: 4 },
      { stopId: "stop_gurudwara", order: 5 },
      { stopId: "stop_nad", order: 6 },
      { stopId: "stop_gajuwaka", order: 7 },
      { stopId: "stop_kurmannapalem", order: 8 },
      { stopId: "stop_duvvada", order: 9 },
      { stopId: "stop_college", order: 10 },
    ],
  },
  {
    id: "route_311",
    name: "311 (Scindia ↔ Chodavaram via Duvvada)",
    busNumbers: ["311"],
    color: "#10B981",
    isActive: true,
    stops: [
      { stopId: "stop_scindia", order: 1 },
      { stopId: "stop_gajuwaka", order: 2 },
      { stopId: "stop_kurmannapalem", order: 3 },
      { stopId: "stop_duvvada", order: 4 },
      { stopId: "stop_sabbavaram", order: 5 },
      { stopId: "stop_chodavaram", order: 6 },
    ],
  },
  {
    id: "route_55y",
    name: "55Y (Duvvada Railway Station ↔ Simhachalam)",
    busNumbers: ["55Y"],
    color: "#EF4444",
    isActive: true,
    stops: [
      { stopId: "stop_duvvada", order: 1 },
      { stopId: "stop_kurmannapalem", order: 2 },
      { stopId: "stop_gajuwaka", order: 3 },
      { stopId: "stop_nad", order: 4 },
      { stopId: "stop_gopalapatnam", order: 5 },
      { stopId: "stop_simhachalam", order: 6 },
    ],
  },
  {
    id: "route_55p",
    name: "55P (Duvvada Railway Station ↔ Pendurthi)",
    busNumbers: ["55P"],
    color: "#F97316",
    isActive: true,
    stops: [
      { stopId: "stop_duvvada", order: 1 },
      { stopId: "stop_kurmannapalem", order: 2 },
      { stopId: "stop_gajuwaka", order: 3 },
      { stopId: "stop_nad", order: 4 },
      { stopId: "stop_vepagunta", order: 5 },
      { stopId: "stop_pendurthi", order: 6 },
    ],
  },
  {
    id: "route_400",
    name: "400 (RTC Complex ↔ Rajeev Nagar / Kurmannapalem Feeder)",
    busNumbers: ["400"],
    color: "#F59E0B",
    isActive: true,
    stops: [
      { stopId: "stop_rtc", order: 1 },
      { stopId: "stop_railwaystation", order: 2 },
      { stopId: "stop_scindia", order: 3 },
      { stopId: "stop_malkapuram", order: 4 },
      { stopId: "stop_gajuwaka", order: 5 },
      { stopId: "stop_kurmannapalem", order: 6 },
    ],
  },
  {
    id: "route_400y",
    name: "400Y (RTC Complex ↔ Yelamanchili via Gajuwaka)",
    busNumbers: ["400Y"],
    color: "#3B82F6",
    isActive: true,
    stops: [
      { stopId: "stop_rtc", order: 1 },
      { stopId: "stop_railwaystation", order: 2 },
      { stopId: "stop_scindia", order: 3 },
      { stopId: "stop_malkapuram", order: 4 },
      { stopId: "stop_gajuwaka", order: 5 },
      { stopId: "stop_kurmannapalem", order: 6 },
      { stopId: "stop_parawada", order: 7 },
      { stopId: "stop_achyutapuram", order: 8 },
      { stopId: "stop_yelamanchili", order: 9 },
    ],
  },
  {
    id: "route_500",
    name: "500 (RTC Complex ↔ Anakapalli via Kurmannapalem)",
    busNumbers: ["500"],
    color: "#8B5CF6",
    isActive: true,
    stops: [
      { stopId: "stop_rtc", order: 1 },
      { stopId: "stop_gurudwara", order: 2 },
      { stopId: "stop_nad", order: 3 },
      { stopId: "stop_gajuwaka", order: 4 },
      { stopId: "stop_kurmannapalem", order: 5 },
      { stopId: "stop_steelplant", order: 6 },
      { stopId: "stop_aganampudi", order: 7 },
      { stopId: "stop_anakapalli", order: 8 },
    ],
  },
  {
    id: "route_38k",
    name: "38K / 38 (RTC Complex / Maddilapalem ↔ Kurmannapalem Area)",
    busNumbers: ["38K", "38"],
    color: "#EC4899",
    isActive: true,
    stops: [
      { stopId: "stop_rtc", order: 1 },
      { stopId: "stop_maddilapalem", order: 2 },
      { stopId: "stop_gurudwara", order: 3 },
      { stopId: "stop_nad", order: 4 },
      { stopId: "stop_gajuwaka", order: 5 },
      { stopId: "stop_kurmannapalem", order: 6 },
    ],
  },
  {
    id: "route_38rn",
    name: "38R/N (RTC Complex ↔ Steel Plant / Rajeev Nagar)",
    busNumbers: ["38RN"],
    color: "#64748B",
    isActive: true,
    stops: [
      { stopId: "stop_rtc", order: 1 },
      { stopId: "stop_nad", order: 2 },
      { stopId: "stop_gajuwaka", order: 3 },
      { stopId: "stop_kurmannapalem", order: 4 },
      { stopId: "stop_rajeevnagar", order: 5 },
    ],
  },
];

export const MASTER_BUSES: Bus[] = [
  { id: "bus_38y", busNumber: "38Y", routeId: "route_38y", currentStopId: "stop_kurmannapalem", currentLat: 17.6745, currentLng: 83.1850, isActive: true },
  { id: "bus_111", busNumber: "111", routeId: "route_111", currentStopId: "stop_nad", currentLat: 17.7391, currentLng: 83.2372, isActive: true },
  { id: "bus_311", busNumber: "311", routeId: "route_311", currentStopId: "stop_scindia", currentLat: 17.6842, currentLng: 83.2798, isActive: true },
  { id: "bus_55y", busNumber: "55Y", routeId: "route_55y", currentStopId: "stop_gajuwaka", currentLat: 17.6896, currentLng: 83.2185, isActive: true },
  { id: "bus_400y", busNumber: "400Y", routeId: "route_400y", currentStopId: "stop_malkapuram", currentLat: 17.6950, currentLng: 83.2500, isActive: true },
];

export async function seedFirestoreDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Seeding Firestore with Complete Duvvada Route Master Dataset (10 Routes)...");

    // 1. App Config
    await setDoc(doc(db, "app_config", "config"), {
      collegeName: "Duvvada / Kompallaju College",
      fixedDestinationStopId: "stop_college",
      duvvadaStationStopId: "stop_duvvada",
      lastSeeded: new Date().toISOString(),
      activeObservationCount: 28,
      totalSeededRoutes: 10,
    });

    // 2. Master Stops (28 Stops)
    for (const stop of MASTER_STOPS) {
      await setDoc(doc(db, "stops", stop.id), stop);
    }

    // 3. Master Routes (10 Routes)
    for (const route of MASTER_ROUTES) {
      await setDoc(doc(db, "routes", route.id), route);
    }

    // 4. Master Buses
    for (const bus of MASTER_BUSES) {
      await setDoc(doc(db, "buses", bus.id), bus);
    }

    // 5. Seed Historical Voted Arrival Observations for Future Predictive ETA Engine
    for (let i = 1; i <= 28; i++) {
      const sampleStops = ["stop_nad", "stop_gajuwaka", "stop_kurmannapalem", "stop_duvvada", "stop_college"];
      const stopId = sampleStops[(i - 1) % sampleStops.length];
      await setDoc(doc(db, "arrivalObservations", `obs_${i}`), {
        id: `obs_${i}`,
        routeId: i % 2 === 0 ? "route_38y" : "route_55y",
        stopId: stopId,
        travelTimeFromPrevious: 10 + (i % 6),
        observedTime: `08:${(15 + i).toString().padStart(2, "0")} AM`,
        studentId: `voted_std_${i}`,
        timestamp: new Date(Date.now() - i * 300000).toISOString(),
        verifiedByStudentVotes: 5 + (i % 8),
      });
    }

    // 6. Seed Student Confirmations (Votes History Collection)
    for (let v = 1; v <= 18; v++) {
      await setDoc(doc(db, "studentConfirmations", `conf_seeded_${v}`), {
        id: `conf_seeded_${v}`,
        userId: `voter_student_${v}`,
        busNumber: v % 3 === 0 ? "55Y" : "38Y",
        routeId: v % 3 === 0 ? "route_55y" : "route_38y",
        stopId: "stop_kurmannapalem",
        stopName: "Kurmannapalem",
        timestamp: new Date(Date.now() - v * 400000).toISOString(),
        isConfirmed: true,
      });
    }

    // 7. Seed Active Student Journeys
    for (let s = 1; s <= 27; s++) {
      const offsetLat = (Math.random() - 0.5) * 0.003;
      const offsetLng = (Math.random() - 0.5) * 0.003;
      await setDoc(doc(db, "activeJourneys", `student_sim_${s}`), {
        id: `student_sim_${s}`,
        userId: `std_user_${s}`,
        routeId: "route_38y",
        boardingPoint: "Simhachalam",
        currentStopId: "stop_kurmannapalem",
        latitude: 17.6745 + offsetLat,
        longitude: 83.1850 + offsetLng,
        lastUpdated: new Date().toISOString(),
        journeyStatus: "IN_TRANSIT",
        confidence: "HIGH",
        confirmedByStudent: s <= 14,
      });
    }

    return {
      success: true,
      message: "Firestore seeded successfully with all 10 Master Routes (38Y, 111, 311, 55Y, 55P, 400, 400Y, 500, 38K, 38R/N), 28 Corridor Stops, 28 Voted Observations & 18 Student Votes History!",
    };
  } catch (error: any) {
    console.error("Error seeding Firestore:", error);
    return {
      success: false,
      message: `Failed to seed database: ${error?.message || error}`,
    };
  }
}
