import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    // The mobile app matches on `service` to decide whether the address it was
    // given is the KIPL API or some other host answering. Renaming the field,
    // or the value, silently breaks that check — hence a test on the literal.
    it('identifies the service so a client can verify the endpoint', () => {
      expect(appController.getHealth().service).toBe('kipl-projectos-api');
      expect(appController.getHealth().status).toBe('ok');
    });

    it('reports a parseable current timestamp', () => {
      const t = Date.parse(appController.getHealth().time);
      expect(Number.isNaN(t)).toBe(false);
      expect(Math.abs(Date.now() - t)).toBeLessThan(5000);
    });
  });
});

import { deployedCommit } from './app.controller'

/**
 * Why this is here at all: a fault that looks like a bug in the code you are
 * reading, and is really the host serving an older build. The endpoint is
 * unauthenticated, so "which commit is live" is answerable before sign-in,
 * which is exactly when a broken deploy shows itself.
 */
describe('deployedCommit', () => {
  it('reads the commit Render sets on every deploy', () => {
    expect(deployedCommit({ RENDER_GIT_COMMIT: 'c671f387449d037f92d7816757e9c2fd64569c6d' } as never))
      .toBe('c671f387449d')
  })

  it('accepts the other names a host might use', () => {
    expect(deployedCommit({ GIT_COMMIT: 'abcdef1234567' } as never)).toBe('abcdef123456')
    expect(deployedCommit({ SOURCE_COMMIT: 'abcdef1' } as never)).toBe('abcdef1')
  })

  it('prefers Render when more than one is set', () => {
    expect(deployedCommit({ RENDER_GIT_COMMIT: 'aaaaaaa', GIT_COMMIT: 'bbbbbbb' } as never))
      .toBe('aaaaaaa')
  })

  it('shortens a full hash rather than printing all forty characters', () => {
    expect(deployedCommit({ RENDER_GIT_COMMIT: 'a'.repeat(40) } as never)).toHaveLength(12)
  })

  it('says unknown rather than echoing something that is not a commit', () => {
    expect(deployedCommit({} as never)).toBe('unknown')
    expect(deployedCommit({ RENDER_GIT_COMMIT: '' } as never)).toBe('unknown')
    expect(deployedCommit({ RENDER_GIT_COMMIT: '   ' } as never)).toBe('unknown')
    expect(deployedCommit({ RENDER_GIT_COMMIT: 'refs/heads/main' } as never)).toBe('unknown')
    expect(deployedCommit({ RENDER_GIT_COMMIT: 'zzzzzzz' } as never)).toBe('unknown')
    expect(deployedCommit({ RENDER_GIT_COMMIT: 'abc' } as never)).toBe('unknown')
  })

  it('tolerates surrounding whitespace, which a shell export commonly leaves', () => {
    expect(deployedCommit({ RENDER_GIT_COMMIT: '  abcdef1  ' } as never)).toBe('abcdef1')
  })
})
