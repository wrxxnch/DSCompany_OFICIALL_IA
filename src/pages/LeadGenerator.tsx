import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ExternalLink, History, Loader2, MapPin, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Lead = { name: string; city: string; address: string; phone: string; maps_link: string; niche: string; imported?: boolean };
export default function LeadGenerator() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setLeads([]);
    try {
      const response = await fetch('/api/leads/search', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ query }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível buscar leads.');
      const found: Lead[] = Array.isArray(data.leads) ? data.leads : [];
      setLeads(found);
      await fetch('/api/search-history', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ query, results_count: found.length, results_json: { leads: found } }) });
    } catch (e: any) { setError(e.message || 'Falha na busca.'); }
    finally { setLoading(false); }
  }

  async function saveLead(lead: Lead, index: number) {
    const response = await fetch('/api/analyze/save', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ success: true, name: lead.name, city: lead.city, address: lead.address, map_link: lead.maps_link, niche: lead.niche, phone: lead.phone, description: `Lead pesquisado: ${lead.name}`, services: '' }) });
    if (!response.ok) { setError('Não foi possível salvar o lead.'); return; }
    setLeads((current) => current.map((item, i) => i === index ? { ...item, imported: true } : item));
  }

  return <section className="mx-auto max-w-6xl space-y-6">
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><Sparkles className="h-8 w-8 text-emerald-600"/><div><h1 className="text-2xl font-bold">Gerador de leads</h1><p className="text-sm text-zinc-500">Busque empresas por atividade, nome e cidade com IA no servidor.</p></div></div><Link to="/leads/history" className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm"><History className="h-4 w-4"/> Histórico</Link></div>
      <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: clínicas odontológicas em Campinas" className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-4 py-3"/><button disabled={loading || !query.trim()} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}{loading ? 'Buscando…' : 'Buscar empresas'}</button></form>
      <p className="mt-3 text-xs text-zinc-500">A chave da IA nunca é enviada ao navegador; configure <code>GEMINI_API_KEY</code> no servidor.</p>
      {error && <p className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4"/>{error}</p>}
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{leads.map((lead, index) => <article key={`${lead.name}-${index}`} className="rounded-xl border bg-white p-5"><h2 className="font-bold">{lead.name}</h2><p className="mt-2 flex gap-1 text-sm text-zinc-600"><MapPin className="h-4 w-4 shrink-0"/>{lead.city} · {lead.address}</p><p className="mt-2 text-sm">{lead.phone || 'Telefone não disponível'} · {lead.niche}</p><div className="mt-4 flex gap-2"><a href={lead.maps_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded border px-3 py-2 text-sm">Maps <ExternalLink className="h-3 w-3"/></a><button disabled={lead.imported} onClick={() => saveLead(lead, index)} className="rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:bg-zinc-300">{lead.imported ? 'Salvo' : 'Salvar lead'}</button></div></article>)}</div>
  </section>;
}
