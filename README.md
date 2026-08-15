# Painel Admin MIZ

Painel web interno para a equipe MIZ gerenciar peças, coleções, conteúdo (Academia e Materiais), aprovação de cadastro de lojistas, indicação de clientes e visualização de gamificação — sem precisar mexer direto no Supabase Table Editor.

É um projeto **separado** do app mobile da lojista (React Native/Expo), mas conectado ao **mesmo projeto Supabase**: mesmo banco, mesma autenticação, mesmas regras de RLS. Só quem tem `role = 'admin'` no banco consegue entrar.

<div align="center">

### 📖 [**Documentação completa — usemizdevelopers.github.io/admappmiz**](https://usemizdevelopers.github.io/admappmiz/)

Site publicado via GitHub Pages a partir da pasta [`docs/`](docs) — reúne a documentação do app mobile e do Painel Admin já formatada, sem precisar clonar o repositório.

</div>

## Documentação

Publicada e navegável em **[usemizdevelopers.github.io/admappmiz](https://usemizdevelopers.github.io/admappmiz/)** (link acima). Os mesmos arquivos, pra quem preferir ler direto no repositório, na ordem sugerida:

1. [`docs/00-LEIA-PRIMEIRO-Admin.md`](docs/00-LEIA-PRIMEIRO-Admin.md) — regras fixas do projeto (banco compartilhado com produção, nunca `service_role`, nunca migration sem aprovação)
2. [`docs/PRD-Admin-App-Miz.md`](docs/PRD-Admin-App-Miz.md) — escopo funcional, princípios de segurança, ordem de implementação
3. [`docs/Backend-Supabase-App-Miz.md`](docs/Backend-Supabase-App-Miz.md) — schema do banco (fonte de verdade de tabelas/colunas/RLS)
4. [`docs/Design-System-Admin-Web.md`](docs/Design-System-Admin-Web.md) — tokens de cor/tipografia e padrão de microinterações (Framer Motion)
5. [`docs/Documentacao-App-Miz.html`](docs/Documentacao-App-Miz.html) — documentação completa do app mobile da lojista (produto, jornada do usuário, gamificação, banco de dados). Formatada corretamente no link do GitHub Pages acima; o GitHub só mostra o HTML como texto puro dentro do repositório.

## Áreas funcionais

| Área | O que faz |
|---|---|
| Peças e Coleções | CRUD completo, upload de imagens (Supabase Storage, bucket público) |
| Aprovação de Cadastro | Fila de lojistas com `status_cadastro = 'pending'`, aprovar/recusar |
| CNPJs reconhecidos | Lista de CNPJs com aprovação automática de cadastro |
| Cursos (Academia) | CRUD de cursos e módulos — vídeo é campo de ID do Vimeo, não upload |
| Materiais | CRUD de material Comercial/Marketing, upload de PDF/imagem (Storage privado) |
| Indicação de Clientes | Criar indicação de cliente associada a uma lojista |
| Gamificação | **Somente leitura** — ranking mensal e extrato de pontos, decisão consciente de não permitir ajuste manual nesta versão |

## Segurança

- RLS já existente no banco protege as tabelas — o Admin só funciona porque quem loga tem `role = 'admin'`, checado tanto no client quanto reforçado pelo banco
- Autenticação via Supabase Auth (mesmo sistema do app mobile), só com a `anon key` pública — **a `service_role key` nunca aparece neste projeto**
- Toda ação destrutiva (excluir peça, recusar cadastro) exige confirmação explícita na interface antes de executar
- Banco compartilhado com produção do app mobile, sem staging separado — mudanças estruturais no banco (migrations) exigem aprovação explícita antes de rodar

## Stack

- React 19 + [Vite](https://vite.dev) + TypeScript
- React Router para navegação entre as áreas
- [Supabase JS client](https://supabase.com/docs/reference/javascript) (`anon key` + RLS)
- [Framer Motion](https://motion.dev) para microinterações (botões, listas, modais, upload)
- [lucide-react](https://lucide.dev) para ícones

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com as credenciais do Supabase (peça pra quem tem acesso)
npm run dev
```

Variáveis de ambiente necessárias (ver `.env.example`):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.env` nunca é commitado — está no `.gitignore`.

## Scripts

| Comando | Faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Type-check (`tsc -b`) + build de produção |
| `npm run lint` | ESLint no projeto inteiro |
| `npm run preview` | Serve o build de produção localmente |

## Estrutura

```
src/
  components/     Componentes reutilizáveis (MotionButton, ConfirmModal, Dropzone, StatusPill, ...)
  contexts/       AuthContext — sessão + checagem de role='admin'
  lib/            Client Supabase, helpers de Storage (público e privado), tipos
  pages/
    pecas/        Peças (CRUD + galeria de imagens + cores/tamanhos)
    colecoes/     Coleções
    cadastros/    Aprovação de Cadastro
    cnpjs/        CNPJs reconhecidos
    cursos/       Cursos (Academia) + módulos
    materiais/    Material Comercial/Marketing
    indicacoes/   Indicação de Clientes
    gamificacao/  Ranking + extrato de pontos (somente leitura)
```
