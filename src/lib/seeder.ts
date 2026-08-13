import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Stop, Route, RouteStopOrder, TransferConnection, Bus, ScheduledTrip } from "../types";
import masterData from "../data/excelMasterData.json";
import masterTripsData from "../data/masterTripsData.json";

export const MASTER_STOPS: Stop[] = masterData.stops as Stop[];
export const MASTER_ROUTES: Route[] = masterData.routes as Route[];
export const MASTER_ROUTE_STOPS: RouteStopOrder[] = masterData.routeStops as RouteStopOrder[];
export const MASTER_TRANSFER_CONNECTIONS: TransferConnection[] = masterData.transferConnections as TransferConnection[];
export const MASTER_TRIPS: ScheduledTrip[] = masterTripsData.trips as ScheduledTrip[];

export const MASTER_BUSES: Bus[] = [
  { id: "bus_38y", busNumber: "38Y", routeId: "38Y", currentStopId: "gajuwaka", currentLat: 17.69029, currentLng: 83.22383, isActive: true },
  { id: "bus_400k", busNumber: "400K", routeId: "400K", currentStopId: "nad", currentLat: 17.73910, currentLng: 83.23720, isActive: true },
  { id: "bus_400y", busNumber: "400Y", routeId: "400Y", currentStopId: "scindia", currentLat: 17.68420, currentLng: 83.27980, isActive: true },
  { id: "bus_500", busNumber: "500", routeId: "500", currentStopId: "rtc", currentLat: 17.72368, currentLng: 83.30810, isActive: true },
];

/**
 * Seeds Firestore runtime database with Master Collections from Excel & Trips Seed Data:
 * 1. stops (35 physical stops)
 * 2. routes (18 master routes)
 * 3. routeStops (131 sequence documents)
 * 4. transferConnections (directional transfer connections)
 * 5. trips (scheduled trip timetables)
 * 6. college (destination metadata)
 */
export async function seedFirestoreDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Seeding Firestore Master Collections from Seed Data...");

    // 1. College Config
    await setDoc(doc(db, "college", "duvvada_college"), masterData.college);

    // 2. Stops Collection
    for (const stop of MASTER_STOPS) {
      await setDoc(doc(db, "stops", stop.id), stop);
    }

    // 3. Routes Collection
    for (const route of MASTER_ROUTES) {
      await setDoc(doc(db, "routes", route.id), route);
    }

    // 4. RouteStops Collection
    for (const rs of MASTER_ROUTE_STOPS) {
      const docId = rs.id || `${rs.routeId}_${rs.stopId}_${rs.sequence}`;
      await setDoc(doc(db, "routeStops", docId), {
        id: docId,
        routeId: rs.routeId,
        stopId: rs.stopId,
        sequence: rs.sequence,
        referenceTime: rs.referenceTime || "",
      });
    }

    // 5. TransferConnections Collection
    for (const conn of MASTER_TRANSFER_CONNECTIONS) {
      await setDoc(doc(db, "transferConnections", conn.id), conn);
    }

    // 6. Trips Timetables Collection
    for (const trip of MASTER_TRIPS) {
      const tripDocId = `trip_${trip.routeId}_trip_${trip.tripNumber}`;
      await setDoc(doc(db, "trips", tripDocId), {
        ...trip,
        id: tripDocId,
      });
    }

    console.log("Firestore Master Collections successfully seeded!");
    return { success: true, message: "Firestore database successfully seeded with all Master Collections!" };
  } catch (error: any) {
    console.error("Error seeding Firestore database:", error);
    return { success: false, message: `Seeding failed: ${error.message}` };
  }
}
