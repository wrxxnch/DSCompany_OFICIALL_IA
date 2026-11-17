# Workflow n8n: empresa → prompt ou HTML

Importe [`company-research-to-website.json`](./company-research-to-website.json) no n8n. O fluxo recebe uma empresa e uma localidade, consulta o Google Places Text Search, opcionalmente tenta obter dados de um perfil profissional do Instagram pela API oficial Meta Business Discovery e devolve um prompt ou HTML gerado pelo Gemini.

## Credenciais

O workflow usa estas variáveis de ambiente do n8n:

- `GOOGLE_MAPS_API_KEY`: chave com Google Places API habilitada e billing configurado.
- `GEMINI_API_KEY`: chave do Google AI Studio / Gemini API.
- `META_GRAPH_VERSION`: versão da Graph API configurada para seu app Meta (por exemplo, `vXX.0`; use uma versão ainda suportada pela Meta).
- `META_IG_USER_ID`: ID do Instagram profissional associado ao token.
- `META_ACCESS_TOKEN`: token válido para o Instagram Graph API/Business Discovery.

Em n8n self-hosted, as expressões `$env` dependem das configurações de acesso a variáveis de ambiente (p.ex. `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`). Se sua instância bloquear `$env` — incluindo ambientes n8n Cloud — configure credenciais n8n do tipo Header Auth/Query Auth e substitua os campos que usam `$env` pelos campos de credencial correspondentes. Não coloque chaves no corpo do webhook nem versione credenciais reais.

A chamada do Google Places pede somente campos de estabelecimento: nome, endereço, telefone, website, avaliação, URL do Maps, categorias, resumo editorial e horário. Ela seleciona o primeiro resultado retornado; informe cidade/estado para reduzir homônimos.

## Instagram: limite importante

A API oficial não oferece uma busca pública irrestrita de qualquer perfil pelo nome de uma empresa. O fluxo **não faz scraping**. Para enriquecer o Instagram, envie `instagramUsername` e configure Business Discovery com um usuário profissional autorizado e token/permissões aceitos pela Meta. Caso não seja informado ou a API não retorne dados, a resposta conserva somente o link do perfil informado; não inventa username nem biografia.

## Ativar e chamar

1. Configure as chaves/credenciais na instância n8n e teste o workflow inativo.
2. Ative o workflow e copie a **Production URL** do nó Webhook.
3. Proteja o webhook com autenticação do n8n (ou reverse proxy/rate limit) antes de expô-lo. Cada execução pode consumir quota do Google/Gemini.
4. Envie `Content-Type: application/json` com um corpo como:

```json
{
  "companyName": "Padaria Central",
  "location": "Campinas, SP, Brasil",
  "instagramUsername": "padariacentral",
  "mode": "prompt",
  "templatePrompt": "Crie uma página para ${data.name}, em ${data.address}. Telefone: ${data.phone}. Maps: ${mapLink}. Instagram: ${instagram}."
}
```

`mode` aceita `prompt` (padrão) ou `site`. `templatePrompt` é opcional; quando ausente o fluxo cria um prompt inicial. Placeholders reconhecidos incluem `${data.name}`, `${data.address}`, `${data.phone}`, `${data.website}`, `${data.description}`, `${data.services}`, `${data.rating}`, `${data.reviewCount}`, `${mapLink}`, `${instagram}`, além dos equivalentes `{{name}}`, `{{address}}`, `{{phone}}`, `{{website}}`, `{{description}}`, `{{services}}`, `{{rating}}`, `{{reviewCount}}`, `{{mapLink}}` e `{{instagram}}`.

No modo `prompt`, a resposta JSON contém `company`, `prompt`, `googleMapsUrl` dentro de `company`, e eventual link/resultado do Instagram. No modo `site`, contém `html` gerado pelo Gemini; o fluxo devolve o HTML, mas não o publica automaticamente. Revise os dados e publique em um serviço de hospedagem escolhido por você.

## Privacidade e acesso público

O painel deste repositório foi configurado sem autenticação a pedido do proprietário. Todas as rotas de API e ações administrativas tornam-se acessíveis a visitantes; não exponha dados reais ou chaves no app. O webhook n8n tem sua própria superfície de acesso e precisa ser protegido separadamente.
