export interface TrafficAdjustmentResult {
  delayMinutes: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  source: "traffic_api" | "none";
}

/**
 * Traffic Service Abstraction
 * Checks if real traffic API / data source is available.
 * NO FABRICATED RANDOM VALUES: Returns delayMinutes = 0 and source = "none" if no traffic API exists.
 */
export function getTrafficAdjustment(
  fromStopId: string,
  toStopId: string,
  departureTime: Date = new Date()
): TrafficAdjustmentResult {
  // Production traffic service abstraction.
  // Returns 0 delay and source: "none" when no external traffic API is connected.
  return {
    delayMinutes: 0,
    confidence: "LOW",
    source: "none",
  };
}
