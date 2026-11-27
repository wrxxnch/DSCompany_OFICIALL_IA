import React, { useRef, useState } from 'react';
import { Download, RefreshCw, Upload } from 'lucide-react';
import { clearBrowserCache, exportBrowserBackup, importBrowserBackup } from '../utils/browserCache';

export default function BrowserCacheControls() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleExport = async () => {
    setBusy(true);
    setMessage('');
    try {
      const backup = await exportBrowserBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `dscompany-cache-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`${backup.entries.length} conjuntos exportados.`);
    } catch (error: any) {
      setMessage(error.message || 'Falha ao exportar o cache.');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setMessage('O arquivo ultrapassa o limite de 50 MB.');
      return;
    }
    if (!window.confirm('Importar este JSON vai substituir o cache local deste navegador. Deseja continuar?')) return;
    setBusy(true);
    setMessage('');
    try {
      const json = JSON.parse(await file.text());
      const count = await importBrowserBackup(json, false);
      setMessage(`${count} conjuntos importados. Recarregando os dados salvos…`);
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error: any) {
      setMessage(error.message || 'Falha ao importar o arquivo JSON.');
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    if (!window.confirm('Isso limpa o cache local e carrega dados atualizados do servidor. Continuar?')) return;
    setBusy(true);
    try {
      await clearBrowserCache();
      window.location.reload();
    } catch (error: any) {
      setMessage(error.message || 'Não foi possível limpar o cache.');
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
      <button type="button" onClick={handleExport} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50" title="Baixar backup JSON do cache deste navegador">
        <Download className="h-4 w-4" /> Exportar JSON
      </button>
      <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50" title="Importar backup JSON para o cache deste navegador">
        <Upload className="h-4 w-4" /> Importar JSON
      </button>
      <button type="button" onClick={handleSync} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50" title="Limpar cache e atualizar dados do servidor">
        <RefreshCw className="h-4 w-4" /> Sincronizar
      </button>
      <span className="w-full text-right text-[10px] text-zinc-500">JSON exporta/importa somente o cache deste navegador; chaves e senhas são excluídas.</span>
      {message && <span role="status" className="w-full text-right text-[11px] text-zinc-500">{message}</span>}
    </div>
  );
}
