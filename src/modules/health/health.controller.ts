import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'MOA NEXUS API',
    };
  }

  @Get('sentry-debug')
  getError() {
    throw new Error('Sentry Backend Test Error!');
  }
}
