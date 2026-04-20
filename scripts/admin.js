window.APP_CONFIG = window.APP_CONFIG || {};

const APP_CONFIG = window.APP_CONFIG || {};
const SUPABASE_URL = (APP_CONFIG.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = APP_CONFIG.SUPABASE_ANON_KEY || '';
const SUPABASE_LEADS_TABLE = APP_CONFIG.SUPABASE_LEADS_TABLE || 'chat_leads';
const SUPABASE_CONVERSAS_TABLE = APP_CONFIG.SUPABASE_CONVERSAS_TABLE || '';
const SUPABASE_LOGS_TABLE = APP_CONFIG.SUPABASE_LOGS_TABLE || '';
const ADMIN_CONVERSAS_ENDPOINT = APP_CONFIG.ADMIN_CONVERSAS_ENDPOINT || '';
const ADMIN_LOGS_ENDPOINT = APP_CONFIG.ADMIN_LOGS_ENDPOINT || '';

const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const STATE = {
  leads: [],
  conversas: [],
  logsIA: []
};

function escapeHtml(value) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(value == null ? '' : value).replace(/[&<>"']/g, m => map[m]);
}

function normalizeArea(area) {
  const raw = String(area || '').trim().toLowerCase();
  if (!raw) return 'geral';
  if (/(trib|fiscal|impost)/.test(raw)) return 'tributario';
  if (/(trab|clt|rescis|empreg)/.test(raw)) return 'trabalhista';
  if (/(fam|divorc|invent|sucess)/.test(raw)) return 'familia';
  if (/(compl|lgpd|privacidade)/.test(raw)) return 'compliance';
  if (/(empres|societ|contrat|cnpj|m&a)/.test(raw)) return 'empresarial';
  return raw.replace(/\s+/g, '_');
}

function normalizeStatus(status) {
  const raw = String(status || '').trim().toLowerCase();
  if (['novo', 'contatado', 'qualificado', 'perdido'].includes(raw)) return raw;
  if (/(new|novo|aberto)/.test(raw)) return 'novo';
  if (/(contat|follow)/.test(raw)) return 'contatado';
  if (/(qualif|fechado|ganho)/.test(raw)) return 'qualificado';
  if (/(perd|lost|cancel)/.test(raw)) return 'perdido';
  return 'novo';
}

function parseDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDate(value) {
  return parseDate(value).toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  return parseDate(value).toLocaleString('pt-BR');
}

function formatHour(value) {
  return parseDate(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function minutesAgo(value) {
  const diffMs = Date.now() - parseDate(value).getTime();
  return Math.max(1, Math.floor(diffMs / 60000));
}

function timeAgo(mins) {
  if (mins < 60) return `ha ${mins} min`;
  if (mins < 1440) return `ha ${Math.floor(mins / 60)}h`;
  return `ha ${Math.floor(mins / 1440)}d`;
}

function statusBadge(s) {
  const status = normalizeStatus(s);
  const map = {
    novo: 'badge-gold',
    contatado: 'badge-blue',
    qualificado: 'badge-green',
    perdido: 'badge-red'
  };
  return `<span class="badge ${map[status] || 'badge-gold'}"><span class="badge-dot"></span>${escapeHtml(status)}</span>`;
}

function areaBadge(a) {
  return `<span class="area-pill">${escapeHtml(normalizeArea(a))}</span>`;
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
}

async function fetchSupabaseRows(table, selectColumns, orderBy, limit) {
  if (!HAS_SUPABASE || !table) return [];

  const endpoint = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(selectColumns)}&order=${encodeURIComponent(orderBy)}&limit=${limit}`;
  const res = await fetch(endpoint, { headers: supabaseHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao consultar ${table}: ${res.status} ${text}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchJsonEndpoint(url) {
  if (!url) return [];
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao consultar endpoint ${url}: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function mapLead(row, index) {
  const createdAt = row.created_at || row.data || row.updated_at || new Date().toISOString();
  const idValue = row.id || row.lead_id || row.session_id || `lead_${index + 1}`;

  return {
    id: String(idValue),
    nome: row.nome || row.name || 'Lead sem nome',
    area: normalizeArea(row.area || row.intent || row.intencao || 'geral'),
    status: normalizeStatus(row.status || 'novo'),
    data: formatDate(createdAt),
    createdAt,
    origem: row.origem || row.source || 'chat_site',
    tokens: Number(row.tokens || row.total_tokens || 0),
    msgs: Number(row.msgs || row.message_count || row.total_msgs || 0),
    sessionId: row.session_id || row.sessao || '',
    ultimaMensagem: row.ultima_mensagem || row.last_message || ''
  };
}

function mapConversa(row, index) {
  const createdAt = row.created_at || row.updated_at || new Date().toISOString();
  const idValue = row.session_id || row.id || `sessao_${index + 1}`;
  const nome = row.nome || row.name || 'Contato';
  const area = normalizeArea(row.area || row.intencao || row.intent || 'geral');
  const preview = row.preview || row.ultima_mensagem || row.last_message || 'Sem mensagem registrada';

  let messages = [];
  if (Array.isArray(row.messages)) {
    messages = row.messages.map(msg => ({
      role: msg.role === 'assistant' ? 'bot' : msg.role === 'bot' ? 'bot' : 'user',
      text: String(msg.text || msg.content || ''),
      time: formatHour(msg.created_at || msg.time || createdAt)
    })).filter(msg => msg.text.trim());
  }

  if (!messages.length && preview) {
    messages = [{ role: 'user', text: preview, time: formatHour(createdAt) }];
  }

  return {
    id: String(idValue),
    nome,
    area,
    preview,
    time: minutesAgo(createdAt),
    unread: Number(row.unread || 0),
    msgs: messages
  };
}

function mapLog(row, index) {
  const timestamp = row.timestamp || row.created_at || row.updated_at || new Date().toISOString();
  const latencyMs = Number(row.latency_ms || row.latencia_ms || 0);

  return {
    id: String(row.id || `log_${index + 1}`),
    sessao: String(row.session_id || row.sessao || row.session || '--'),
    intencao: normalizeArea(row.intencao || row.intent || row.area || 'geral'),
    tokens: Number(row.tokens || row.total_tokens || 0),
    rag: Boolean(row.rag || row.used_rag),
    latencia: latencyMs > 0 ? `${latencyMs}ms` : String(row.latencia || '--'),
    timestamp: formatDateTime(timestamp)
  };
}

function buildConversationsFromLeads(leads) {
  return leads
    .filter(lead => lead.sessionId || lead.ultimaMensagem)
    .slice(0, 30)
    .map((lead, index) => ({
      id: lead.sessionId || `lead_${index + 1}`,
      nome: lead.nome,
      area: normalizeArea(lead.area),
      preview: lead.ultimaMensagem || 'Contato registrado no lead',
      time: minutesAgo(lead.createdAt),
      unread: 0,
      msgs: [{ role: 'user', text: lead.ultimaMensagem || 'Contato inicial registrado.', time: formatHour(lead.createdAt) }]
    }));
}

async function loadLeads() {
  if (!HAS_SUPABASE) return [];

  const rows = await fetchSupabaseRows(
    SUPABASE_LEADS_TABLE,
    'id,session_id,nome,area,status,origem,ultima_mensagem,tokens,msgs,message_count,total_tokens,total_msgs,created_at,updated_at',
    'created_at.desc',
    500
  );

  return rows.map(mapLead);
}

async function loadConversas(leads) {
  if (HAS_SUPABASE && SUPABASE_CONVERSAS_TABLE) {
    const rows = await fetchSupabaseRows(
      SUPABASE_CONVERSAS_TABLE,
      'id,session_id,nome,area,preview,ultima_mensagem,last_message,unread,messages,created_at,updated_at',
      'updated_at.desc',
      300
    );
    return rows.map(mapConversa);
  }

  if (ADMIN_CONVERSAS_ENDPOINT) {
    const rows = await fetchJsonEndpoint(ADMIN_CONVERSAS_ENDPOINT);
    return rows.map(mapConversa);
  }

  return buildConversationsFromLeads(leads);
}

async function loadLogs() {
  if (HAS_SUPABASE && SUPABASE_LOGS_TABLE) {
    const rows = await fetchSupabaseRows(
      SUPABASE_LOGS_TABLE,
      'id,session_id,sessao,intencao,intent,area,tokens,total_tokens,rag,used_rag,latency_ms,latencia_ms,latencia,created_at,timestamp,updated_at',
      'created_at.desc',
      500
    );
    return rows.map(mapLog);
  }

  if (ADMIN_LOGS_ENDPOINT) {
    const rows = await fetchJsonEndpoint(ADMIN_LOGS_ENDPOINT);
    return rows.map(mapLog);
  }

  return [];
}

function renderLeadsTable() {
  const filterArea = document.getElementById('filter-area')?.value || '';
  const filterStatus = document.getElementById('filter-status')?.value || '';
  const data = STATE.leads.filter(lead => {
    const byArea = !filterArea || normalizeArea(lead.area) === filterArea;
    const byStatus = !filterStatus || normalizeStatus(lead.status) === filterStatus;
    return byArea && byStatus;
  });

  const countEl = document.getElementById('leads-full-count');
  if (countEl) countEl.textContent = `${data.length} registros`;

  const tbl = document.getElementById('leads-table-full');
  if (!tbl) return;

  if (!data.length) {
    tbl.innerHTML = '<tbody><tr><td style="padding:16px;color:var(--white-dim)">Sem leads reais. Dados esperados de Supabase na tabela configurada em SUPABASE_LEADS_TABLE.</td></tr></tbody>';
    return;
  }

  tbl.innerHTML = `
    <thead><tr>
      <th>ID</th><th>Nome</th><th>Area</th><th>Status</th>
      <th>Data</th><th>Msgs</th><th>Origem</th><th>Acoes</th>
    </tr></thead>
    <tbody>${data.map(lead => `
      <tr>
        <td class="td-mono">${escapeHtml(lead.id)}</td>
        <td>${escapeHtml(lead.nome)}</td>
        <td>${areaBadge(lead.area)}</td>
        <td>${statusBadge(lead.status)}</td>
        <td>${escapeHtml(lead.data)}</td>
        <td>${Number(lead.msgs) || 0}</td>
        <td style="color:var(--white-faint)">${escapeHtml(lead.origem)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="ld-btn" style="padding:4px 10px;font-size:0.58rem">Ver</button>
            <button class="ld-btn primary" style="padding:4px 10px;font-size:0.58rem">Contatar</button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>`;
}

function renderLeadsMini() {
  const data = STATE.leads
    .filter(lead => normalizeStatus(lead.status) === 'novo')
    .slice(0, 5);

  const tbl = document.getElementById('leads-table-mini');
  if (!tbl) return;

  if (!data.length) {
    tbl.innerHTML = '<tbody><tr><td style="padding:16px;color:var(--white-dim)">Nenhum lead novo encontrado.</td></tr></tbody>';
    return;
  }

  tbl.innerHTML = `
    <thead><tr><th>Nome</th><th>Area</th><th>Status</th><th>Data</th><th>Msgs</th></tr></thead>
    <tbody>${data.map(lead => `
      <tr>
        <td>${escapeHtml(lead.nome)}</td>
        <td>${areaBadge(lead.area)}</td>
        <td>${statusBadge(lead.status)}</td>
        <td>${escapeHtml(lead.data)}</td>
        <td>${Number(lead.msgs) || 0}</td>
      </tr>`).join('')}
    </tbody>`;
}

function renderConvList() {
  const list = document.getElementById('conv-list');
  if (!list) return;

  if (!STATE.conversas.length) {
    list.innerHTML = '<div style="padding:16px;color:var(--white-dim)">Sem conversas. Configure SUPABASE_CONVERSAS_TABLE ou ADMIN_CONVERSAS_ENDPOINT para carregar o historico real.</div>';
    const title = document.getElementById('conv-detail-title');
    const body = document.getElementById('conv-detail-body');
    if (title) title.textContent = 'Sem conversas';
    if (body) body.innerHTML = '<div style="color:var(--white-dim)">Aguardando fonte de dados de conversas.</div>';
    return;
  }

  list.innerHTML = STATE.conversas.slice(0, 80).map((conv, idx) => `
    <div class="conv-item ${idx === 0 ? 'selected' : ''}" onclick="selectConv(${idx}, this)">
      <div class="conv-avatar">${escapeHtml((conv.nome || '?')[0] || '?')}</div>
      <div class="conv-body">
        <div class="conv-name">${escapeHtml(conv.nome)}</div>
        <div class="conv-preview">${escapeHtml(conv.preview)}</div>
      </div>
      <div class="conv-meta">
        <div class="conv-time">${timeAgo(conv.time)}</div>
        ${conv.unread ? `<div class="conv-unread">${conv.unread}</div>` : ''}
      </div>
    </div>`).join('');

  selectConv(0, list.querySelector('.conv-item'));
}

function selectConv(index, el) {
  const conv = STATE.conversas[index];
  if (!conv) return;

  document.querySelectorAll('.conv-item').forEach(item => item.classList.remove('selected'));
  if (el) el.classList.add('selected');

  const title = document.getElementById('conv-detail-title');
  const body = document.getElementById('conv-detail-body');
  if (!title || !body) return;

  title.textContent = conv.nome;
  body.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
      ${areaBadge(conv.area)}
      <span class="badge badge-green"><span class="badge-dot"></span>Historico real</span>
      <span style="font-size:0.68rem;color:var(--white-faint)">${escapeHtml(conv.id)}</span>
    </div>
    <div class="chat-panel">
      <div class="chat-panel-messages">${conv.msgs.map(msg => `
        <div class="cp-msg ${msg.role === 'bot' ? 'bot' : 'user'}">
          <div class="cp-bubble">${escapeHtml(msg.text)}</div>
          <div class="cp-time">${escapeHtml(msg.time)}</div>
        </div>`).join('')}
      </div>
      <div class="chat-panel-footer">
        <input class="chat-reply-input" placeholder="Responder manualmente...">
        <button class="chat-send-btn">Enviar</button>
      </div>
    </div>`;
}

function renderPipeline() {
  const cols = [
    { name: 'Novo', status: 'novo', color: 'var(--gold)' },
    { name: 'Contatado', status: 'contatado', color: 'var(--blue)' },
    { name: 'Qualificado', status: 'qualificado', color: 'var(--green)' },
    { name: 'Perdido', status: 'perdido', color: 'var(--red)' }
  ];

  const board = document.getElementById('pipeline-board');
  if (!board) return;

  board.innerHTML = cols.map(col => {
    const items = STATE.leads.filter(lead => normalizeStatus(lead.status) === col.status);
    return `<div class="pipeline-col">
      <div class="pipeline-col-header">
        <span class="pipeline-col-name" style="color:${col.color}">${col.name}</span>
        <span class="pipeline-col-count">${items.length}</span>
      </div>
      ${items.map(lead => `
        <div class="pipeline-card" style="border-left-color:${col.color}">
          <div class="pipeline-card-name">${escapeHtml(lead.nome)}</div>
          <div class="pipeline-card-area">${escapeHtml(normalizeArea(lead.area))}</div>
          <div class="pipeline-card-footer">
            <span class="pipeline-card-date">${escapeHtml(lead.data)}</span>
            <span style="font-size:0.65rem;color:var(--white-faint)">${Number(lead.msgs) || 0} msgs</span>
          </div>
        </div>`).join('')}
    </div>`;
  }).join('');
}

function renderLogs() {
  const tbl = document.getElementById('logs-table');
  const count = document.getElementById('logs-count');
  if (!tbl || !count) return;

  count.textContent = `${STATE.logsIA.length} entradas`;

  if (!STATE.logsIA.length) {
    tbl.innerHTML = '<tbody><tr><td style="padding:16px;color:var(--white-dim)">Sem logs. Configure SUPABASE_LOGS_TABLE ou ADMIN_LOGS_ENDPOINT para auditoria real.</td></tr></tbody>';
    return;
  }

  tbl.innerHTML = `
    <thead><tr>
      <th>Sessao</th><th>Intencao</th><th>Tokens</th><th>RAG</th><th>Latencia</th><th>Timestamp</th>
    </tr></thead>
    <tbody>${STATE.logsIA.map(log => `
      <tr>
        <td class="td-mono">${escapeHtml(log.sessao)}</td>
        <td>${areaBadge(log.intencao)}</td>
        <td style="font-variant-numeric:tabular-nums">${Number(log.tokens) || 0}</td>
        <td>${log.rag ? '<span class="badge badge-green"><span class="badge-dot"></span>Sim</span>' : '<span class="badge badge-red"><span class="badge-dot"></span>Nao</span>'}</td>
        <td style="color:var(--white-faint)">${escapeHtml(log.latencia)}</td>
        <td style="color:var(--white-faint);font-size:0.72rem">${escapeHtml(log.timestamp)}</td>
      </tr>`).join('')}
    </tbody>`;
}

function renderActivity() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  const recentLeads = STATE.leads.slice(0, 6).map((lead, idx) => ({
    color: idx % 2 === 0 ? 'var(--green)' : 'var(--gold)',
    text: `Novo lead: <strong>${escapeHtml(lead.nome)}</strong> (${escapeHtml(normalizeArea(lead.area))})`,
    time: `${Math.max(1, minutesAgo(lead.createdAt))} min`
  }));

  if (!recentLeads.length) {
    feed.innerHTML = '<div class="activity-item"><div class="activity-body"><div class="activity-text">Aguardando eventos reais de leads e conversas.</div></div></div>';
    return;
  }

  feed.innerHTML = recentLeads.map(item => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${item.color}"></div>
      <div class="activity-body">
        <div class="activity-text">${item.text}</div>
        <div class="activity-time">ha ${escapeHtml(item.time)}</div>
      </div>
    </div>`).join('');
}

function renderBarChart() {
  const el = document.getElementById('bar-chart');
  const legend = document.getElementById('area-distribution-legend');
  if (!el) return;

  const areaOrder = ['empresarial', 'tributario', 'trabalhista', 'familia', 'compliance', 'geral'];
  const areaMap = new Map(areaOrder.map(area => [area, 0]));

  STATE.leads.forEach(lead => {
    const area = normalizeArea(lead.area);
    areaMap.set(area, (areaMap.get(area) || 0) + 1);
  });

  const total = Array.from(areaMap.values()).reduce((acc, value) => acc + value, 0);
  if (!total) {
    el.innerHTML = '<div style="padding:12px;color:var(--white-dim);font-size:0.75rem">Sem dados para grafico. Fonte: tabela de leads no Supabase.</div>';
    if (legend) {
      legend.innerHTML = '<span class="badge badge-yellow"><span class="badge-dot"></span>Aguardando distribuicao por area</span>';
    }
    return;
  }

  const colorByArea = {
    empresarial: 'var(--gold)',
    tributario: 'var(--blue)',
    trabalhista: 'var(--green)',
    familia: 'var(--yellow)',
    compliance: 'var(--red)',
    geral: 'rgba(255,255,255,0.15)'
  };

  const data = areaOrder
    .filter(area => (areaMap.get(area) || 0) > 0)
    .map(area => {
      const count = areaMap.get(area) || 0;
      const percent = Math.round((count / total) * 100);
      return {
        label: area.slice(0, 4),
        area,
        count,
        percent,
        h: Math.max(8, Math.round((count / total) * 100)),
        color: colorByArea[area] || 'rgba(255,255,255,0.15)'
      };
    });

  el.innerHTML = data.map(item => `
    <div class="bar-group">
      <div class="bar" style="height:${item.h}%;background:${item.color};opacity:0.75"></div>
      <div class="bar-label">${escapeHtml(item.label)}</div>
    </div>`).join('');

  if (legend) {
    legend.innerHTML = data.map(item => `
      <span class="badge badge-gold"><span class="badge-dot"></span>${escapeHtml(item.area)} ${item.percent}%</span>
    `).join('');
  }
}

function setView(name, el) {
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  const view = document.getElementById(`view-${name}`);
  if (view) view.classList.add('active');
  if (el) el.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    leads: 'Leads',
    conversas: 'Conversas',
    pipeline: 'Pipeline',
    configuracoes: 'Configuracoes',
    logs: 'Logs IA'
  };

  const subs = {
    dashboard: '· Visao Geral',
    leads: '· Gestao de Leads',
    conversas: '· Historico do Chat',
    pipeline: '· Funil de Conversao',
    configuracoes: '· Integracoes',
    logs: '· Auditoria IA'
  };

  const titleEl = document.getElementById('topbar-title');
  const subtitleEl = document.getElementById('topbar-subtitle');
  if (titleEl) titleEl.textContent = titles[name] || name;
  if (subtitleEl) subtitleEl.textContent = subs[name] || '';

  closeMobileMenu();
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
}

function openMobileMenu() {
  document.getElementById('sidebar')?.classList.add('mobile-open');
  document.getElementById('mobile-overlay')?.classList.add('active');
}

function closeMobileMenu() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('mobile-overlay')?.classList.remove('active');
}

function updateBadgeCounters() {
  const novos = STATE.leads.filter(lead => normalizeStatus(lead.status) === 'novo').length;
  const comNaoLidas = STATE.conversas.filter(conv => Number(conv.unread) > 0).length;
  const conversasHoje = STATE.conversas.filter(conv => Number(conv.time) <= 1440).length;

  const badgeLeads = document.getElementById('badge-leads');
  const badgeConv = document.getElementById('badge-conv');
  if (badgeLeads) badgeLeads.textContent = String(novos);
  if (badgeConv) badgeConv.textContent = String(comNaoLidas);

  const countMini = document.getElementById('leads-count');
  if (countMini) countMini.textContent = `${novos} pendentes`;

  const convCountHeader = document.getElementById('conv-count-header');
  if (convCountHeader) convCountHeader.textContent = `${conversasHoje} hoje`;
}

function updateSummaryCards() {
  const totalLeads = STATE.leads.length;
  const novos = STATE.leads.filter(lead => normalizeStatus(lead.status) === 'novo').length;
  const totalConversas = STATE.conversas.length;
  const conversasHoje = STATE.conversas.filter(conv => Number(conv.time) <= 1440).length;
  const taxa = totalLeads > 0 ? Math.round((novos / totalLeads) * 100) : 0;

  const latencias = STATE.logsIA
    .map(log => Number(String(log.latencia || '').replace(/[^0-9]/g, '')))
    .filter(value => Number.isFinite(value) && value > 0);
  const mediaMs = latencias.length
    ? Math.round(latencias.reduce((acc, value) => acc + value, 0) / latencias.length)
    : 0;
  const mediaSeg = mediaMs > 0 ? (mediaMs / 1000).toFixed(1) : '--';

  const statConversasHoje = document.getElementById('stat-conversas-hoje');
  const statConversasDelta = document.getElementById('stat-conversas-delta');
  const statConversasFill = document.getElementById('stat-conversas-fill');
  if (statConversasHoje) statConversasHoje.textContent = String(conversasHoje);
  if (statConversasDelta) statConversasDelta.textContent = `${totalConversas} conversas totais`;
  if (statConversasFill) statConversasFill.style.width = `${Math.min(100, totalConversas)}%`;

  const statLeadsNovos = document.getElementById('stat-leads-novos');
  const statLeadsDelta = document.getElementById('stat-leads-delta');
  const statLeadsFill = document.getElementById('stat-leads-fill');
  if (statLeadsNovos) statLeadsNovos.textContent = String(novos);
  if (statLeadsDelta) statLeadsDelta.textContent = `${totalLeads} leads totais`;
  if (statLeadsFill) statLeadsFill.style.width = `${totalLeads ? Math.min(100, Math.round((novos / totalLeads) * 100)) : 0}%`;

  const statTaxa = document.getElementById('stat-taxa-conversao');
  const statTaxaDelta = document.getElementById('stat-taxa-delta');
  const statTaxaFill = document.getElementById('stat-taxa-fill');
  if (statTaxa) statTaxa.innerHTML = `${taxa}<sup>%</sup>`;
  if (statTaxaDelta) statTaxaDelta.textContent = 'Novo / total de leads';
  if (statTaxaFill) statTaxaFill.style.width = `${taxa}%`;

  const statTempoMedio = document.getElementById('stat-tempo-medio');
  const statTempoDelta = document.getElementById('stat-tempo-delta');
  const statTempoFill = document.getElementById('stat-tempo-fill');
  if (statTempoMedio) statTempoMedio.innerHTML = `${mediaSeg}<sup>s</sup>`;
  if (statTempoDelta) statTempoDelta.textContent = latencias.length ? `${latencias.length} logs com latencia` : 'Sem latencia registrada';
  if (statTempoFill) {
    const score = mediaMs > 0 ? Math.max(5, Math.min(100, Math.round(100 - (mediaMs / 30)))) : 0;
    statTempoFill.style.width = `${score}%`;
  }
}

async function bootstrap() {
  try {
    STATE.leads = await loadLeads();
  } catch (error) {
    console.error(error);
    STATE.leads = [];
  }

  try {
    STATE.conversas = await loadConversas(STATE.leads);
  } catch (error) {
    console.error(error);
    STATE.conversas = buildConversationsFromLeads(STATE.leads);
  }

  try {
    STATE.logsIA = await loadLogs();
  } catch (error) {
    console.error(error);
    STATE.logsIA = [];
  }

  renderLeadsMini();
  renderLeadsTable();
  renderConvList();
  renderPipeline();
  renderLogs();
  renderActivity();
  renderBarChart();
  updateBadgeCounters();
  updateSummaryCards();

  if (!HAS_SUPABASE) {
    console.warn('Admin sem Supabase configurado. Preencha SUPABASE_URL e SUPABASE_ANON_KEY no config.js.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
