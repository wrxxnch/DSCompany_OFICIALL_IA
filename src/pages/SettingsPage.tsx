import { useEffect, useState, type FormEvent } from 'react';
import { Settings, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
export default function SettingsPage() {
  const { token } = useAuth();
  const [endpoint, setEndpoint] = useState('');
  const [salesMessage, setSalesMessage] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : {} as Record<string, string>).then((data: Record<string, string>) => { setEndpoint(data.default_endpoint || ''); setSalesMessage(data.sales_message_template || ''); }).catch(() => setMessage('Não foi possível carregar as configurações.')); }, [token]);
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('');
    try { const response = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ default_endpoint: endpoint, sales_message_template: salesMessage }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Falha ao salvar.'); setMessage('Configurações salvas.'); }
    catch (error: any) { setMessage(error.message || 'Falha ao salvar.'); } finally { setSaving(false); }
  }
  return <section className="mx-auto max-w-3xl space-y-6"><header><h1 className="flex items-center gap-2 text-2xl font-bold"><Settings className="h-6 w-6"/>Configurações</h1><p className="mt-1 text-sm text-zinc-500">Preferências operacionais do painel.</p></header><div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><strong>Chave de IA protegida:</strong> configure <code>GEMINI_API_KEY</code> nas variáveis privadas do servidor. A chave não é armazenada nem exibida no navegador.</div><form onSubmit={save} className="space-y-5 rounded-xl border bg-white p-6"><label className="block text-sm font-medium">Endpoint padrão do fluxo<input type="url" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://exemplo.com/api/upload" className="mt-2 block w-full rounded-lg border px-3 py-2"/></label><label className="block text-sm font-medium">Modelo de mensagem comercial<textarea rows={5} value={salesMessage} onChange={(e) => setSalesMessage(e.target.value)} className="mt-2 block w-full rounded-lg border px-3 py-2" placeholder="Olá! Conheça nossa proposta para sua empresa…"/></label><div className="flex items-center justify-between"><span role="status" className="text-sm text-zinc-600">{message}</span><button disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4"/>{saving ? 'Salvando…' : 'Salvar'}</button></div></form></section>;
}
