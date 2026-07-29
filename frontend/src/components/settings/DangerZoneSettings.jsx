import { useState } from 'react';
import { Download, Trash2, AlertTriangle } from 'lucide-react';

export function DangerZoneSettings({ tenantSlug }) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Download do arquivo JSON
  const handleExport = () => {
    window.location.href = '/api/tenant/export';
  };

  // Requisição de exclusão
  const handleDeleteTenant = async () => {
    setIsDeleting(true);

    try {
      const res = await fetch('/api/tenant/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmSlug: confirmInput }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'Erro ao excluir conta');
        return;
      }

      // Redireciona para a página inicial ou de logout
      window.location.href = '/login?deleted=true';
    } catch (err) {
      console.error(err);
      alert('Falha na comunicação com o servidor.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 border border-red-200 rounded-lg p-6 bg-red-50">
      <div>
        <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" /> Zona de Perigo & Privacidade (LGPD)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Gerencie a portabilidade e o expurgo definitivo dos dados da sua organização.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-t pt-4">
        <div>
          <h4 className="font-medium text-sm">Exportar todos os dados</h4>
          <p className="text-xs text-gray-500">
            Baixe um backup completo com usuários, cadastros e histórico em formato JSON.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" /> Exportar Dados
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-t pt-4">
        <div>
          <h4 className="font-medium text-sm text-red-600">Excluir Organização</h4>
          <p className="text-xs text-gray-500">
            Esta ação é irreversível. Todos os membros, configurações e dados serão apagados permanentemente.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
              <Trash2 className="h-4 w-4" /> Excluir Conta
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Você tem certeza absoluta?</DialogTitle>
              <DialogDescription>
                Esta ação não pode ser desfeita. Para confirmar, digite o identificador da empresa:{' '}
                <strong className="text-gray-900 font-mono">{tenantSlug}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={tenantSlug}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>

            <DialogFooter>
              <button
                disabled={confirmInput !== tenantSlug || isDeleting}
                onClick={handleDeleteTenant}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão Definitiva'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Componentes de Dialog (substituindo shadcn/ui)
function Dialog({ children }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <DialogTrigger asChild>
        {typeof children === 'function' ? children({ open, setOpen }) : children}
      </DialogTrigger>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        {typeof children === 'function' ? children({ open, setOpen }) : children}
      </div>
    </div>
  );
}

function DialogTrigger({ asChild, children }) {
  // O trigger é renderizado apenas quando o dialog está fechado
  return children;
}

function DialogContent({ children }) {
  return <>{children}</>;
}

function DialogHeader({ children }) {
  return <div className="p-6">{children}</div>;
}

function DialogTitle({ children }) {
  return <h2 className="text-xl font-semibold">{children}</h2>;
}

function DialogDescription({ children }) {
  return <p className="text-sm text-gray-600 mt-2">{children}</p>;
}

function DialogFooter({ children }) {
  return <div className="flex justify-end gap-2 p-6 border-t">{children}</div>;
}