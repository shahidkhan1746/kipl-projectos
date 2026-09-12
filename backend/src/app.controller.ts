import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Unauthenticated liveness + identity endpoints, mounted under the global
 * `api/v1` prefix.
 */
/** When this process came up. A commit that never changes across restarts is
 *  a stuck deploy; a startedAt that never moves is a process that never
 *  restarted, which tells them apart. */
const STARTED_AT = new Date().toISOString();

/** The commit the running build was made from, or 'unknown' off-platform. */
export function deployedCommit(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const raw = env.RENDER_GIT_COMMIT || env.GIT_COMMIT || env.SOURCE_COMMIT || '';
  const commit = raw.trim();
  return /^[0-9a-f]{7,40}$/i.test(commit) ? commit.slice(0, 12) : 'unknown';
}

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
   *
   * `commit` answers the other question this endpoint kept being needed for:
   * which code is actually running. A whole class of fault looks like a bug in
   * the code you are reading and is really the host still serving an older
   * build — a fix that cannot work because it was never deployed, and hours
   * spent debugging the difference. Render sets RENDER_GIT_COMMIT on every
   * deploy; anywhere else, GIT_COMMIT or SOURCE_COMMIT will do. It is a public
   * commit hash of a private repository, which discloses nothing.
   */
  @Get('health')
  getHealth() {
    return {
      service: 'kipl-projectos-api',
      status: 'ok',
      commit: deployedCommit(),
      startedAt: STARTED_AT,
      time: new Date().toISOString(),
    };
  }
}
