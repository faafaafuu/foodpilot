import { Test } from '@nestjs/testing';
import { HealthController } from '../src/health/health.controller';
import { HealthModule } from '../src/health/health.module';

describe('HealthController', () => {
  it('returns API health status', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const response = controller.getHealth();

    expect(response).toMatchObject({
      status: 'ok',
      service: 'foodpilot-api',
    });
    expect(typeof response.timestamp).toBe('string');
  });
});
