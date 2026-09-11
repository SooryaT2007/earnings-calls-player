import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.substring(0, eqIdx).trim();
    let val = trimmed.substring(eqIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val;
  }
});

import { fetchCompanies, fetchSessions } from './src/lib/notion-db';
import { getNotionClient, getDatabaseIds } from './src/lib/notion-client';

async function test() {
  console.log('--- FETCH COMPANIES ---');
  const companies = await fetchCompanies();
  console.log('Companies count:', companies.length);
  console.log('Companies:', JSON.stringify(companies, null, 2));

  for (const c of companies) {
    console.log(`\n--- FETCH SESSIONS FOR: ${c.name} (${c.id}) ---`);
    const sessions = await fetchSessions(c.id);
    console.log(`Sessions count for ${c.name}:`, sessions.length);
    console.log('Sessions:', JSON.stringify(sessions, null, 2));
  }
}

test().catch(console.error);
