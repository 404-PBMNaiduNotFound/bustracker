export type CrowdLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Stop {
  id: string;
  name: string;
  nameTelugu?: string;
  lat: number;
  lng: number;
  isIntermediate: boolean;
  isDestination: boolean;
  address: string;
}

export interface RouteStopOrder {
  stopId: string;
  order: number;
}

export interface Route {
  id: string;
  name: string;
  busNumbers: string[];
  color: string;
  isActive: boolean;
  stops: RouteStopOrder[];
}

export interface Bus {
  id: string;
  busNumber: string;
  routeId: string;
  currentStopId: string;
  currentLat: number;
  currentLng: number;
  isActive: boolean;
}

export interface ActiveJourney {
  id: string;
  userId: string;
  routeId: string;
  boardingPoint: string;
  currentStopId: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  journeyStatus: 'IN_TRANSIT' | 'WAITING' | 'ARRIVED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confirmedByStudent?: boolean;
}

export interface ArrivalObservation {
  id: string;
  routeId: string;
  stopId: string;
  observedTime: string;
  travelTimeFromPrevious: number; // in minutes
  studentId: string;
  timestamp: string;
}

export interface StudentConfirmation {
  id: string;
  userId: string;
  busNumber: string;
  routeId: string;
  timestamp: string;
  isConfirmed: boolean;
}

export interface ETAPrediction {
  duvvadaEta: string; // e.g. "8:42 AM"
  collegeEta: string; // e.g. "8:55 AM"
  minutesToDuvvada: number;
  minutesToCollege: number;
  observationCount: number;
  statusText: string; // "ON TIME" | "SLIGHT DELAY" | "FAST"
  confidenceLevel: 'High' | 'Medium' | 'Low';
}

export interface RouteOption {
  id: string;
  title: string;
  type: 'DIRECT' | 'TRANSFER' | 'AUTO_WALK';
  routeNumbers: string[];
  pathSummary: string; // "38Y → Duvvada" or "400Y → Kurmannapalem → 38Y → Duvvada"
  duvvadaEta: string;
  collegeEta: string;
  totalMinutes: number;
  transfersCount: number;
  crowdLevel: CrowdLevel;
  activeStudents: number;
  isRecommended: boolean;
  badgeTag: string;
}

export interface UserCommuteStatus {
  isGpsActive: boolean;
  userLat: number | null;
  userLng: number | null;
  matchedNearestStop: Stop | null;
  suggestedBusNumber: string;
  isUserOnboard: boolean; // True if moving along route with bus; False if waiting at stop
  statusMessage: string; // e.g. "Waiting at Kurmannapalem Stop" or "Travelling on Board 38Y"
}
