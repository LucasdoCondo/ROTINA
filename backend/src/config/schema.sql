-- Sistema SaaS - Schema Inicial
-- PostgreSQL

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de tenants (empresas)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  telefone VARCHAR(20),
  endereco TEXT,
  plano VARCHAR(50) DEFAULT 'basic',
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  senha VARCHAR(255) NOT NULL,
  cargo VARCHAR(100) DEFAULT 'user',
  avatar_url TEXT,
  email_verificado BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMP,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, email)
);

-- Tabela de módulos por tenant
CREATE TABLE IF NOT EXISTS tenant_modulos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  modulo VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  data_ativacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_desativacao TIMESTAMP,
  UNIQUE(tenant_id, modulo)
);

-- Tabela de usuários online (para dashboard)
CREATE TABLE IF NOT EXISTS usuarios_online (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  data_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_ultima_atividade TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de chamados (tickets)
CREATE TABLE IF NOT EXISTS chamados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(100),
  prioridade VARCHAR(50) DEFAULT 'media',
  status VARCHAR(50) DEFAULT 'aberto',
  data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_fechamento TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes (CRM)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(18),
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  status VARCHAR(50) DEFAULT 'ativo',
  origem VARCHAR(100),
  data_primeira_compra DATE,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de produtos (e-commerce)
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL,
  estoque INTEGER DEFAULT 0,
  categoria VARCHAR(100),
  imagem_url TEXT,
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de pedidos (e-commerce)
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id),
  status VARCHAR(50) DEFAULT 'pendente',
  valor_total DECIMAL(10,2) NOT NULL,
  data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_pagamento TIMESTAMP,
  data_envio TIMESTAMP,
  data_entrega TIMESTAMP
);

-- Tabela de membros/assinaturas
CREATE TABLE IF NOT EXISTS membros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_plano VARCHAR(100) NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  valor_mensal DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'ativo',
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chamados_tenant ON chamados(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_membros_tenant ON membros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);

-- Trigger para atualizar data_atualizacao
CREATE OR REPLACE FUNCTION update_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger nas tabelas relevantes
DROP TRIGGER IF EXISTS trigger_update_tenants ON tenants;
CREATE TRIGGER trigger_update_tenants BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_data_atualizacao();

DROP TRIGGER IF EXISTS trigger_update_usuarios ON usuarios;
CREATE TRIGGER trigger_update_usuarios BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_data_atualizacao();