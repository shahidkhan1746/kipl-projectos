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
