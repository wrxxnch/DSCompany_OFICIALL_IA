<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DS Company — Prospecções e sites feitos

Painel público simplificado para criar prospecções de empresas e consultar os sites já salvos. Não há tela de login nem gerenciamento de usuários.

## Run Locally

**Pré-requisitos:** Node.js e uma URL de conexão SQLite Cloud configurada no ambiente do servidor.


1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env` e configure as variáveis locais.
3. Cole a chave Gemini somente no servidor, deixando o nome da variável como no exemplo:

   ```env
   GEMINI_API_KEY=
   ```

4. Configure também `SQLITE_CLOUD_URL` com a URL privada do banco; a aplicação falha de forma explícita se ela estiver vazia.
5. Inicie com `npm run dev`.

## Public panel and n8n

O menu contém apenas “Nova prospecção” e “Sites já feitos”. As rotas de login e CRUD de usuários foram removidas. A tabela antiga de usuários é mantida sem migração destrutiva para preservar referências e dados existentes. Como o painel é público, as operações de prospecção e site podem ser acionadas por qualquer visitante; proteja o deployment e o banco. Consulte [SECURITY_PUBLIC_MODE.md](./SECURITY_PUBLIC_MODE.md).

O workflow e as instruções do n8n estão em [n8n/README.md](./n8n/README.md). O cabeçalho `x-api-key` das integrações externas permanece compatível. Novas operações do painel não gravam a chave Gemini no banco nem no navegador; valores legados podem continuar no banco, mas não são usados nem devolvidos pela API. Os fluxos gerados mantêm o placeholder `{YOUR_API_KEY}`.

O ZIP para download exclui deliberadamente `database_export.json`, um dump sensível que já está versionado no repositório. Não publique alterações sem antes decidir como removê-lo do repositório e tratar o histórico público.
