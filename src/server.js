import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import axios from 'axios';
import pinoHttp from 'pino-http';
import { fileURLToPath } from 'url';
import { upsertWaba, getWaba, setLastAccessToken, getLastAccessToken } from './store.js';
import logger from './logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const APP_URL = process.env.APP_URL;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v24.0';

app.use(pinoHttp({
  logger,
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `ERR ${req.method} ${req.url} ${res.statusCode} ${err.message}`,
  customAttributeKeys: { req: 'request', res: 'response', err: 'error' }
}));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(cors({
  origin: [APP_URL, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'https://www.facebook.com'].filter(Boolean),
  credentials: false
}));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Expose safe config for the front-end
app.get('/config.js', (req, res) => {
  const safeConfig = {
    facebookAppId: process.env.FACEBOOK_APP_ID || '',
    facebookConfigId: process.env.FACEBOOK_CONFIG_ID || '',
    facebookBusinessId: process.env.FACEBOOK_BUSINESS_ID || '',
    appUrl: APP_URL || '',
    graphApiVersion: GRAPH_API_VERSION
  };
  res.type('application/javascript').send(`window.__PUBLIC_CONFIG__ = ${JSON.stringify(safeConfig)};`);
});

// Root serves the HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Exchange FB authorization code for access token
app.post('/api/fbAuthCode', async (req, res) => {
  try {
    const { code, waba_id, phone_number_id } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Missing code' });

    const params = {
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      code
    };

    const tokenUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`;
    const { data: tokenResp } = await axios.get(tokenUrl, { params });
    const access_token = tokenResp?.access_token;
    if (!access_token) return res.status(502).json({ error: 'No access_token in response', details: tokenResp });

    setLastAccessToken(access_token);
    let saved = null;
    if (waba_id) {
      saved = upsertWaba(waba_id, { access_token, phone_number_id });
    }

    return res.json({ success: true, access_token_saved: Boolean(access_token), saved, token_type: tokenResp?.token_type, expires_in: tokenResp?.expires_in });
  } catch (err) {
    const msg = err?.response?.data || err.message || 'Unknown error';
    return res.status(500).json({ error: 'fbAuthCode exchange failed', details: msg });
  }
});

// Register a phone number with Cloud API
app.post('/api/registerNumber', async (req, res) => {
  try {
    const { phone_number_id, pin, access_token, waba_id } = req.body || {};
    if (!phone_number_id) return res.status(400).json({ error: 'Missing phone_number_id' });

    let token = access_token;
    if (!token && waba_id) token = getWaba(waba_id)?.access_token;
    if (!token) token = getLastAccessToken();
    if (!token) return res.status(400).json({ error: 'Missing access token (provide access_token or save one via /api/fbAuthCode)' });

    const registerUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phone_number_id}/register`;
    const payload = { messaging_product: 'whatsapp', pin: pin || process.env.DEFAULT_REGISTER_PIN };
    const { data } = await axios.post(registerUrl, payload, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    return res.json({ success: true, result: data });
  } catch (err) {
    return res.status(500).json({ error: 'registerNumber failed', details: err?.response?.data || err.message });
  }
});

// Subscribe app to WABA webhooks
app.post('/api/subscribeWebhook', async (req, res) => {
  try {
    const { waba_id, access_token } = req.body || {};
    if (!waba_id) return res.status(400).json({ error: 'Missing waba_id' });

    const token = access_token || getWaba(waba_id)?.access_token || getLastAccessToken();
    if (!token) return res.status(400).json({ error: 'Missing access token' });

    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${waba_id}/subscribed_apps`;
    const { data } = await axios.post(url, null, { headers: { Authorization: `Bearer ${token}` } });
    return res.json({ success: true, result: data });
  } catch (err) {
    return res.status(500).json({ error: 'subscribeWebhook failed', details: err?.response?.data || err.message });
  }
});

// Debug endpoint: diagnose why existing WABA doesn't appear in Embedded Signup
app.post('/api/debug/wabas', async (req, res) => {
  try {
    const { access_token } = req.body || {};
    if (!access_token) return res.status(400).json({ error: 'Missing access_token in body' });

    const diagnosis = { timestamp: new Date().toISOString(), checks: [] };

    // 1. Get user's businesses with owned WABAs
    try {
      const { data: bizData } = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/me`, {
        params: { fields: 'businesses{id,name,owned_whatsapp_business_accounts{id,name,timezone}}', access_token }
      });
      diagnosis.checks.push({ check: 'Businesses with owned WABAs', success: true, data: bizData });
    } catch (err) {
      diagnosis.checks.push({ check: 'Businesses with owned WABAs', success: false, error: err?.response?.data || err.message });
    }

    // 2. Get user's businesses with client (shared) WABAs
    try {
      const { data: clientData } = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/me`, {
        params: { fields: 'businesses{id,name,client_whatsapp_business_accounts{id,name}}', access_token }
      });
      diagnosis.checks.push({ check: 'Businesses with client (shared) WABAs', success: true, data: clientData });
    } catch (err) {
      diagnosis.checks.push({ check: 'Businesses with client WABAs', success: false, error: err?.response?.data || err.message });
    }

    // 3. Debug token to see granted scopes
    try {
      const { data: debugData } = await axios.get(`https://graph.facebook.com/${GRAPH_API_VERSION}/debug_token`, {
        params: { input_token: access_token, access_token }
      });
      diagnosis.checks.push({ check: 'Token debug (scopes)', success: true, data: debugData });
    } catch (err) {
      diagnosis.checks.push({ check: 'Token debug', success: false, error: err?.response?.data || err.message });
    }

    // 4. Summary and recommendations
    const summary = { issues: [], recommendations: [] };
    
    const ownedCheck = diagnosis.checks.find(c => c.check === 'Businesses with owned WABAs');
    if (ownedCheck?.success) {
      const businesses = ownedCheck.data?.businesses?.data || [];
      const totalOwned = businesses.reduce((sum, b) => sum + (b.owned_whatsapp_business_accounts?.data?.length || 0), 0);
      if (totalOwned === 0) {
        summary.issues.push('Nenhuma WABA "owned" encontrada. WABAs compartilhadas não aparecem no Embedded Signup.');
        summary.recommendations.push('Verifique se você é Admin do Business Manager que possui a WABA.');
        summary.recommendations.push('Transfira a propriedade da WABA para o Business correto (Business Settings > WhatsApp Accounts).');
      } else {
        summary.issues.push(`${totalOwned} WABA(s) owned encontrada(s). Deveria aparecer no seletor.`);
      }
    }

    const scopeCheck = diagnosis.checks.find(c => c.check === 'Token debug (scopes)');
    if (scopeCheck?.success) {
      const scopes = scopeCheck.data?.data?.scopes || [];
      const hasWhatsAppManagement = scopes.includes('whatsapp_business_management');
      const hasBusinessManagement = scopes.includes('business_management');
      if (!hasWhatsAppManagement || !hasBusinessManagement) {
        summary.issues.push('Escopos insuficientes no token.');
        summary.recommendations.push('Certifique-se que a configuração (config_id) inclui whatsapp_business_management e business_management.');
        summary.recommendations.push('Refaça o login e aceite todas as permissões solicitadas.');
      }
    }

    diagnosis.summary = summary;
    return res.json(diagnosis);
  } catch (err) {
    return res.status(500).json({ error: 'debug/wabas failed', details: err?.response?.data || err.message });
  }
});

// Webhook verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Webhook receiver (POST)
app.post('/webhook', (req, res) => {
  try {
    const body = req.body;
    // Minimal logging; expand as needed
  logger.info({ event: body }, 'Webhook event received');
    // Always 200 to acknowledge receipt
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(500);
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal error' });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
