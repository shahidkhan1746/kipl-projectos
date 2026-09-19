import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationCategory } from './notification.entity';
import { User, UserRole } from '../users/user.entity';
import { Employee } from '../hr/employee.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

export interface NotificationPayload {
  category?: NotificationCategory | string;
  type: string;
  title: string;
  message: string;
  link?: string;
  projectId?: string | null;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Employee)
    private readonly empRepo: Repository<Employee>,
  ) {}

  /**
   * Persist a notification for a single user
   */
  async notifyUser(userId: string, payload: NotificationPayload): Promise<Notification | null> {
    if (!userId) return null;
    try {
      const notif = this.repo.create({
        userId,
        projectId: payload.projectId || null,
        category: payload.category || NotificationCategory.INFO,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link || null,
        isRead: false,
        metadata: payload.metadata || {},
      });
      return await this.repo.save(notif);
    } catch (err: any) {
      this.logger.error(`Failed to create notification for user ${userId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Send notification to a batch of user IDs (deduplicated)
   */
  async notifyUsers(userIds: string[], payload: NotificationPayload, excludeUserId?: string): Promise<Notification[]> {
    const validIds = Array.from(new Set(userIds.filter((id) => !!id && id !== excludeUserId)));
    if (validIds.length === 0) return [];

    try {
      const records = validIds.map((userId) =>
        this.repo.create({
          userId,
          projectId: payload.projectId || null,
          category: payload.category || NotificationCategory.INFO,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          link: payload.link || null,
          isRead: false,
          metadata: payload.metadata || {},
        }),
      );
      return await this.repo.save(records);
    } catch (err: any) {
      this.logger.error(`Failed to batch create notifications: ${err.message}`);
      return [];
    }
  }

  /**
   * Notify all active users matching specified role(s)
   */
  async notifyRoles(
    roles: (UserRole | string)[],
    payload: NotificationPayload,
    excludeUserId?: string,
  ): Promise<Notification[]> {
    try {
      const users = await this.userRepo.find({
        where: { role: In(roles), isActive: true },
        select: ['id'],
      });
      const ids = users.map((u) => u.id);
      return await this.notifyUsers(ids, payload, excludeUserId);
    } catch (err: any) {
      this.logger.error(`Failed to notify roles [${roles.join(', ')}]: ${err.message}`);
      return [];
    }
  }

  /**
   * Notify Project Managers, Admins, and Super Admins
   */
  async notifyProjectManagers(
    payload: NotificationPayload,
    excludeUserId?: string,
  ): Promise<Notification[]> {
    return this.notifyRoles(
      [UserRole.PROJECT_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      payload,
      excludeUserId,
    );
  }

  /**
   * Notify an employee by resolving their linked user account (if any)
   */
  async notifyEmployee(
    employeeId: string,
    payload: NotificationPayload,
  ): Promise<Notification | null> {
    if (!employeeId) return null;
    try {
      const emp = await this.empRepo.findOne({ where: { id: employeeId }, select: ['id', 'userId'] });
      if (emp?.userId) {
        return await this.notifyUser(emp.userId, payload);
      }
      return null;
    } catch (err: any) {
      this.logger.error(`Failed to notify employee ${employeeId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetch recent notifications for a user
   */
  async getUserNotifications(
    userId: string,
    query?: { isRead?: boolean | string; category?: string; limit?: number },
  ): Promise<{ items: Notification[]; unreadCount: number }> {
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orderBy('n.createdAt', 'DESC');

    if (query?.isRead !== undefined) {
      const isReadBool = query.isRead === true || query.isRead === 'true';
      qb.andWhere('n.isRead = :isRead', { isRead: isReadBool });
    }

    if (query?.category) {
      qb.andWhere('n.category = :cat', { cat: query.category });
    }

    const limit = Math.min(Math.max(Number(query?.limit) || 30, 1), 100);
    qb.take(limit);

    const [items, unreadCount] = await Promise.all([
      qb.getMany(),
      this.repo.count({ where: { userId, isRead: false } }),
    ]);

    return { items, unreadCount };
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.repo.count({ where: { userId, isRead: false } });
    return { unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notif = await this.repo.findOne({ where: { id, userId } });
    if (!notif) throw new NotFoundException('Notification not found');

    notif.isRead = true;
    notif.readAt = new Date();
    return await this.repo.save(notif);
  }

  /**
   * Mark all unread notifications for a user as read
   */
  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const res = await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('userId = :userId AND isRead = false', { userId })
      .execute();

    return { updated: res.affected || 0 };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string, userId: string): Promise<{ success: boolean }> {
    const res = await this.repo.delete({ id, userId });
    return { success: (res.affected || 0) > 0 };
  }

  /**
   * Clear all read notifications
   */
  async clearReadNotifications(userId: string): Promise<{ deleted: number }> {
    const res = await this.repo
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('userId = :userId AND isRead = true', { userId })
      .execute();

    return { deleted: res.affected || 0 };
  }
}
