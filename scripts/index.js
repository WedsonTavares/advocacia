// NAV SCROLL
window.addEventListener('scroll',()=>document.getElementById('navbar').classList.toggle('scrolled',scrollY>60));

// HAMBURGER
const hamburger = document.getElementById('hamburger');
const drawer    = document.getElementById('nav-drawer');
const drawerLinks = document.querySelectorAll('.drawer-link');

hamburger.addEventListener('click', () => {
  const open = hamburger.classList.toggle('active');
  drawer.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', open);
  drawer.setAttribute('aria-hidden', !open);
  document.body.style.overflow = open ? 'hidden' : '';
});

drawerLinks.forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    drawer.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  });
});

// REVEAL
const obs=new IntersectionObserver(e=>e.forEach(x=>{if(x.isIntersecting)x.target.classList.add('visible');}),{threshold:.1});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));

window.APP_CONFIG = window.APP_CONFIG || {};

/* ══════════════════════════════════════════
  CONFIGURAÇÃO
   ══════════════════════════════════════════

  1) Preencha o arquivo .env (base: .env.example)
  2) Execute: node scripts/generate-config.js
  3) O script gera config.js (ignorado pelo Git)
  4) A aplicação lê os dados de window.APP_CONFIG
   ══════════════════════════════════════════ */

const APP_CONFIG = window.APP_CONFIG || {};
const CHATWOOT_TOKEN = APP_CONFIG.CHATWOOT_TOKEN || '';
const CHATWOOT_URL = APP_CONFIG.CHATWOOT_URL || '';
const N8N_WEBHOOK_URL = APP_CONFIG.N8N_WEBHOOK_URL || '';
const SUPABASE_URL = APP_CONFIG.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = APP_CONFIG.SUPABASE_ANON_KEY || '';
const SUPABASE_LEADS_TABLE = APP_CONFIG.SUPABASE_LEADS_TABLE || 'chat_leads';

// ── Detecta se Chatwoot foi configurado ──
const USAR_CHATWOOT = Boolean(CHATWOOT_TOKEN);
const USAR_N8N = Boolean(N8N_WEBHOOK_URL);
const USAR_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const SUPABASE_TABLE = SUPABASE_LEADS_TABLE;

// ── Injeta SDK do Chatwoot se configurado ──
if (USAR_CHATWOOT) {
  (function(d,t){
    var BASE_URL = CHATWOOT_URL;
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+'/packs/js/sdk.js';
    g.defer=true; g.async=true;
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.chatwootSDK.run({
        websiteToken: CHATWOOT_TOKEN,
        baseUrl: BASE_URL
      });
    }
  })(document,'script');

  // FAB abre o Chatwoot nativo
  document.getElementById('chat-fab').addEventListener('click', function() {
    if (window.$chatwoot) window.$chatwoot.toggle('open');
  });
  document.getElementById('chat-window').style.display = 'none';

} else {
  // ── Modo local (demo ou webhook n8n direto) ──
  const fab     = document.getElementById('chat-fab');
  const win     = document.getElementById('chat-window');
  const msgs    = document.getElementById('chat-messages');
  const input   = document.getElementById('chat-input');
  const send    = document.getElementById('chat-send');
  const typing  = document.getElementById('typing');
  const closeBtn= document.getElementById('chat-close');
  let isOpen    = false;
  let conversationHistory = [];

  const SESSION_STORAGE_KEY = 'advocacia_chat_session_id';
  const LEAD_SENT_STORAGE_KEY = 'advocacia_chat_lead_sent';

  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }

  const leadState = {
    nome: '',
    email: '',
    telefone: '',
    area: '',
    preferenciaHorario: '',
    modalidade: ''
  };
  let leadJaEnviado = localStorage.getItem(LEAD_SENT_STORAGE_KEY) === '1';

  function openChat()  { isOpen=true;  win.classList.add('open'); fab.classList.add('open');    setTimeout(()=>input.focus(),300); }
  function closeChat() { isOpen=false; win.classList.remove('open'); fab.classList.remove('open'); }

  fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 90) + 'px';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  send.addEventListener('click', sendMessage);

  function escapeHtml(value) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(value).replace(/[&<>"']/g, m => map[m]);
  }

  function addMessage(text, role) {
    const now = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML = `<div class="msg-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div><div class="msg-time">${now}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function inferirArea(texto) {
    const m = texto.toLowerCase();
    if (/tribut[aá]r|imposto|fiscal/.test(m)) return 'tributario';
    if (/trabalh|rescis|clt|fgts/.test(m)) return 'trabalhista';
    if (/fam[ií]lia|div[oó]r|invent[aá]r|sucess/.test(m)) return 'familia';
    if (/compliance|lgpd|privacidade|dados pessoais/.test(m)) return 'compliance';
    if (/empres|societ|contrato|cnpj/.test(m)) return 'empresarial';
    return '';
  }

  function atualizarLeadState(textoUsuario) {
    const texto = textoUsuario.trim();

    if (!leadState.nome) {
      const nomeMatch = texto.match(/(?:meu nome e|meu nome é|me chamo|sou o|sou a)\s+([a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ'\s]{2,60})/i);
      if (nomeMatch) {
        leadState.nome = nomeMatch[1].trim().replace(/[.,;!?]+$/, '');
      }
    }

    if (!leadState.email) {
      const emailMatch = texto.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) leadState.email = emailMatch[0].toLowerCase();
    }

    if (!leadState.telefone) {
      const phoneMatch = texto.match(/(\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4})-?\d{4}/);
      if (phoneMatch) {
        leadState.telefone = phoneMatch[0].replace(/\s+/g, ' ').trim();
      }
    }

    if (!leadState.area) {
      leadState.area = inferirArea(texto);
    }

    if (!leadState.preferenciaHorario) {
      if (/manh[aã]/i.test(texto)) leadState.preferenciaHorario = 'manha';
      else if (/tarde/i.test(texto)) leadState.preferenciaHorario = 'tarde';
      else if (/noite/i.test(texto)) leadState.preferenciaHorario = 'noite';
    }

    if (!leadState.modalidade) {
      if (/online|video|meet|zoom/i.test(texto)) leadState.modalidade = 'online';
      else if (/presencial/i.test(texto)) leadState.modalidade = 'presencial';
    }
  }

  function deveSalvarLeadNoSupabase() {
    return USAR_SUPABASE
      && !leadJaEnviado
      && !!leadState.nome
      && (!!leadState.email || !!leadState.telefone)
      && !!leadState.area;
  }

  async function salvarLeadNoSupabase(ultimaMensagem) {
    if (!deveSalvarLeadNoSupabase()) return;

    const endpoint = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${SUPABASE_TABLE}`;
    const payload = {
      session_id: sessionId,
      nome: leadState.nome,
      email: leadState.email || null,
      telefone: leadState.telefone || null,
      area: leadState.area,
      preferencia_horario: leadState.preferenciaHorario || null,
      modalidade: leadState.modalidade || null,
      origem: 'chat_site',
      ultima_mensagem: ultimaMensagem
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const erro = await res.text();
      throw new Error(`Falha ao salvar lead no Supabase: ${res.status} ${erro}`);
    }

    leadJaEnviado = true;
    localStorage.setItem(LEAD_SENT_STORAGE_KEY, '1');
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = ''; input.style.height = 'auto';
    addMessage(text, 'user');
    conversationHistory.push({ role: 'user', content: text });
    atualizarLeadState(text);

    if (deveSalvarLeadNoSupabase()) {
      try {
        await salvarLeadNoSupabase(text);
      } catch (supabaseError) {
        console.error(supabaseError);
      }
    }

    // Mostra digitando
    typing.classList.add('visible');
    msgs.scrollTop = msgs.scrollHeight;

    try {
      let resposta;

      if (USAR_N8N) {
        // ── Envia pro webhook do n8n ──
        const res = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            sessionId,
            history: conversationHistory
          })
        });
        const data = await res.json();
        if (data.sessionId) {
          sessionId = data.sessionId;
          localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        }
        // n8n deve retornar { reply: "texto da resposta" }
        resposta = data.reply || data.message || data.text || 'Recebi sua mensagem. Um especialista entrará em contato em breve.';
      } else {
        // ── Fallback demo (sem backend) ──
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
        resposta = getRespostaDemo(text);
      }

      conversationHistory.push({ role: 'assistant', content: resposta });
      typing.classList.remove('visible');
      addMessage(resposta, 'bot');

    } catch(e) {
      typing.classList.remove('visible');
      addMessage('Desculpe, ocorreu um erro de conexão. Por favor, entre em contato pelo telefone +55 11 3042-8800.', 'bot');
    }
  }

  // Respostas demo (substitua pelo n8n real)
  function getRespostaDemo(msg) {
    const m = msg.toLowerCase();
    if (m.includes('tributar') || m.includes('imposto') || m.includes('fiscal'))
      return 'Nossa área tributária pode ajudá-lo com planejamento fiscal, defesa em autuações e recuperação de créditos. Gostaria de agendar uma consulta com a Dra. Camila Andrade, nossa especialista em Tributário?';
    if (m.includes('trabalhista') || m.includes('demiss') || m.includes('trabalho') || m.includes('empregado'))
      return 'Atendemos tanto empresas quanto pessoas físicas em questões trabalhistas: demissões, rescisões, ações na Justiça do Trabalho e compliance de RH. Posso agendar uma consulta inicial gratuita?';
    if (m.includes('divórcio') || m.includes('divorcio') || m.includes('família') || m.includes('familia') || m.includes('inventário'))
      return 'Nossa equipe de Direito de Família e Sucessões trabalha com total discrição. Tratamos de divórcios, inventários e planejamento sucessório. Quer que eu verifique a disponibilidade de um especialista?';
    if (m.includes('empresa') || m.includes('societár') || m.includes('contrato') || m.includes('sociedade'))
      return 'O Dr. Henrique Tavares lidera nossa área Empresarial com 25+ anos de experiência. Cuida de contratos, reorganizações societárias e governança. Deseja agendar uma reunião?';
    if (m.includes('consulta') || m.includes('agendar') || m.includes('marcar') || m.includes('reunião'))
      return 'Ótimo! Podemos agendar sua consulta presencialmente em nossa sede na Av. Paulista, 1374 (12º andar), ou por videochamada.\n\nPor favor, informe: qual área jurídica você precisa tratar e qual sua disponibilidade de horário?';
    if (m.includes('valor') || m.includes('preço') || m.includes('quanto') || m.includes('honorár'))
      return 'Nossos honorários variam conforme a complexidade do caso. Oferecemos consulta inicial para avaliação. Podemos apresentar uma proposta personalizada após entender sua situação. Quer continuar?';
    return 'Entendi sua mensagem. Nossa equipe especializada pode analisar melhor seu caso.\n\nGostaria de agendar uma consulta com um dos nossos advogados ou prefere deixar seu contato para retornarmos?';
  }
}

