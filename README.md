# Discord OAuth2 callback (consent-based)

This starter app provides a basic Discord OAuth2 login and callback. It only requests the `identify` scope, which verifies the identity of the person who explicitly clicks “Continuar com Discord”. It does not add users to a server or restore departed members.

## 1. Create a GitHub repository

1. Sign in at https://github.com/new
2. Create a **Public** repository named `discord-oauth2-callback`.
3. Upload `package.json`, `server.js`, `.gitignore`, and this README to the repository root.

## 2. Deploy on Render

1. In Render, choose **New → Web Service**.
2. Choose **Public Git Repository** and paste the URL of your GitHub repository.
3. Runtime/language: Node.
4. Build command: `npm install`
5. Start command: `npm start`
6. Create the service. Wait for Render to assign a URL such as `https://your-service.onrender.com`.

## 3. Add environment variables in Render

In the service's **Environment** tab, add:

- `DISCORD_CLIENT_ID` = your application's Client ID
- `DISCORD_CLIENT_SECRET` = the OAuth2 Client Secret from Discord Developer Portal (keep private)
- `DISCORD_REDIRECT_URI` = `https://YOUR-SERVICE.onrender.com/api/auth/discord/callback` (replace with the exact Render hostname)
- `SESSION_SECRET` = a long random secret, at least 32 characters

Save changes and redeploy.

## 4. Configure Discord

Open https://discord.com/developers/applications/1558629910787006534/oauth2

Under OAuth2 → Redirects, add the exact value of `DISCORD_REDIRECT_URI`, including `https://` and the full path. Save.

## 5. Test

Open `https://YOUR-SERVICE.onrender.com/` and click “Continuar com Discord”.
The callback must match exactly in Render and Discord.

## Notes

- Never publish the Client Secret, bot token, access tokens, or SESSION_SECRET.
- This starter stores OAuth state in process memory, so a service restart or multiple instances can interrupt a login; suitable only as a minimal starter, not a production session system.
- It requests only `identify`. Adding a member to a server is a separate, explicit flow requiring the `guilds.join` scope, a bot installed in the target guild with the appropriate permissions, and the user's consent. Do not use this to add people without clear consent.
