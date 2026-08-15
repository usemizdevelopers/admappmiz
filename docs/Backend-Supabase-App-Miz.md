# Especificação de Backend — Supabase
### App MIZ — v1, 24/07/2026

*Documento de mesmo espírito do `ref_estrutura_codificada.md`, só que para dados em vez de visual: define schema, relacionamentos e regras de acesso, para que o Claude Code não precise inventar nome de tabela/coluna. Serve de ponte entre o PRD/Jornada/Estrutura de Telas e a implementação real de funcionalidade.*

---

## 0. Princípios gerais

- Toda tabela sensível a usuário usa **Row Level Security (RLS)** — nunca acesso irrestrito
- Nomenclatura: tabelas em `snake_case`, plural (`pecas`, `cursos`, `pedidos`)
- Toda tabela tem `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`
- Dados que o Admin edita (peças, cursos, materiais) usam **Realtime** habilitado, para refletir no app sem novo deploy
- Arquivos grandes (vídeo, PDF) ficam no **Supabase Storage**, e a tabela guarda só a URL/path — não guardar binário em coluna

### 0.1 Imagens — confirmado em 24/07/2026: migrar de bundled assets para Supabase Storage

**Decisão:** as imagens de peças/coleções (hoje empacotadas dentro do app) devem migrar para o **Supabase Storage**. O app passa a carregar por URL (`<Image source={{uri: peca.imagem_url}} />`), nunca mais por `require()` de asset local para conteúdo de peça/coleção. Isso permite trocar coleção/lançar peça nova sem gerar novo build.

- **Não usar o recurso de Image Transformations (redimensionamento automático) do Supabase** — o modelo de cobrança é imprevisível em escala. Preferir subir as imagens já nos tamanhos necessários (ex: thumbnail de grid e imagem de carrossel como 2 arquivos separados no upload), servindo a URL direta sem parâmetros de transformação.
- Placeholders/assets de UI (ícones, logo, imagens de tela institucional) continuam bundled normalmente — a migração para Storage é só para conteúdo editorial (peças, coleções, e por extensão os materiais/cursos já cobertos nas seções 2 e 3).
- Buckets sugeridos: `pecas` (imagens de produto), `materiais` (PDFs/ZIPs/vídeos de Material Comercial/Marketing), `academia` (vídeos/PDFs de curso)

---

## 1. Autenticação e perfil da lojista

### `profiles` (estende `auth.users`)
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | FK para `auth.users.id` |
| `nome` | text | |
| `nome_loja` | text | |
| `cnpj_cpf` | text | |
| `whatsapp` | text | |
| `status_cadastro` | text | `pending` \| `approved` \| `rejected` — default `pending` |
| `aprovado_em` | timestamptz | nullable |
| `aprovado_por` | uuid | nullable — FK para admin que aprovou (nulo se aprovação automática) |
| `aprovacao_automatica` | boolean | default false — marca se foi CNPJ reconhecido (imediata) ou timeout de 7 dias, para diferenciar de aprovação manual |
| `role` | text | `parceira` \| `admin` — default `parceira` |

**RLS:** usuária só lê/edita seu próprio registro. Admin lê/edita qualquer registro (checar `role = 'admin'`).

**Tela relacionada:** Cadastro, Status do Cadastro, Login, Perfil.

### 1.1 Regra de aprovação (confirmada em 24/07/2026)

1. **No momento do cadastro:** verificar se `cnpj_cpf` existe na tabela `cnpjs_reconhecidos` (ver abaixo). Se sim → `status_cadastro = 'approved'` imediatamente, `aprovacao_automatica = true`.
2. **Se não reconhecido:** `status_cadastro = 'pending'`. Fica visível para revisão manual (via Supabase Table Editor no MVP, ou painel futuro).
3. **Timeout de 7 dias:** job agendado (ver 1.2) verifica diariamente registros `pending` com `created_at` há mais de 7 dias e aprova automaticamente (`status_cadastro = 'approved'`, `aprovacao_automatica = true`).

### `cnpjs_reconhecidos`
| Coluna | Tipo | Notas |
|---|---|---|
| `cnpj_cpf` | text | valor a comparar no momento do cadastro |
| `nome_loja` | text | opcional, referência |

> ⚠️ **Em aberto (pendência #8 do PRD):** de onde vem essa lista — upload manual da Miz, planilha existente, integração externa? No MVP, pode ser populada manualmente como placeholder (ex: copiar de uma planilha que a Miz já tenha).

### 1.2 Job agendado de timeout (7 dias)
Implementar via **pg_cron** (extensão nativa do Supabase) ou um workflow agendado no **n8n** rodando diariamente:
```sql
-- Exemplo de lógica (pg_cron), rodando 1x/dia
UPDATE profiles
SET status_cadastro = 'approved', aprovado_em = now(), aprovacao_automatica = true
WHERE status_cadastro = 'pending'
  AND created_at < now() - interval '7 days';
```
Preferência entre pg_cron e n8n: como o restante da automação do projeto já usa n8n (seção 7.1 do PRD), pode ser mais consistente centralizar esse job lá também, em vez de espalhar lógica entre pg_cron e n8n. Decisão fica a critério de quem implementar — ambos resolvem o requisito.

---

## 2. Peças e Coleções

> ⚠️ **Correção em 06/08/2026:** colunas abaixo existem de verdade no banco em produção, mas não estavam documentadas aqui — descobertas durante a construção do Painel Admin (projeto separado), ao esbarrar em constraints `NOT NULL` reais. Esquema real, não o schema original planejado.

### `colecoes`
| Coluna | Tipo | Notas |
|---|---|---|
| `nome` | text | |
| `tipo` | text | `essenciais` \| `colecoes` \| `novidades` \| `mais_vendidos` |
| `ativa` | boolean | default true |
| `tone` | text | **NOT NULL** — valores em uso: `surfaceAlt` \| `dark` \| `rose` \| `brand`. Provavelmente controla variação visual do card no app mobile; confirmar propósito exato antes de expandir os valores aceitos |

### `pecas`
| Coluna | Tipo | Notas |
|---|---|---|
| `nome` | text | ex: "Blusa Mia" |
| `codigo_referencia` | text | **NOT NULL** — ex: "BL0001" (campo obrigatório na prática, mesmo sem constraint explícita documentada antes) |
| `colecao_id` | uuid | FK `colecoes.id` |
| `categoria` | text | ex: "blusas", "calças" |
| `composicao` | text | texto livre |
| `diferenciais` | text | conteúdo do accordion "Diferenciais" |
| `como_vender` | text | conteúdo do accordion "Como vender" |
| `esgotado` | boolean | default false — controla o badge de esgotado que o Admin liga/desliga |
| `ativa` | boolean | default true — Admin pode "despublicar" sem deletar |
| `tone` | text | **NOT NULL** — mesmo conjunto de valores de `colecoes.tone` |

### `peca_imagens`
| Coluna | Tipo | Notas |
|---|---|---|
| `peca_id` | uuid | FK `pecas.id` |
| `url` | text | Storage path |
| `ordem` | int | para o carrossel |

### `peca_cores` / `peca_tamanhos`
Tabelas simples de opções (`peca_id`, `valor` **ou** `nome` conforme a tabela, `ordem`) — lembrando que a seleção é **informativa** (sem lógica de carrinho), conforme já decidido. ⚠️ Nome exato da coluna de valor pode divergir entre `peca_cores` (possivelmente `nome`) e `peca_tamanhos` — conferir estrutura real antes de escrever query nova, não assumir simetria entre as duas tabelas.

### `favoritos`
| Coluna | Tipo | Notas |
|---|---|---|
| `profile_id` | uuid | FK `profiles.id` |
| `peca_id` | uuid | FK `pecas.id` |

**RLS:** `pecas`/`colecoes`/imagens/opções são **públicas para leitura** (inclusive visitante sem login, já que a Home Pública mostra preview). Escrita restrita a `role = 'admin'`. `favoritos` só a própria usuária lê/escreve os seus.

**Realtime:** habilitado em `pecas` (Admin edita → reflete na hora).

**Telas relacionadas:** Peças e Coleções, Detalhe da Peça.

---

## 3. Conteúdo — Academia, Material Comercial, Material de Marketing

### `cursos`
| Coluna | Tipo | Notas |
|---|---|---|
| `titulo` | text | |
| `descricao` | text | |
| `categoria` | text | `vendas` \| `produtos` \| `gestao` \| `marketing` |
| `thumbnail_url` | text | |
| `duracao_min` | int | |
| `is_novo` | boolean | default false |
| `ativo` | boolean | default true |

### `curso_modulos`
> ⚠️ **Decisão em 24/07/2026:** vídeos das aulas vão hospedados no **Vimeo** (não Supabase Storage) — evita custo de armazenamento/banda de vídeo no Supabase. PDFs continuam no Storage normalmente.

| Coluna | Tipo | Notas |
|---|---|---|
| `curso_id` | uuid | FK |
| `titulo` | text | |
| `tipo` | text | `video` \| `pdf` |
| `url_conteudo` | text | Se `tipo = 'pdf'`: Storage path. Se `tipo = 'video'`: **ID ou URL de embed do Vimeo** (ex: `1234567890`), não path de Storage |
| `ordem` | int | |

### `curso_progresso`
| Coluna | Tipo | Notas |
|---|---|---|
| `profile_id` | uuid | FK |
| `curso_id` | uuid | FK |
| `percentual` | int | 0–100 |
| `ultimo_modulo_id` | uuid | nullable — fora de escopo do MVP conforme PRD (marcado como melhoria futura), mas schema já preparado |

### `recursos_materiais`
Cobre tanto Material Comercial quanto Material de Marketing (diferenciados por `tipo_area`).

> ⚠️ Mesma decisão acima se aplica aqui: se `tipo_arquivo = 'video'`, `url_arquivo` guarda ID/URL do Vimeo, não path de Storage.

| Coluna | Tipo | Notas |
|---|---|---|
| `titulo` | text | |
| `descricao` | text | |
| `tipo_area` | text | `comercial` \| `marketing` |
| `tipo_arquivo` | text | `pdf` \| `zip` \| `imagem` \| `video` |
| `tamanho_legivel` | text | ex: "12,4 MB" — texto pronto pra exibir, não recalculado. Para vídeo do Vimeo, pode ficar vazio/não aplicável (banda é do Vimeo, não do app) |
| `url_arquivo` | text | Storage path (pdf/zip/imagem) **ou** ID/URL do Vimeo (video) |
| `peca_relacionada_id` | uuid | nullable — FK `pecas.id`, para "Ficha técnica: Blusa Mia" etc. |
| `ativo` | boolean | |

### `favoritos_materiais`
Mesma lógica de `favoritos`, mas para `recursos_materiais`.

**RLS:** leitura exige `status_cadastro = 'approved'` (conteúdo logado, não é preview da Home Pública). Escrita restrita a `role = 'admin'`.

**Realtime:** habilitado em `cursos`, `curso_modulos`, `recursos_materiais`.

**Player de vídeo:** implementar via `react-native-webview` carregando a URL de embed do Vimeo, montada centralmente pela função `montarUrlVimeo(vimeoId, hash?)` em `lib/vimeo.ts` — `https://player.vimeo.com/video/{id}?title=0&byline=0&portrait=0&color=999085`, mais `&h={hash}` para vídeo não-listado/privado. Vídeos devem ser configurados como não-listados no Vimeo (não aparecer em busca pública) — plano pago (Starter, US$12/mês) necessário para essa configuração de privacidade e acesso à API.

> ⚠️ **Checklist obrigatório ao cadastrar cada vídeo real no Vimeo (descoberto em 06/08/2026):** o parâmetro `color=` na URL é reconhecido pelo Vimeo, mas o player novo deles tem um painel próprio de **"Appearance"** (cores Primary/Accent/Ícone/Fundo) configurado por vídeo, que **sobrescreve** o parâmetro da URL se estiver definido. Ao subir cada vídeo real (institucional e aulas), o time precisa **também** ir em Configurações do vídeo → "Appearance" no Vimeo e definir a cor primária como `#999085` (mesmo tom da marca) — o parâmetro na URL sozinho não garante mais o resultado com o player atual. `title=0`/`byline=0`/`portrait=0` continuam funcionando normalmente via URL, sem essa ressalva.
>
> **Confirmado (documentação oficial Vimeo, 06/08/2026):** o painel "Appearance" está disponível a partir do plano **Starter** (US$12/mês) — não precisa do Standard. A customização de cor só se aplica a vídeos **Não Listados ou Privados**, o que já bate com a decisão de privacidade tomada para os vídeos da MIZ.

**Telas relacionadas:** Academia Miz, Material Comercial, Material de Marketing.

---

## 4. Inteligências (IA)

> Conforme decidido em 24/07/2026 (seção 7.1 do PRD): o app **não chama a API de IA diretamente** — chama um **webhook do n8n**, que orquestra a lógica e devolve a resposta. O Supabase aqui serve só para **persistir o histórico**, não para gerar a resposta.

### `ia_conversas`
| Coluna | Tipo | Notas |
|---|---|---|
| `profile_id` | uuid | FK |
| `persona` | text | `vendas` \| `marketing` \| `produto` |
| `peca_relacionada_id` | uuid | nullable |
| `titulo` | text | resumo da conversa (gerado a partir da 1ª pergunta) |
| `favorita` | boolean | default false |

### `ia_mensagens`
| Coluna | Tipo | Notas |
|---|---|---|
| `conversa_id` | uuid | FK |
| `autor` | text | `usuaria` \| `ia` |
| `conteudo` | text | |

**Fluxo de envio de mensagem (não é escrita direta na tabela pelo app):**
```
App → POST webhook n8n (payload: profile_id, persona, peca_id, mensagem)
   → n8n processa (consulta API de IA + o que for necessário)
   → n8n grava a mensagem do usuário E a resposta da IA em ia_mensagens 
     (via Supabase service role, não pela sessão do app)
   → n8n retorna a resposta pro app
   → App também pode re-consultar ia_mensagens via Supabase Realtime, 
     como fallback caso a resposta direta do webhook falhe
```

**RLS:** usuária só lê/escreve suas próprias conversas/mensagens. Inserts de resposta da IA feitos pelo n8n usam a **service role key** (bypassa RLS, é backend confiável), nunca a chave pública do app.

**Telas relacionadas:** Miz Inteligência (hub), IA de Vendas/Marketing/Produto, Histórico.

---

## 5. Pedidos, Indicação, Ranking

### `pedidos` — ✅ Aprovado em 06/08/2026: fluxo "Monte seu Pedido"

> ⚠️ **Muda de status:** antes era só "somente leitura, origem em aberto". Agora o app **escreve** aqui diretamente, via o novo fluxo "Monte seu Pedido" (ver 5.1). A pendência de integração futura com GoHighLevel/n8n continua existindo em paralelo (pedidos que vierem por outros canais), mas não bloqueia mais este fluxo.

| Coluna | Tipo | Notas |
|---|---|---|
| `profile_id` | uuid | FK |
| `origem` | text | `whatsapp` (todos, por enquanto) |
| `descricao` | text | Texto formatado, igual ao enviado no WhatsApp — cópia de auditoria |
| `status` | text | `enviado` \| `em_andamento` \| `concluido` — texto simples, sem lógica de workflow complexa no MVP |
| `data_pedido` | timestamptz | |

### `pedido_itens` (novo — detalhe estruturado de cada pedido)
| Coluna | Tipo | Notas |
|---|---|---|
| `pedido_id` | uuid | FK `pedidos.id` |
| `peca_id` | uuid | FK `pecas.id` |
| `quantidade` | int | default 1 |
| `cor` | text | nullable — cópia do que foi selecionado no momento (não FK viva, é snapshot histórico) |
| `tamanho` | text | nullable — idem |

**RLS:** usuária só lê/escreve os próprios pedidos e itens (INSERT direto permitido — diferente do sistema de pontos, aqui não há risco de "fraude" relevante, é só o registro do pedido dela mesma).

### 5.1 Fluxo "Monte seu Pedido" (não é carrinho de e-commerce)

**Distinção importante:** isto NÃO reintroduz checkout/pagamento — continua sendo regra de negócio fixa que toda compra acontece fora do app, via WhatsApp. Isto é só um **montador de mensagem**, que acumula peças de interesse e formata um pedido pra enviar de uma vez, em vez de pedir peça por peça separadamente.

**Diferença de conceito vs. Favoritar (já existe):**
| | Favoritar | Adicionar ao Pedido |
|---|---|---|
| Duração | Permanente | Temporário — some depois de enviar |
| Propósito | "achar de novo depois" | "perguntar sobre isso agora" |
| Tem quantidade? | Não | Sim (seletor +/-) |

**Estado do pedido em construção:** fica **local no app** (Context + AsyncStorage para sobreviver a fechar/abrir o app), não sincronizado com Supabase enquanto está sendo montado — só grava no banco (`pedidos` + `pedido_itens`) no momento do envio. Evita complexidade de sincronização pra algo transitório.

**Passo a passo da experiência:**
1. Card de peça ganha uma ação nova: "Adicionar ao pedido" (ícone de sacola, distinto do coração de favoritar)
2. Badge com contador (quantos itens já selecionados) fica visível — provavelmente perto da tab bar ou como botão flutuante nas telas de Peças/Produto
3. Toca no badge → abre tela **"Meu Pedido"**: lista dos itens, cada um com seletor de quantidade (+/-) e botão de remover
4. Botão **"Enviar via WhatsApp"**:
   - Monta texto formatado (nome da peça + quantidade + cor/tamanho se selecionado, por item)
   - Abre WhatsApp via `Linking` com o texto pré-preenchido (mesmo padrão já usado nos outros pontos de contato)
   - Grava 1 linha em `pedidos` (com o texto formatado em `descricao`) + N linhas em `pedido_itens`
   - Limpa o estado local (pedido em construção volta a zero)
   - Mostra confirmação visual de que foi enviado

**Telas afetadas:** `ProductCard` (novo botão), nova tela `MeuPedidoScreen`, `PecasScreen`/`ProductDetailScreen` (badge flutuante), `PedidosScreen` (agora finalmente populada com dado real).

### `clientes_indicadas`
| Coluna | Tipo | Notas |
|---|---|---|
| `profile_id` | uuid | FK — lojista que recebeu a indicação |
| `nome_cliente` | text | |
| `contato` | text | |
| `data_indicacao` | timestamptz | |

**RLS:** usuária só lê as suas. Escrita só via Admin/n8n (service role).

### `ranking_pontos`
| Coluna | Tipo | Notas |
|---|---|---|
| `profile_id` | uuid | FK |
| `periodo` | text | ex: "2026-07" |
| `pontos` | numeric | |
| `posicao` | int | recalculado externamente, não pelo app |

> ⚠️ Em aberto (já sinalizado no PRD): origem do dado de ranking. Schema pronto para receber, mas cálculo/integração não definidos.

---

## 6. Resumo — mapa de tela → tabelas

| Tela | Tabelas envolvidas |
|---|---|
| Cadastro / Status / Login | `profiles` |
| Home (pública e logada) | `profiles`, contagens agregadas das demais |
| Peças e Coleções / Produto | `pecas`, `colecoes`, `peca_imagens`, `peca_cores`, `peca_tamanhos`, `favoritos` |
| Academia Miz | `cursos`, `curso_modulos`, `curso_progresso` |
| Material Comercial / Marketing | `recursos_materiais`, `favoritos_materiais` |
| Miz Inteligência / IAs / Histórico | `ia_conversas`, `ia_mensagens` (via webhook n8n) |
| Pedidos | `pedidos` |
| Indicação de Clientes | `clientes_indicadas` |
| Ranking | `ranking_pontos` |
| Perfil | `profiles` + atalhos para Pedidos/Indicação/Ranking |

---

## 7. Ordem sugerida de implementação (fase de funcionalidade)

1. **Auth + `profiles`** — sem isso nada mais funciona (gate de tudo)
2. **Peças e Coleções** — dado mais visível, permite validar o padrão de leitura pública + Realtime cedo
3. **Conteúdo (Academia/Materiais)** — mesmo padrão de leitura logada, reaproveita a lógica do passo 2
4. **IA + webhook n8n** — mais complexo, depende de infraestrutura externa (n8n configurado)
5. **Pedidos/Indicação/Ranking** — dados majoritariamente somente-leitura, menor prioridade, ainda com origem de dado em aberto

---

## 8. Gamificação — Pontos, Ranking e Conquistas (adicionado 25/07/2026)

> ⚠️ **SEÇÃO CRÍTICA — feature que toca o app inteiro.** Implementar em fases isoladas (ver 8.7), nunca tudo de uma vez. Nenhuma fase desta seção deve alterar o comportamento de telas/dados já existentes e funcionando — é sempre **adição**, nunca substituição de lógica atual, exceto onde explicitamente indicado.

### 8.1 Princípio de design (o "porquê" por trás dos números)

Só pontua ação que **(a)** tem custo real de repetir — não é "grátis" a usuária repetir só pra farmar ponto — e **(b)** indica proximidade real de venda ou aprendizado genuíno. Navegação pura (trocar de aba, abrir tela) **nunca pontua**, exceto o simples ato de abrir o app 1x/dia (engajamento mínimo, não vendável).

### 8.2 Dois sistemas paralelos — não confundir

| | **Ranking Mensal** | **Conquistas (Currículo)** |
|---|---|---|
| Reseta? | ✅ Sim, todo mês | ❌ Nunca, permanente |
| Mede | Atividade/vendas recentes | Conhecimento acumulado |
| Onde aparece | Tela de Ranking | Tela de Perfil |
| Decide indicação de cliente? | Sim | Não |

### 8.3 Tabela de pontuação (Ranking Mensal)

| Ação | Pontos | Regra anti-farm |
|---|---|---|
| Abrir o app | 5 | 1x por dia (`data_evento` única) |
| Sequência de 7 dias abrindo o app | +20 (bônus) | Calculado, não inserido pelo app diretamente (ver 8.6) |
| Solicitar orçamento (WhatsApp) de uma peça | 15 | 1x por peça, por período (`profile_id + referencia_id + periodo` único) |
| Favoritar uma peça | 2 | 1x por peça, por período |
| Usar qualquer IA | 3 | 1x por dia (não por pergunta — não importa quantas mensagens) |
| **Assistir aula/curso — marco 25%** | **2** | 1x por módulo, por período |
| **Assistir aula/curso — marco 50%** | **3** | 1x por módulo, por período |
| **Assistir aula/curso — marco 90%** | **5** (além do selo permanente em 8.4) | 1x por módulo, por período |
| Baixar material | 0 | Neutro — não pontua nada, é só utilitário |

### 8.4 Conquistas (permanente, currículo da lojista)

| Conquista | Quando dispara |
|---|---|
| Selo de módulo concluído | `curso_progresso` daquele módulo atinge ≥90% assistido pela primeira vez |
| Certificado de curso concluído | Todos os módulos de um curso têm selo |

Exibido na tela de **Perfil**, numa seção nova ("Minhas Conquistas" ou similar) — não some, não reseta, não depende do mês.

### 8.5 Schema novo

```sql
-- Log de todo evento de pontuação (nunca escrito direto pelo app — só via RPC, ver 8.6)
create table pontos_eventos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null,
  tipo_acao text not null, -- 'abrir_app' | 'solicitar_orcamento' | 'favoritar_peca' | 'usar_ia' | 'streak_7_dias'
  pontos int not null,
  referencia_id uuid, -- nullable: id da peça, módulo, etc, conforme o tipo_acao
  data_evento date not null default current_date,
  periodo text not null, -- 'YYYY-MM', gerado a partir de data_evento
  created_at timestamptz default now()
);

-- Trava anti-duplicidade: ações com referência (1x por item, por período)
create unique index pontos_unicos_com_referencia 
  on pontos_eventos (profile_id, tipo_acao, referencia_id, periodo) 
  where referencia_id is not null;

-- Trava anti-duplicidade: ações diárias sem referência (abrir_app, usar_ia)
create unique index pontos_unicos_diarios 
  on pontos_eventos (profile_id, tipo_acao, data_evento) 
  where referencia_id is null;

-- Conquistas permanentes (nunca resetam)
create table conquistas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) not null,
  tipo text not null, -- 'modulo_completo' | 'curso_completo'
  referencia_id uuid not null, -- modulo_id ou curso_id
  titulo text not null, -- texto pronto pra exibir, ex: "Técnicas de Vendas — Módulo 3"
  data_conquista timestamptz default now(),
  unique(profile_id, tipo, referencia_id)
);

-- Colunas novas em curso_progresso (para tracking real de vídeo)
alter table curso_progresso add column tempo_assistido_segundos int default 0;
alter table curso_progresso add column maior_ponto_assistido_segundos int default 0;
```

**`ranking_pontos` (já existente) não muda de estrutura** — continua sendo a soma agregada por período, mas agora é **calculada a partir de `pontos_eventos`** (via função ou view), nunca escrita manualmente linha por linha.

### 8.6 Função RPC — único ponto de entrada pra pontuar (segurança)

> ⚠️ **O app NUNCA faz `INSERT` direto em `pontos_eventos`.** Toda pontuação passa por esta função, que valida o tipo de ação contra uma lista permitida e aplica as travas. Isso impede que alguém manipule a API diretamente pra inflar pontuação.

```sql
create or replace function registrar_ponto(
  p_tipo_acao text,
  p_referencia_id uuid default null
) returns void
language plpgsql
security definer -- roda com privilégio elevado, mas só faz o que a lógica interna permite
as $$
declare
  v_pontos int;
  v_profile_id uuid := auth.uid();
begin
  -- Valida tipo de ação e define pontuação (nunca confia em valor vindo do cliente)
  v_pontos := case p_tipo_acao
    when 'abrir_app' then 5
    when 'solicitar_orcamento' then 15
    when 'favoritar_peca' then 2
    when 'usar_ia' then 3
    when 'assistir_25' then 2
    when 'assistir_50' then 3
    when 'assistir_90' then 5
    else null
  end;

  if v_pontos is null then
    raise exception 'Tipo de ação inválido: %', p_tipo_acao;
  end if;

  insert into pontos_eventos (profile_id, tipo_acao, pontos, referencia_id, periodo)
  values (v_profile_id, p_tipo_acao, v_pontos, p_referencia_id, to_char(current_date, 'YYYY-MM'))
  on conflict do nothing; -- se já existe (trava de duplicidade), simplesmente ignora, sem erro
end;
$$;
```

**Chamada pelo app** (via Supabase client, não é REST insert cru):
```ts
await supabase.rpc('registrar_ponto', { p_tipo_acao: 'favoritar_peca', p_referencia_id: pecaId });
```

### 8.7 Rastreamento de vídeo (Vimeo) + anti-avanço

**Arquitetura:** WebView carrega uma página HTML própria (não a URL direta do player) com o SDK Player.js do Vimeo embutido, escutando eventos e comunicando com o app React Native via `postMessage`.

- Evento `timeupdate`: throttled (a cada ~10s, não a cada disparo) → envia `{segundosAtuais, maiorPontoAlcancado}` pro app → app atualiza `curso_progresso.tempo_assistido_segundos` e `maior_ponto_assistido_segundos`
- Evento `seeked`: se o novo tempo for maior que `maior_ponto_assistido_segundos`, o próprio script dentro do WebView chama `player.setCurrentTime(maiorPontoAlcancado)` — barra "puxa de volta", sem precisar de round-trip com o app
- Quando `percentual >= 90` pela primeira vez: app chama uma segunda função RPC, `registrar_conquista(tipo, referencia_id, titulo)`, que insere em `conquistas` (mesma proteção de `on conflict do nothing` pra não duplicar)

### 8.8 RLS

- `pontos_eventos`: usuária só **lê** os próprios (nunca escreve direto — só via RPC, que roda com `security definer`)
- `conquistas`: usuária só lê as próprias (escrita só via RPC `registrar_conquista`, mesma lógica de segurança)

### 8.9 Fases de implementação (seguir em ordem, cada uma testada antes da próxima)

1. **Schema + RPCs, sem tocar em nenhuma tela** — criar as tabelas, índices, e as 2 funções (`registrar_ponto`, `registrar_conquista`), testar via chamada direta (SQL Editor/API), sem integrar em lugar nenhum do app ainda
2. **Rastreamento de vídeo isolado** — implementar o bridge WebView+Player.js só tecnicamente (progresso + anti-avanço), testado na tela de Aula que já existe, sem ainda disparar pontuação/conquista
3. **Conectar conquista ao rastreamento** — quando `percentual >= 90%`, chama `registrar_conquista`
4. **Conectar pontos aos pontos de interação já existentes** — abrir app, favoritar, solicitar orçamento, usar IA — um de cada vez, testando isoladamente que não quebrou o fluxo original de cada tela
5. **Tela de Conquistas no Perfil** — nova seção de UI mostrando o currículo
6. **Ranking lendo de `pontos_eventos` agregado** — substitui a leitura antiga (hoje vazia/mockada) pela leitura real
7. **Bônus de sequência de 7 dias** — deixar por último, é o mais complexo (precisa checar dias consecutivos), pode ser calculado por uma função agendada (pg_cron ou n8n, mesmo padrão do timeout de aprovação de cadastro)

---

*Próximo passo: revisar este schema com o time (principalmente os pontos ⚠️ em aberto) antes de rodar as migrations reais no Supabase.*