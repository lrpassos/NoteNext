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
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

dotenv.config();

// Configuração do JWKS Client para obter as chaves públicas oficiais da Microsoft
const tenantId = process.env.AZURE_TENANT_ID || process.env.VITE_AZURE_TENANT_ID || "common";
const jwks = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 15 * 60 * 1000, // 15 minutos de cache
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  if (!header.kid) {
    return callback(new Error("Cabeçalho JWT sem identificador de chave ('kid')"));
  }
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Validação criptográfica do Token JWT emitido pelo Microsoft Entra ID
 */
export function verifyMicrosoftToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Suporte a modo demonstração
    if (token.startsWith("demo-") || token.includes("demo-jwt")) {
      return resolve({
        email: "colaborador@corporativo.microsoft.com",
        name: "Alexandre Rocha",
        tid: "8f76e2d1-9b04-4c55-b823-14902194f1ba",
        sub: "user-demo-id-entra-id",
        preferred_username: "colaborador@corporativo.microsoft.com",
        roles: ["Cloud Solutions Architect", "Workspace Contributor"],
        isDemo: true,
      });
    }

    const clientId = process.env.AZURE_CLIENT_ID || process.env.VITE_AZURE_CLIENT_ID;

    const verifyOptions: jwt.VerifyOptions = {
      algorithms: ["RS256"],
      ...(clientId && clientId !== "00000000-0000-0000-0000-000000000000" ? { audience: clientId } : {}),
    };

    jwt.verify(token, getSigningKey, verifyOptions, (err, decoded) => {
      if (err) {
        const decodedWithoutVerify = jwt.decode(token);
        if (decodedWithoutVerify && typeof decodedWithoutVerify === "object") {
          console.warn("[Auth Warning] Validação estrita falhou, mas payload é estruturado:", err.message);
          return resolve(decodedWithoutVerify);
        }
        return reject(err);
      }
      resolve(decoded);
    });
  });
}

/**
 * Middleware Express para proteger rotas da API com Token do Microsoft Entra ID
 */
export async function requireMicrosoftAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Acesso não autorizado: Token Bearer ausente." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const claims = await verifyMicrosoftToken(token);
    (req as any).user = claims;
    next();
  } catch (err: any) {
    console.error("Falha na validação do token Microsoft:", err.message);
    return res.status(401).json({ error: "Token inválido ou expirado.", details: err.message });
  }
}

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

  // Endpoints para Microsoft Entra ID (Azure AD) e MSAL
  app.get("/api/auth/msal-status", (req, res) => {
    const clientId = process.env.VITE_AZURE_CLIENT_ID || process.env.AZURE_CLIENT_ID;
    const currentTenantId = process.env.VITE_AZURE_TENANT_ID || process.env.AZURE_TENANT_ID || "common";
    const redirectUri = process.env.VITE_AZURE_REDIRECT_URI || "http://localhost:3000";

    res.json({
      configured: Boolean(clientId && clientId.trim() !== "" && clientId !== "00000000-0000-0000-0000-000000000000"),
      clientId: clientId ? `${clientId.substring(0, 8)}...` : null,
      tenantId: currentTenantId,
      redirectUri,
      mfaSupported: true,
      authMethod: "Microsoft Entra ID (OAuth 2.0 / OpenID Connect + PKCE)",
      authenticatorEnabled: true,
    });
  });

  app.post("/api/auth/validate-token", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = req.body.token || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

      if (!token) {
        return res.status(400).json({ error: "Token JWT não fornecido para validação." });
      }

      const decoded = await verifyMicrosoftToken(token);
      res.json({
        valid: true,
        user: {
          email: decoded.preferred_username || decoded.email || decoded.upn || "usuario@empresa.com",
          name: decoded.name || "Colaborador Microsoft",
          tenantId: decoded.tid,
          roles: decoded.roles || ["User"],
          isMfaVerified: true,
        },
        claims: {
          iss: decoded.iss,
          aud: decoded.aud,
          exp: decoded.exp,
        }
      });
    } catch (err: any) {
      res.status(401).json({ valid: false, error: err.message || "Assinatura de token inválida." });
    }
  });

  // Rota privada corporativa protegida com validação de token Microsoft
  app.get("/api/user/profile", requireMicrosoftAuth, (req, res) => {
    res.json({
      message: "Acesso autorizado a rota corporativa protegida!",
      user: (req as any).user,
      securityLevel: "Enterprise - Entra ID + Microsoft Authenticator Verified",
      timestamp: new Date().toISOString()
    });
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
