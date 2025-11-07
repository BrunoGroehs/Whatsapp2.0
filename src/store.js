import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'store.json');

function ensureDb() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ wabas: {}, lastAccessToken: null }, null, 2));
  }
}

export function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

export function writeDb(data) {
  ensureDb();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function upsertWaba(wabaId, payload) {
  const db = readDb();
  db.wabas[wabaId] = { ...(db.wabas[wabaId] || {}), ...payload, updatedAt: new Date().toISOString() };
  writeDb(db);
  return db.wabas[wabaId];
}

export function getWaba(wabaId) {
  const db = readDb();
  return db.wabas[wabaId] || null;
}

export function setLastAccessToken(token) {
  const db = readDb();
  db.lastAccessToken = token;
  writeDb(db);
}

export function getLastAccessToken() {
  const db = readDb();
  return db.lastAccessToken || null;
}
