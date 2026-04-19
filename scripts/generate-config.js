const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, '.env');
const outputPath = path.join(projectRoot, 'config.js');

function parseDotEnv(content) {
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const sep = line.indexOf('=');
    if (sep === -1) continue;

    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }

  return parsed;
}

const fileEnv = fs.existsSync(envPath)
  ? parseDotEnv(fs.readFileSync(envPath, 'utf8'))
  : {};

const env = { ...process.env, ...fileEnv };

const appConfig = {
  CHATWOOT_TOKEN: env.CHATWOOT_TOKEN || '',
  CHATWOOT_URL: env.CHATWOOT_URL || '',
  N8N_WEBHOOK_URL: env.N8N_WEBHOOK_URL || '',
  SUPABASE_URL: env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || '',
  SUPABASE_LEADS_TABLE: env.SUPABASE_LEADS_TABLE || 'chat_leads'
};

const output = `window.APP_CONFIG = ${JSON.stringify(appConfig, null, 2)};\n`;
fs.writeFileSync(outputPath, output, 'utf8');

console.log(`config.js gerado em: ${outputPath}`);