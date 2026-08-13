import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Stop,
  Route,
  RouteStopOrder,
  TransferConnection,
  Bus,
  ActiveJourney,
  ArrivalObservation,
  StudentConfirmation,
} from "../types";

export function subscribeStops(onData: (stops: Stop[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, "stops"),
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Stop[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Stop));
        onData(loaded);
      }
    },
    (err) => console.error("Firestore stops subscription error:", err)
  );
}

export function subscribeRoutes(onData: (routes: Route[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, "routes"),
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Route[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Route));
        onData(loaded);
      }
    },
    (err) => console.error("Firestore routes subscription error:", err)
  );
}

export function subscribeRouteStops(onData: (routeStops: RouteStopOrder[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, "routeStops"),
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: RouteStopOrder[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as RouteStopOrder));
        onData(loaded);
      }
    },
    (err) => console.error("Firestore routeStops subscription error:", err)
  );
}

export function subscribeTransferConnections(
  onData: (conns: TransferConnection[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "transferConnections"),
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: TransferConnection[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as TransferConnection));
        onData(loaded);
      }
    },
    (err) => console.error("Firestore transferConnections subscription error:", err)
  );
}

export function subscribeBuses(onData: (buses: Bus[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, "buses"),
    (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Bus[] = [];
        snapshot.forEach((d) => loaded.push(d.data() as Bus));
        onData(loaded);
      }
    },
    (err) => console.error("Firestore buses subscription error:", err)
  );
}

export function subscribeActiveJourneys(
  onData: (journeys: ActiveJourney[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "activeJourneys"),
    (snapshot) => {
      const loaded: ActiveJourney[] = [];
      snapshot.forEach((d) => loaded.push(d.data() as ActiveJourney));
      onData(loaded);
    },
    (err) => console.error("Firestore activeJourneys subscription error:", err)
  );
}

export function subscribeArrivalObservations(
  onData: (obs: ArrivalObservation[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "arrivalObservations"),
    (snapshot) => {
      const loaded: ArrivalObservation[] = [];
      snapshot.forEach((d) => loaded.push(d.data() as ArrivalObservation));
      onData(loaded);
    },
    (err) => console.error("Firestore arrivalObservations subscription error:", err)
  );
}

export function subscribeStudentConfirmations(
  onData: (confirmations: StudentConfirmation[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, "studentConfirmations"),
    (snapshot) => {
      const loaded: StudentConfirmation[] = [];
      snapshot.forEach((d) => loaded.push(d.data() as StudentConfirmation));
      onData(loaded);
    },
    (err) => console.error("Firestore studentConfirmations subscription error:", err)
  );
}

export async function updateActiveStudentJourney(journey: ActiveJourney): Promise<void> {
  if (!journey.userId) return;
  const docRef = doc(db, "activeJourneys", journey.userId);
  await setDoc(
    docRef,
    {
      ...journey,
      lastUpdated: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function recordStudentConfirmation(
  userId: string,
  busNumber: string,
  routeId: string,
  stopId: string
): Promise<string> {
  const confId = `conf_${userId}_${Date.now()}`;
  const docRef = doc(db, "studentConfirmations", confId);
  const confirmation: StudentConfirmation = {
    id: confId,
    userId,
    busNumber,
    routeId,
    stopId,
    timestamp: new Date().toISOString(),
    isConfirmed: true,
  };
  await setDoc(docRef, confirmation);
  return confId;
}

export async function recordArrivalObservation(
  routeId: string,
  stopId: string,
  travelTimeFromPrevious: number,
  studentId: string,
  fromStopId: string = "gajuwaka"
): Promise<string> {
  const obsId = `obs_${routeId}_${stopId}_${Date.now()}`;
  const docRef = doc(db, "arrivalObservations", obsId);
  const observation: ArrivalObservation = {
    id: obsId,
    routeId,
    fromStopId,
    toStopId: stopId,
    travelTimeSeconds: travelTimeFromPrevious * 60,
    travelTimeFromPrevious,
    observedAt: new Date().toISOString(),
    studentId,
    timestamp: new Date().toISOString(),
    source: "student_gps",
    confidence: "HIGH",
  };
  await setDoc(docRef, observation);
  return obsId;
}

export async function updateCollegeTargetTime(targetTime: string): Promise<void> {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("routereach_targetCollegeTime", targetTime);
    }
    await setDoc(
      doc(db, "collegeConfig", "duvvada_college"),
      { targetCollegeTime: targetTime, lastUpdated: new Date().toISOString() },
      { merge: true }
    );
  } catch (err) {
    console.warn("Firestore updateCollegeTargetTime warning:", err);
  }
}

export function subscribeCollegeTargetTime(onData: (targetTime: string) => void): Unsubscribe {
  return onSnapshot(
    doc(db, "collegeConfig", "duvvada_college"),
    (snapshot) => {
      if (snapshot.exists() && snapshot.data().targetCollegeTime) {
        const time = snapshot.data().targetCollegeTime;
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem("routereach_targetCollegeTime", time);
        }
        onData(time);
      }
    },
    (err) => console.warn("College config subscription warning:", err)
  );
}
