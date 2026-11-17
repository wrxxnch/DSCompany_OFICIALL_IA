# Atenção: painel sem autenticação

Este projeto foi alterado para abrir o painel e suas APIs sem login, conforme solicitação do proprietário. O middleware público atribui permissões administrativas a qualquer visitante. Assim, qualquer pessoa com acesso ao endereço pode consultar, criar, alterar ou excluir registros, usar funções administrativas, acessar configurações/chaves expostas pela API e exportar dados. Não use este modo com dados pessoais, leads reais ou credenciais de produção.

## Antes de publicar

- O repositório de origem contém `database_export.json` versionado com hashes de senhas, chaves de API e dados de contato/endereço. O dump não foi incluído no pacote de arquivos modificados. Removê-lo do último commit não remove cópias dos commits anteriores nem de clones já feitos; avalie uma limpeza de histórico planejada e coordenada.
- Uma chave SQLite Cloud estava escrita no antigo `.env.example`; esse arquivo agora contém somente um placeholder. Como a chave já esteve em um repositório público, revogue-a e emita outra imediatamente. Faça o mesmo com chaves Gemini/integrações contidas no dump ou em qualquer commit público.
- Troque/remova credenciais padrão e chaves de API expostas; restrinja o banco para o menor escopo possível e verifique logs de uso.
- O workflow n8n não ativa autenticação no Webhook por padrão. Proteja-o com credencial, proxy e limite de chamadas antes de expô-lo.

Para reativar autenticação no futuro, restaure a validação JWT em `server.ts`, a tela e a guarda de rota, e remova qualquer chave de acesso público do cliente. Não basta esconder o aviso visual.
