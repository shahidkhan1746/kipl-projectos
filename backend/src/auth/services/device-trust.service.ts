import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDevice } from '../entities/user-device.entity';
import { RefreshToken } from '../refresh-token.entity';

export interface DeviceMetadata {
  deviceId?: string;
  deviceName?: string;
  deviceFingerprint?: string;
}

export interface DeviceAssessment {
  device?: UserDevice;
  isTrusted: boolean;
  trustScore: number;
  deviceId: string;
  deviceName: string;
  isNewDevice?: boolean;
}

@Injectable()
export class DeviceTrustService {
  private readonly logger = new Logger(DeviceTrustService.name);

  constructor(
    @InjectRepository(UserDevice)
    private readonly deviceRepo: Repository<UserDevice>,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  /**
   * Derives a class C subnet (/24) for IPv4 or prefix for IPv6/localhost to
   * cluster dynamic IP changes within the same ISP/office network.
   */
  deriveSubnet(ip: string): string {
    const clean = (ip || '').replace(/^::ffff:/, '').trim();
    if (!clean || clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') {
      return '127.0.0.0/8';
    }
    const ipv4Parts = clean.split('.');
    if (ipv4Parts.length === 4) {
      return `${ipv4Parts[0]}.${ipv4Parts[1]}.${ipv4Parts[2]}.0/24`;
    }
    // IPv6 /64 prefix
    const ipv6Parts = clean.split(':');
    if (ipv6Parts.length >= 4) {
      return `${ipv6Parts.slice(0, 4).join(':')}::/64`;
    }
    return clean;
  }

  calculateTrustScore(
    device: UserDevice,
    ip: string,
    subnet: string,
    fingerprint?: string,
  ): number {
    let score = 50; // recognized device ID baseline
    const fingerprintMatch =
      !!fingerprint &&
      fingerprint !== 'unknown' &&
      device.deviceFingerprint === fingerprint;
    if (fingerprintMatch) score += 25;

    const subnetMatch = device.subnet === subnet || device.ipAddress === ip;
    if (subnetMatch) score += 25;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluates device signals (persistent cryptographic device ID, hardware
   * fingerprint, and subnet clustering) to calculate trust score (0-100).
   */
  async assessAndRecord(
    userId: string,
    meta: DeviceMetadata,
    rawIp?: string,
    userAgent?: string,
  ): Promise<DeviceAssessment> {
    const ip = rawIp || '127.0.0.1';
    const ua = userAgent || 'Unknown';
    const subnet = this.deriveSubnet(ip);
    const deviceId = (meta.deviceId || '').trim() || `dev_${Math.random().toString(36).slice(2, 12)}`;
    const deviceName = (meta.deviceName || '').trim() || 'Browser Client';
    const fingerprint = (meta.deviceFingerprint || '').trim() || undefined;

    const device = await this.deviceRepo.findOne({
      where: { userId, deviceId },
    });

    if (device) {
      const score = this.calculateTrustScore(device, ip, subnet, fingerprint);
      device.loginCount = (device.loginCount || 0) + 1;
      device.lastActiveAt = new Date();
      device.ipAddress = ip;
      device.subnet = subnet;
      device.userAgent = userAgent || device.userAgent;
      device.deviceName = deviceName || device.deviceName;
      device.trustScore = score;
      device.isTrusted = device.isTrusted !== false; // preserve explicit revocation

      await this.deviceRepo.save(device);

      return {
        device,
        isTrusted: device.isTrusted,
        trustScore: score,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        isNewDevice: false,
      };
    }

    // New device for this user
    const newDevice = this.deviceRepo.create({
      userId,
      deviceId,
      deviceName,
      deviceFingerprint: fingerprint || 'unknown',
      ipAddress: ip,
      subnet,
      userAgent: userAgent || 'Unknown User-Agent',
      isTrusted: true,
      trustScore: 85, // New device baseline on successful credential verification
      loginCount: 1,
      lastActiveAt: new Date(),
    });

    await this.deviceRepo.save(newDevice);

    return {
      device: newDevice,
      isTrusted: true,
      trustScore: 85,
      deviceId,
      deviceName,
      isNewDevice: true,
    };
  }

  /**
   * Lists recognized systems for the user with details and active device indicator.
   */
  async listUserDevices(userId: string, currentDeviceId?: string) {
    const devices = await this.deviceRepo.find({
      where: { userId },
      order: { lastActiveAt: 'DESC' },
    });

    return devices.map(d => ({
      id: d.id,
      deviceId: d.deviceId,
      deviceName: d.deviceName,
      ipAddress: d.ipAddress,
      subnet: d.subnet,
      isTrusted: d.isTrusted,
      trustScore: d.trustScore,
      lastActiveAt: d.lastActiveAt,
      loginCount: d.loginCount,
      isCurrentDevice: !!currentDeviceId && d.deviceId === currentDeviceId,
    }));
  }

  /**
   * Revokes a specific device and its active sessions.
   */
  async revokeDevice(userId: string, deviceId: string) {
    await this.deviceRepo.update({ userId, deviceId }, { isTrusted: false });
    await this.refreshRepo
      .createQueryBuilder()
      .delete()
      .where('"user_id" = :uid AND "device_id" = :did', { uid: userId, did: deviceId })
      .execute();
    return { ok: true, revokedDeviceId: deviceId };
  }

  /**
   * Revokes all devices other than the current one (security panic button).
   */
  async revokeAllOtherDevices(userId: string, currentDeviceId: string) {
    const otherDevices = await this.deviceRepo
      .createQueryBuilder()
      .where('"user_id" = :uid AND "device_id" != :did', { uid: userId, did: currentDeviceId })
      .getMany();

    if (otherDevices.length > 0) {
      await this.deviceRepo
        .createQueryBuilder()
        .update(UserDevice)
        .set({ isTrusted: false })
        .where('"user_id" = :uid AND "device_id" != :did', { uid: userId, did: currentDeviceId })
        .execute();

      await this.refreshRepo
        .createQueryBuilder()
        .delete()
        .where('"user_id" = :uid AND ("device_id" != :did OR "device_id" IS NULL)', { uid: userId, did: currentDeviceId })
        .execute();
    }

    return { ok: true, count: otherDevices.length };
  }
}
