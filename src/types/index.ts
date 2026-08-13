export type CrowdLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH';

export type RouteStatusTag = 'LIVE' | 'RECENT' | 'TRAFFIC-ADJUSTED' | 'SCHEDULED' | 'LIMITED DATA' | 'NO LIVE DATA';

export type PriorityTag = 'LIVE' | 'RECENT' | 'TRAFFIC-ADJUSTED' | 'SCHEDULED' | 'LIMITED DATA' | 'NO LIVE DATA';

export type RouteCategory = 'BEST_OPTION' | 'DIRECT' | 'TRANSFER' | 'LAST_MILE' | 'AUTO_WALK';

export type ETAStatusType = 'ETA_AVAILABLE' | 'ETA_LIMITED' | 'ETA_UNAVAILABLE' | 'SCHEDULED_ESTIMATE';

export type VoteStatus = 'PENDING' | 'VALIDATED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED';

export interface Stop {
  id: string;
  name: string;
  nameTelugu?: string;
  lat: number;
  lng: number;
  isIntermediate?: boolean;
  isDestination?: boolean;
  address?: string;
  isTransferPoint?: boolean;
  isDuvvadaPoint?: boolean;
}

export interface LastMileConnection {
  id: string;
  fromStopId: string;
  toDestinationId: string;
  destinationName: string;
  mode: 'walk' | 'auto' | 'bus';
  distanceMeters: number;
  estimatedMinutes: number;
  enabled: boolean;
}

export interface RouteStopOrder {
  id?: string;
  routeId: string;
  stopId: string;
  sequence: number;
  referenceTime?: string;
}

export interface Route {
  id: string;
  name: string;
  type: string; // 'direct' | 'feeder'
  origin: string;
  destination: string;
  isDirectToDuvvada: boolean;
  busNumbers: string[];
  color?: string;
  isActive: boolean;
}

export interface TripStop {
  stopId: string;
  stopName: string;
  departureTime: string;
  timeInMinutes: number;
}

export interface ScheduledTrip {
  id?: string;
  routeId: string;
  tripNumber: number;
  stops: TripStop[];
}

export interface TransferConnection {
  id: string;
  fromRouteId: string;
  toRouteId: string;
  transferStopId: string;
  walkingDistanceMeters: number;
  estimatedTransferMinutes: number;
  enabled: boolean;
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
  studentId?: string;
  journeyId?: string;
  routeId: string;
  boardingPoint: string;
  boardingStopId?: string;
  currentStopId: string;
  currentSequence?: number;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters?: number;
  lastUpdated: string;
  lastLocationAt?: string;
  startedAt?: string;
  journeyStatus: 'IN_TRANSIT' | 'WAITING' | 'ARRIVED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  routeConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  routeVerificationStatus?: 'VERIFIED' | 'VERIFICATION_REQUIRED';
  validationStatus?: VoteStatus;
  validationScore?: number;
  validationReasons?: string[];
  consecutiveValidReadings?: number;
  confirmedByStudent?: boolean;
  isDemo?: boolean;
}

export interface StudentVote {
  voteId: string;
  studentId: string;
  routeId: string;
  boardingStopId: string;
  status: VoteStatus;
  validationScore: number;
  validationReasons: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ArrivalObservation {
  id: string;
  routeId: string;
  fromStopId: string;
  toStopId: string;
  travelTimeSeconds: number; // strictly in seconds
  travelTimeFromPrevious?: number; // legacy in minutes for UI display
  observedAt: string;
  journeyId?: string;
  studentId?: string;
  timestamp: string;
  source: 'student_gps' | 'demo' | 'gps';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface StudentConfirmation {
  id: string;
  userId: string;
  busNumber: string;
  routeId: string;
  stopId: string;
  timestamp: string;
  isConfirmed: boolean;
}

export interface ETAPrediction {
  duvvadaEta: string;
  collegeEta: string;
  minutesToDuvvada: number | null;
  minutesToCollege: number | null;
  observationCount: number;
  statusText: 'ON TIME' | 'SLIGHT DELAY' | 'LIKELY LATE' | 'ETA UNAVAILABLE';
  confidenceLevel: 'High' | 'Medium' | 'Low';
  hasSufficientData: boolean;
  displayNote: string;
  etaStatus: ETAStatusType;
}

export interface RouteSegment {
  routeId: string;
  routeName?: string;
  fromStopId: string;
  toStopId: string;
  fromStopName: string;
  toStopName: string;
  fromSequence: number;
  toSequence: number;
  travelTimeSeconds?: number | null;
  travelTimeMinutes?: number | null;
}

export interface TransferPoint {
  stopId: string;
  stopName: string;
  fromRouteId: string;
  toRouteId: string;
  walkingDistanceMeters: number;
  estimatedTransferMinutes: number;
}

export interface DiscoveredPath {
  pathId: string;
  type: 'DIRECT' | 'TRANSFER' | 'LAST_MILE' | 'AUTO_WALK';
  transfersCount: number;
  segments: RouteSegment[];
  transfers: TransferPoint[];
  departureFromBoardingTime?: string;
  waitingMinutes?: number;
  predictedDuvvadaArrival: string;
  predictedCollegeArrival: string;
  totalMinutesToCollege: number | null;
  activeStudentCount: number;
  crowdLevel: CrowdLevel | 'NO DATA';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ON TIME' | 'SLIGHT DELAY' | 'LIKELY LATE' | 'ETA UNAVAILABLE';
  etaStatus: ETAStatusType;
  liveStatus: RouteStatusTag;
  priorityTag?: PriorityTag;
  scheduledStatusText?: string;
  lastMileStopName?: string;
  lastMileMode?: 'walk' | 'auto' | 'bus';
  lastMileMinutes?: number;
  summaryDetail?: string;
  rankingScore: number;
  pathSummary: string;
  boardingStopName: string;
  badgeTag: string;
  isRecommended: boolean;
}

export type RouteOption = DiscoveredPath;

export interface AggregatedBusPosition {
  routeId: string;
  currentSegmentFromStopId: string;
  currentSegmentToStopId: string;
  approximateStopName: string;
  nextStopId?: string;
  nextStopName?: string;
  activeStudentCount: number;
  verifiedStudentCount: number;
  confidence: 'HIGH' | 'LIMITED' | 'STALE' | 'NO_LIVE_DATA';
  latitude: number;
  longitude: number;
  snappedLatitude?: number;
  snappedLongitude?: number;
  source?: 'student_gps_aggregation';
  lastUpdated: string;
  calculatedAt?: string;
  expiresAt?: string;
  displayText: string;
}

export interface UserCommuteStatus {
  isGpsActive: boolean;
  permissionGranted: boolean;
  permissionError: string | null;
  userLat: number | null;
  userLng: number | null;
  matchedNearestStop: Stop | null;
  suggestedBusNumber: string;
  isUserOnboard: boolean;
  statusMessage: string;
}

export interface CollegeConfig {
  id: string;
  name: string;
  duvvadaStationStopId: string;
  collegeTravelTimeMinutes: number;
}
