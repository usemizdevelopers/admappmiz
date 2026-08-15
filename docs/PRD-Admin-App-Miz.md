# PRD — Painel Admin MIZ
### Documento de Requisitos — projeto separado, mesmo backend

*Este é um projeto NOVO e SEPARADO do app mobile da lojista — um painel web, para uso interno da equipe MIZ, conectado ao MESMO projeto Supabase. Não duplica schema: para qualquer dúvida de tabela/coluna/RLS, a fonte de verdade continua sendo `Backend-Supabase-App-Miz.md` (do projeto do app mobile) — este documento só adiciona o que é específico do Admin.*

---

## 1. Visão Geral

**O que é:** um painel web (não mobile) para a equipe interna da MIZ gerenciar o conteúdo e os dados que hoje só são editáveis via Supabase Table Editor cru — peças, coleções, aulas, materiais, aprovação de cadastro, indicações de clientes, e ajustes pontuais de gamificação.

**Por que existe:** o app mobile da lojista foi desenhado desde o início para nunca precisar de novo deploy só para trocar uma foto de peça ou lançar uma coleção — os dados vêm do Supabase em tempo real. O Admin é a ferramenta que torna essa edição prática para uma pessoa não-técnica, em vez de exigir acesso direto ao banco.

**Quem usa:** qualquer `profile` com `role = 'admin'` (já existe no schema do app mobile — não é preciso criar novo sistema de usuário, só uma segunda interface de login para o mesmo tipo de conta).

**Não é:** um segundo app de vendas, nem uma cópia do app mobile. É uma ferramenta de back-office.

---

## 2. Stack recomendada

- **Web, não mobile** — React (Vite) ou Next.js, hospedado gratuitamente (Vercel/Netlify)
- **Supabase JS client**, mesmo projeto (mesma URL, mesma `anon key` pública) — autenticação usa o mesmo sistema de login do app mobile, só que a interface só libera acesso a quem tem `role = 'admin'` (checagem tanto no front quanto reforçada por RLS no banco)
- Sem necessidade de Expo, React Native, ou qualquer coisa mobile-específica

---

## 3. Escopo funcional

### 3.1 Peças e Coleções
- CRUD completo de `pecas` e `colecoes`
- Upload de imagens direto para o Supabase Storage (bucket `pecas`), substituindo a foto sem precisar mexer em nada além do Admin
- Editar composição, diferenciais, "como vender", cores, tamanhos
- Marcar peça como esgotada / ativa-inativa

### 3.2 Conteúdo — Academia e Materiais
- CRUD de `cursos` e `curso_modulos`
- **Vídeo:** como o vídeo é hospedado no Vimeo (não no Supabase — ver seção 3 do `Backend-Supabase-App-Miz.md`), o Admin não faz upload de vídeo diretamente. O campo relevante é um input de **ID do Vimeo** (a pessoa sobe o vídeo no Vimeo separadamente, configura "Não Listado" + Aparência de cor conforme o checklist já documentado, e cola o ID aqui)
- Upload de PDF/imagem para `recursos_materiais` (esses sim vão direto pro Supabase Storage)
- CRUD de `recursos_materiais` (Material Comercial e de Marketing, controlado por `tipo_area`)

### 3.3 Aprovação de Cadastro
- Lista de lojistas com `status_cadastro = 'pending'`
- Ver dados do cadastro (nome, loja, CNPJ) e aprovar ou recusar com um clique — resolve a pendência que hoje só é possível via Table Editor
- Gestão da lista `cnpjs_reconhecidos` (adicionar/remover CNPJs que recebem aprovação imediata) — **resolve a pendência #8 do PRD do app mobile**

### 3.4 Indicação de Clientes
- Criar uma indicação (nome da cliente + contato) e associá-la a uma lojista específica — resolve a pendência de como a tabela `clientes_indicadas` seria populada

### 3.5 Gamificação — Ranking e Pontos (somente leitura)

- Visualização do Ranking mensal de todas as lojistas (leitura simples, sem risco)
- Visualização do extrato de `pontos_eventos` por lojista (auditoria — "por que ela tem X pontos")
- **Ajuste manual de pontos: fora de escopo nesta versão** (ver seção 5) — decisão consciente de não abrir essa porta agora, mesmo com a proteção de RPC desenhada. Se um dia for necessário, a especificação de como fazer com segurança já está preservada abaixo, em "Fora de escopo", para retomar quando fizer sentido.
- **Nunca** dar ao Admin uma tela que edite `ranking_pontos` diretamente (essa tabela está em desuso — ver nota no `Backend-Supabase-App-Miz.md`)

### 3.6 Conteúdo institucional
- Editar o vídeo institucional da Home (troca de ID do Vimeo)
- Editar textos institucionais simples, se fizer sentido (ex: "Benefícios da parceria", ainda pendente de conteúdo desde o início do projeto)

---

## 4. Segurança — princípios não-negociáveis

1. **RLS de escrita nas tabelas do app mobile já exige `role = 'admin'`** (peças, cursos, materiais) — o Admin só funciona porque quem loga nele tem essa role. Nenhuma tabela nova de permissão é necessária.
2. **Login do Admin usa Supabase Auth, mesmo sistema do app mobile** — não criar sistema de senha separado.
3. **Toda ação sensível (principalmente pontos) passa por função RPC validada**, nunca por escrita direta de tabela — mesmo princípio já estabelecido no app mobile (seção 8.6 do `Backend-Supabase-App-Miz.md`).
4. **Nunca expor a `service_role key` no painel Admin** — mesmo sendo uma ferramenta interna, ela continua sendo só de backend (n8n), nunca de um app com interface, mesmo administrativa. A `anon key` + RLS + checagem de `role='admin'` é suficiente e mais seguro.
5. Toda ação destrutiva (deletar peça, recusar cadastro) deve ter confirmação explícita na interface antes de executar.

---

## 5. Fora de escopo (nesta versão)

- Gestão de usuárias não-admin (edição de perfil de lojista) além de aprovar/recusar cadastro
- Relatórios avançados/analytics além do extrato simples de pontos
- Edição do formato da IA ou do prompt do sistema (isso continua sendo configurado direto no n8n)
- Multi-idioma, múltiplos administradores com permissões diferenciadas entre si (todo admin tem acesso igual, por enquanto)
- **Ajuste manual de pontos/ranking** — decisão consciente (06/08/2026) de não implementar por enquanto, mesmo sendo tecnicamente viável com segurança. Especificação preservada aqui, caso retome no futuro:
  > Não deve ser um `UPDATE`/`INSERT` direto na tabela `pontos_eventos`. Precisaria de uma função RPC separada e exclusiva para admin (ex: `ajustar_pontos_admin(profile_id, pontos, motivo)`), que só executa se quem chama tem `role = 'admin'` (checagem dentro da própria função, não só no front), insere um evento com `tipo_acao = 'ajuste_manual'` guardando o motivo em campo de auditoria, e nunca sobrescreve o histórico anterior — cada ajuste rastreável individualmente.

---

## 6. Ordem sugerida de implementação

1. **Autenticação + gate de admin** — login reaproveitando Supabase Auth, tela de "acesso negado" se `role != 'admin'`
2. **Peças e Coleções** (CRUD + upload de imagem) — maior volume de uso esperado, e já reaproveita padrão de Storage já validado no app mobile
3. **Aprovação de Cadastro + CNPJs reconhecidos** — resolve pendência de negócio mais antiga do projeto
4. **Conteúdo (Academia + Materiais)** — cadastro de cursos/módulos (com campo de ID Vimeo) e upload de materiais
5. **Indicação de Clientes**
6. **Gamificação — visualização** (Ranking + extrato, somente leitura)

---

*Este PRD deve ser lido junto com `Backend-Supabase-App-Miz.md` (schema completo) e `PRD-App-Miz-Claude-Code.md` (contexto de negócio geral) do projeto do app mobile — nenhum desses documentos precisa ser duplicado aqui, só referenciado.*
