const prisma = require('../config/prisma');

class OrderService {
  async listar(tenantId, filtros = {}) {
    const { page = 1, limit = 20, status, search = '' } = filtros;
    const offset = (page - 1) * limit;

    const where = { tenantId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { orderDate: 'desc' },
        include: {
          client: {
            select: { id: true, name: true }
          },
          items: {
            include: {
              product: {
                select: { name: true }
              }
            }
          }
        }
      }),
      prisma.order.count({ where })
    ]);

    return {
      pedidos: orders.map(o => ({
        id: o.id,
        cliente_id: o.clientId,
        cliente_nome: o.client.name,
        status: o.status,
        valor_total: o.totalAmount,
        data_pedido: o.orderDate,
        data_pagamento: o.paymentDate,
        data_envio: o.shippingDate,
        data_entrega: o.deliveryDate,
        itens: o.items.map(i => ({
          produto_id: i.productId,
          produto_nome: i.product.name,
          quantidade: i.quantity,
          preco: i.price,
        })),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async buscarPorId(id, tenantId) {
    const order = await prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              }
            }
          }
        }
      }
    });

    if (!order) return null;

    return {
      id: order.id,
      cliente: order.client,
      status: order.status,
      valor_total: order.totalAmount,
      data_pedido: order.orderDate,
      data_pagamento: order.paymentDate,
      data_envio: order.shippingDate,
      data_entrega: order.deliveryDate,
      itens: order.items.map(i => ({
        produto_id: i.productId,
        produto_nome: i.product.name,
        quantidade: i.quantity,
        preco: i.price,
        subtotal: i.price * i.quantity,
      })),
    };
  }

  async criar(tenantId, data) {
    const { cliente_id, itens } = data;

    return prisma.$transaction(async (tx) => {
      // Calcular total e verificar estoque
      let totalAmount = 0;
      const orderItems = [];

      for (const item of itens) {
        const product = await tx.product.findUnique({
          where: { id: item.produtoId }
        });

        if (!product || product.tenantId !== tenantId) {
          throw new Error(`PRODUCT_NOT_FOUND: ${item.produtoId}`);
        }

        if (product.stock < item.quantidade) {
          throw new Error(`INSUFFICIENT_STOCK: ${product.name}`);
        }

        // Atualizar estoque
        await tx.product.update({
          where: { id: product.id },
          data: { stock: product.stock - item.quantidade }
        });

        const subtotal = product.price * item.quantidade;
        totalAmount += subtotal;

        orderItems.push({
          productId: product.id,
          quantity: item.quantidade,
          price: product.price,
        });
      }

      // Criar pedido
      const order = await tx.order.create({
        data: {
          tenantId,
          clientId: cliente_id,
          totalAmount,
          status: 'pending',
          items: {
            create: orderItems
          }
        },
        include: {
          client: {
            select: { id: true, name: true }
          },
          items: {
            include: {
              product: {
                select: { name: true }
              }
            }
          }
        }
      });

      return order;
    });
  }

  async atualizarStatus(id, tenantId, status) {
    const order = await prisma.order.findFirst({
      where: { id, tenantId }
    });

    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    const updateData = { status };
    if (status === 'paid') updateData.paymentDate = new Date();
    if (status === 'shipped') updateData.shippingDate = new Date();
    if (status === 'delivered') updateData.deliveryDate = new Date();

    return prisma.order.update({
      where: { id },
      data: updateData
    });
  }

  async getVendasPorDia(tenantId, dias = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dias);

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        orderDate: { gte: startDate }
      },
      select: {
        orderDate: true,
        totalAmount: true,
      },
      orderBy: { orderDate: 'asc' }
    });

    // Agrupar por dia
    const porDia = {};
    orders.forEach(o => {
      const dia = o.orderDate.toISOString().split('T')[0];
      if (!porDia[dia]) {
        porDia[dia] = { data: dia, total_vendas: 0, quantidade_pedidos: 0 };
      }
      porDia[dia].total_vendas += Number(o.totalAmount);
      porDia[dia].quantidade_pedidos += 1;
    });

    return Object.values(porDia);
  }

  async deletar(id, tenantId) {
    const order = await prisma.order.findFirst({
      where: { id, tenantId }
    });

    if (!order) {
      throw new Error('ORDER_NOT_FOUND');
    }

    return prisma.order.delete({
      where: { id }
    });
  }
}

module.exports = new OrderService();