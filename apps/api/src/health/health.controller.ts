import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller()
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get('health')
  getHealth() {
    return {
      app: 'BID Hub',
      status: 'ok',
      environment: this.config.get('NODE_ENV'),
      timestamp: new Date().toISOString(),
    };
  }
}
