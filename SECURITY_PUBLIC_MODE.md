# Segurança do painel público

O painel não possui login nem usuários operacionais. Qualquer pessoa com acesso ao endereço pode usar as funções públicas de prospecção e consultar, alterar ou excluir registros, inclusive a configuração da chave Gemini. A chave inserida em Configurações é guardada no banco do servidor; o valor não é retornado pela API, armazenado no cache do navegador nem incluído nos backups JSON. O cabeçalho externo `x-api-key` foi preservado.

## Antes de publicar

- Nunca versione `.env`. Configure a chave Gemini por Configurações somente se aceitar que qualquer visitante do painel público pode substituí-la ou removê-la. Para maior segurança, proteja o acesso ao painel; configure `SQLITE_CLOUD_URL` em variável protegida quando precisar de persistência em hospedagens com disco efêmero.
- Uma credencial SQLite Cloud esteve anteriormente embutida no código do repositório; remova/rotacione-a se ainda estiver ativa. Faça o mesmo com chaves de IA ou integrações que tenham sido expostas em commits, dumps ou clones antigos. Alterar o código atual não revoga credenciais históricas.
- Restrinja a rede e o escopo da credencial do banco, e monitore consumo da IA: endpoints públicos podem ser acionados por terceiros.
- O workflow n8n não ativa autenticação no Webhook por padrão. Proteja-o com credencial, proxy e limite de chamadas antes de expô-lo.

Os registros e a tabela legada de usuários não foram apagados: isso evita perda de dados e mantém a estrutura de compatibilidade do banco. Para reintroduzir contas no futuro, será necessário adicionar autenticação e autorização reais no backend; não basta restaurar uma tela de login.
