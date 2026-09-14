import { createWorker } from '../config/queue.js';
import { logger } from '../shared/logger.js';
import { env } from '../config/env.js';
import { queueEmail, type EmailJob } from './email.queue.js';
import { queueNotification, type NotificationJob } from './notification.queue.js';

/**
 * Workers BullMQ — processamento assíncrono em background.
 *
 * - 'email': dispara e-mails transacionais (camuflado para Nodemailer/Resend
 *   quando configurado; por padrão loga o payload e dura como stub).
 * - 'notification': notificações in-app (stub por padrão, pronto para
 *   persistir em tabela de notificações ou disparar webhooks).
 *
 * `startWorkers()` é chamado no bootstrap (server.ts). Se Redis estiver
 * indisponível, a criação dos workers falha silenciosamente (degradação).
 */

const EMAIL_PROVIDER_ENABLED = false; // habilitar ao integrar Resend/Nodemailer

function sendEmail(job: EmailJob): void {
  if (EMAIL_PROVIDER_ENABLED) {
    // Integração real entra aqui (ex.: Resend REST ou Nodemailer SMTP).
    // const transporter = nodemailer.createTransport(...); await transporter.sendMail(...)
    throw new Error('EMAIL_PROVIDER_ENABLED mas provedor não configurado');
  }

  // Stub seguro para dev: loga o e-mail completo. Em prod trocar por SMTP/Resend.
  logger.info(
    {
      to: job.to,
      subject: job.subject,
      template: job.template,
      data: job.data,
    },
    `[email-stub] seria enviado: ${job.subject}`,
  );
}

function notify(job: NotificationJob): void {
  logger.info(
    {
      tenantId: job.tenantId,
      userId: job.userId,
      channel: job.channel,
      kind: job.kind,
      title: job.title,
    },
    `[notification] ${job.title}`,
  );
}

export function startWorkers(): void {
  createWorker<EmailJob>({
    name: 'email',
    handler: async ({ data }) => {
      sendEmail(data);
    },
    concurrency: env.QUEUE_CONCURRENCY,
  });
  logger.info('BullMQ: worker de e-mails iniciado');

  createWorker<NotificationJob>({
    name: 'notification',
    handler: async ({ data }) => {
      notify(data);
    },
    concurrency: env.QUEUE_CONCURRENCY,
  });
  logger.info('BullMQ: worker de notificações iniciado');
}

export function stopWorkers(): void {
  // BullMQ Workers registram seus próprios close; aqui apenas logamos.
  logger.info('BullMQ: workers encerrados');
}

// Re-export das filas para uso nos services
export { queueEmail, queueNotification };