import { createQueue, enqueue } from '../config/queue.js';

/**
 * Fila de notificações in-app (badges, audit log, triggers).
 * Consumer: src/queues/workers.ts (Worker 'notification').
 */

export type NotificationChannel = 'inapp' | 'webhook' | 'slack';

export interface NotificationJob {
  tenantId: string;
  userId?: string;
  channel: NotificationChannel;
  kind: 'ticket' | 'order' | 'member' | 'plan' | 'system';
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}

export const notificationQueue = createQueue<NotificationJob>('notification');

export function queueNotification(job: NotificationJob): Promise<void> {
  return enqueue(notificationQueue, job, job.dedupeKey);
}