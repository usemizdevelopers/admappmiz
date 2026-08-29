import { supabase } from './supabase';
import type { Notificacao } from './types';

export type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

export type EnvioNotificacaoResultado = {
  notificacao: Notificacao;
  tokensEnviados: number;
  tickets: ExpoPushTicket[];
};

/**
 * Registra a notificação e dispara o push via a Edge Function `send-push` (proxy server-side —
 * a Expo Push API não aceita chamada direta do navegador por CORS). A function busca os tokens
 * ela mesma; nunca aceitamos lista de tokens vinda do cliente.
 */
export async function enviarNotificacao(titulo: string, mensagem: string): Promise<EnvioNotificacaoResultado> {
  const { data, error } = await supabase.functions.invoke('send-push', {
    body: { titulo, mensagem },
  });

  if (error) {
    // Edge Function retornou status de erro (4xx/5xx) — o corpo JSON tem a mensagem real.
    let mensagemErro = error.message;
    try {
      const corpo = await (error as { context?: Response }).context?.json();
      if (corpo?.error) mensagemErro = corpo.error;
    } catch {
      // mantém error.message padrão se o corpo não vier em JSON
    }
    throw new Error(mensagemErro);
  }
  if (data?.error) {
    throw new Error(data.error);
  }

  return data as EnvioNotificacaoResultado;
}
