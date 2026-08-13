import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { MASTER_STOPS } from "./seeder";
import { ActiveJourney, Stop } from "../types";

// Sequence of demo simulation stops along 38Y / Duvvada corridor
const SIMULATION_STOP_IDS = [
  "rtc",
  "gurudwar",
  "nad",
  "airport",
  "bhpv",
  "gajuwaka",
  "kurmannapalem",
  "duvvada",
];

let simulationInterval: any = null;
let currentStepIndex = 5; // Default at Gajuwaka
let currentSimulatedCrowdCount = 8; // Default 8 students (LIVE, High Confidence)

export function isSimulationActive(): boolean {
  return simulationInterval !== null;
}

/**
 * Instantly applies user demo simulation parameters (stop location, student count, route)
 * Creates simulated student telemetry marked with isDemo: true and validationStatus: VALIDATED.
 */
export async function applyDemoSimulationParams(
  stopId: string,
  studentCount: number,
  routeId: string,
  stops: Stop[] = []
): Promise<ActiveJourney[]> {
  const targetStop =
    stops.find((s) => s.id === stopId) ||
    MASTER_STOPS.find((s) => s.id === stopId) ||
    stops[0] ||
    MASTER_STOPS[0];

  const simulatedJourneys: ActiveJourney[] = [];

  for (let s = 1; s <= 30; s++) {
    const journeyId = `demo_std_${s}`;
    if (s <= studentCount) {
      const offsetLat = (Math.random() - 0.5) * 0.0012;
      const offsetLng = (Math.random() - 0.5) * 0.0012;
      const j: ActiveJourney = {
        id: journeyId,
        userId: `demo_user_${s}`,
        studentId: `demo_user_${s}`,
        journeyId,
        routeId: routeId || "38Y",
        boardingPoint: targetStop.name,
        currentStopId: targetStop.id,
        currentSequence: 6,
        latitude: targetStop.lat + offsetLat,
        longitude: targetStop.lng + offsetLng,
        gpsAccuracyMeters: 12,
        lastUpdated: new Date().toISOString(),
        lastLocationAt: new Date().toISOString(),
        journeyStatus: targetStop.id === "duvvada" ? "ARRIVED" : "IN_TRANSIT",
        confidence: "HIGH",
        routeConfidence: "HIGH",
        routeVerificationStatus: "VERIFIED",
        validationStatus: "VALIDATED",
        consecutiveValidReadings: 3,
        confirmedByStudent: true,
        isDemo: true,
      };
      simulatedJourneys.push(j);

      try {
        await setDoc(doc(db, "activeJourneys", journeyId), j, { merge: true });
      } catch (err) {
        console.warn("Firestore setDoc demo journey warning:", err);
      }
    } else {
      try {
        await setDoc(
          doc(db, "activeJourneys", journeyId),
          {
            id: journeyId,
            journeyStatus: "ARRIVED",
            isDemo: true,
          },
          { merge: true }
        );
      } catch (err) {}
    }
  }

  return simulatedJourneys;
}

export function startDemoSimulation(
  onStopChange?: (stopName: string, stepIndex: number) => void,
  intervalMs: number = 4000,
  targetRouteId: string = "38Y"
) {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  console.log("Starting RouteReach DEMO MODE student sensor network simulation...");

  simulationInterval = setInterval(async () => {
    currentStepIndex = (currentStepIndex + 1) % SIMULATION_STOP_IDS.length;
    const targetStopId = SIMULATION_STOP_IDS[currentStepIndex];
    const targetStop = MASTER_STOPS.find((s) => s.id === targetStopId) || MASTER_STOPS[0];

    if (!targetStop) return;

    try {
      // Update cluster of simulated student journeys in Firestore activeJourneys
      for (let s = 1; s <= 10; s++) {
        const journeyId = `demo_std_${s}`;
        if (s <= currentSimulatedCrowdCount) {
          const offsetLat = (Math.random() - 0.5) * 0.0015;
          const offsetLng = (Math.random() - 0.5) * 0.0015;
          await setDoc(
            doc(db, "activeJourneys", journeyId),
            {
              id: journeyId,
              userId: `demo_user_${s}`,
              studentId: `demo_user_${s}`,
              journeyId,
              routeId: targetRouteId,
              boardingPoint: "RTC",
              currentStopId: targetStop.id,
              currentSequence: currentStepIndex + 1,
              latitude: targetStop.lat + offsetLat,
              longitude: targetStop.lng + offsetLng,
              lastUpdated: new Date().toISOString(),
              lastLocationAt: new Date().toISOString(),
              journeyStatus: targetStop.id === "duvvada" ? "ARRIVED" : "IN_TRANSIT",
              confidence: "HIGH",
              routeConfidence: "HIGH",
              routeVerificationStatus: "VERIFIED",
              validationStatus: "VALIDATED",
              consecutiveValidReadings: 3,
              confirmedByStudent: true,
              isDemo: true,
            },
            { merge: true }
          );
        } else {
          await setDoc(
            doc(db, "activeJourneys", journeyId),
            {
              id: journeyId,
              journeyStatus: "ARRIVED",
              isDemo: true,
            },
            { merge: true }
          );
        }
      }

      if (onStopChange) {
        onStopChange(targetStop.name, currentStepIndex);
      }
    } catch (err) {
      console.error("Demo Simulation update error:", err);
    }
  }, intervalMs);
}

export function stopDemoSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}
