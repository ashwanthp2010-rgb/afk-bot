require('dns').setDefaultResultOrder('ipv4first');
"use strict";

const { addLog, getLogs } = require("./logger");
const mineflayer = require("mineflayer");
const { Movements, pathfinder, goals } = require("mineflayer-pathfinder");
const config = require("./settings.json");
const express = require("express");
const http = require("http");
const { SocksProxyAgent } = require("socks-proxy-agent");
const https = require("https");

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;

let bot = null;
let botRunning = false;
let reconnectTimer = null;

function createBot() {
  if (!botRunning) return;

  addLog("[Bot] Initializing Minecraft connection...");

  const proxyUrl = process.env.SOCKS_PROXY;
  const agent = proxyUrl ? new SocksProxyAgent(proxyUrl) : undefined;

  if (proxyUrl) {
    addLog("[Proxy] Connecting via SOCKS proxy...");
  }

  bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    username: config.bot.username,
    version: config.server.version || false,
    agent: agent
  });

  bot.loadPlugin(pathfinder);

  bot.on('login', () => {
    addLog(`[Bot] Successfully logged in as ${bot.username}`);
  });

  bot.on('spawn', () => {
    addLog("[Bot] Spawned in the world.");
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    addLog(`[Chat] <${username}> ${message}`);
  });

  bot.on('kicked', (reason) => {
    addLog(`[Bot] Kicked: ${reason}`);
  });

  bot.on('error', (err) => {
    addLog(`[Bot Error] ${err.message}`);
  });

  bot.on('end', () => {
    addLog("[Bot] Connection ended.");
    bot = null;
    if (botRunning) {
      addLog("[Bot] Attempting reconnect in 15 seconds...");
      reconnectTimer = setTimeout(createBot, 15000);
    }
  });
}

function stopBot() {
  botRunning = false;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (bot) {
    bot.end();
    bot = null;
  }
}

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>AFK Bot Control Panel</title>
        <style>
          body { font-family: sans-serif; background: #121212; color: #fff; padding: 20px; }
          #logs { background: #1e1e1e; padding: 10px; height: 300px; overflow-y: scroll; font-family: monospace; }
          button { padding: 10px 20px; margin-right: 10px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>AFK Bot Dashboard</h1>
        <button onclick="fetch('/start', {method:'POST'}).then(()=>location.reload())">Start Bot</button>
        <button onclick="fetch('/stop', {method:'POST'}).then(()=>location.reload())">Stop Bot</button>
        <h3>Live Logs:</h3>
        <div id="logs">${getLogs().join('<br>')}</div>
        <script>
          setInterval(() => {
            fetch('/logs-data').then(r => r.json()).then(data => {
              document.getElementById('logs').innerHTML = data.join('<br>');
            });
          }, 3000);
        </script>
      </body>
    </html>
  `);
});

app.get("/logs-data", (req, res) => {
  res.json(getLogs());
});

app.post("/start", (req, res) => {
  if (botRunning) return res.json({ success: false, msg: "Already running" });
  botRunning = true;
  createBot();
  addLog("[Control] Bot started");
  res.json({ success: true });
});

app.post("/stop", (req, res) => {
  if (!botRunning) return res.json({ success: false, msg: "Already stopped" });
  stopBot();
  addLog("[Control] Bot stopped");
  res.json({ success: true });
});

app.post("/command", (req, res) => {
  const cmd = (req.body.command || "").trim();
  if (!cmd) return res.json({ success: false, msg: "Empty command." });
  if (!bot) return res.json({ success: false, msg: "Bot is offline." });

  bot.chat(cmd);
  addLog(`[Console Command] > ${cmd}`);
  res.json({ success: true, msg: `Sent: ${cmd}` });
});

app.listen(PORT, () => {
  addLog(`[Web] Dashboard running on port ${PORT}`);
  botRunning = true;
  createBot();
});
