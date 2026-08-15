# Design System — Painel Admin MIZ (Web)
### Adaptação web dos tokens oficiais já validados no app mobile

*Este documento reaproveita 100% dos tokens de cor/tipografia do `ref_estrutura_codificada.md` (app mobile) — não redefine nada, só traduz a sintaxe de React Native (StyleSheet) para CSS/web, e troca a biblioteca de animação (Reanimated/Moti → Framer Motion, o padrão equivalente em React web).*

---

## 1. Tokens de cor (idênticos ao app mobile)

```css
:root {
  --white: #FFFFFF;
  --background: #F7F6F3;
  --surface: #EEECE7;
  --surface-alt: #E6E3DB;
  --border-light: #D1CCC7;
  --neutral-mid: #BEB8B1;
  --neutral-warm: #ABA49B;
  --brand-primary: #999085;
  --brand-deep: #7A7266;
  --text-secondary: #645D54;
  --text-body: #4E4841;
  --text-heading: #38332E;
  --text-strong: #221F1C;
  --black: #000000;
}
```

## 2. Tipografia (mesmas fontes do app mobile)

```css
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&family=Whisper&display=swap');

--font-serif: 'Instrument Serif', serif;   /* títulos, headings */
--font-sans: 'Inter', sans-serif;          /* corpo, UI, botões, tabelas */
--font-script: 'Whisper', cursive;         /* uso pontual — tagline/assinatura, se fizer sentido no Admin */
```

> ⚠️ Diferente do app mobile (onde title/headline usa bastante Instrument Serif), no Admin — sendo uma ferramenta de produtividade, não uma experiência de marca — usar Inter como padrão predominante em toda a UI de trabalho (tabelas, formulários, botões), reservando Instrument Serif só para títulos de página (ex: "Peças", "Aprovação de Cadastro").

## 3. Forma

```css
--radius: 14px;       /* cards, inputs, botões — mesmo valor do app mobile */
--radius-sm: 10px;    /* elementos menores (chips, badges) */
--radius-pill: 9999px; /* chips de status, badges */
```

## 4. Sombra e elevação (novo para o Admin — não existia essa necessidade no mobile)

```css
--shadow-card: 0 1px 3px rgba(34, 31, 28, 0.06), 0 1px 2px rgba(34, 31, 28, 0.04);
--shadow-modal: 0 12px 32px rgba(34, 31, 28, 0.16);
```

---

## 5. Microinterações — Framer Motion (equivalente web do Reanimated/Moti)

> Instalar: `npm install framer-motion`. Mesma filosofia da seção 16 do `ref_estrutura_codificada.md`: feedback vivo em toda ação, sem exagero. Duração 150–250ms para feedback de interação, 200–300ms para transições de página/modal.

### 5.1 Botões
```jsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
```

### 5.2 Linhas de tabela / cards de lista
- Hover: leve elevação (`box-shadow` de `--shadow-card` mais forte) + `background: var(--surface)`, transição 150ms
- Entrada da lista (ao carregar): fade + slide-up sutil (`y: 8 → 0`), stagger de ~30ms entre linhas se a lista tiver poucos itens (mesma lógica do app mobile — sem stagger em listas longas)

### 5.3 Modais (confirmação de exclusão, formulários em overlay)
```jsx
// Overlay
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
// Conteúdo do modal
<motion.div
  initial={{ opacity: 0, y: 16, scale: 0.98 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: 16, scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 300, damping: 26 }}
/>
```
Mesmo padrão de "saída suave" já validado no app mobile (fade + leve movimento antes de desmontar, nunca corte abrupto).

### 5.4 Toast de confirmação (sucesso)
Mesmo princípio já decidido no app mobile: toast não-bloqueante para sucesso, mensagem/confirmação bloqueante (modal) para erro destrutivo ou ação que exige atenção. Puxar visualmente do `SuccessToast` do app mobile (banner no topo, ícone de check, fundo `--brand-deep`, texto claro, auto-dismiss em 3s).

### 5.5 Upload de arquivo (drag & drop)
- Área de drop com borda tracejada (`border: 2px dashed var(--border-light)`)
- Ao arrastar arquivo sobre a área: borda muda para `--brand-primary` + leve `scale: 1.01` no container (transição 150ms)
- Durante upload: barra de progresso ou spinner sutil na cor `--brand-primary`
- Sucesso: fade-in da preview da imagem/arquivo

### 5.6 Navegação entre páginas (React Router)
- Fade simples entre rotas (200ms) — não precisa de slide, é ferramenta de trabalho, transição rápida importa mais que efeito

### 5.7 O que NÃO animar
- Não animar toda a tabela ao simplesmente reordenar/filtrar (só a entrada inicial dos dados)
- Não animar campos de formulário em foco além de uma leve transição de borda (`border-color` 150ms) — nada de scale/bounce em input de texto, atrapalha digitação

---

## 6. Aplicação por área (o que dá mais "sensação de marca" com menos esforço)

Prioridade sugerida, do que rende mais impacto visual por esforço:
1. **Paleta de cor geral** (fundo, texto, botões) — maior impacto, menor esforço, é praticamente troca de CSS variables
2. **Tipografia** — trocar fonte padrão do sistema pela Inter/Instrument Serif
3. **Botões com microinteração** (hover/tap) — dá "vida" imediata perceptível
4. **Cards de lista com hover/entrada** — segunda maior superfície de contato
5. **Modais com transição suave**
6. **Upload de arquivo com feedback visual**

---

*Próximo passo: aplicar esses tokens no projeto (provavelmente via um arquivo `theme.css` ou `tailwind.config` se o projeto usar Tailwind — confirmar qual abordagem de CSS o projeto já usa antes de began a aplicação).*
