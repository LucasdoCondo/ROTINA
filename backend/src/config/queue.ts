import { Queue, Worker, type QueueOptions, type WorkerOptions } from 'bullmq';
import { Redis as IORedis } from 'ioredis';
import { env, IS_SERVERLESS } from './env.js';
import { logger } from '../shared/logger.js';

/**
 * Infraestrutura de colas BullMQ (procesamiento asíncrono).
 *
 * - Una única conexión Redis compartida por toda la app.
 * - `createQueue` y `createWorker` son factories tipadas.
 * - Falta de Redis ⇒ degradación silenciosa (las colas quedan no-ops)
 *   para que la API principal no muera si Redis cae.
 */

let connection: IORedis | null = null;

/** Aviso único: evita poluir os logs a cada invocação serverless. */
let avisouServerless = false;

/** Conexión compartida (ini-perezosa). Retorna null si REDIS_URL no está. */
export function getQueueConnection(): IORedis | null {
  if (!env.REDIS_URL) return null;

  // Serverless (Vercel): BullMQ exige conexões long-lived
  // (`maxRetriesPerRequest: null`) + loops de retry — incompatível com
  // functions efêmeras (a instância é congelada depois do request/response).
  // O processamento assíncrono roda em processo ISOLADO na OCI
  // (backend/src/worker.ts). Aqui as filas ficam no-op (degradação silenciosa).
  if (IS_SERVERLESS) {
    if (!avisouServerless) {
      avisouServerless = true;
      logger.info(
        'BullMQ: ambiente serverless detectado — filas desabilitadas (workers rodam na OCI)',
      );
    }
    return null;
  }

  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // BullMQ requiere retries ilimitados
    });
    connection.on('error', (err: Error) => {
      logger.error({ err }, 'BullMQ: erro de conexão Redis');
    });
  }
  return connection;
}

const defaultJobOptions = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 1000 },
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2_000 },
};

export function createQueue<T>(name: string): Queue<T> | null {
  const conn = getQueueConnection();
  if (!conn) {
    logger.warn({ name }, 'BullMQ: Redis indisponível, fila desabilitada');
    return null;
  }
  const options: QueueOptions = {
    connection: conn,
    defaultJobOptions,
  };
  return new Queue<T>(name, options);
}

export interface WorkerSpec<T> {
  name: string;
  handler: (job: { data: T }) => Promise<void>;
  concurrency?: number;
}

export function createWorker<T>(spec: WorkerSpec<T>): Worker<T> | null {
  const conn = getQueueConnection();
  if (!conn) return null;

  const workerOptions: WorkerOptions = {
    connection: conn,
    concurrency: spec.concurrency ?? env.QUEUE_CONCURRENCY,
  };

  return new Worker<T>(spec.name, async (job) => {
    await spec.handler({ data: job.data });
  }, workerOptions);
}

/** Encola con fallback silencioso (log) si la fila no está disponible. */
export async function enqueue<T>(queue: Queue<T> | null, payload: T, jobId?: string): Promise<void> {
  if (!queue) {
    logger.debug('BullMQ: fila indisponível, job ignorado');
    return;
  }
  // BullMQ v6 tipa el nombre del job con un condicional no resuelto en genéricos;
  // el cast es seguro: el nombre de job es un string libre por diseño.
  const q = queue as unknown as { add(name: string, data: T, opts?: { jobId?: string }): Promise<unknown> };
  await q.add('job', payload, { jobId });
}

export async function closeQueues(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}