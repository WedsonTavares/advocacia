# Landing Page - Ferreira & Associados

Landing page institucional de advocacia, feita em HTML, CSS e JavaScript puro, com foco em apresentacao premium, responsividade, conversao e preparo para deploy estatico na Vercel.

## 1. Visao Geral

Este projeto entrega uma pagina unica para escritorio juridico com:

- Identidade visual forte e layout premium
- Navegacao com menu desktop e drawer mobile
- Secoes institucionais completas (hero, escritorio, areas, equipe, depoimentos e CTA)
- Widget de chat com modo local e opcao de integracao externa
- Estrutura pronta para SEO tecnico e indexacao

## 2. Stack e Abordagem

- HTML5
- CSS3 (inline no proprio arquivo)
- JavaScript Vanilla (sem frameworks)
- Deploy estatico (sem etapa de build obrigatoria)

Nao ha dependencia de npm, yarn, pnpm, Python, PHP ou banco de dados para a landing funcionar.

## 3. Estrutura de Arquivos

- index.html: pagina principal, estilos, scripts e widget de chat
- robots.txt: regras basicas de rastreamento para motores de busca
- sitemap.xml: sitemap da pagina principal
- GUIA-IMPLANTACAO.md: guia separado para fluxo IA juridico e integracoes (n8n, RAG, Redis, CRM etc.)

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
6. Validar URL final e atualizar referencias de SEO se necessario

## 10. Integracao do Chat

O chat do front ja suporta dois caminhos:

- Modo local: respostas demo no proprio navegador
- Modo webhook: envio para fluxo externo (ex.: n8n)

Para configuracao completa de automacao e IA juridica, consulte o arquivo GUIA-IMPLANTACAO.md.



