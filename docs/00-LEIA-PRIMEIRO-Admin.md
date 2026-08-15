# 00 — LEIA PRIMEIRO (Painel Admin MIZ)

*Este arquivo orienta qualquer agente (Claude Code ou outro) sobre como ler os documentos desta pasta. Leia este arquivo antes de qualquer outro.*

---

## Contexto rápido

Este é um projeto **novo e separado** do app mobile da lojista MIZ (React Native/Expo). É um **painel web interno**, para a equipe da MIZ gerenciar peças, conteúdo, cadastros e indicações — conectado ao **mesmo projeto Supabase** do app mobile, mas sem nenhuma dependência de código com ele.

---

## Ordem de leitura recomendada

1. **`PRD-Admin-App-Miz.md`** — visão geral, escopo funcional, princípios de segurança, e ordem sugerida de implementação. Comece por aqui.
2. **`Backend-Supabase-App-Miz.md`** — schema completo do banco (tabelas, RLS, funções). Copiado do projeto do app mobile — é a **fonte de verdade do banco de dados**, não duplicar nem redefinir nada daqui.

---

## ⚠️ Regras fixas deste projeto

0. **REGRA MAIS IMPORTANTE DE TODAS — banco compartilhado, sem ambiente de teste separado:** este projeto usa o MESMO banco Supabase de produção que o app mobile já usa em uso real. Não existe uma cópia/staging separada. Por isso: **NUNCA rode uma migration (criar tabela, coluna, policy, função) sem antes explicar o que ela faz e pedir aprovação explícita da pessoa.** Mesmo que pareça pequena ou óbvia. Se durante o desenvolvimento você perceber que precisa de algo estrutural novo no banco que não está no `Backend-Supabase-App-Miz.md`, PARE e pergunte antes de criar — não presuma que pode adicionar. Da mesma forma, ao testar (criar peça de teste, aprovar cadastro de teste), use dados claramente identificáveis como teste (mesmo padrão de prefixo `teste.miz.*` ou `[TESTE]` já usado no projeto do app mobile) e avise quais precisam ser limpos depois.

1. **Nunca escrever direto em tabela sensível a fraude.** Qualquer ação de pontuação/gamificação é **somente leitura** nesta versão do Admin (ver seção 3.5 e 5 do PRD) — não implementar escrita ali, mesmo que pareça simples.
2. **`service_role key` nunca aparece neste projeto.** Toda autenticação usa a `anon key` pública + RLS + checagem de `role = 'admin'` — igual ao app mobile.
3. **Vídeo não é upload direto.** Cursos e materiais em vídeo usam um campo de **ID do Vimeo** (texto), não upload de arquivo de vídeo — o vídeo é hospedado à parte, no Vimeo.
4. **Stack é web, não mobile.** Não usar nada de React Native/Expo aqui — projeto é React/Next.js puro.
5. Se qualquer instrução deste projeto conflitar com o que está documentado, a regra de resolução é: **`PRD-Admin-App-Miz.md` manda em escopo/segurança do Admin; `Backend-Supabase-App-Miz.md` manda em schema/banco.** Nenhum dos dois documentos do app mobile referentes a UI/visual (design system, telas) se aplica aqui — o Admin tem sua própria identidade visual, ainda a definir.

---

## Resumo de uma linha por documento

| Arquivo | Serve para |
|---|---|
| `PRD-Admin-App-Miz.md` | O quê construir, escopo, segurança, ordem de implementação |
| `Backend-Supabase-App-Miz.md` | Schema de banco, RLS, funções — mesmo banco do app mobile |

---

*Se este projeto crescer (nova área de gestão, nova decisão de segurança), atualizar este índice antes de continuar o desenvolvimento — mesmo padrão já usado no projeto do app mobile.*