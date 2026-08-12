import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MASTER_STOPS } from "./seeder";
import { CrowdLevel } from "../types";

// Sequence of demo simulation stops
const SIMULATION_STOP_IDS = [
  "stop_simhachalam",
  "stop_nad",
  "stop_gajuwaka",
  "stop_kurmannapalem",
  "stop_duvvada",
  "stop_college",
];

let simulationInterval: any = null;
let currentStepIndex = 3; // Default at Kurmannapalem
let currentSimulatedCrowdCount = 27; // Default HIGH crowd count

export function isSimulationActive(): boolean {
  return simulationInterval !== null;
}

export function startDemoSimulation(
  onStopChange?: (stopName: string, stepIndex: number) => void,
  intervalMs: number = 4000
) {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  console.log("Starting RouteReach live simulation along Duvvada Corridor...");

  simulationInterval = setInterval(async () => {
    currentStepIndex = (currentStepIndex + 1) % SIMULATION_STOP_IDS.length;
    const targetStopId = SIMULATION_STOP_IDS[currentStepIndex];
    const targetStop = MASTER_STOPS.find((s) => s.id === targetStopId);

    if (!targetStop) return;

    try {
      // 1. Update Bus 38Y position in Firestore
      await updateDoc(doc(db, "buses", "bus_38y"), {
        currentStopId: targetStop.id,
        currentLat: targetStop.lat,
        currentLng: targetStop.lng,
      });

      // 2. Update Primary User Active Journey in Firestore
      await setDoc(
        doc(db, "activeJourneys", "current_user_journey"),
        {
          id: "current_user_journey",
          userId: "std_student_main",
          routeId: "route_38y",
          boardingPoint: "Simhachalam",
          currentStopId: targetStop.id,
          latitude: targetStop.lat,
          longitude: targetStop.lng,
          lastUpdated: new Date().toISOString(),
          journeyStatus: targetStop.isDestination ? "ARRIVED" : "IN_TRANSIT",
          confidence: "HIGH",
          confirmedByStudent: true,
        },
        { merge: true }
      );

      // 3. Update Cluster of Active Student Journeys according to currentSimulatedCrowdCount
      for (let s = 1; s <= 30; s++) {
        const journeyId = `student_sim_${s}`;
        if (s <= currentSimulatedCrowdCount) {
          const offsetLat = (Math.random() - 0.5) * 0.003;
          const offsetLng = (Math.random() - 0.5) * 0.003;
          await setDoc(
            doc(db, "activeJourneys", journeyId),
            {
              id: journeyId,
              userId: `std_user_${s}`,
              routeId: "route_38y",
              boardingPoint: "Simhachalam",
              currentStopId: targetStop.id,
              latitude: targetStop.lat + offsetLat,
              longitude: targetStop.lng + offsetLng,
              lastUpdated: new Date().toISOString(),
              journeyStatus: targetStop.isDestination ? "ARRIVED" : "IN_TRANSIT",
              confidence: "HIGH",
              confirmedByStudent: s <= 12,
            },
            { merge: true }
          );
        } else {
          await setDoc(
            doc(db, "activeJourneys", journeyId),
            {
              id: journeyId,
              journeyStatus: "ARRIVED",
            },
            { merge: true }
          );
        }
      }

      if (onStopChange) {
        onStopChange(targetStop.name, currentStepIndex);
      }
    } catch (err) {
      console.error("Simulation update error:", err);
    }
  }, intervalMs);
}

export function stopDemoSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    console.log("Demo simulation stopped.");
  }
}

export async function adjustCrowdSimulation(level: CrowdLevel) {
  if (level === "LOW") currentSimulatedCrowdCount = 3;
  if (level === "MEDIUM") currentSimulatedCrowdCount = 10;
  if (level === "HIGH") currentSimulatedCrowdCount = 27;

  const currentStopId = SIMULATION_STOP_IDS[currentStepIndex];
  const targetStop = MASTER_STOPS.find((s) => s.id === currentStopId) || MASTER_STOPS[5];

  console.log(`Setting active crowd count to ${currentSimulatedCrowdCount} (${level})`);

  for (let s = 1; s <= 30; s++) {
    const journeyId = `student_sim_${s}`;
    if (s <= currentSimulatedCrowdCount) {
      const offsetLat = (Math.random() - 0.5) * 0.003;
      const offsetLng = (Math.random() - 0.5) * 0.003;
      await setDoc(
        doc(db, "activeJourneys", journeyId),
        {
          id: journeyId,
          userId: `std_user_${s}`,
          routeId: "route_38y",
          boardingPoint: "Simhachalam",
          currentStopId: targetStop.id,
          latitude: targetStop.lat + offsetLat,
          longitude: targetStop.lng + offsetLng,
          lastUpdated: new Date().toISOString(),
          journeyStatus: "IN_TRANSIT",
          confidence: "HIGH",
          confirmedByStudent: s <= 8,
        },
        { merge: true }
      );
    } else {
      await setDoc(
        doc(db, "activeJourneys", journeyId),
        {
          id: journeyId,
          journeyStatus: "ARRIVED",
        },
        { merge: true }
      );
    }
  }
}
