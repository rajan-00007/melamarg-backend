import { analyticsRepository, VisitorSessionRecord } from './analytics.repository';

export class AnalyticsService {
  async trackVisit(eventId: string, deviceId: string, platform: string): Promise<VisitorSessionRecord> {
    if (!eventId || !deviceId) {
      throw new Error('Event ID and Device ID are required for tracking visits.');
    }
    const cleanPlatform = (platform || 'web').toLowerCase();
    return analyticsRepository.upsertVisitorSession(eventId, deviceId, cleanPlatform);
  }

  async getEventAnalytics(eventId: string): Promise<any> {
    if (!eventId) {
      throw new Error('Event ID is required.');
    }

    const [
      visitors,
      poiDensity,
      poisList,
      meetups,
      parking,
      overview
    ] = await Promise.all([
      analyticsRepository.getVisitorStats(eventId),
      analyticsRepository.getPoiDensityStats(eventId),
      analyticsRepository.getPoiDetailsForFiltering(eventId),
      analyticsRepository.getMeetupStats(eventId),
      analyticsRepository.getParkingStats(eventId),
      analyticsRepository.getEventOverview(eventId)
    ]);

    // Construct the formatted response
    return {
      eventId,
      visitors: {
        total: visitors.reduce((sum, current) => sum + current.count, 0),
        distribution: visitors // e.g. [{ platform: 'web', count: 12 }, { platform: 'android', count: 8 }]
      },
      poiDensity: {
        summary: poiDensity, // [{ category_id, category_name, category_icon, category_color, zone_id, zone_name, count }]
        allPois: poisList // Detail list of active POIs with categories and zones for client-side filtering
      },
      meetups, // { totalGroups, totalMembers, activeMembers24h, groupsDetail }
      parking, // { lots: [...], reservationStatusCounts: [...] }
      overview // { zonesCount, nodesCount, edgesCount, notificationsCount, bundlesCount, highlightsCount, feedbackCount, feedbackAvgRating }
    };
  }
}

export const analyticsService = new AnalyticsService();
