export interface HealthStatus {
  status: 'ok';
  service: 'foodpilot-api';
  timestamp: string;
}

export class HealthService {
  getStatus(): HealthStatus {
    return {
      status: 'ok',
      service: 'foodpilot-api',
      timestamp: new Date().toISOString(),
    };
  }
}
