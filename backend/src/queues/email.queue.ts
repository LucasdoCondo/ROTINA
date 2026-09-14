import { createQueue, enqueue } from '../config/queue.js';

/**
 * Fila de e-mails (transaccionales y de campanha).
 * Consumer: src/queues/workers.ts (Worker 'email').
 */

export interface EmailJob {
  to: string;
  subject: string;
  template: 'invitation' | 'ticket-update' | 'order-confirmation' | 'plan-change' | 'generic';
  data: Record<string, unknown>;
  /** Idempotência opcional: evita duplicar e-mails para o mesmo evento. */
  dedupeKey?: string;
}

// Fila singleton (criada na primeira importação).
export const emailQueue = createQueue<EmailJob>('email');

export function queueEmail(job: EmailJob): Promise<void> {
  return enqueue(emailQueue, job, job.dedupeKey);
}