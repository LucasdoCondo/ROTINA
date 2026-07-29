# Arquitetura Prática - Guia de Implementação

Guia complementar com exemplos executáveis de código para a arquitetura SaaS recomendada.

## 📋 Índice

1. [Configuração Inicial do Projeto](#1-configuração-inicial-do-projeto)
2. [Migração do Banco de Dados (Prisma)](#2-migração-do-banco-de-dados-prisma)
3. [Sistema de Autenticação](#3-sistema-de-autenticação)
4. [Implementação de RBAC](#4-implementação-de-rbac)
5. [Background Jobs com BullMQ](#5-background-jobs-com-bullmq)
6. [Integração com Gateway de Pagamento](#6-integração-com-gateway-de-pagamento)
7. [Testes Automatizados](#7-testes-automatizados)

---

## 1. Configuração Inicial do Projeto

### 1.1 Criar Projeto NestJS

```bash
# Instalar NestJS CLI
npm install -g @nestjs/cli

# Criar novo projeto
nest new saas-backend
cd saas-backend

# Instalar dependências
npm install @nestjs/typeorm @nestjs/typeorm @nestjs/jwt @nestjs/passport
npm install @prisma/client @nestjs/swagger class-validator class-transformer
npm install bcrypt helmet cors express-rate-limit winston
npm install @nestjs/config ioredis bullmq
npm install axios

# Dependências de desenvolvimento
npm install -D @types/bcrypt @types/jsonwebtoken @types/passport-jwt
npm install -D @types/node typescript ts-node nodemon
npm install -D jest @types/jest supertest @types/supertest
```

### 1.2 Estrutura de Pastas

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── guards/
│   │   │   ├── strategies/
│   │   │   ├── services/
│   │   │   └── auth.controller.ts
│   │   │   └── auth.module.ts
│   │   ├── tenants/
│   │   ├── usuarios/
│   │   ├── chamados/
│   │   ├── clientes/
│   │   ├── produtos/
│   │   ├── pedidos/
│   │   └── membros/
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── guards/
│   ├── config/
│   │   ├── database/
│   │   ├── redis/
│   │   └── queues/
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
└── package.json
```

---

## 2. Migração do Banco de Dados (Prisma)

### 2.1 Schema Prisma (baseado no schema.sql atual)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id               String    @id @default(uuid())
  nome             String
  cnpj             String?   @unique
  email            String    @unique
  telefone         String?
  endereco         String?
  plano            String    @default("basic")
  ativo            Boolean   @default(true)
  dataCriacao      DateTime  @default(now())
  dataAtualizacao  DateTime  @updatedAt

  // Relacionamentos
  usuarios      Usuario[]
  chamados      Chamado[]
  clientes      Cliente[]
  produtos      Produto[]
  pedidos       Pedido[]
  membros       Membro[]
  modulos       TenantModulo[]
  permissoes    Permissao[]
  roles         Role[]

  @@map("tenants")
}

model Usuario {
  id               String    @id @default(uuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  nome             String
  email            String
  senha            String
  cargo            String    @default("user")
  avatarUrl        String?
  emailVerificado  Boolean   @default(false)
  ativo            Boolean   @default(true)
  ultimoLogin      DateTime?
  dataCriacao      DateTime  @default(now())
  dataAtualizacao  DateTime  @updatedAt
  
  // RBAC
  roleId           String?
  role             Role?     @relation(fields: [roleId], references: [id])

  // Relacionamentos
  chamados         Chamado[]
  pedidos          Pedido[]
  membros          Membro[]
  usuariosOnline   UsuarioOnline[]

  @@unique([tenantId, email])
  @@map("usuarios")
}

model Role {
  id          String       @id @default(uuid())
  tenantId    String
  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  nome        String
  descricao   String?

  // Relacionamentos
  usuarios    Usuario[]
  permissaos  RolePermissao[]

  @@unique([tenantId, nome])
  @@map("roles")
}

model Permissao {
  id          String       @id @default(uuid())
  tenantId    String
  tenant      Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  codigo      String
  descricao   String?

  // Relacionamentos
  roles       RolePermissao[]

  @@unique([tenantId, codigo])
  @@map("permissoes")
}

model RolePermissao {
  roleId       String
  role         Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  permissaoId  String
  permissao    Permissao @relation(fields: [permissaoId], references: [id], onDelete: Cascade)

  @@id([roleId, permissaoId])
  @@map("role_permissoes")
}

model TenantModulo {
  id               String    @id @default(uuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  modulo           String
  ativo            Boolean   @default(true)
  dataAtivacao     DateTime  @default(now())
  dataDesativacao  DateTime?

  @@unique([tenantId, modulo])
  @@map("tenant_modulos")
}

model UsuarioOnline {
  id                  String    @id @default(uuid())
  usuarioId           String
  usuario             Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  
  tenantId            String
  tenant              Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  token               String    @unique
  dataLogin           DateTime  @default(now())
  dataUltimaAtividade DateTime  @default(now())

  @@map("usuarios_online")
}

model Chamado {
  id               String    @id @default(uuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  usuarioId        String
  usuario          Usuario   @relation(fields: [usuarioId], references: [id])
  
  titulo           String
  descricao        String?
  categoria        String?
  prioridade       String    @default("media")
  status           String    @default("aberto")
  dataAbertura     DateTime  @default(now())
  dataFechamento   DateTime?
  dataAtualizacao  DateTime  @updatedAt

  @@map("chamados")
}

model Cliente {
  id               String    @id @default(uuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  nome             String
  cpfCnpj          String?
  email            String?
  telefone         String?
  endereco         String?
  status           String    @default("ativo")
  origem           String?
  dataPrimeiraCompra DateTime?
  dataCriacao      DateTime  @default(now())
  dataAtualizacao  DateTime  @updatedAt

  pedidos          Pedido[]

  @@map("clientes")
}

model Produto {
  id               String    @id @default(uuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  nome             String
  descricao        String?
  preco            Decimal   @db.Decimal(10, 2)
  estoque          Int       @default(0)
  categoria        String?
  imagemUrl        String?
  ativo            Boolean   @default(true)
  dataCriacao      DateTime  @default(now())
  dataAtualizacao  DateTime  @updatedAt

  @@map("produtos")
}

model Pedido {
  id               String    @id @default(uuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  clienteId        String
  cliente          Cliente   @relation(fields: [clienteId], references: [id])
  
  status           String    @default("pendente")
  valorTotal       Decimal   @db.Decimal(10, 2)
  dataPedido       DateTime  @default(now())
  dataPagamento    DateTime?
  dataEnvio        DateTime?
  dataEntrega      DateTime?

  @@map("pedidos")
}

model Membro {
  id               String    @id @default(uuid())
  tenantId         String
  tenant           Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  usuarioId        String
  usuario          Usuario   @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  
  tipoPlano        String
  dataInicio       DateTime  @db.Date
  dataFim          DateTime? @db.Date
  valorMensal      Decimal   @db.Decimal(10, 2)?
  status           String    @default("ativo")
  dataCriacao      DateTime  @default(now())

  @@map("membros")
}
```

### 2.2 Configuração do Prisma Client

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Criar tenant de exemplo
  const tenant = await prisma.tenant.upsert({
    where: { email: 'admin@exemplo.com' },
    update: {},
    create: {
      nome: 'Empresa Exemplo',
      email: 'admin@exemplo.com',
      plano: 'enterprise',
    },
  });

  // Criar role master
  const roleMaster = await prisma.role.upsert({
    where: { 
      tenantId_nome: {
        tenantId: tenant.id,
        nome: 'master'
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      nome: 'master',
      descricao: 'Acesso total ao sistema',
    },
  });

  // Criar permissões
  const permissoes = [
    { codigo: 'dashboard:view', descricao: 'Visualizar dashboard' },
    { codigo: 'usuarios:view', descricao: 'Visualizar usuários' },
    { codigo: 'usuarios:create', descricao: 'Criar usuários' },
    { codigo: 'chamados:view', descricao: 'Visualizar chamados' },
    { codigo: 'clientes:view', descricao: 'Visualizar clientes' },
  ];

  for (const permissao of permissoes) {
    await prisma.permissao.upsert({
      where: {
        tenantId_codigo: {
          tenantId: tenant.id,
          codigo: permissao.codigo
        }
      },
      update: {},
      create: {
        ...permissao,
        tenantId: tenant.id,
      },
    });
  }

  // Criar usuário master
  const senhaHash = await bcrypt.hash('admin123', 10);
  
  const usuario = await prisma.usuario.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@exemplo.com'
      }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      nome: 'Administrador',
      email: 'admin@exemplo.com',
      senha: senhaHash,
      cargo: 'master',
      roleId: roleMaster.id,
    },
  });

  console.log('Seed executado:', { tenant, usuario });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

### 2.3 Configuração do Prisma Module (NestJS)

```typescript
// src/config/database.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from 'nestjs-prisma';

@Module({
  imports: [
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        prismaOptions: {
          log: ['query', 'info', 'warn', 'error'],
        },
      },
    }),
  ],
})
export class DatabaseModule {}
```

---

## 3. Sistema de Autenticação

### 3.1 DTOs de Autenticação

```typescript
// src/modules/auth/dto/login.dto.ts
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { z } from 'zod';

// Zod schema (frontend)
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export type LoginDTO = z.infer<typeof loginSchema>;

// Class-validator (backend)
export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  senha: string;
}
```

### 3.2 Service de Autenticação

```typescript
// src/modules/auth/services/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'nestjs-prisma';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, senha: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { email },
      include: { tenant: true, role: { include: { permissaos: { include: { permissao: true } } } } },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Senha incorreta');
    }

    if (!usuario.ativo) {
      throw new UnauthorizedException('Conta desativada');
    }

    if (!usuario.tenant.ativo) {
      throw new UnauthorizedException('Empresa desativada');
    }

    return usuario;
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.validateUser(loginDto.email, loginDto.senha);

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      tenantId: usuario.tenantId,
      role: usuario.cargo,
    };

    const token = this.jwtService.sign(payload);

    // Registrar sessão online
    await this.prisma.usuarioOnline.create({
      data: {
        usuarioId: usuario.id,
        tenantId: usuario.tenantId,
        token,
      },
    });

    // Atualizar último login
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    return {
      access_token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        tenant: {
          id: usuario.tenant.id,
          nome: usuario.tenant.nome,
          plano: usuario.tenant.plano,
        },
        permissoes: usuario.role?.permissaos.map(p => p.permissao.codigo) || [],
      },
    };
  }

  async registrarTenant(data: any) {
    return this.prisma.$transaction(async (tx) => {
      // Criar tenant
      const tenant = await tx.tenant.create({
        data: {
          nome: data.nomeEmpresa,
          email: data.emailEmpresa,
          cnpj: data.cnpj,
          plano: data.plano || 'basic',
        },
      });

      // Criar role master
      const roleMaster = await tx.role.create({
        data: {
          tenantId: tenant.id,
          nome: 'master',
          descricao: 'Acesso total',
        },
      });

      // Hash da senha
      const senhaHash = await bcrypt.hash(data.usuarioSenha, 10);

      // Criar usuário master
      const usuario = await tx.usuario.create({
        data: {
          tenantId: tenant.id,
          nome: data.usuarioNome,
          email: data.usuarioEmail,
          senha: senhaHash,
          cargo: 'master',
          roleId: roleMaster.id,
        },
      });

      // Ativar módulos padrão
      const modulos = ['dashboard', 'crm', 'chamados', 'ecommerce', 'membros'];
      for (const modulo of modulos) {
        await tx.tenantModulo.create({
          data: {
            tenantId: tenant.id,
            modulo,
            ativo: true,
          },
        });
      }

      // Criar permissões básicas
      const permissoesBasicas = [
        'dashboard:view',
        'usuarios:view',
        'usuarios:create',
        'chamados:view',
        'clientes:view',
      ];

      for (const codigo of permissoesBasicas) {
        const permissao = await tx.permissao.create({
          data: {
            tenantId: tenant.id,
            codigo,
          },
        });

        await tx.rolePermissao.create({
          data: {
            roleId: roleMaster.id,
            permissaoId: permissao.id,
          },
        });
      }

      return { tenant, usuario };
    });
  }
}
```

---

## 4. Implementação de RBAC

### 4.1 Guard de Permissão

```typescript
// src/common/guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: string[]) => {
  return (target: any, key?: string, descriptor?: any) => {
    if (descriptor) {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, descriptor.value);
    } else {
      Reflect.defineMetadata(PERMISSIONS_KEY, permissions, target);
    }
    return descriptor || target;
  };
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const userPermissions = user.permissoes || [];
    
    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Acesso negado: permissões insuficientes');
    }

    return true;
  }
}
```

### 4.2 Exemplo de Uso em Controller

```typescript
// src/modules/usuarios/usuarios.controller.ts
import { Controller, Get, Post, Put, Delete, Body, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/guards/permissions.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsuariosController {
  
  @Get()
  @RequirePermissions('usuarios:view')
  async listar() {
    // Listar usuários
  }

  @Post()
  @RequirePermissions('usuarios:create')
  async criar(@Body() data: any) {
    // Criar usuário
  }

  @Put(':id')
  @RequirePermissions('usuarios:edit')
  async atualizar(@Param('id') id: string, @Body() data: any) {
    // Atualizar usuário
  }

  @Delete(':id')
  @RequirePermissions('usuarios:delete')
  async deletar(@Param('id') id: string) {
    // Deletar usuário
  }
}
```

---

## 5. Background Jobs com BullMQ

### 5.1 Configuração do Redis

```typescript
// src/config/redis.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'relatorio' },
      { name: 'pagamento' },
      { name: 'notificacao' },
    ),
  ],
  exports: [BullModule],
})
export class RedisModule {}
```

### 5.2 Fila de E-mails

```typescript
// src/modules/notifications/processors/email.processor.ts
import { Processor, WorkerHost } from '@nestjs/bull';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modular/mailer';

interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Processor('email')
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private mailerService: MailerService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    this.logger.log(`Processando e-mail: ${job.data.subject}`);
    
    try {
      await this.mailerService.sendMail({
        to: job.data.to,
        subject: job.data.subject,
        template: job.data.template,
        context: job.data.context,
      });

      // Atualizar progresso
      await job.progress(100);
      this.logger.log(`E-mail enviado com sucesso: ${job.id}`);
    } catch (error) {
      this.logger.error(`Erro ao enviar e-mail: ${error.message}`);
      throw error; // BullMQ vai tentar novamente baseado em attempts
    }
  }
}
```

### 5.3 Service para Enfileirar Jobs

```typescript
// src/modules/notifications/services/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EmailJobData } from '../processors/email.processor';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async enviarEmailBoasVindas(usuarioId: string, email: string, nome: string) {
    await this.emailQueue.add(
      'boas-vindas',
      {
        to: email,
        subject: 'Bem-vindo ao sistema!',
        template: 'boas-vindas',
        context: { nome },
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        jobId: `boas-vindas-${usuarioId}`, // Evita duplicatas
      },
    );
  }

  async notificarChamadoAtualizado(
    email: string,
    chamadoId: string,
    titulo: string,
  ) {
    await this.emailQueue.add(
      'chamado-atualizado',
      {
        to: email,
        subject: `Chamado #${chamadoId} atualizado`,
        template: 'chamado-atualizado',
        context: { chamadoId, titulo },
      },
      {
        delay: 60000, // 1 minuto de delay
      },
    );
  }
}
```

---

## 6. Integração com Gateway de Pagamento

### 6.1 Integração com Asaas (Brasil)

```typescript
// src/modules/payments/services/asaas.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

interface AsaasSubscription {
  id: string;
  status: string;
  nextDueDate: string;
  value: number;
}

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);
  private readonly client: AxiosInstance;
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY!;
    this.apiUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.asaas.com/v3'
      : 'https://sandbox.asaas.com/api/v3';

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
    });
  }

  async criarCliente(
    nome: string,
    email: string,
    cpfCnpj: string,
    telefone?: string,
  ): Promise<AsaasCustomer> {
    try {
      const response = await this.client.post('/customers', {
        name,
        email,
        cpfCnpj,
        phone: telefone,
      });

      this.logger.log(`Cliente criado no Asaas: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Erro ao criar cliente no Asaas: ${error.message}`);
      throw error;
    }
  }

  async criarAssinatura(
    customerId: string,
    valor: number,
    diaVencimento: number,
    planoId: string,
  ): Promise<AsaasSubscription> {
    try {
      const response = await this.client.post('/subscriptions', {
        customer: customerId,
        billingType: 'CREDIT_CARD',
        value: valor,
        nextDueDate: this.getNextDueDate(diaVencimento),
        cycle: 'MONTHLY',
        description: `Assinatura ${planoId}`,
        externalReference: planoId,
      });

      this.logger.log(`Assinatura criada: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Erro ao criar assinatura: ${error.message}`);
      throw error;
    }
  }

  async criarCobrancaPIX(
    customerId: string,
    valor: number,
    vencimento: Date,
  ): Promise<any> {
    try {
      const response = await this.client.post('/payments', {
        customer: customerId,
        billingType: 'PIX',
        value: valor,
        dueDate: vencimento.toISOString().split('T')[0],
        description: 'Pagamento via PIX',
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Erro ao criar cobrança PIX: ${error.message}`);
      throw error;
    }
  }

  async getStatusAssinatura(subscriptionId: string): Promise<AsaasSubscription> {
    try {
      const response = await this.client.get(`/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Erro ao buscar assinatura: ${error.message}`);
      throw error;
    }
  }

  async cancelarAssinatura(subscriptionId: string): Promise<void> {
    try {
      await this.client.post(`/subscriptions/${subscriptionId}/cancel`);
      this.logger.log(`Assinatura cancelada: ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Erro ao cancelar assinatura: ${error.message}`);
      throw error;
    }
  }

  async processarWebhook(evento: any): Promise<void> {
    const { event, payment } = evento;

    switch (event) {
      case 'PAYMENT_RECEIVED':
        await this.processarPagamentoConfirmado(payment);
        break;
      case 'PAYMENT_OVERDUE':
        await this.processarPagamentoAtrasado(payment);
        break;
    }
  }

  private async processarPagamentoConfirmado(payment: any) {
    // Atualizar status do pedido/assinatura
    this.logger.log(`Pagamento confirmado: ${payment.id}`);
  }

  private async processarPagamentoAtrasado(payment: any) {
    // Enviar notificação de pagamento atrasado
    this.logger.log(`Pagamento atrasado: ${payment.id}`);
  }

  private getNextDueDate(dia: number): string {
    const date = new Date();
    date.setDate(dia);
    return date.toISOString().split('T')[0];
  }
}
```

### 6.2 Controller de Webhooks

```typescript
// src/modules/payments/controllers/webhooks.controller.ts
import { Controller, Post, Body, Headers, UseGuards, HttpCode } from '@nestjs/common';
import { AsaasService } from '../services/asaas.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private asaasService: AsaasService) {}

  @Post('asaas')
  @HttpCode(200)
  async webhookAsaas(
    @Body() payload: any,
    @Headers('asaas-access-token') token: string,
  ) {
    if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
      return { error: 'Token inválido' };
    }

    try {
      await this.asaasService.processarWebhook(payload);
      return { received: true };
    } catch (error) {
      console.error('Erro no webhook:', error);
      throw error;
    }
  }
}
```

---

## 7. Testes Automatizados

### 7.1 Configuração do Jest

```json
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

### 7.2 Exemplo de Teste de Service

```typescript
// src/modules/auth/services/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'nestjs-prisma';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            usuario: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            tenant: {
              findUnique: jest.fn(),
            },
            usuarioOnline: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('deve realizar login com sucesso', async () => {
      const mockUsuario = {
        id: '1',
        email: 'user@teste.com',
        senha: await bcrypt.hash('senha123', 10),
        ativo: true,
        tenant: {
          id: 'tenant-1',
          ativo: true,
          nome: 'Empresa Teste',
          plano: 'basic',
        },
        role: null,
      };

      jest.spyOn(prismaService.usuario, 'findFirst').mockResolvedValue(mockUsuario as any);
      jest.spyOn(jwtService, 'sign').mockReturnValue('token123');

      const result = await service.login({
        email: 'user@teste.com',
        senha: 'senha123',
      });

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('usuario');
      expect(result.usuario.email).toBe('user@teste.com');
    });

    it('deve retornar erro para senha incorreta', async () => {
      const mockUsuario = {
        id: '1',
        email: 'user@teste.com',
        senha: await bcrypt.hash('senha123', 10),
        ativo: true,
        tenant: { ativo: true },
        role: null,
      };

      jest.spyOn(prismaService.usuario, 'findFirst').mockResolvedValue(mockUsuario as any);

      await expect(
        service.login({
          email: 'user@teste.com',
          senha: 'senhaErrada',
        }),
      ).rejects.toThrow('UnauthorizedException');
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
```

---

## 📚 Recursos Adicionais

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io)
- [Asaas Documentation](https://docs.asaas.com)
- [Stripe Documentation](https://stripe.com/docs)

---

## ✅ Checklist de Implementação

- [ ] Setup inicial do projeto NestJS
- [ ] Configurar Prisma e migrar schema
- [ ] Implementar módulo de autenticação JWT
- [ ] Implementar RBAC completo
- [ ] Configurar Redis e BullMQ
- [ ] Implementar filas de e-mail, relatórios e notificações
- [ ] Integrar gateway de pagamento (Asaas/Stripe)
- [ ] Configurar webhooks
- [ ] Implementar testes automatizados
- [ ] Adicionar logs estruturados (Winston)
- [ ] Configurar monitoramento (Sentry)
- [ ] Migrar frontend para TypeScript
- [ ] Implementar componentes Shadcn UI
- [ ] Adicionar TanStack Table para grids
- [ ] Configurar React Hook Form + Zod

---

**Este documento fornece bases práticas para implementar a arquitetura SaaS recomendada. Adapte conforme suas necessidades específicas.**