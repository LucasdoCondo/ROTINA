/**
 * Controller de Assinatura - Endpoints para gerenciamento de planos e checkout
 * 
 * Fluxo completo de cobrança:
 * 1. GET /api/assinatura/planos → Lista planos disponíveis
 * 2. POST /api/assinatura/checkout → Cria sessão de checkout no gateway
 * 3. Usuário paga no gateway (PIX, Boleto, Cartão)
 * 4. Gateway envia webhook → subscriptionService.processWebhookEvent()
 * 5. GET /api/webhooks/status → Frontend verifica status atualizado
 */

const prisma = require('../config/prisma');
const { subscriptionService, PLANS } = require('../services/subscriptionService');

const subscriptionController = {
  /**
   * Lista todos os planos disponíveis
   * GET /api/assinatura/planos
   */
  async listarPlanos(req, res) {
    try {
      const planos = subscriptionService.getPlans();
      
      res.json({
        planos,
        total: planos.length
      });

    } catch (error) {
      console.error('Erro ao listar planos:', error);
      res.status(500).json({
        message: 'Erro ao listar planos'
      });
    }
  },

  /**
   * Cria uma sessão de checkout para o tenant atual
   * POST /api/assinatura/checkout
   * 
   * Body: { planId: string, billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' }
   */
  async criarCheckout(req, res) {
    try {
      const tenantId = req.tenantId;
      const { planId, billingType = 'PIX' } = req.body;

      if (!planId) {
        return res.status(400).json({
          message: 'ID do plano é obrigatório',
          code: 'MISSING_PLAN_ID'
        });
      }

      // Validar se o plano existe
      const plan = PLANS[planId];
      if (!plan) {
        return res.status(400).json({
          message: 'Plano não encontrado',
          code: 'PLAN_NOT_FOUND'
        });
      }

      // Buscar dados do tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cnpj: true,
          plan: true
        }
      });

      if (!tenant) {
        return res.status(404).json({
          message: 'Empresa não encontrada',
          code: 'TENANT_NOT_FOUND'
        });
      }

      // Criar assinatura no Asaas
      const result = await subscriptionService.createSubscription(
        tenant,
        planId,
        billingType
      );

      res.status(201).json({
        message: 'Checkout criado com sucesso',
        checkout: result.checkout,
        subscription: {
          id: result.subscription.id,
          status: result.subscription.status,
          planId: result.subscription.planId,
          currentPeriodEnd: result.subscription.currentPeriodEnd
        }
      });

    } catch (error) {
      if (error.message === 'SUBSCRIPTION_ALREADY_ACTIVE') {
        return res.status(409).json({
          message: 'Assinatura já está ativa',
          code: 'SUBSCRIPTION_ALREADY_ACTIVE'
        });
      }

      console.error('Erro ao criar checkout:', error);
      res.status(500).json({
        message: 'Erro ao criar checkout',
        error: error.message
      });
    }
  },

  /**
   * Retorna os detalhes da assinatura do tenant atual
   * GET /api/assinatura/minha-assinatura
   */
  async minhaAssinatura(req, res) {
    try {
      const tenantId = req.tenantId;

      const subscription = await prisma.subscription.findUnique({
        where: { tenantId },
        select: {
          id: true,
          gateway: true,
          status: true,
          planId: true,
          currentPeriodEnd: true,
          paymentAttempts: true,
          lastPaymentAttempt: true,
          lastInvoiceUrl: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!subscription) {
        return res.status(404).json({
          message: 'Nenhuma assinatura encontrada',
          code: 'NO_SUBSCRIPTION'
        });
      }

      // Calcular dias restantes
      const now = new Date();
      const daysRemaining = Math.ceil(
        (subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24)
      );

      // Buscar detalhes do plano
      const plan = PLANS[subscription.planId];

      res.json({
        subscription: {
          ...subscription,
          daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
          isExpired: now > subscription.currentPeriodEnd
        },
        plan: plan || null
      });

    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      res.status(500).json({
        message: 'Erro ao buscar assinatura'
      });
    }
  },

  /**
   * Cancela a assinatura do tenant atual (apenas ADMIN)
   * POST /api/assinatura/cancelar
   */
  async cancelarAssinatura(req, res) {
    try {
      const tenantId = req.tenantId;

      await subscriptionService.cancelManually(tenantId);

      res.json({
        message: 'Assinatura cancelada com sucesso'
      });

    } catch (error) {
      if (error.message === 'SUBSCRIPTION_NOT_FOUND') {
        return res.status(404).json({
          message: 'Assinatura não encontrada',
          code: 'SUBSCRIPTION_NOT_FOUND'
        });
      }

      console.error('Erro ao cancelar assinatura:', error);
      res.status(500).json({
        message: 'Erro ao cancelar assinatura'
      });
    }
  },

  /**
   * Retorna o histórico de pagamentos da assinatura
   * GET /api/assinatura/historico
   */
  async historicoPagamentos(req, res) {
    try {
      const tenantId = req.tenantId;

      const subscription = await prisma.subscription.findUnique({
        where: { tenantId },
        select: {
          asaasSubscriptionId: true,
          stripeSubscriptionId: true
        }
      });

      if (!subscription) {
        return res.status(404).json({
          message: 'Nenhuma assinatura encontrada'
        });
      }

      // Buscar histórico no Asaas
      let pagamentos = [];
      if (subscription.asaasSubscriptionId) {
        const asaasService = require('../services/asaasService');
        pagamentos = await asaasService.listPayments(
          subscription.asaasSubscriptionId
        );
      }

      res.json({
        pagamentos: pagamentos.map(p => ({
          id: p.id,
          value: p.value,
          netValue: p.netValue,
          billingType: p.billingType,
          status: p.status,
          dueDate: p.dueDate,
          confirmedDate: p.confirmedDate,
          invoiceUrl: p.invoiceUrl,
          pixQrCode: p.pixQrCode
        }))
      });

    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      res.status(500).json({
        message: 'Erro ao buscar histórico de pagamentos'
      });
    }
  }
};

module.exports = subscriptionController;