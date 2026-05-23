/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // SERVER-SIDE USER DATABASE FOR SECURE AUTHENTICATION
  const USERS_FILE = path.join(process.cwd(), "users-db.json");

  function readUsers() {
    try {
      if (!fs.existsSync(USERS_FILE)) {
        const defaults = [{ email: "admin@notenext.sh", password: "password123" }];
        fs.writeFileSync(USERS_FILE, JSON.stringify(defaults, null, 2), "utf8");
        return defaults;
      }
      const content = fs.readFileSync(USERS_FILE, "utf8");
      return JSON.parse(content);
    } catch (err) {
      console.error("Error reading users DB", err);
      return [{ email: "admin@notenext.sh", password: "password123" }];
    }
  }

  function writeUsers(users: any[]) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing users DB", err);
    }
  }

  // Auth endpoints
  app.get("/api/auth/users", (req, res) => {
    try {
      const users = readUsers();
      res.json(users.map((u: any) => ({ email: u.email })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/register", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }
      const users = readUsers();
      const exists = users.some((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        return res.status(400).json({ error: "Este endereço de e-mail já está cadastrado." });
      }
      users.push({ email: email.toLowerCase(), password });
      writeUsers(users);
      res.json({ success: true, message: "Usuário cadastrado com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }
      const users = readUsers();
      const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!user) {
        return res.status(401).json({ error: "Credenciais inválidas! Verifique o e-mail ou a senha." });
      }
      res.json({ success: true, email: user.email });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ error: "E-mail e nova senha são obrigatórios." });
      }
      const users = readUsers();
      const userIdx = users.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase());
      if (userIdx === -1) {
        return res.status(404).json({ error: "Este e-mail não foi encontrado no sistema." });
      }
      users[userIdx].password = newPassword;
      writeUsers(users);
      res.json({ success: true, message: "Senha redefinida com sucesso!" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SERVER-SIDE PROXY FOR GEMINI API
  app.post("/api/gemini", async (req, res) => {
    try {
      const { prompt, systemInstruction } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error: "A chave de API do Gemini (GEMINI_API_KEY) não foi encontrada no servidor. Configure-a no painel de Secrets no canto superior direito."
        });
      }

      // Initialize the modern @google/genai SDK on the server with user-agent telemetry
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Erro chamando Gemini API no servidor:", err);
      res.status(500).json({ error: err.message || "Erro de rede ou autenticação no Gemini" });
    }
  });

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
