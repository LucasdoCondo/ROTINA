/**
 * AuditoriaDemo - Página de demonstração do componente AuditLogTable
 *
 * Usa dados mockados para teste visual, sem depender do backend.
 * Equivalente ao app/dashboard/audit/page.tsx do exemplo original.
 */
import { AuditLogTable } from '../components/audit/AuditLogTable';
import { History } from 'lucide-react';
import './Auditoria.css';

// Dados simulados para teste visual
const mockLogs = [
  {
    id: '1',
    userEmail: 'admin@empresa.com',
    action: 'UPDATE',
    entity: 'Cliente',
    entityId: 'cli_98721',
    oldValues: { name: 'Tech Solutions LTDA', status: 'PENDING', limit: 5000 },
    newValues: { name: 'Tech Solutions SA', status: 'ACTIVE', limit: 15000 },
    ipAddress: '191.185.10.45',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    userEmail: 'suporte@empresa.com',
    action: 'DELETE',
    entity: 'Fatura',
    entityId: 'inv_0012',
    oldValues: { amount: 150.0, client: 'João Silva', status: 'CANCELLED' },
    newValues: null,
    ipAddress: '201.82.190.12',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    userEmail: 'vendas@empresa.com',
    action: 'CREATE',
    entity: 'Pedido',
    entityId: 'ord_5543',
    oldValues: null,
    newValues: {
      produto: 'Licença Enterprise',
      quantidade: 3,
      valorTotal: 4500.0,
      cliente: 'Tech Solutions SA',
    },
    ipAddress: '191.185.10.45',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '4',
    userEmail: 'admin@empresa.com',
    action: 'LOGIN',
    entity: 'User',
    entityId: 'usr_001',
    oldValues: null,
    newValues: { loginAt: new Date().toISOString() },
    ipAddress: '191.185.10.45',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '5',
    userEmail: null,
    action: 'EXPORT',
    entity: 'Clientes',
    entityId: null,
    oldValues: null,
    newValues: null,
    ipAddress: '201.82.190.12',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const AuditoriaDemo = () => {
  return (
    <div className="auditoria-demo">
      <div className="auditoria-demo-header">
        <h1>
          <History size={28} />
          Trilha de Auditoria
        </h1>
        <p className="auditoria-demo-subtitle">
          Histórico de alterações e ações executadas pelos usuários dentro da
          organização. (Página de demonstração com dados mockados)
        </p>
      </div>

      <AuditLogTable logs={mockLogs} />
    </div>
  );
};