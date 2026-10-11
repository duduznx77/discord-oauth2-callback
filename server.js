const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "1558629910787006534";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

if (!CLIENT_SECRET || !REDIRECT_URI) {
  console.error("Configuração ausente: defina DISCORD_CLIENT_SECRET e DISCORD_REDIRECT_URI no Render.");
  process.exit(1);
}

const states = new Map();
const STATE_TTL = 10 * 60 * 1000;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verificação Discord</title>
<body style="font-family:system-ui;max-width:680px;margin:60px auto;padding:0 20px;color:#222">
<h1>Verificação com Discord</h1>
<p>Ao continuar, você autoriza a identificação básica da sua conta Discord. Este site não adiciona você a servidores.</p>
<a href="/auth/discord" style="display:inline-block;background:#5865F2;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Continuar com Discord</a>
</body></html>`);
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/auth/discord", (_req, res) => {
  const state = crypto.randomBytes(32).toString("hex");
  states.set(state, Date.now());

  const query = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "identify",
    state
  });
  res.redirect(`https://discord.com/oauth2/authorize?${query}`);
});

app.get("/api/auth/discord/callback", async (req, res) => {
  const { code, state, error } = req.query;
  if (error) return res.status(400).send("A autorização foi cancelada ou recusada.");
  if (typeof code !== "string" || typeof state !== "string") {
    return res.status(400).send("Callback inválido. Volte à página inicial e tente novamente.");
  }

  const created = states.get(state);
  states.delete(state);
  if (!created || Date.now() - created > STATE_TTL) {
    return res.status(400).send("A sessão de autorização expirou. Volte à página inicial e tente novamente.");
  }

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
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
    const token = await tokenRes.json();

    if (!tokenRes.ok || !token.access_token) {
      console.error("Falha na troca OAuth2:", token.error || tokenRes.status);
      return res.status(400).send("Não foi possível concluir a autorização. Confira a URL de callback no Render e no Discord.");
    }

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    const user = await userRes.json();

    if (!userRes.ok || !user.id) {
      return res.status(400).send("Não foi possível identificar a conta Discord.");
    }

    res.type("html").send(`<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<title>Autorização concluída</title><body style="font-family:system-ui;max-width:680px;margin:60px auto;padding:0 20px">
<h1>Autorização concluída</h1>
<p>Conta identificada: <strong>${escapeHtml(user.username || "usuário")}</strong></p>
<p>Você autorizou apenas a identificação básica. Nenhum servidor foi alterado.</p>
</body></html>`);
  } catch (err) {
    console.error("Erro no callback:", err.message);
    res.status(500).send("Erro interno ao processar a autorização.");
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`Aplicação iniciada na porta ${PORT}`));
