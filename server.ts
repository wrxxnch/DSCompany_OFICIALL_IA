import 'dotenv/config';
import express from 'express';
console.log('Server starting...');
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import db from './src/db.js';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

// Ensure 'dados' directory exists
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;
const dadosDir = isVercel ? '/tmp/dados' : path.join(process.cwd(), 'dados');
if (!fs.existsSync(dadosDir)) {
  fs.mkdirSync(dadosDir, { recursive: true });
}

// --- API Routes ---

// Public mode: no account is loaded, created, or authenticated.
const authenticateToken = async (req: any, res: any, next: any) => {
  req.user = { id: 0, username: 'Painel público', role: 'admin', sector: 'Produção' };
  return next();
};

// Get current user
app.get('/api/auth/me', authenticateToken, async (req: any, res) => {
  res.json({ id: 0, username: 'Painel público', role: 'admin', sector: 'Produção' });
});

// Get settings: only non-secret operational values are exposed.
app.get('/api/settings', authenticateToken, async (_req: any, res: any) => {
  try {
    const settings = await db.sql`SELECT key, value FROM settings WHERE key = 'default_endpoint'`;
    res.json(Object.fromEntries(settings.map((item: any) => [item.key, item.value])));
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ error: 'Erro interno ao buscar configurações' });
  }
});

// AI keys are server-only; this endpoint stores only the optional webhook destination.
app.post('/api/settings', authenticateToken, async (req: any, res: any) => {
  const { default_endpoint } = req.body;
  try {
    if (default_endpoint !== undefined) {
      await db.sql`INSERT INTO settings (key, value) VALUES ('default_endpoint', ${default_endpoint}) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

// Get Gemini API usage
app.get('/api/gemini-usage', authenticateToken, async (req: any, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const usageDateRes = await db.sql`SELECT value FROM settings WHERE key = 'gemini_usage_date'`;
    const usageCountRes = await db.sql`SELECT value FROM settings WHERE key = 'gemini_usage_count'`;
    
    let usageDate = usageDateRes[0]?.value || '';
    let usageCount = parseInt(usageCountRes[0]?.value || '0', 10);
    
    if (usageDate !== today) {
      usageCount = 0;
      await db.sql`INSERT INTO settings (key, value) VALUES ('gemini_usage_date', ${today}) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
      await db.sql`INSERT INTO settings (key, value) VALUES ('gemini_usage_count', '0') ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
    }
    
    res.json({ count: usageCount, limit: 1500 });
  } catch (error) {
    console.error('Error fetching gemini usage:', error);
    res.status(500).json({ error: 'Erro ao buscar uso da API' });
  }
});

// Increment Gemini API usage
app.post('/api/gemini-usage/increment', authenticateToken, async (req: any, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const usageDateRes = await db.sql`SELECT value FROM settings WHERE key = 'gemini_usage_date'`;
    const usageCountRes = await db.sql`SELECT value FROM settings WHERE key = 'gemini_usage_count'`;
    
    let usageDate = usageDateRes[0]?.value || '';
    let usageCount = parseInt(usageCountRes[0]?.value || '0', 10);
    
    if (usageDate !== today) {
      usageCount = 1;
      await db.sql`INSERT INTO settings (key, value) VALUES ('gemini_usage_date', ${today}) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
    } else {
      usageCount += 1;
    }
    
    await db.sql`INSERT INTO settings (key, value) VALUES ('gemini_usage_count', ${usageCount.toString()}) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
    
    res.json({ count: usageCount, limit: 1500 });
  } catch (error) {
    console.error('Error incrementing gemini usage:', error);
    res.status(500).json({ error: 'Erro ao incrementar uso da API' });
  }
});

// Templates Management
app.get('/api/templates', authenticateToken, async (req: any, res) => {
  try {
    const templates = await db.sql`SELECT * FROM templates ORDER BY created_at DESC`;
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Erro ao buscar templates' });
  }
});

app.post('/api/templates', authenticateToken, async (req: any, res) => {
  const { name, prompt_template, flow_structure } = req.body;
  if (!name || !prompt_template || !flow_structure) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }
  
  try {
    const result = await db.sql`INSERT INTO templates (name, prompt_template, flow_structure) VALUES (${name}, ${prompt_template}, ${flow_structure})`;
    res.json({ id: result.lastID, success: true });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Erro ao criar template' });
  }
});

app.put('/api/templates/:id', authenticateToken, async (req: any, res) => {
  const { name, prompt_template, flow_structure } = req.body;
  const { id } = req.params;
  
  try {
    await db.sql`UPDATE templates SET name = ${name}, prompt_template = ${prompt_template}, flow_structure = ${flow_structure} WHERE id = ${id}`;
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Erro ao atualizar template' });
  }
});

app.delete('/api/templates/:id', authenticateToken, async (req: any, res) => {
  try {
    await db.sql`DELETE FROM templates WHERE id = ${req.params.id}`;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Erro ao excluir template' });
  }
});

// Save Analyzed Data
app.post('/api/analyze/save', authenticateToken, async (req: any, res) => {
  const data = req.body;
  
  // Generate filename
  const safeName = data.name ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, '') : 'empresa';
  const timestamp = Date.now();
  const filename = `${safeName}_${timestamp}.json`;
  const filepath = path.join(dadosDir, filename);

  // Save JSON to 'dados' folder
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving JSON file:', err);
    return res.status(500).json({ error: 'Erro ao salvar arquivo JSON' });
  }

  // Save to DB for history (reusing sites table)
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

    const servicesStr = Array.isArray(data.services) ? data.services.join(', ') : (data.services || '');
    const nameStr = String(data.name || 'Desconhecido');
    const phoneStr = String(data.phone || '');
    const addressStr = String(data.address || '');
    const cityStr = String(data.city || '');
    const descriptionStr = String(data.description || '');
    const mapLinkStr = String(data.map_link || '');
    const imageUrlStr = String(data.image_url || '');

    const result = await db.sql`
      INSERT INTO sites (slug, name, phone, address, city, description, services, map_link, image_url, expires_at, user_id, status, full_data)
      VALUES (${filename}, ${nameStr}, ${phoneStr}, ${addressStr}, ${cityStr}, ${descriptionStr}, ${servicesStr}, ${mapLinkStr}, ${imageUrlStr}, ${expiresAt.toISOString()}, ${null}, 'prospectado', ${JSON.stringify(data)})
    `;

    res.json({ id: result.lastID, filename });
  } catch (dbErr: any) {
    console.error('Database error when saving site:', dbErr);
    return res.status(500).json({ error: 'Erro no banco de dados ao salvar: ' + dbErr.message });
  }
});

// Bulk Save Leads
app.post('/api/analyze/bulk-save', authenticateToken, async (req: any, res) => {
  const { leads } = req.body;
  if (!Array.isArray(leads)) {
    return res.status(400).json({ error: 'Leads deve ser um array' });
  }

  const results = [];
  const errors = [];

  for (const lead of leads) {
    try {
      const safeName = lead.name ? lead.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)+/g, '') : 'empresa';
      const timestamp = Date.now() + Math.floor(Math.random() * 1000);
      const filename = `${safeName}_${timestamp}.json`;
      const filepath = path.join(dadosDir, filename);

      fs.writeFileSync(filepath, JSON.stringify(lead, null, 2));

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const servicesStr = Array.isArray(lead.services) ? lead.services.join(', ') : (lead.services || '');
      const nameStr = String(lead.name || 'Desconhecido');
      const phoneStr = String(lead.phone || '');
      const addressStr = String(lead.address || '');
      const cityStr = String(lead.city || '');
      const descriptionStr = String(lead.description || '');
      const mapLinkStr = String(lead.maps_link || lead.map_link || '');
      const imageUrlStr = String(lead.image_url || '');

      const result = await db.sql`
        INSERT INTO sites (slug, name, phone, address, city, description, services, map_link, image_url, expires_at, user_id, status, full_data)
        VALUES (${filename}, ${nameStr}, ${phoneStr}, ${addressStr}, ${cityStr}, ${descriptionStr}, ${servicesStr}, ${mapLinkStr}, ${imageUrlStr}, ${expiresAt.toISOString()}, ${null}, 'prospectado', ${JSON.stringify(lead)})
      `;
      results.push({ id: result.lastID, name: lead.name });
    } catch (err: any) {
      console.error('Bulk save error for lead:', lead.name, err);
      errors.push({ name: lead.name, error: err.message });
    }
  }

  res.json({ success: true, results, errors });
});

// List Analyzed Links
app.get('/api/sites', authenticateToken, async (_req: any, res: any) => {
  try {
    const sites = await db.sql(`
      SELECT s.*, u.username as creator_name, u.sector as creator_sector
      FROM sites s LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(sites);
  } catch (error: any) {
    console.error('Error in /api/sites:', error);
    const message = error.message?.includes('Maximum number of allowed connections reached')
      ? 'O banco de dados está temporariamente sobrecarregado. Por favor, tente novamente em alguns instantes.'
      : 'Erro interno ao carregar sites';
    res.status(500).json({ error: message });
  }
});
// Download JSON
app.get('/api/analyze/download/:filename', authenticateToken, async (req: any, res) => {
  const filename = req.params.filename;
  
  try {
    // First try to get from database
    const results = await db.sql`SELECT full_data FROM sites WHERE slug = ${filename}`;
    const site = results[0];
    
    if (site) {
      if (site.full_data) {
        try {
          const data = JSON.parse(site.full_data);
          return res.json(data);
        } catch (e) {
          console.error('Error parsing full_data from DB:', e);
        }
      } else {
        // Reconstruct from columns if full_data is missing
        const resultsFull = await db.sql`SELECT * FROM sites WHERE slug = ${filename}`;
        const s = resultsFull[0];
        if (s) {
          const data = {
            name: s.name,
            phone: s.phone,
            address: s.address,
            city: s.city,
            description: s.description,
            services: s.services ? s.services.split(', ') : [],
            map_link: s.map_link,
            image_url: s.image_url,
            status: s.status,
            created_at: s.created_at
          };
          return res.json(data);
        }
      }
    }

    // Fallback to file system
    const filepath = path.join(dadosDir, filename);
    if (fs.existsSync(filepath)) {
      return res.download(filepath);
    }

    res.status(404).json({ error: 'Arquivo não encontrado' });
  } catch (error) {
    console.error('Error in /api/analyze/download:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Expand URL
app.post('/api/expand-url', authenticateToken, async (req: any, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    
    const response = await fetch(url, { 
      method: 'GET', 
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    res.json({ url: response.url });
  } catch (error: any) {
    console.error('Error expanding URL:', error);
    res.status(500).json({ error: 'Failed to expand URL' });
  }
});

// Proxy Endpoint for Webhooks
app.post('/api/proxy-webhook', authenticateToken, async (req: any, res: any) => {
  // Only admins and Produção sector can send data to endpoints
  if (req.user.role !== 'admin' && req.user.sector !== 'Produção') {
    return res.status(403).json({ error: 'Apenas administradores e o setor de Produção podem enviar dados para endpoints' });
  }

  try {
    const { url: rawUrl, payload, method = 'POST', authToken } = req.body;
    if (!rawUrl) return res.status(400).json({ error: 'URL is required' });
    if (!payload) return res.status(400).json({ error: 'Payload is required' });
    
    // Clean URL: trim and remove trailing slashes which can cause 404s on some servers
    const url = rawUrl.trim().replace(/\/+$/, '');
    console.log(`[Proxy] ${method} to: ${url}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (authToken) {
      // Support both Bearer and simple token formats
      headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      headers['x-api-key'] = authToken; // Some systems use this instead
    }

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers
    };

    if (fetchOptions.method !== 'GET' && fetchOptions.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(payload);
    }

    const response = await fetch(url, fetchOptions);

    if (response.ok) {
      res.json({ success: true, status: response.status });
    } else {
      let errorBody = '';
      try {
        errorBody = await response.text();
        // Try to parse if it's JSON to get a cleaner message
        const json = JSON.parse(errorBody);
        if (json.error || json.message) {
          errorBody = json.error || json.message;
        }
      } catch (e) {
        // use raw text if not JSON
      }
      
      res.status(response.status).json({ 
        error: errorBody || `HTTP Error: ${response.status}`, 
        status: response.status 
      });
    }
  } catch (error: any) {
    console.error('Error proxying webhook:', error);
    res.status(500).json({ error: error.message || 'Failed to send webhook' });
  }
});

// Analyze Link Endpoint
app.post('/api/analyze-link', authenticateToken, async (req: any, res: any) => {
  // This endpoint is public in the explicitly selected public-panel mode.
  const requestUser = req.user;
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'A URL é obrigatória no corpo da requisição ({"url": "..."}).' });
  }

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiApiKey) {
      return res.status(503).json({ error: 'Chave da IA não configurada. Defina GEMINI_API_KEY no ambiente do servidor.' });
    }
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    
    // Extract place name hint if possible
    let placeNameHint = '';
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const placePart = pathParts.find(part => part.includes('+') || part.includes('-'));
      if (placePart) {
        placeNameHint = decodeURIComponent(placePart.replace(/\+/g, ' '));
      }
    } catch (e) {
      // ignore
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um especialista em extração de dados e inteligência de mercado.
Você recebeu o seguinte link: ${url}
${placeNameHint ? `\nDica: O nome do estabelecimento extraído da URL parece ser "${placeNameHint}".` : ''}

Sua missão é OBRIGATÓRIA:
1. Analise cuidadosamente a URL fornecida (pode ser Google Maps, Instagram, Site Próprio, Facebook, etc.) para identificar o estabelecimento ou empresa.
2. Descubra EXATAMENTE qual é a empresa real (nome, nicho, descrição, contato, endereço).
3. Se o link for genérico, quebrado, ou se você NÃO TIVER 100% DE CERTEZA de qual é a empresa exata, você DEVE definir "success" como false e preencher o "errorMessage" explicando que não foi possível identificar o local e pedindo para o usuário verificar o link.
4. Se você encontrou a empresa com sucesso, defina "success" as true e extraia os dados reais:
   - "name": Nome da empresa.
   - "phone": Telefone (apenas números com DDD).
   - "address": Endereço completo (se disponível).
   - "city": Cidade.
   - "niche": Nicho exato (ex: barbearia, lanchonete, clínica, restaurante, agência).
   - "description": Descrição detalhada e persuasiva do negócio.
   - "services": Principais serviços oferecidos, separados por vírgula.
   - "email": E-mail de contato (se disponível).
   - "social": Links de redes sociais encontrados (se disponível).

RETORNE APENAS UM JSON VÁLIDO com a seguinte estrutura exata (sem formatação markdown como \`\`\`json):
{
  "success": true/false,
  "errorMessage": "mensagem de erro se success for false",
  "name": "Nome da Empresa",
  "phone": "Telefone",
  "address": "Endereço Completo",
  "city": "Cidade",
  "niche": "Nicho",
  "description": "Descrição",
  "services": "Serviços",
  "email": "E-mail",
  "social": "Redes Sociais"
}

NÃO INVENTE DADOS. Se não souber ou não encontrar a empresa exata, retorne success: false.`,
      config: {
        // A IA consegue extrair os dados diretamente da URL expandida ou via URL Context se disponível.
        tools: [{ urlContext: {} }]
      }
    });

    let responseText = '{}';
    try {
      responseText = response.text || '{}';
    } catch (e: any) {
      console.error('Error getting response text:', e);
      throw new Error('A resposta da IA foi bloqueada ou retornou vazia. Tente um link diferente.');
    }

    let result;
    try {
      const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      result = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw text:", responseText);
      throw new Error("A resposta da IA não estava em um formato válido. Tente novamente.");
    }
    
    return res.json(result);

  } catch (error: any) {
    console.error('Error analyzing link:', error);
    
    let friendlyError = error.message || 'Erro interno ao analisar o link';
    if (friendlyError.includes('429') || friendlyError.includes('RESOURCE_EXHAUSTED') || friendlyError.includes('quota')) {
      friendlyError = 'Limite de cota atingido (Erro 429). A ferramenta de IA atingiu o limite de uso. Tente novamente mais tarde.';
    } else if (friendlyError.includes('503') || friendlyError.includes('UNAVAILABLE') || friendlyError.includes('high demand')) {
      friendlyError = 'Os servidores da Inteligência Artificial estão sobrecarregados no momento (Erro 503). Isso é temporário. Por favor, aguarde alguns instantes e tente novamente.';
    } else if (friendlyError.includes('API_KEY_INVALID') || friendlyError.includes('invalid API key')) {
      friendlyError = 'Chave de API inválida. Verifique GEMINI_API_KEY no ambiente do servidor.';
    }

    return res.status(500).json({ error: friendlyError, details: error.message });
  }
});

// Update Site Status
app.patch('/api/sites/:id/status', authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  const { status, hosting_url } = req.body;
  
  try {
    const siteRes = await db.sql`SELECT status, user_id FROM sites WHERE id = ${id}`;
    if (siteRes.length === 0) return res.status(404).json({ error: 'Site não encontrado' });
    let updates = [];
    let values = [];

    if (status) {
      updates.push("status = ?");
      values.push(status);
    }
    
    if (hosting_url !== undefined) {
      updates.push("hosting_url = ?");
      values.push(hosting_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    const updateQuery = "UPDATE sites SET " + updates.join(", ") + " WHERE id = ?";
    values.push(id);

    await db.sql(updateQuery, ...values);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Delete Analyzed Data
app.delete('/api/sites/:id', authenticateToken, async (req: any, res) => {
  try {
    const results = await db.sql`SELECT slug FROM sites WHERE id = ${req.params.id}`;
    const site = results[0];
    if (site) {
      const filepath = path.join(dadosDir, site.slug);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
      await db.sql`DELETE FROM sites WHERE id = ${req.params.id}`;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting site:', error);
    res.status(500).json({ error: 'Erro ao excluir site' });
  }
});

// Generate AI Message for Sales
app.post('/api/sales/generate-message', authenticateToken, async (req: any, res: any) => {
  const { siteId } = req.body;
  if (!siteId) return res.status(400).json({ error: 'ID do site é obrigatório' });
  try {
    const siteRes = await db.sql`SELECT * FROM sites WHERE id = ${siteId}`;
    const site = siteRes[0];
    if (!site) return res.status(404).json({ error: 'Site não encontrado' });

    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiApiKey) {
      return res.status(503).json({ error: 'Chave da IA não configurada. Defina GEMINI_API_KEY no ambiente do servidor.' });
    }
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Você é um especialista em vendas e copywriting.
Sua tarefa é criar uma primeira mensagem de abordagem personalizada e altamente persuasiva para um cliente em potencial.

DADOS DA EMPRESA:
Nome: ${site.name}
Nicho/Descrição: ${site.description}
Serviços: ${site.services}
Cidade: ${site.city}

OBJETIVO:
Apresentar a DS Company e oferecer a criação de um site profissional (que já foi pré-produzido como demonstração).
A mensagem deve ser amigável, profissional e focada em como um site pode ajudar o negócio dele a crescer.

REGRAS:
1. Use um tom de voz que combine com o nicho da empresa.
2. Seja conciso e direto ao ponto.
3. Inclua um Call to Action (CTA) claro.
4. Não use placeholders como [Nome], use os dados fornecidos.
5. Retorne APENAS o texto da mensagem, sem comentários ou formatação markdown.`,
    });

    res.json({ message: response.text });
  } catch (error: any) {
    console.error('Error generating sales message:', error);
    res.status(500).json({ error: 'Erro ao gerar mensagem: ' + (error.message || 'Erro desconhecido') });
  }
});

// --- Vercel Serverless Export ---
export default app;

// --- Local Development & Production Server ---
const startServer = async () => {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    // Start Vite dev server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware integrated');
  } else if (!process.env.VERCEL) {
    // Serve static files in production (Render, Railway, VPS, etc.)
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
    });
  }
};

startServer();
