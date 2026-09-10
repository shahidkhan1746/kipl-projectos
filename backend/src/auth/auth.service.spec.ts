import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService, REFRESH_ROTATION_GRACE_MS } from './auth.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService - Multi-Tab Refresh & Hardening', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;
  let config: any;
  let refreshRepo: any;
  let tokensInDb: any[];

  const dummyPassword = 'SecretPassword123!';
  let dummyHash: string;

  beforeAll(async () => {
    dummyHash = await bcrypt.hash(dummyPassword, 4);
  });

  beforeEach(() => {
    tokensInDb = [];

    const activeUser = {
      id: 'user-1',
      name: 'Shahid Khan',
      email: 'admin@kipl.com',
      role: 'super_admin',
      passwordHash: dummyHash,
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
    };

    usersService = {
      findByEmail: jest.fn(async (email: string) => {
        if (email === 'admin@kipl.com') return { ...activeUser };
        return null;
      }),
      findById: jest.fn(async (id: string) => {
        if (id === 'user-1') return { ...activeUser };
        return null;
      }),
      findByPasswordResetHash: jest.fn(),
      update: jest.fn(async (id: string, patch: any) => {
        Object.assign(activeUser, patch);
        return activeUser;
      }),
      updateLastLogin: jest.fn(),
      resetPassword: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(async (payload: any) => {
        if (payload.type === 'refresh') return `rt-${payload.sub}-${Date.now()}-${Math.random()}`;
        return `at-${payload.sub}-${payload.role}`;
      }),
      verify: jest.fn((token: string) => {
        if (token.startsWith('rt-user-1')) {
          return { sub: 'user-1', type: 'refresh' };
        }
        if (token.startsWith('rt-user-2')) {
          return { sub: 'user-2', type: 'refresh' };
        }
        throw new Error('Invalid signature');
      }),
    };

    config = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        return null;
      }),
    };

    refreshRepo = {
      create: jest.fn((item: any) => ({ id: `token-${Date.now()}-${Math.random()}`, ...item })),
      save: jest.fn(async (item: any) => {
        const row = { ...item };
        tokensInDb.push(row);
        return row;
      }),
      findOne: jest.fn(async ({ where }: any) => {
        return tokensInDb.find(t => t.tokenHash === where.tokenHash) || null;
      }),
      update: jest.fn(async (id: string, patch: any) => {
        const found = tokensInDb.find(t => t.id === id);
        if (found) Object.assign(found, patch);
      }),
      delete: jest.fn(async (criteria: any) => {
        if (criteria?.id) {
          tokensInDb = tokensInDb.filter(t => t.id !== criteria.id);
        } else if (criteria?.tokenHash) {
          tokensInDb = tokensInDb.filter(t => t.tokenHash !== criteria.tokenHash);
        } else if (criteria?.user?.id) {
          tokensInDb = tokensInDb.filter(t => t.user?.id !== criteria.user.id);
        }
      }),
      createQueryBuilder: jest.fn(() => ({
        delete: () => ({
          where: () => ({
            execute: async () => {
              tokensInDb = [];
            },
          }),
        }),
      })),
    };

    service = new AuthService(usersService, jwtService, config, refreshRepo);
  });

  describe('Login & Lockout', () => {
    it('authenticates active user and issues session', async () => {
      const session = await service.login('admin@kipl.com', dummyPassword);
      expect(session.access_token).toBe('at-user-1-super_admin');
      expect(session.refresh_token).toContain('rt-user-1');
      expect(usersService.update).toHaveBeenCalledWith('user-1', { failedLoginCount: 0, lockedUntil: null });
      expect(tokensInDb).toHaveLength(1);
    });

    it('increments failed count on wrong password', async () => {
      await expect(service.login('admin@kipl.com', 'wrongpassword')).rejects.toThrow(UnauthorizedException);
      expect(usersService.update).toHaveBeenCalledWith('user-1', { failedLoginCount: 1 });
    });

    it('locks account after 5 consecutive failed attempts', async () => {
      for (let i = 1; i <= 4; i++) {
        await expect(service.login('admin@kipl.com', 'bad')).rejects.toThrow(UnauthorizedException);
      }
      expect(usersService.update).toHaveBeenLastCalledWith('user-1', { failedLoginCount: 4 });

      // 5th attempt locks the account
      await expect(service.login('admin@kipl.com', 'bad')).rejects.toThrow(UnauthorizedException);
      const lastCall = usersService.update.mock.calls[usersService.update.mock.calls.length - 1];
      expect(lastCall[1].failedLoginCount).toBe(5);
      expect(lastCall[1].lockedUntil).toBeInstanceOf(Date);
    });

    it('rejects login while account is locked', async () => {
      usersService.findByEmail.mockResolvedValueOnce({
        id: 'user-1',
        email: 'admin@kipl.com',
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // locked for 10 more minutes
      });
      await expect(service.login('admin@kipl.com', dummyPassword)).rejects.toThrow('Account temporarily locked');
    });
  });

  describe('Multi-Tab Refresh & Grace Window', () => {
    it('shortens rotated token to 30s grace window on first rotation', async () => {
      const loginSession = await service.login('admin@kipl.com', dummyPassword);
      const originalToken = loginSession.refresh_token;
      expect(tokensInDb).toHaveLength(1);
      const stored = tokensInDb[0];
      const initialExpiry = new Date(stored.expiresAt).getTime();

      // Tab 1 calls refresh
      const newSession = await service.refresh(originalToken);
      expect(newSession.access_token).toBe('at-user-1-super_admin');
      expect(newSession.refresh_token).not.toBe(originalToken);

      // The original token is NOT deleted; its expiry is shortened to ~30s
      const updatedOriginal = tokensInDb.find(t => t.id === stored.id);
      expect(updatedOriginal).toBeDefined();
      const shortenedExpiry = new Date(updatedOriginal.expiresAt).getTime();
      expect(shortenedExpiry).toBeLessThan(initialExpiry);
      expect(shortenedExpiry).toBeLessThanOrEqual(Date.now() + REFRESH_ROTATION_GRACE_MS + 1000);
      expect(shortenedExpiry).toBeGreaterThan(Date.now());
    });

    it('allows sibling tab to refresh with the SAME token within the grace window', async () => {
      const loginSession = await service.login('admin@kipl.com', dummyPassword);
      const originalToken = loginSession.refresh_token;
      const initialCount = tokensInDb.length;

      // Tab 1 refreshes
      const tab1Session = await service.refresh(originalToken);
      expect(tab1Session).toBeDefined();

      // Tab 2 refreshes 2 seconds later with the same original token (in grace window)
      const tab2Session = await service.refresh(originalToken);
      expect(tab2Session).toBeDefined();
      expect(tab2Session.access_token).toBe('at-user-1-super_admin');

      // Crucial: Tab 2 did NOT wipe out Tab 1's tokens!
      // We now have the original (in grace) + tab1's token + tab2's token in DB
      expect(tokensInDb.length).toBeGreaterThanOrEqual(initialCount + 2);
    });

    it('does not extend the grace window on subsequent sibling calls', async () => {
      const loginSession = await service.login('admin@kipl.com', dummyPassword);
      const originalToken = loginSession.refresh_token;

      // Tab 1 refreshes
      await service.refresh(originalToken);
      const originalRow = tokensInDb.find(t => t.tokenHash === (service as any).hashToken(originalToken));
      const firstRotationExpiry = new Date(originalRow.expiresAt).getTime();

      // Tab 2 refreshes shortly after
      await service.refresh(originalToken);
      const secondRotationExpiry = new Date(originalRow.expiresAt).getTime();

      // The expiry must remain the same (not pushed forward again)
      expect(secondRotationExpiry).toBe(firstRotationExpiry);
    });

    it('revokes all user tokens when a token is reused AFTER the grace window expires', async () => {
      const loginSession = await service.login('admin@kipl.com', dummyPassword);
      const originalToken = loginSession.refresh_token;

      // Tab 1 refreshes
      await service.refresh(originalToken);
      expect(tokensInDb.length).toBe(2); // original + new

      // Simulate time passing: grace window expires
      const originalRow = tokensInDb.find(t => t.tokenHash === (service as any).hashToken(originalToken));
      originalRow.expiresAt = new Date(Date.now() - 5000); // 5 seconds in the past

      // Attacker or stale tab attempts to use the expired rotated token
      await expect(service.refresh(originalToken)).rejects.toThrow('Refresh token expired or revoked');

      // All tokens for this user must have been wiped out
      expect(tokensInDb).toHaveLength(0);
    });

    it('revokes all user tokens when an unknown token is presented with valid payload', async () => {
      await service.login('admin@kipl.com', dummyPassword);
      expect(tokensInDb).toHaveLength(1);

      // Present a token signed for user-1 that is NOT in the database
      const rogueToken = 'rt-user-1-rogue';
      await expect(service.refresh(rogueToken)).rejects.toThrow('Refresh token expired or revoked');

      // The genuine tokens for user-1 are wiped
      expect(tokensInDb).toHaveLength(0);
    });
  });

  describe('Logout & Session Cleanup', () => {
    it('deletes token on logout by hash', async () => {
      const session = await service.login('admin@kipl.com', dummyPassword);
      expect(tokensInDb).toHaveLength(1);

      await service.logout(session.refresh_token);
      expect(tokensInDb).toHaveLength(0);
    });

    it('deletes all user tokens when userId is provided to logout', async () => {
      await service.login('admin@kipl.com', dummyPassword);
      expect(tokensInDb).toHaveLength(1);

      await service.logout(undefined, 'user-1');
      expect(tokensInDb).toHaveLength(0);
    });
  });
});
