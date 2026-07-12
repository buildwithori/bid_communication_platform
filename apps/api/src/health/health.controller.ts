import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { API_HEALTH_PATH, BID_APP_NAME } from '@bid/shared';

@Controller()
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get(API_HEALTH_PATH)
  getHealth() {
    return {
      app: BID_APP_NAME,
      status: 'ok',
      environment: this.config.get('NODE_ENV'),
      timestamp: new Date().toISOString(),
    };
  }
}
