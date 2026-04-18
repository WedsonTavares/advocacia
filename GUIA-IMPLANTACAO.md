# Workflow IA Jurídico — Guia Completo de Implantação
**Ferreira & Associados — Assistente IA de Atendimento**

---

## Arquitetura do Fluxo

```
Landing Page (chat)
       │
       ▼
01 · Webhook Entrada          ← recebe { message, sessionId, history[] }
       │
       ▼
02 · Filtro & Validação       ← bloqueia vazios e mensagens > 2000 chars
       │
       ▼
03 · Preparar Contexto        ← detecta intenção + sanitiza input
       │
       ▼
04 · Redis — Ler Memória      ← recupera histórico da sessão
       │
       ▼
05 · Montar Memória           ← combina Redis + histórico frontend
       │
       ▼
06 · Roteador Urgência ───────────────────────────────────┐
       │                                                   │ urgente=true
       ▼ normal                                            ▼
07 · Preparar Query RAG              06b · Notificar Plantão (e-mail)
       │                                                   │
       ▼                                             06c · Resposta Urgente
08 · Busca RAG (Qdrant)
       │
       ▼
09 · Processar Resultados RAG
       │
       ▼
10 · Montar Prompt Completo   ← injeta system prompt + contexto RAG
       │
       ▼
11 · Agente IA (Claude)       ← chamada Anthropic API
       │
       ▼
12 · Processar Resposta IA    ← extrai texto + atualiza histórico
       │
       ▼
13 · Redis — Salvar Memória   ← persiste histórico (TTL: 2h)
       │
       ▼
14 · Checar se é Agendamento ─────────────────────────────┐
       │                                                   │ agendamento=true
       ▼ não-agendamento                      14b · Extrair Dados
       │                                                   │
       │                                       15 · Enviar para CRM
       │                                                   │
       │                                       16 · Notificar Equipe
       │                                                   │
       └───────────────────────────────────────────────────┘
                                               │
                                               ▼
                                    17 · Nó de Espera (2s)
                                               │
                                               ▼
                                    18 · Resposta Final → { reply }
                                               │
                                               ▼
                                    19 · Log de Auditoria
```

---

## O Que Cada Nó Faz

| # | Nó | Função |
|---|-----|--------|
| 01 | Webhook Entrada | Porta de entrada. Escuta POST em `/webhook/atendimento-juridico` |
| 02 | Filtro & Validação | Rejeita mensagens vazias ou com mais de 2000 caracteres |
| 02b | Resposta Inválida | Retorna HTTP 400 com mensagem amigável |
| 03 | Preparar Contexto | Detecta intenção via regex (tributário, trabalhista, família, empresarial, compliance, agendamento, urgente) |
| 04 | Redis — Ler Memória | Busca histórico da sessão no Redis pela chave `memoria:{sessionId}` |
| 05 | Montar Memória | Combina Redis + histórico do frontend, limita a 20 mensagens |
| 06 | Roteador Urgência | Separa mensagens urgentes para atendimento humano imediato |
| 06b | Notificar Plantão | Envia e-mail ao advogado de plantão em casos urgentes |
| 06c | Resposta Urgente | Informa usuário que foi encaminhado ao plantão |
| 07 | Preparar Query RAG | Enriquece a busca com contexto da área jurídica detectada |
| 08 | Busca RAG (Qdrant) | Busca vetorial na base de conhecimento do escritório |
| 09 | Processar RAG | Filtra chunks por score (≥ 0.7), formata para o prompt |
| 10 | Montar Prompt | Monta system prompt completo + contexto RAG + histórico |
| 11 | Agente IA | Chamada à API Claude (Anthropic) ou OpenAI |
| 12 | Processar Resposta | Extrai texto, atualiza histórico, registra tokens |
| 13 | Redis — Salvar | Persiste novo histórico no Redis com TTL de 2 horas |
| 14 | Checar Agendamento | Bifurca para fluxo de CRM se intenção for agendamento |
| 14b | Extrair Dados | Tenta extrair nome, área e preferência do histórico |
| 15 | Enviar CRM | POST para HubSpot/Pipedrive/RD Station com dados do lead |
| 16 | Notificar Equipe | E-mail interno com resumo do novo lead |
| 17 | Nó de Espera | Pausa de 2s para UX mais natural (simula digitação) |
| 18 | Resposta Final | Retorna `{ reply, sessionId, tokens }` ao frontend |
| 19 | Log Auditoria | Registra métricas (tokens, intenção, uso RAG) para análise |

---

## Variáveis de Ambiente Necessárias

Crie um arquivo `.env` na raiz do n8n ou configure em **Settings → Environment Variables**:

```env
# ── IA ──────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

# Alternativa OpenAI (comente a de cima e use esta):
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# ── REDIS (memória) ──────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=sua_senha_redis

# ── RAG / QDRANT ─────────────────────────────
VECTOR_DB_URL=http://localhost:6333
QDRANT_API_KEY=

# Alternativa Pinecone:
# PINECONE_API_KEY=
# PINECONE_INDEX_URL=https://seu-index.pinecone.io

# ── E-MAIL ───────────────────────────────────
EMAIL_ESCRITORIO=contato@ferreiraadv.com.br
EMAIL_PLANTAO=plantao@ferreiraadv.com.br

# ── CRM ──────────────────────────────────────
CRM_WEBHOOK_URL=https://api.pipedrive.com/v1/deals
CRM_API_KEY=sua_chave_crm
```

---

## Como Importar no n8n

1. Abra seu n8n (`http://localhost:5678` ou URL cloud)
2. Clique em **Workflows → Import from file**
3. Selecione o arquivo `workflow-advocacia-n8n.json`
4. Configure as credenciais (veja abaixo)
5. Ative o workflow com o toggle no canto superior direito

---

## Configuração das Credenciais

### Anthropic (Claude)
```
Settings → Credentials → Add Credential → HTTP Header Auth
Name: Anthropic API
Header Name: x-api-key
Header Value: sk-ant-xxxxxx
```

### Redis
```
Settings → Credentials → Add Credential → Redis
Host: localhost (ou IP do servidor)
Port: 6379
Password: sua_senha
```

### E-mail (SMTP)
```
Settings → Credentials → Add Credential → SMTP
Host: smtp.gmail.com (ou seu servidor)
Port: 587
User: seu@email.com
Password: senha_app
```

---

## Configurar o RAG (Base de Conhecimento)

### Passo 1 — Instalar o Qdrant
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### Passo 2 — Criar a coleção
```bash
curl -X PUT http://localhost:6333/collections/advocacia \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'
```

### Passo 3 — Documentos para indexar
Priorize estes documentos (gere embeddings com OpenAI ou Cohere):

| Documento | Descrição |
|-----------|-----------|
| `apresentacao_escritorio.txt` | História, valores, diferenciais |
| `areas_atuacao_detalhadas.txt` | Descrição completa de cada área |
| `faq_juridico.txt` | Perguntas e respostas frequentes por área |
| `equipe.txt` | Bio dos advogados e especialidades |
| `processo_agendamento.txt` | Passo a passo para agendar |
| `legislacao_resumida.txt` | Resumos das leis mais consultadas |
| `honorarios_politica.txt` | Política de honorários (sem valores fixos) |

### Passo 4 — Script de indexação (Python)
```python
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
import uuid

openai_client = OpenAI(api_key="SUA_CHAVE")
qdrant = QdrantClient("http://localhost:6333")

# Para cada documento:
def indexar(texto, metadados):
    embedding = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=texto
    ).data[0].embedding
    
    qdrant.upsert(
        collection_name="advocacia",
        points=[PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={"text": texto, **metadados}
        )]
    )
```

---

## O Que Ainda Falta Conectar

| Item | Status | O Que Fazer |
|------|--------|-------------|
| **Chave Anthropic** | ⚠️ Pendente | Criar conta em console.anthropic.com e gerar API key |
| **Redis** | ⚠️ Pendente | Instalar Redis local (`docker run redis`) ou usar Redis Cloud |
| **Qdrant + documentos** | ⚠️ Pendente | Instalar Qdrant + indexar documentos do escritório |
| **SMTP configurado** | ⚠️ Pendente | Configurar credencial SMTP no n8n para e-mails |
| **CRM** | 🔵 Opcional | Integrar Pipedrive, HubSpot ou RD Station |
| **Landing page → n8n** | ⚠️ Pendente | Descomentar `N8N_WEBHOOK_URL` no HTML com a URL do webhook |
| **Domínio/SSL** | ⚠️ Produção | n8n precisa de HTTPS em produção (Nginx + Certbot) |

---

## Conectar a Landing Page ao n8n

No arquivo HTML, localize o comentário de configuração e descomente:

```javascript
const N8N_WEBHOOK_URL = 'https://seu-n8n.com/webhook/atendimento-juridico';
```

O workflow retorna `{ reply: "..." }` e o frontend já está preparado para isso.

---

## Fluxo de Dados Resumido

```
Frontend envia:
{
  "message": "Preciso de ajuda com questão tributária",
  "sessionId": "user_abc123",
  "history": []
}

n8n retorna:
{
  "reply": "Olá! Nossa especialista tributária, Dra. Camila Andrade...",
  "sessionId": "user_abc123",
  "tokens": 312
}
```

---

## Custos Estimados (por mês)

| Serviço | Estimativa | Base |
|---------|-----------|------|
| Claude Sonnet 4.6 | R$ 15–80 | 500 conversas/mês, ~400 tokens/troca |
| Redis Cloud (free tier) | R$ 0 | Até 30MB gratuito |
| Qdrant Cloud (free tier) | R$ 0 | Até 1GB gratuito |
| n8n Cloud | R$ 120–250 | Plano Starter |
| **Total estimado** | **R$ 135–330/mês** | |

> Para volume maior, considere n8n self-hosted (apenas custo de servidor ~R$ 80/mês).
