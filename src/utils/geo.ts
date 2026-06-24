/**
 * Calculates the great-circle distance between two points on the Earth's surface 
 * using the Haversine formula.
 * @returns Distance in kilometers
 */
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks if a point is inside a polygon boundary using the Ray-Casting algorithm.
 * @param point Coordinate to test: { latitude: number; longitude: number }
 * @param polygon List of coordinate vertices: { lat: number; lng: number }[] or { latitude: number; longitude: number }[]
 * @returns boolean
 */
export function isPointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: any[]
): boolean {
  if (!polygon || polygon.length < 3) return false;
  
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pI = polygon[i];
    const pJ = polygon[j];
    
    const xi = pI.lng !== undefined ? pI.lng : pI.longitude;
    const yi = pI.lat !== undefined ? pI.lat : pI.latitude;
    const xj = pJ.lng !== undefined ? pJ.lng : pJ.longitude;
    const yj = pJ.lat !== undefined ? pJ.lat : pJ.latitude;
    
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) {
      continue;
    }
    
    const intersect = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
      
    if (intersect) inside = !inside;
  }
  
  return inside;
}
