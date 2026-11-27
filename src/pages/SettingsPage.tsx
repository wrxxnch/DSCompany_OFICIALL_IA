import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Save, Settings, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type SettingsResponse = {
  default_endpoint?: string;
  sales_message_template?: string;
  gemini_api_key_configured?: boolean;
};

export default function SettingsPage() {
  const { token } = useAuth();
  const [endpoint, setEndpoint] = useState('');
  const [salesMessage, setSalesMessage] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar as configurações.');
        return response.json() as Promise<SettingsResponse>;
      })
      .then((data) => {
        setEndpoint(data.default_endpoint || '');
        setSalesMessage(data.sales_message_template || '');
        setKeyConfigured(Boolean(data.gemini_api_key_configured));
      })
      .catch((error: Error) => setMessage(error.message));
  }, [token]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const keyToSave = geminiKey.trim();
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          default_endpoint: endpoint,
          sales_message_template: salesMessage,
          ...(keyToSave ? { gemini_api_key: keyToSave } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao salvar.');
      if (keyToSave) setKeyConfigured(true);
      setGeminiKey('');
      setMessage('Configurações salvas. A chave fica somente no servidor.');
    } catch (error: any) {
      setMessage(error.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function clearGeminiKey() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clear_gemini_api_key: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao remover a chave.');
      setGeminiKey('');
      setKeyConfigured(false);
      setMessage('Chave Gemini removida do banco do servidor.');
    } catch (error: any) {
      setMessage(error.message || 'Falha ao remover a chave.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Settings className="h-6 w-6" />Configurações</h1>
        <p className="mt-1 text-sm text-zinc-500">Preferências operacionais e credencial do Gemini.</p>
      </header>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Painel público:</strong> qualquer pessoa com acesso ao painel pode substituir ou remover a chave configurada. A chave não é devolvida à página, nem incluída no cache do navegador ou nos backups JSON.
      </div>

      <form onSubmit={save} className="space-y-5 rounded-xl border bg-white p-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <label htmlFor="gemini-api-key" className="flex items-center gap-2 text-sm font-semibold text-blue-950"><KeyRound className="h-4 w-4" />Chave da API Gemini</label>
          <p className="mt-1 text-sm text-blue-900">{keyConfigured ? 'Há uma chave salva no servidor. Digite outra apenas para substituí-la.' : 'Informe sua chave para habilitar os recursos de IA.'}</p>
          <input
            id="gemini-api-key"
            type="password"
            autoComplete="new-password"
            value={geminiKey}
            onChange={(event) => setGeminiKey(event.target.value)}
            placeholder={keyConfigured ? 'Chave configurada — campo vazio para manter' : 'Cole a chave da API Gemini'}
            className="mt-3 block w-full rounded-lg border border-blue-200 bg-white px-3 py-2"
          />
          {keyConfigured && <button type="button" onClick={clearGeminiKey} disabled={saving} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" />Remover chave salva</button>}
        </div>

        <label className="block text-sm font-medium">Endpoint padrão do fluxo
          <input type="url" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://exemplo.com/api/upload" className="mt-2 block w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">Modelo de mensagem comercial
          <textarea rows={5} value={salesMessage} onChange={(event) => setSalesMessage(event.target.value)} className="mt-2 block w-full rounded-lg border px-3 py-2" placeholder="Olá! Conheça nossa proposta para sua empresa…" />
        </label>
        <div className="flex items-center justify-between gap-4">
          <span role="status" className="text-sm text-zinc-600">{message}</span>
          <button type="submit" disabled={saving} className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </section>
  );
}
