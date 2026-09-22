import { DeviceTrustService } from './device-trust.service';

describe('DeviceTrustService', () => {
  let service: DeviceTrustService;
  let mockDeviceRepo: any;
  let mockRefreshRepo: any;

  beforeEach(() => {
    mockDeviceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(d => ({ ...d })),
      save: jest.fn(d => Promise.resolve(d)),
      update: jest.fn(() => Promise.resolve()),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    mockRefreshRepo = {
      createQueryBuilder: jest.fn(() => ({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    service = new DeviceTrustService(mockDeviceRepo, mockRefreshRepo);
  });

  describe('deriveSubnet', () => {
    it('clusters IPv4 addresses into a /24 subnet', () => {
      expect(service.deriveSubnet('103.24.120.45')).toBe('103.24.120.0/24');
      expect(service.deriveSubnet('103.24.120.99')).toBe('103.24.120.0/24');
      expect(service.deriveSubnet('192.168.1.15')).toBe('192.168.1.0/24');
    });

    it('handles localhost and loopback gracefully', () => {
      expect(service.deriveSubnet('127.0.0.1')).toBe('127.0.0.0/8');
      expect(service.deriveSubnet('::1')).toBe('127.0.0.0/8');
    });
  });

  describe('assessAndRecord', () => {
    it('registers a new device on successful login', async () => {
      mockDeviceRepo.findOne.mockResolvedValue(null);

      const assessment = await service.assessAndRecord(
        'user-123',
        { deviceId: 'dev-abc', deviceName: 'Chrome on Windows', deviceFingerprint: 'fp-xyz' },
        '103.24.120.45',
        'Mozilla/5.0 Chrome/128.0',
      );

      expect(assessment.isTrusted).toBe(true);
      expect(assessment.trustScore).toBe(85);
      expect(assessment.deviceId).toBe('dev-abc');
      expect(mockDeviceRepo.save).toHaveBeenCalled();
    });

    it('increases trust score when existing device matches fingerprint and subnet', async () => {
      const existing = {
        userId: 'user-123',
        deviceId: 'dev-abc',
        deviceName: 'Chrome on Windows',
        deviceFingerprint: 'fp-xyz',
        ipAddress: '103.24.120.45',
        subnet: '103.24.120.0/24',
        userAgent: 'Mozilla/5.0',
        isTrusted: true,
        trustScore: 85,
        loginCount: 5,
        lastActiveAt: new Date(),
      };
      mockDeviceRepo.findOne.mockResolvedValue(existing);

      const assessment = await service.assessAndRecord(
        'user-123',
        { deviceId: 'dev-abc', deviceName: 'Chrome on Windows', deviceFingerprint: 'fp-xyz' },
        '103.24.120.99', // same /24 subnet!
        'Mozilla/5.0 Chrome/128.0',
      );

      expect(assessment.isTrusted).toBe(true);
      expect(assessment.trustScore).toBe(100); // 50 (known ID) + 25 (matching FP) + 25 (matching subnet)
      expect(existing.loginCount).toBe(6);
    });
  });

  describe('listUserDevices', () => {
    it('returns formatted device list highlighting current device', async () => {
      mockDeviceRepo.find.mockResolvedValue([
        {
          id: '1',
          deviceId: 'dev-1',
          deviceName: 'Windows PC',
          ipAddress: '103.24.120.45',
          subnet: '103.24.120.0/24',
          isTrusted: true,
          trustScore: 100,
          lastActiveAt: new Date(),
          loginCount: 12,
        },
      ]);

      const list = await service.listUserDevices('user-123', 'dev-1');
      expect(list).toHaveLength(1);
      expect(list[0].isCurrentDevice).toBe(true);
    });
  });

  describe('revokeDevice', () => {
    it('marks device as untrusted and purges its refresh tokens', async () => {
      const res = await service.revokeDevice('user-123', 'dev-abc');
      expect(res.ok).toBe(true);
      expect(mockDeviceRepo.update).toHaveBeenCalledWith(
        { userId: 'user-123', deviceId: 'dev-abc' },
        { isTrusted: false },
      );
    });
  });
});
