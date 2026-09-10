import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Unauthenticated liveness + identity endpoints, mounted under the global
 * `api/v1` prefix.
 */
@Public()
@SkipThrottle()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * GET /api/v1/health
   *
   * Exists so a client can tell "I am talking to the KIPL API" apart from
   * "something else answered". That distinction is not academic: the mobile
   * app shipped with a base URL pointing at the Vercel-hosted website, whose
   * catch-all SPA rewrite answers a POST with 405 and a GET with HTML. To the
   * app that looked exactly like a rejected login, and site staff were told to
   * check credentials that were never wrong.
   *
   * `service` is the marker clients match on — do not rename it. It must stay
   * public (no auth) or the check cannot run before sign-in, which is the only
   * moment it is useful.
   */
  @Get('health')
  getHealth() {
    return {
      service: 'kipl-projectos-api',
      status: 'ok',
      time: new Date().toISOString(),
    };
  }
}
