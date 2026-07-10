/**
 * @file dijkstra.ts
 * @description StadiumPulse AI – Memoized Dijkstra shortest path solver.
 * Finds optimal pedestrian routes between gates, sections, and concourses at MetLife Stadium.
 */

interface Edge {
  node: string;
  weight: number;
}

const STADIUM_GRAPH: Record<string, Edge[]> = {
  'gate-1': [
    { node: 'north-concourse', weight: 3 },
    { node: 'east-concourse', weight: 7 }
  ],
  'gate-2': [
    { node: 'east-concourse', weight: 4 },
    { node: 'south-concourse', weight: 6 }
  ],
  'gate-3': [
    { node: 'south-concourse', weight: 3 },
    { node: 'west-concourse', weight: 8 }
  ],
  'gate-4': [
    { node: 'west-concourse', weight: 5 },
    { node: 'north-concourse', weight: 5 }
  ],
  'north-concourse': [
    { node: 'gate-1', weight: 3 },
    { node: 'gate-4', weight: 5 },
    { node: 'sec-100', weight: 2 },
    { node: 'west-concourse', weight: 6 }
  ],
  'east-concourse': [
    { node: 'gate-1', weight: 7 },
    { node: 'gate-2', weight: 4 },
    { node: 'sec-200', weight: 3 },
    { node: 'south-concourse', weight: 8 }
  ],
  'south-concourse': [
    { node: 'gate-2', weight: 6 },
    { node: 'gate-3', weight: 3 },
    { node: 'sec-300', weight: 2 },
    { node: 'east-concourse', weight: 8 }
  ],
  'west-concourse': [
    { node: 'gate-3', weight: 8 },
    { node: 'gate-4', weight: 5 },
    { node: 'sec-400', weight: 3 },
    { node: 'north-concourse', weight: 6 }
  ],
  'sec-100': [{ node: 'north-concourse', weight: 2 }],
  'sec-200': [{ node: 'east-concourse', weight: 3 }],
  'sec-300': [{ node: 'south-concourse', weight: 2 }],
  'sec-400': [{ node: 'west-concourse', weight: 3 }]
};

// Caching and metrics
const dijkstraCache = new Map<string, { path: string[]; distance: number }>();
let dijkstraHits = 0;
let dijkstraMisses = 0;

export interface DijkstraResult {
  path: string[];
  distance: number;
  cached: boolean;
  timeMs: number;
}

/**
 * Calculates the shortest path between two nodes in MetLife Stadium using Dijkstra's algorithm.
 * Results are cached (memoized) for subsequent calls.
 * 
 * @param {string} start - The starting node (e.g. 'gate-1')
 * @param {string} end - The destination node (e.g. 'sec-300')
 * @returns {DijkstraResult} Shortest path array, distance, and performance telemetry
 */
export function findShortestPath(start: string, end: string): DijkstraResult {
  const cacheKey = `${start}->${end}`;
  const cachedVal = dijkstraCache.get(cacheKey);

  if (cachedVal !== undefined) {
    dijkstraHits++;
    return {
      path: cachedVal.path,
      distance: cachedVal.distance,
      cached: true,
      timeMs: 0,
    };
  }

  const t0 = performance.now();
  dijkstraMisses++;

  // Initialize Dijkstra data structures
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const unvisited = new Set<string>();

  for (const node of Object.keys(STADIUM_GRAPH)) {
    distances[node] = Infinity;
    previous[node] = null;
    unvisited.add(node);
  }
  distances[start] = 0;

  while (unvisited.size > 0) {
    // Find node in unvisited with smallest distance
    let currentNode: string | null = null;
    let minDistance = Infinity;

    for (const node of unvisited) {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        currentNode = node;
      }
    }

    if (currentNode === null || distances[currentNode] === Infinity) {
      break;
    }

    if (currentNode === end) {
      break;
    }

    unvisited.delete(currentNode);

    const neighbors = STADIUM_GRAPH[currentNode] ?? [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.node)) continue;
      const alt = distances[currentNode] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = currentNode;
      }
    }
  }

  // Backtrack path
  const path: string[] = [];
  let u: string | null = end;

  if (previous[u] !== null || u === start) {
    while (u !== null) {
      path.unshift(u);
      u = previous[u];
    }
  }

  const distance = distances[end] === Infinity ? -1 : distances[end];
  const result = { path, distance };

  if (distance !== -1) {
    dijkstraCache.set(cacheKey, result);
  }

  return {
    path,
    distance,
    cached: false,
    timeMs: parseFloat((performance.now() - t0).toFixed(4)),
  };
}

/**
 * Returns performance cache telemetry data for pathfinding metrics.
 */
export function getDijkstraMetrics() {
  return {
    hits: dijkstraHits,
    misses: dijkstraMisses,
    cacheSize: dijkstraCache.size,
  };
}

/**
 * Clear dijkstra cache (helper for benchmarking)
 */
export function clearDijkstraCache() {
  dijkstraCache.clear();
  dijkstraHits = 0;
  dijkstraMisses = 0;
}
