/**
 * Espelho frontend da máquina de estágios do deal
 * (backend/src/domain/constants.ts → DEAL_STAGE_TRANSITIONS).
 * Mantido local para a UI oferecer apenas transições válidas sem
 * round-trip — o backend continua sendo a autoridade (valida de novo).
 */
export const DEAL_STAGE_TRANSITIONS = {
  LEAD: ['QUALIFICATION', 'LOST'],
  QUALIFICATION: ['LEAD', 'PROPOSAL', 'LOST'],
  PROPOSAL: ['QUALIFICATION', 'NEGOTIATION', 'LOST'],
  NEGOTIATION: ['PROPOSAL', 'WON', 'LOST'],
  WON: [],
  LOST: [],
} as const;

/** Rótulo e descrição curta por estágio para o Kanban. */
export const DEAL_STAGE_META = {
  LEAD: { label: 'Lead', hint: 'Contato inicial' },
  QUALIFICATION: { label: 'Em Contato', hint: 'Qualificação' },
  PROPOSAL: { label: 'Proposta', hint: 'Proposta enviada' },
  NEGOTIATION: { label: 'Negociação', hint: 'Ajustes finais' },
  WON: { label: 'Fechado', hint: 'Ganho ✓' },
  LOST: { label: 'Perdido', hint: 'Encerrado ✕' },
} as const;
