import {
  Stop,
  Route,
  RouteStopOrder,
  TransferConnection,
  RouteSegment,
  TransferPoint,
  DiscoveredPath,
} from "../types";

export interface GraphEngineOptions {
  boardingStopId: string;
  destinationStopId?: string; // Default "duvvada"
  routes: Route[];
  stops: Stop[];
  routeStops: RouteStopOrder[];
  transferConnections: TransferConnection[];
  maxTransfers?: number; // Default 2
}

/**
 * Dynamic Graph Pathfinding Engine
 * Strict Directional Transfer Enforcement:
 * Discovers candidate paths ONLY when a valid, enabled directional transferConnection exists in Firestore.
 * NO FALLBACK DEFAULTS: If no valid transferConnection exists, the transfer is REJECTED.
 */
export function discoverGraphPaths(options: GraphEngineOptions): DiscoveredPath[] {
  const {
    boardingStopId,
    destinationStopId = "duvvada",
    routes,
    stops,
    routeStops,
    transferConnections,
    maxTransfers = 2,
  } = options;

  if (!boardingStopId || routes.length === 0 || stops.length === 0) {
    return [];
  }

  const stopsMap = new Map<string, Stop>();
  stops.forEach((s) => stopsMap.set(s.id, s));

  const routesMap = new Map<string, Route>();
  routes.forEach((r) => routesMap.set(r.id, r));

  // Map: routeId -> Map<stopId, sequence>
  const routeStopSeqMap = new Map<string, Map<string, number>>();
  routeStops.forEach((rs) => {
    if (!routeStopSeqMap.has(rs.routeId)) {
      routeStopSeqMap.set(rs.routeId, new Map<string, number>());
    }
    routeStopSeqMap.get(rs.routeId)!.set(rs.stopId, rs.sequence);
  });

  const boardingStop = stopsMap.get(boardingStopId) || {
    id: boardingStopId,
    name: boardingStopId.toUpperCase(),
    lat: 17.7000,
    lng: 83.2000,
  };

  const rawDiscoveredPaths: {
    type: "DIRECT" | "TRANSFER";
    transfersCount: number;
    segments: RouteSegment[];
    transfers: TransferPoint[];
  }[] = [];

  // Helper to get sequence
  const getSeq = (routeId: string, stopId: string): number | null => {
    const seq = routeStopSeqMap.get(routeId)?.get(stopId);
    return seq !== undefined ? seq : null;
  };

  // Strict helper: finds directional TransferConnection from Firestore.
  // NO FALLBACK: Returns null if no enabled matching connection exists!
  const getStrictTransferConnection = (
    fromRouteId: string,
    toRouteId: string,
    transferStopId: string
  ): TransferConnection | null => {
    const conn = transferConnections.find(
      (c) =>
        c.fromRouteId === fromRouteId &&
        c.toRouteId === toRouteId &&
        c.transferStopId === transferStopId &&
        c.enabled === true
    );
    return conn || null;
  };

  // Helper to build route segment
  const makeSegment = (
    routeId: string,
    fromStopId: string,
    toStopId: string
  ): RouteSegment => {
    const r = routesMap.get(routeId);
    const fromS = stopsMap.get(fromStopId);
    const toS = stopsMap.get(toStopId);
    const fromSeq = getSeq(routeId, fromStopId) || 1;
    const toSeq = getSeq(routeId, toStopId) || 2;

    return {
      routeId,
      routeName: r?.name || routeId,
      fromStopId,
      toStopId,
      fromStopName: fromS?.name || fromStopId,
      toStopName: toS?.name || toStopId,
      fromSequence: fromSeq,
      toSequence: toSeq,
    };
  };

  // ==========================================
  // 1. DISCOVER 0-TRANSFER (DIRECT) PATHS
  // ==========================================
  routes.forEach((r) => {
    const seqBoard = getSeq(r.id, boardingStopId);
    const seqDuv = getSeq(r.id, destinationStopId);

    if (seqBoard !== null && seqDuv !== null && seqBoard < seqDuv) {
      rawDiscoveredPaths.push({
        type: "DIRECT",
        transfersCount: 0,
        segments: [makeSegment(r.id, boardingStopId, destinationStopId)],
        transfers: [],
      });
    }
  });

  // ==========================================
  // 2. DISCOVER 1-TRANSFER PATHS (STRICT VALIDATION)
  // ==========================================
  if (maxTransfers >= 1) {
    routes.forEach((r1) => {
      const seq1Board = getSeq(r1.id, boardingStopId);
      if (seq1Board === null) return;

      const r1StopsMap = routeStopSeqMap.get(r1.id);
      if (!r1StopsMap) return;

      r1StopsMap.forEach((seq1T, tStopId) => {
        // Enforce sequence: transfer stop must be AFTER boarding stop
        if (seq1T <= seq1Board || tStopId === destinationStopId) return;

        routes.forEach((r2) => {
          if (r2.id === r1.id) return;

          // STRICT CHECK: Directional TransferConnection document MUST exist in Firestore
          const conn = getStrictTransferConnection(r1.id, r2.id, tStopId);
          if (!conn) return; // REJECT TRANSFER if no valid transferConnection document exists!

          const seq2T = getSeq(r2.id, tStopId);
          const seq2Duv = getSeq(r2.id, destinationStopId);

          // Enforce sequence: R2 must proceed toward Duvvada AFTER transfer stop
          if (seq2T !== null && seq2Duv !== null && seq2T < seq2Duv) {
            const tStopObj = stopsMap.get(tStopId);

            rawDiscoveredPaths.push({
              type: "TRANSFER",
              transfersCount: 1,
              segments: [
                makeSegment(r1.id, boardingStopId, tStopId),
                makeSegment(r2.id, tStopId, destinationStopId),
              ],
              transfers: [
                {
                  stopId: tStopId,
                  stopName: tStopObj?.name || tStopId.toUpperCase(),
                  fromRouteId: r1.id,
                  toRouteId: r2.id,
                  walkingDistanceMeters: conn.walkingDistanceMeters,
                  estimatedTransferMinutes: conn.estimatedTransferMinutes,
                },
              ],
            });
          }
        });
      });
    });
  }

  // ==========================================
  // 3. DISCOVER 2-TRANSFER PATHS (STRICT VALIDATION)
  // ==========================================
  if (maxTransfers >= 2) {
    routes.forEach((r1) => {
      const seq1Board = getSeq(r1.id, boardingStopId);
      if (seq1Board === null) return;

      const r1StopsMap = routeStopSeqMap.get(r1.id);
      if (!r1StopsMap) return;

      r1StopsMap.forEach((seq1T1, t1StopId) => {
        if (seq1T1 <= seq1Board || t1StopId === destinationStopId) return;

        routes.forEach((r2) => {
          if (r2.id === r1.id) return;

          const conn1 = getStrictTransferConnection(r1.id, r2.id, t1StopId);
          if (!conn1) return;

          const seq2T1 = getSeq(r2.id, t1StopId);
          if (seq2T1 === null) return;

          const r2StopsMap = routeStopSeqMap.get(r2.id);
          if (!r2StopsMap) return;

          r2StopsMap.forEach((seq2T2, t2StopId) => {
            if (seq2T2 <= seq2T1 || t2StopId === t1StopId || t2StopId === destinationStopId) return;

            routes.forEach((r3) => {
              if (r3.id === r2.id || r3.id === r1.id) return;

              const conn2 = getStrictTransferConnection(r2.id, r3.id, t2StopId);
              if (!conn2) return;

              const seq3T2 = getSeq(r3.id, t2StopId);
              const seq3Duv = getSeq(r3.id, destinationStopId);

              if (seq3T2 !== null && seq3Duv !== null && seq3T2 < seq3Duv) {
                const t1Obj = stopsMap.get(t1StopId);
                const t2Obj = stopsMap.get(t2StopId);

                rawDiscoveredPaths.push({
                  type: "TRANSFER",
                  transfersCount: 2,
                  segments: [
                    makeSegment(r1.id, boardingStopId, t1StopId),
                    makeSegment(r2.id, t1StopId, t2StopId),
                    makeSegment(r3.id, t2StopId, destinationStopId),
                  ],
                  transfers: [
                    {
                      stopId: t1StopId,
                      stopName: t1Obj?.name || t1StopId.toUpperCase(),
                      fromRouteId: r1.id,
                      toRouteId: r2.id,
                      walkingDistanceMeters: conn1.walkingDistanceMeters,
                      estimatedTransferMinutes: conn1.estimatedTransferMinutes,
                    },
                    {
                      stopId: t2StopId,
                      stopName: t2Obj?.name || t2StopId.toUpperCase(),
                      fromRouteId: r2.id,
                      toRouteId: r3.id,
                      walkingDistanceMeters: conn2.walkingDistanceMeters,
                      estimatedTransferMinutes: conn2.estimatedTransferMinutes,
                    },
                  ],
                });
              }
            });
          });
        });
      });
    });
  }

  // ==========================================
  // 4. DEDUPLICATE & FORMAT DISCOVERED PATHS
  // ==========================================
  const uniquePathKeys = new Set<string>();
  const formattedPaths: DiscoveredPath[] = [];

  rawDiscoveredPaths.forEach((raw) => {
    const pathKey = raw.segments
      .map((s) => `${s.routeId}:${s.fromStopId}->${s.toStopId}`)
      .join("|");

    if (uniquePathKeys.has(pathKey)) return;
    uniquePathKeys.add(pathKey);

    const pathId = `path_${raw.segments.map((s) => `${s.routeId}_${s.fromStopId}`).join("_")}_duvvada`;

    let pathSummary = "";
    if (raw.type === "DIRECT") {
      const rName = raw.segments[0].routeName;
      pathSummary = `${rName} → Duvvada Direct`;
    } else {
      pathSummary = raw.segments
        .map((s) => s.routeName)
        .join(" → ") + " → Duvvada";
    }

    formattedPaths.push({
      pathId,
      type: raw.type,
      transfersCount: raw.transfersCount,
      segments: raw.segments,
      transfers: raw.transfers,
      predictedDuvvadaArrival: "ETA unavailable",
      predictedCollegeArrival: "ETA unavailable",
      totalMinutesToCollege: null,
      activeStudentCount: 0,
      crowdLevel: "NO DATA",
      confidence: "LOW",
      status: "ETA UNAVAILABLE",
      etaStatus: "ETA_UNAVAILABLE",
      liveStatus: "NO LIVE DATA",
      rankingScore: 50 - raw.transfersCount * 15,
      pathSummary,
      boardingStopName: boardingStop.name,
      badgeTag: raw.transfersCount === 0 ? "Direct Duvvada" : `${raw.transfersCount} Transfer`,
      isRecommended: false,
    });
  });

  return formattedPaths;
}
