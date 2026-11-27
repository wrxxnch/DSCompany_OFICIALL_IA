export interface CacheEntry {
  key: string;
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  updatedAt: string;
}

export interface BrowserBackup {
  format: 'dscompany-browser-cache';
  version: 1;
  exportedAt: string;
  entries: CacheEntry[];
}

const DB_NAME = 'dscompany-browser-cache';
const STORE_NAME = 'api-responses';
const DB_VERSION = 1;
const API_PREFIX = '/api/';

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o cache local.'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openCacheDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha no cache local.'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error || new Error('Falha na transação do cache.'));
  });
}

function cacheKey(url: string): string {
  return `GET ${new URL(url, window.location.origin).href}`;
}

export async function readCacheEntry(url: string): Promise<CacheEntry | undefined> {
  return withStore('readonly', (store) => store.get(cacheKey(url)));
}

export async function listCacheEntries(): Promise<CacheEntry[]> {
  return (await withStore('readonly', (store) => store.getAll())) || [];
}

export async function clearBrowserCache(): Promise<void> {
  await withStore('readwrite', (store) => store.clear());
}

export async function importBrowserBackup(value: unknown, merge = false): Promise<number> {
  const backup = value as Partial<BrowserBackup>;
  if (backup?.format !== 'dscompany-browser-cache' || backup.version !== 1 || !Array.isArray(backup.entries)) {
    throw new Error('Arquivo JSON inválido: esperado um backup do cache DS Company versão 1.');
  }
  if (backup.entries.length > 20000) throw new Error('O arquivo contém itens demais para importar.');
  const normalized = backup.entries.map((entry: any): CacheEntry => {
    if (!entry || typeof entry.url !== 'string' || !entry.url.startsWith(API_PREFIX) || typeof entry.body === 'undefined') {
      throw new Error('O backup contém uma entrada de API inválida.');
    }
    const absoluteUrl = new URL(entry.url, window.location.origin).href;
    return {
      key: `GET ${absoluteUrl}`,
      url: entry.url,
      status: Number(entry.status) || 200,
      statusText: typeof entry.statusText === 'string' ? entry.statusText : 'OK',
      headers: entry.headers && typeof entry.headers === 'object' ? entry.headers : { 'content-type': 'application/json' },
      body: entry.body,
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString(),
    };
  });
  const db = await openCacheDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    if (!merge) store.clear();
    normalized.forEach((entry) => store.put(entry));
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Não foi possível importar o backup.')); };
    transaction.onabort = () => { db.close(); reject(transaction.error || new Error('A importação foi cancelada.')); };
  });
  return normalized.length;
}

export async function exportBrowserBackup(): Promise<BrowserBackup> {
  const stripSecrets = (value: any): any => {
    if (Array.isArray(value)) return value.map(stripSecrets);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !/^(password|password_hash|api_key|gemini_api_key|token|secret)$/i.test(key))
      .map(([key, nested]) => [key, stripSecrets(nested)]));
  };
  return {
    format: 'dscompany-browser-cache',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: (await listCacheEntries()).map((entry) => ({ ...entry, body: stripSecrets(entry.body) })),
  };
}

function invalidateCollection(path: string): string[] {
  if (/\/api\/(analyze\/save|analyze\/bulk-save|sites(?:\/|$))/.test(path)) return ['/api/sites', '/api/stats', '/api/analyze/download/'];
  if (path.startsWith('/api/templates')) return ['/api/templates'];
  if (path.startsWith('/api/users')) return ['/api/users'];
  if (path.startsWith('/api/settings')) return ['/api/settings'];
  if (path.startsWith('/api/search-history')) return ['/api/search-history'];
  if (path.startsWith('/api/gemini-usage')) return ['/api/gemini-usage'];
  return [];
}

async function invalidatePrefixes(prefixes: string[]): Promise<void> {
  if (!prefixes.length) return;
  const entries = await listCacheEntries();
  const db = await openCacheDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    entries.filter((entry) => prefixes.some((prefix) => entry.url.includes(prefix))).forEach((entry) => store.delete(entry.key));
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Falha ao limpar entradas antigas.')); };
  });
}

function responseFromEntry(entry: CacheEntry): Response {
  return new Response(JSON.stringify(entry.body), {
    status: entry.status >= 200 && entry.status < 300 ? entry.status : 200,
    statusText: entry.statusText || 'OK',
    headers: { ...entry.headers, 'content-type': 'application/json', 'x-dscompany-cache': 'hit' },
  });
}

let installed = false;
export function installBrowserApiCache(): void {
  if (installed || typeof window === 'undefined' || !('indexedDB' in window)) return;
  installed = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : undefined;
    const url = request?.url || new URL(String(input), window.location.origin).href;
    const method = (init?.method || request?.method || 'GET').toUpperCase();
    const pathname = new URL(url).pathname;
    if (!pathname.startsWith(API_PREFIX)) return originalFetch(input, init);
    if (method === 'GET') {
      try {
        const cached = await readCacheEntry(url);
        if (cached) return responseFromEntry(cached);
      } catch (error) {
        console.warn('Não foi possível ler o cache local:', error);
      }
      try {
        const response = await originalFetch(input, init);
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          try {
            const body = await response.clone().json();
            const headers: Record<string, string> = {};
            response.headers.forEach((value, name) => { headers[name] = value; });
            const entry: CacheEntry = {
              key: `GET ${url}`,
              url: `${new URL(url).pathname}${new URL(url).search}`,
              status: response.status,
              statusText: response.statusText,
              headers,
              body,
              updatedAt: new Date().toISOString(),
            };
            await withStore('readwrite', (store) => store.put(entry));
          } catch (error) {
            console.warn('Não foi possível gravar a resposta no cache local:', error);
          }
        }
        return response;
      } catch (error) {
        const cached = await readCacheEntry(url).catch(() => undefined);
        if (cached) return responseFromEntry(cached);
        throw error;
      }
    }
    const response = await originalFetch(input, init);
    if (response.ok) {
      try { await invalidatePrefixes(invalidateCollection(pathname)); }
      catch (error) { console.warn('Não foi possível invalidar cache obsoleto:', error); }
    }
    return response;
  };
}
