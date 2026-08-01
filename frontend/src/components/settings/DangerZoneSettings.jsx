import { useState } from 'react';
import { Download, Trash2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

export function DangerZoneSettings({ tenantSlug }) {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Download do arquivo JSON
  const handleExport = async () => {
    try {
      const response = await api.get('/tenant/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `export-tenant-${tenantSlug}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
      alert('Erro ao exportar dados. Tente novamente.');
    }
  };

  // Requisição de exclusão
  const handleDeleteTenant = async () => {
    setIsDeleting(true);

    try {
      const res = await api.delete('/tenant/delete', {
        data: { confirmSlug: confirmInput },
      });

      if (res.status !== 200) {
        alert(res.data?.error || 'Erro ao excluir conta');
        return;
      }

      // Redireciona para a página de login
      window.location.href = '/login?deleted=true';
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Falha na comunicação com o servidor.');
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
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

        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" /> Excluir Conta
        </button>
      </div>

      {/* Modal de confirmação */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsDialogOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold">Você tem certeza absoluta?</h2>
              <p className="text-sm text-gray-600 mt-2">
                Esta ação não pode ser desfeita. Para confirmar, digite o identificador da empresa:{' '}
                <strong className="text-gray-900 font-mono">{tenantSlug}</strong>
              </p>
            </div>

            <div className="px-6 pb-4">
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={tenantSlug}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 p-6 border-t">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={confirmInput !== tenantSlug || isDeleting}
                onClick={handleDeleteTenant}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão Definitiva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}