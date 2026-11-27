<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DS Company — Prospecções e sites feitos

Painel público sem login com Dashboard, Nova análise, Gerador de leads, Histórico de buscas, Minhas análises, Templates, Configurações, API externa e Usuários.

## Run Locally

**Pré-requisitos:** Node.js. SQLite Cloud é recomendado em hospedagens com disco efêmero; sem `SQLITE_CLOUD_URL`, o servidor usa um arquivo SQLite local (`dados/dscompany.sqlite`).


1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env` e configure as variáveis locais.
3. (Opcional) Configure `SQLITE_CLOUD_URL` para usar SQLite Cloud; em hospedagem efêmera, use um banco persistente.
4. Inicie com `npm run dev` e informe a chave Gemini em **Configurações**. Ela é armazenada no banco do servidor, não é retornada à página nem incluída no cache/backups do navegador. `GEMINI_API_KEY` no ambiente continua disponível apenas como fallback compatível.

## Painel público e n8n

O painel continua deliberadamente público e sem autenticação, inclusive as rotas de gestão de usuários/templates; qualquer visitante pode consultar, criar, editar ou excluir dados. Proteja o deployment e o banco e não publique a URL sem aceitar esse risco. Consulte [SECURITY_PUBLIC_MODE.md](./SECURITY_PUBLIC_MODE.md).

O workflow e as instruções do n8n estão em [n8n/README.md](./n8n/README.md). A API externa aceita `x-api-key` quando `EXTERNAL_API_KEY` estiver definida no servidor; sem ela, segue pública. A Gemini é chamada pelo backend; a credencial inserida em Configurações permanece no banco do servidor.

## Cache do navegador e backup JSON

Respostas de leitura (`GET /api/*`), incluindo usuários, são salvas em IndexedDB e servidas primeiro do cache local; configurações são sempre consultadas ao servidor e não são cacheadas. Criar, editar ou excluir dados invalida os conjuntos afetados. O botão **Sincronizar** limpa o cache e volta a consultar o servidor. **Exportar JSON** baixa um backup somente do cache local do navegador; **Importar JSON** substitui somente o cache do navegador atual e não grava nem substitui dados no servidor. Os backups excluem propriedades comuns de segredo (senha, API key, token e similares); mantenha o arquivo exportado em local privado.

O ZIP para download exclui deliberadamente `database_export.json`, um dump sensível que já está versionado no repositório. Não publique alterações sem antes decidir como removê-lo do repositório e tratar o histórico público.
