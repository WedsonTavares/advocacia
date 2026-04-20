# Landing Page Tavares & Associados

Landing page institucional de advocacia, feita em HTML, CSS e JavaScript puro, com foco em apresentacao premium, responsividade, conversao e preparo para deploy estatico na Vercel com integracao de chat IA via n8n e captura de leads no Supabase.

## 1. Visao Geral

Este projeto entrega uma pagina unica para escritorio juridico com:

- Identidade visual forte e layout premium
- Navegacao com menu desktop e drawer mobile
- Secoes institucionais completas (hero, escritorio, areas, equipe, depoimentos e CTA)
- Widget de chat com modo local e opcao de integracao externa
- Estrutura pronta para SEO tecnico e indexacao

## 2. Stack e Abordagem

- HTML5
- CSS3 (arquivos externos)
- JavaScript Vanilla (sem frameworks)
- Integracoes externas via fetch (n8n + Supabase REST)
- Deploy estatico (sem etapa de build obrigatoria)

Nao ha dependencia de npm, yarn, pnpm, Python ou PHP para renderizar a landing. Banco e automacoes rodam em servicos externos (Supabase e n8n).

## 3. Estrutura de Arquivos

- index.html: pagina principal e widget de chat
- styles/index.css: estilos da landing
- styles/admin.css: estilos do painel admin
- scripts/index.js: comportamento da landing e chat
- scripts/admin.js: logica do dashboard admin
- robots.txt: regras basicas de rastreamento para motores de busca
- sitemap.xml: sitemap da pagina principal
- vercel.json: headers de seguranca para deploy
- .env.example: modelo de variaveis de ambiente para integracoes
- scripts/generate-config.js: gera config.js local a partir do .env
- config/config.example.js: modelo de runtime config
- admin/admin-dashboard.html: painel admin local
- n8n/workflow-advocacia-n8n.json: export do workflow n8n
- docs-local/: documentacao operacional local (nao versionada no Git)

Obs: `config.js` e gerado localmente e fica ignorado no Git.

## 4. Conteudo da Landing

Principais blocos implementados em index.html:

- Navbar fixa com CTA
- Hero section com destaque de valor
- Secao O Escritorio
- Secao Areas de Atuacao
- Secao de numeros/estatisticas
- Secao de equipe
- Secao de depoimentos
- CTA final para contato
- Rodape com links institucionais e contato
- Widget de chat com fallback local

## 5. Funcionalidades Tecnicas

- Responsividade para desktop, tablet e mobile
- Menu hamburguer com drawer em telas menores
- Animacoes de reveal por IntersectionObserver
- Scroll behavior suave
- Campo de e-mail no CTA com atributos de acessibilidade
- Links de contato usando tel: e mailto:

## 6. SEO Tecnico Ja Aplicado

- Meta description
- Meta robots
- Canonical
- Open Graph (titulo, descricao, URL, site_name)
- Twitter card
- Structured data (Schema.org - LegalService)
- robots.txt publicado
- sitemap.xml publicado

## 7. Pontos de Atencao Antes de Producao

Revise e mantenha os dados abaixo coerentes em todos os pontos:

- Dominio final
- Telefone
- E-mail
- Endereco
- Nome da marca

Recomendacao importante:

- Garantir que canonical, og:url, robots.txt e sitemap.xml apontem para o mesmo dominio de producao

## 8. Executar Localmente

Opcao 1 (mais simples):

- Abra o arquivo index.html no navegador

Opcao 2 (recomendado para teste proximo de producao):

1. No terminal, entre na pasta do projeto
2. Rode:

    npx serve .

3. Abra a URL local exibida no terminal

Se preferir, pode usar qualquer servidor estatico equivalente.

## 9. Deploy na Vercel

Fluxo recomendado:

1. Subir codigo para o GitHub
2. Importar o repositorio na Vercel
3. Em Project Settings, usar:
   - Framework Preset: Other
   - Build Command: vazio
   - Output Directory: .
4. Fazer deploy
5. Conectar dominio customizado
6. Para subdominio (ex.: advocacia.zeusacademy.com.br), configurar CNAME no Registro.br apontando para o target informado na Vercel
7. Validar URL final e atualizar referencias de SEO se necessario

## 10. Integracao do Chat

O chat do front ja suporta dois caminhos:

- Modo local: respostas demo no proprio navegador
- Modo webhook: envio para fluxo externo (n8n)

O chat tambem suporta captura de lead no Supabase quando detectar no dialogo:

- Nome
- Contato (e-mail ou telefone)
- Area juridica

## 11. Configuracao Segura (sem hardcode)

1. Copie `.env.example` para `.env`
2. Preencha as variaveis:
    - N8N_WEBHOOK_URL
    - ADMIN_CONVERSAS_ENDPOINT (opcional)
    - ADMIN_LOGS_ENDPOINT (opcional)
    - SUPABASE_URL
    - SUPABASE_ANON_KEY
    - SUPABASE_LEADS_TABLE
    - SUPABASE_CONVERSAS_TABLE (opcional)
    - SUPABASE_LOGS_TABLE (opcional)
3. Gere o arquivo de runtime:

    node scripts/generate-config.js

4. Verifique se o arquivo `config.js` foi criado na raiz do projeto
5. Suba para Vercel sem incluir segredos no Git

No painel admin, os dados reais sao lidos de:
- Supabase: `SUPABASE_LEADS_TABLE` (obrigatorio para leads)
- Supabase: `SUPABASE_CONVERSAS_TABLE` e `SUPABASE_LOGS_TABLE` (opcional)
- Endpoints HTTP: `ADMIN_CONVERSAS_ENDPOINT` e `ADMIN_LOGS_ENDPOINT` (opcional)

Para configuracao completa de automacao e IA juridica, consulte docs-local/GUIA-IMPLANTACAO.md (arquivo local, fora do versionamento).



