const express = require("express");
const crypto = require("crypto");

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI || !SESSION_SECRET) {
  console.error("Missing required environment variables. See README.md.");
  process.exit(1);
}

const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function cleanOldStates() {
  const now = Date.now();
  for (const [state, createdAt] of pendingStates.entries()) {
    if (now - createdAt > STATE_TTL_MS) pendingStates.delete(state);
  }
}
setInterval(cleanOldStates, 60_000).unref();

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Verificação Discord</title>
<body style="font-family:system-ui;max-width:680px;margin:60px auto;padding:0 20px;background:#111;color:#eee">
<h1>Verificação com Discord</h1>
<p>Entre usando o Discord para identificar sua conta. Nenhuma autorização será solicitada sem sua ação.</p>
<a href="/auth/discord" style="display:inline-block;padding:12px 18px;background:#5865F2;color:white;border-radius:8px;text-decoration:none">Continuar com Discord</a>
</body></html>`);
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/auth/discord", (_req, res) => {
  const state = crypto.randomBytes(32).toString("hex");
  pendingStates.set(state, Date.now());

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "identify",
    state
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get("/api/auth/discord/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) return res.status(400).send("A autorização foi cancelada ou recusada.");
  if (typeof code !== "string" || typeof state !== "string") {
    return res.status(400).send("Callback inválido: faltam code/state.");
  }

  const createdAt = pendingStates.get(state);
  pendingStates.delete(state);
  if (!createdAt || Date.now() - createdAt > STATE_TTL_MS) {
    return res.status(400).send("State inválido ou expirado. Volte ao site e tente novamente.");
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("OAuth token exchange failed:", tokenData.error || tokenResponse.status);
      return res.status(400).send("Não foi possível concluir a autorização. Tente novamente.");
    }

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userResponse.json();

    if (!userResponse.ok || !user.id) {
      return res.status(400).send("Não foi possível verificar a conta Discord.");
    }

    // Do not log or expose access tokens. This endpoint only identifies the user.
    res.type("html").send(`<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<title>Autorização concluída</title><body style="font-family:system-ui;max-width:680px;margin:60px auto;padding:0 20px">
<h1>Autorização concluída</h1><p>Conta verificada: <strong>${escapeHtml(user.username || "usuário")}</strong></p>
<p>Você autorizou a identificação básica da sua conta. Nenhum servidor foi alterado.</p>
</body></html>`);
  } catch (err) {
    console.error("OAuth callback error:", err.message);
    res.status(500).send("Erro interno ao processar a autorização.");
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

app.listen(PORT, () => console.log(`OAuth app listening on port ${PORT}`));
