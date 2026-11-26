# Segurança do painel público

O painel não possui login nem usuários operacionais. Qualquer pessoa com acesso ao endereço pode usar as funções públicas de prospecção e consultar, alterar ou excluir registros de sites. A chave Gemini agora é lida exclusivamente de `GEMINI_API_KEY` no ambiente do servidor, não é retornada pela API de configurações e não é embutida no código do navegador ou no JSON de fluxo. O cabeçalho externo `x-api-key` foi preservado.

## Antes de publicar

- Nunca versione `.env` nem cole chaves em campos do navegador. Configure `SQLITE_CLOUD_URL` e `GEMINI_API_KEY` em variáveis protegidas no provedor de hospedagem.
- Uma credencial SQLite Cloud esteve anteriormente embutida no código do repositório; remova/rotacione-a se ainda estiver ativa. Faça o mesmo com chaves de IA ou integrações que tenham sido expostas em commits, dumps ou clones antigos. Alterar o código atual não revoga credenciais históricas.
- Restrinja a rede e o escopo da credencial do banco, e monitore consumo da IA: endpoints públicos podem ser acionados por terceiros.
- O workflow n8n não ativa autenticação no Webhook por padrão. Proteja-o com credencial, proxy e limite de chamadas antes de expô-lo.

Os registros e a tabela legada de usuários não foram apagados: isso evita perda de dados e mantém a estrutura de compatibilidade do banco. Para reintroduzir contas no futuro, será necessário adicionar autenticação e autorização reais no backend; não basta restaurar uma tela de login.
