# OAuth2 Discord — pronto para Render

Este projeto oferece login OAuth2 com consentimento explícito e solicita somente o escopo `identify`. Ele identifica a conta que autorizou o login; não adiciona membros a servidores nem recupera membros automaticamente.

## Publicar no GitHub

1. Crie um repositório no GitHub.
2. Envie os arquivos deste ZIP para a raiz do repositório: `server.js`, `package.json`, `.gitignore`, `.env.example` e `README.md`.

## Configuração no Render

Crie um Web Service a partir do repositório.

- Build Command: `npm install`
- Start Command: `npm start`

Depois que o Render gerar o domínio público, abra Environment e adicione:

- `DISCORD_CLIENT_SECRET` = Client Secret da aplicação no Discord Developer Portal
- `DISCORD_REDIRECT_URI` = `https://SEU-SERVICO.onrender.com/api/auth/discord/callback`

O `DISCORD_CLIENT_ID` já tem um valor padrão neste projeto, mas você pode defini-lo como variável também, se preferir.

## Configuração no Discord

Abra https://discord.com/developers/applications/1558629910787006534/oauth2 e, em OAuth2 → Redirects, adicione exatamente a mesma URL informada em `DISCORD_REDIRECT_URI`. Salve.

## Teste

Abra `https://SEU-SERVICO.onrender.com/` e clique em “Continuar com Discord”. O endereço do callback precisa corresponder exatamente nos dois painéis.

## Segurança e limites

- Nunca publique Client Secret, token do bot ou access tokens.
- Este é um exemplo inicial. O estado OAuth fica em memória e pode expirar se o serviço reiniciar durante o login.
- Para adicionar um usuário a um servidor, é necessário outro fluxo explícito, escopo apropriado e um bot configurado no servidor. Não use para adicionar pessoas sem consentimento.
