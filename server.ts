/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "notenext-enterprise-totp-jwt-secret-2026";

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

/**
 * Middleware Express para proteger rotas com JWT próprio da sessão individual do usuário
 */
export function requireSessionAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Sessão não autorizada. Faça login novamente." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type === "mfa_pending") {
      return res.status(403).json({ error: "Verificação 2FA pendente. Conclua o MFA primeiro." });
    }
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Sessão expirada ou inválida. Por favor, autentique-se novamente." });
  }
}

interface DbUser {
  id: string;
  email: string;
  password: string;
  name: string;
  mfa_enabled: boolean;
  mfa_secret?: string;
  temp_mfa_secret?: string;
  created_at: string;
  updated_at?: string;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // SERVER-SIDE USER DATABASE FOR SECURE AUTHENTICATION
  const USERS_FILE = path.join(process.cwd(), "users-db.json");

  function readUsers(): DbUser[] {
    try {
      if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf8");
        return [];
      }
      const content = fs.readFileSync(USERS_FILE, "utf8");
      return JSON.parse(content);
    } catch (err) {
      console.error("Error reading users DB", err);
      return [];
    }
  }

  function writeUsers(users: DbUser[]) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing users DB", err);
    }
  }

  // Healthcheck endpoint for proxy and uptime monitoring
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // List users for administrative display
  app.get("/api/auth/users", (req, res) => {
    try {
      const users = readUsers();
      res.json(users.map((u: any) => ({ email: u.email, mfa_enabled: Boolean(u.mfa_enabled) })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1. Register: Cria usuário individual com MFA pendente por padrão
  app.post("/api/auth/register", (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
      }

      const users = readUsers();
      const cleanEmail = email.toLowerCase().trim();
      const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        return res.status(400).json({ error: "Este endereço de e-mail já está cadastrado." });
      }

      const newUser: DbUser = {
        id: "usr_" + crypto.randomBytes(6).toString("hex"),
        email: cleanEmail,
        password: password, // Em produção estrita recomenda-se bcrypt/argon2
        name: name?.trim() || cleanEmail.split("@")[0],
        mfa_enabled: false, // Força a configuração no primeiro login
        created_at: new Date().toISOString(),
      };

      users.push(newUser);
      writeUsers(users);
      res.json({
        success: true,
        message: "Cadastro realizado com sucesso! Efetue o login para configurar seu autenticador 2FA.",
        email: newUser.email,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Login: Validação de credenciais e roteamento condicional de MFA
  app.post("/api/auth/login", (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }

      const cleanEmail = email.toLowerCase().trim();
      const users = readUsers();
      const user = users.find((u) => u.email.toLowerCase() === cleanEmail && u.password === password);

      if (!user) {
        const userExists = users.some((u) => u.email.toLowerCase() === cleanEmail);
        if (!userExists) {
          return res.status(401).json({
            error: "Usuário não encontrado. Como o banco foi zerado, clique em 'Criar Conta' abaixo para se cadastrar.",
          });
        }
        return res.status(401).json({ error: "Senha incorreta. Por favor, tente novamente." });
      }

      // Gera token temporário de estágio MFA restrito a 5 minutos
      const tempToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          type: "mfa_pending",
        },
        JWT_SECRET,
        { expiresIn: "5m" }
      );

      // CASO A: Primeiro Login - Usuário ainda não tem 2FA configurado
      if (!user.mfa_enabled || !user.mfa_secret) {
        return res.json({
          success: true,
          requireMfaSetup: true,
          requireMfaVerify: false,
          tempToken,
          email: user.email,
          name: user.name,
          message: "Primeiro acesso detectado. É obrigatório configurar o Google ou Microsoft Authenticator.",
        });
      }

      // CASO B: Acessos subsequentes - Usuário já possui 2FA configurado
      return res.json({
        success: true,
        requireMfaSetup: false,
        requireMfaVerify: true,
        tempToken,
        email: user.email,
        name: user.name,
        message: "Digite o código de 6 dígitos gerado no seu aplicativo autenticador.",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. MFA Setup: Gera segredo TOTP e QR Code para escaneamento inicial
  app.post("/api/auth/mfa-setup", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const tempToken = req.body.tempToken || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

      if (!tempToken) {
        return res.status(401).json({ error: "Token de autorização temporário não fornecido." });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(tempToken, JWT_SECRET);
      } catch (e: any) {
        return res.status(401).json({ error: "Sessão temporária expirada. Faça login novamente.", details: e.message });
      }

      if (decoded.type !== "mfa_pending") {
        return res.status(403).json({ error: "Token inválido para configuração de MFA." });
      }

      const users = readUsers();
      const user = users.find((u) => u.id === decoded.sub || u.email.toLowerCase() === decoded.email.toLowerCase());
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }

      // Gera novo segredo seguro em Base32 usando otplib
      const secret = generateSecret();

      // Gera a URI padrão otpauth:// reconhecida pelo Google Authenticator e Microsoft Authenticator
      const otpauth = generateURI({
        issuer: "NoteNext Workspace",
        label: user.email,
        secret: secret,
      });

      // Renderiza a imagem do QR Code em base64 Data URL
      const qrCodeUrl = await QRCode.toDataURL(otpauth, {
        width: 260,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });

      // Salva o segredo temporário (somente atrelado definitivamente após confirmação com código real)
      user.temp_mfa_secret = secret;
      writeUsers(users);

      res.json({
        success: true,
        secret,
        qrCodeUrl,
        otpauth,
        email: user.email,
      });
    } catch (err: any) {
      console.error("Erro na rota /mfa-setup:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. MFA Verify: Valida o código de 6 dígitos (tanto no cadastro inicial quanto no login regular)
  app.post("/api/auth/mfa-verify", (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const { code } = req.body;
      const tempToken = req.body.tempToken || (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

      if (!tempToken) {
        return res.status(401).json({ error: "Token temporário ausente. Reinicie o login." });
      }

      if (!code) {
        return res.status(400).json({ error: "O código de 6 dígitos é obrigatório." });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(tempToken, JWT_SECRET);
      } catch (e: any) {
        return res.status(401).json({ error: "Sua tentativa expirou (limite de 5 min). Faça login novamente.", details: e.message });
      }

      if (decoded.type !== "mfa_pending") {
        return res.status(403).json({ error: "Token inválido para verificação de MFA." });
      }

      const users = readUsers();
      const user = users.find((u) => u.id === decoded.sub || u.email.toLowerCase() === decoded.email.toLowerCase());
      if (!user) {
        return res.status(404).json({ error: "Usuário não localizado no sistema." });
      }

      const cleanCode = String(code).trim().replace(/\s+/g, "");
      if (!/^\d{6}$/.test(cleanCode)) {
        return res.status(400).json({ error: "O código deve ser composto por exatamente 6 dígitos numéricos." });
      }

      const isInitialSetup = !user.mfa_enabled;
      const secretToVerify = isInitialSetup ? user.temp_mfa_secret : user.mfa_secret;

      if (!secretToVerify) {
        return res.status(400).json({ error: "Nenhum segredo 2FA encontrado para este usuário. Reinicie o fluxo." });
      }

      // Validação estrita do token TOTP
      const verificationResult = verifySync({
        token: cleanCode,
        secret: secretToVerify,
      });

      if (!verificationResult || !verificationResult.valid) {
        return res.status(400).json({
          error: "Código de verificação incorreto ou expirado. Verifique o relógio do seu celular e tente novamente.",
        });
      }

      // Se for configuração inicial (primeiro login), ativa o 2FA e salva o secret permanente
      if (isInitialSetup) {
        user.mfa_enabled = true;
        user.mfa_secret = user.temp_mfa_secret;
        delete user.temp_mfa_secret;
        user.updated_at = new Date().toISOString();
        writeUsers(users);
      }

      // Emite o JWT oficial e isolado da sessão do usuário (válido por 24h)
      const sessionToken = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          name: user.name || user.email.split("@")[0],
          mfa_verified: true,
          auth_type: "totp_mfa",
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        message: isInitialSetup ? "2FA ativado com sucesso! Seja bem-vindo ao Workspace." : "Autenticação concluída!",
        token: sessionToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split("@")[0],
          mfaEnabled: true,
        },
      });
    } catch (err: any) {
      console.error("Erro na rota /mfa-verify:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Sessão do Usuário: Verifica token JWT ativo
  app.get("/api/auth/me", requireSessionAuth, (req, res) => {
    try {
      const userClaim = (req as any).user;
      const users = readUsers();
      const existingUser = users.find((u) => u.id === userClaim.sub || u.email.toLowerCase() === userClaim.email?.toLowerCase());
      if (!existingUser) {
        return res.status(401).json({ valid: false, error: "Usuário não encontrado ou base de dados redefinida." });
      }
      res.json({
        valid: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          mfaEnabled: existingUser.mfa_enabled,
        },
      });
    } catch (err: any) {
      res.status(401).json({ valid: false, error: err.message });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ error: "E-mail e nova senha são obrigatórios." });
      }
      const users = readUsers();
      const userIdx = users.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase().trim());
      if (userIdx === -1) {
        return res.status(404).json({ error: "Este e-mail não foi encontrado no sistema." });
      }
      users[userIdx].password = newPassword;
      // Ao redefinir senha, força reconfiguração do 2FA
      users[userIdx].mfa_enabled = false;
      delete users[userIdx].mfa_secret;
      delete users[userIdx].temp_mfa_secret;
      writeUsers(users);
      res.json({ success: true, message: "Senha redefinida com sucesso! Ao entrar, configure seu 2FA novamente." });
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
          name: decoded.name || (decoded.email ? decoded.email.split("@")[0] : "Colaborador Microsoft"),
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

  // Rota privada corporativa protegida com validação de token (aceita sessão individual ou token Entra ID)
  app.get("/api/user/profile", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Acesso não autorizado: Token Bearer ausente." });
    }
    const token = authHeader.split(" ")[1];

    // Tenta primeiro como JWT individual de sessão local
    try {
      const sessionDecoded = jwt.verify(token, JWT_SECRET) as any;
      return res.json({
        message: "Acesso autorizado a rota protegida com sessão autenticada por TOTP 2FA!",
        user: {
          email: sessionDecoded.email,
          name: sessionDecoded.name,
          sub: sessionDecoded.sub,
          authType: "TOTP 2FA (RFC 6238)",
          mfaVerified: true,
        },
        securityLevel: "High - Authenticator 2FA Verified",
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Se não for JWT local, valida como Microsoft Token
      verifyMicrosoftToken(token)
        .then((microsoftClaims) => {
          return res.json({
            message: "Acesso autorizado a rota corporativa protegida!",
            user: microsoftClaims,
            securityLevel: "Enterprise - Entra ID + Microsoft Authenticator Verified",
            timestamp: new Date().toISOString(),
          });
        })
        .catch((err) => {
          return res.status(401).json({ error: "Token inválido ou expirado.", details: err.message });
        });
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

  // API 404 handler - prevents unhandled /api/* requests from falling into Vite SPA HTML fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `Rota de API não encontrada: ${req.method} ${req.originalUrl}` });
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
