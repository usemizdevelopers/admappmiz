// Edge Function: send-push
// Proxy server-side para a Expo Push API — necessário porque a Expo não devolve
// Access-Control-Allow-Origin, então o navegador (Painel Admin) não consegue chamá-la direto.
//
// Segurança: os tokens NUNCA vêm do cliente. A function sempre busca os tokens ela mesma,
// usando o JWT de quem chamou (RLS aplicada normalmente) — assim, mesmo que alguém chame
// esta function diretamente (fora do Admin), só um admin de verdade consegue disparar um
// envio, e só pros tokens que a policy de push_tokens deixa o admin enxergar.
//
// Deploy manual (Dashboard → Edge Functions → New Function → nome "send-push", colar este
// arquivo): SUPABASE_URL e SUPABASE_ANON_KEY já vêm pré-configurados como env vars pela
// própria plataforma, não precisa cadastrar segredo nenhum. Manter "Enforce JWT verification"
// ligado (padrão).

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Sem autenticação.' }, 401);
    }

    // Cliente autenticado como o próprio usuário que chamou — RLS se aplica normalmente,
    // igual a uma chamada feita direto pelo app.
    const supabaseAsCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseAsCaller.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sessão inválida.' }, 401);
    }
    const callerId = userData.user.id;

    const { data: perfil, error: perfilError } = await supabaseAsCaller
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single();

    if (perfilError || perfil?.role !== 'admin') {
      return jsonResponse({ error: 'Apenas administradores podem enviar notificações.' }, 403);
    }

    const { titulo, mensagem } = await req.json();
    const tituloLimpo = (titulo ?? '').trim();
    const mensagemLimpa = (mensagem ?? '').trim();
    if (!tituloLimpo || !mensagemLimpa) {
      return jsonResponse({ error: 'Título e mensagem são obrigatórios.' }, 400);
    }

    const { data: notificacao, error: insertError } = await supabaseAsCaller
      .from('notificacoes')
      .insert({ titulo: tituloLimpo, mensagem: mensagemLimpa, enviado_por: callerId })
      .select()
      .single();

    if (insertError) {
      return jsonResponse({ error: 'Erro ao registrar notificação: ' + insertError.message }, 500);
    }

    // Tokens sempre buscados aqui dentro — nunca aceitos do corpo da requisição.
    const { data: tokenRows, error: tokensError } = await supabaseAsCaller.from('push_tokens').select('token');
    if (tokensError) {
      return jsonResponse(
        { notificacao, error: 'Notificação registrada, mas houve erro ao buscar os dispositivos: ' + tokensError.message },
        500
      );
    }

    const tokens = (tokenRows ?? []).map((t: { token: string }) => t.token);
    if (tokens.length === 0) {
      return jsonResponse({ notificacao, tokensEnviados: 0, tickets: [] });
    }

    const tickets = [];
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const lote = tokens.slice(i, i + CHUNK_SIZE);
      const body = lote.map((token: string) => ({ to: token, title: tituloLimpo, body: mensagemLimpa }));
      const resp = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      tickets.push(...(json.data ?? []));
    }

    return jsonResponse({ notificacao, tokensEnviados: tokens.length, tickets });
  } catch (err) {
    return jsonResponse({ error: 'Erro inesperado: ' + (err as Error).message }, 500);
  }
});
