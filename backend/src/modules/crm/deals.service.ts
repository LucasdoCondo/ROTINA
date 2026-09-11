import { BadRequestError, ConflictError } from '../../shared/errors.js';
import { requireTenantContext } from '../../shared/tenant-context.js';
import {
  DEAL_CLOSED_STAGES,
  DEAL_STAGE_TRANSITIONS,
  DEAL_STAGES,
} from '../../domain/constants.js';
import type { AuthUser } from '../../types/http.js';
import { DealRepository } from './deals.repository.js';
import { EntityNotFoundError } from '../../shared/tenant-repository.js';
import type {
  CreateDealInput,
  ListDealsQuery,
  MoveDealStageInput,
  UpdateDealInput,
} from './deals.schema.js';

const repository = new DealRepository();

export const dealService = {
  /**
   * Criação de negociação. RBAC: ADMIN/AGENT (rota).
   * - customer deve existir no tenant (400 com código claro).
   * - stage inicial: informado ou LEAD; WON/LOST direto é permitido
   *   (importação de negócios já fechados) e preenche closed_at.
   */
  async create(auth: AuthUser, input: CreateDealInput) {
    const { tenantId } = requireTenantContext();

    const customer = await repository.findCustomer(input.customerId);
    if (!customer) {
      throw new BadRequestError('Customer not found in this tenant', 'CUSTOMER_NOT_FOUND');
    }
    if (input.ownerId) {
      await assertValidOwner(input.ownerId);
    }

    const stage = input.stage ?? 'LEAD';
    const closedAt = isClosedStage(stage) ? new Date() : null;

    return repository.create({
      tenantId,
      customerId: input.customerId,
      title: input.title,
      value: input.value,
      currency: input.currency,
      stage,
      probability: input.probability,
      expectedCloseAt: input.expectedCloseAt,
      closedAt,
      ownerId: input.ownerId ?? auth.userId,
    } as never);
  },

  /** Listagem paginada e filtrada, sempre scoped por tenant. */
  async list(auth: AuthUser, query: ListDealsQuery) {
    const customerId =
      query.customer === 'me' ? auth.userId : query.customer ?? undefined;
    const ownerId =
      query.owner === 'me' ? auth.userId : query.owner ?? undefined;

    const { rows, total } = await repository.list({
      stage: query.stage,
      customerId,
      ownerId,
      q: query.q,
      sort: query.sort,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      rows,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  },

  /**
   * GET /deals/funnel — visão agregada do pipeline por estágio.
   * Uma linha por estágio conhecido (inclusive vazios) + totais globais.
   */
  async funnel() {
    const stages = await repository.funnel(DEAL_STAGES);

    const openStages = stages.filter((s) => !isClosedStage(s.stage));
    const openCount = openStages.reduce((acc, s) => acc + s.count, 0);
    const openValue = openStages.reduce((acc, s) => acc + s.total, 0);
    const won = stages.find((s) => s.stage === 'WON');
    const lost = stages.find((s) => s.stage === 'LOST');
    const closedCount = (won?.count ?? 0) + (lost?.count ?? 0);

    return {
      stages,
      summary: {
        openCount,
        openValue,
        wonCount: won?.count ?? 0,
        wonValue: won?.total ?? 0,
        lostCount: lost?.count ?? 0,
        // Win rate sobre negócios encerrados (0 se não houver encerrados).
        winRate: closedCount === 0 ? 0 : Math.round(((won?.count ?? 0) / closedCount) * 100),
      },
    };
  },

  /** Detalhe com customer e owner (404 se fora do tenant). */
  async getById(_auth: AuthUser, id: string) {
    const deal = await repository.findById(id);
    if (!deal) throw new EntityNotFoundError('Deal', id);
    return deal;
  },
};

function isClosedStage(stage: string): boolean {
  return (DEAL_CLOSED_STAGES as readonly string[]).includes(stage);
}

/**
 * Atualização parcial. Se incluir `stage`, aplica a máquina de estados
 * (mesmas regras do endpoint dedicado de movimentação).
 */
export async function updateDeal(
  auth: AuthUser,
  id: string,
  input: UpdateDealInput,
) {
  const existing = await repository.findById(id);
  if (!existing) throw new EntityNotFoundError('Deal', id);

  if (input.ownerId) {
    await assertValidOwner(input.ownerId);
  }

  const patch: Record<string, unknown> = { ...input };
  if (input.stage !== undefined && input.stage !== existing.stage) {
    assertTransition(existing.stage, input.stage);
    patch.closedAt = isClosedStage(input.stage) ? new Date() : null;
  }

  return repository.update(id, patch as never);
}

/**
 * PATCH /deals/:id/stage — movimentação explícita no pipeline (kanban).
 * Transições válidas: ver DEAL_STAGE_TRANSITIONS; WON/LOST são terminais
 * e preenchem closed_at conforme o destino.
 */
export async function moveDealStage(
  auth: AuthUser,
  id: string,
  input: MoveDealStageInput,
) {
  const existing = await repository.findById(id);
  if (!existing) throw new EntityNotFoundError('Deal', id);

  if (input.stage !== existing.stage) {
    assertTransition(existing.stage, input.stage);
  }

  return repository.update(id, {
    stage: input.stage,
    closedAt: isClosedStage(input.stage) ? new Date() : null,
  } as never);
}

/** Soft delete (solo ADMIN — RBAC en la ruta). */
export async function removeDeal(_auth: AuthUser, id: string): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) throw new EntityNotFoundError('Deal', id);
  await repository.softDelete(id);
}

/** Valida a transição de estágio; 400 com código específico se inválida. */
function assertTransition(from: string, to: string): void {
  const allowed = DEAL_STAGE_TRANSITIONS[from as keyof typeof DEAL_STAGE_TRANSITIONS];
  if (!allowed.includes(to as never)) {
    throw new BadRequestError(
      `Invalid deal stage transition: ${from} → ${to}`,
      'INVALID_DEAL_STAGE_TRANSITION',
    );
  }
}

/** Garante que o owner indicado é ADMIN/AGENT ativo do próprio tenant. */
async function assertValidOwner(ownerId: string): Promise<void> {
  const owner = await repository.findAvailableOwner(ownerId);
  if (!owner) {
    throw new ConflictError(
      'Owner must be an active ADMIN or AGENT of this tenant',
      'INVALID_DEAL_OWNER',
    );
  }
}