import { supabase } from './supabase';
import type { Profile } from './types';

/**
 * Resolve um CNPJ/CPF digitado (com ou sem pontuação) até o profile da lojista.
 * Compartilhado entre Cadastros/CNPJs reconhecidos e Lançar Compra — não duplicar.
 */
export async function buscarLojistaPorDocumento(documento: string): Promise<Profile | null> {
  const normalizado = documento.replace(/\D/g, '');
  if (!normalizado) return null;

  const { data, error } = await supabase.from('profiles').select('*').eq('cnpj_cpf', normalizado).maybeSingle();
  if (error) throw error;
  if (data) return data;

  // fallback: o documento pode estar salvo com pontuação no banco
  const { data: semNormalizar } = await supabase.from('profiles').select('*').eq('cnpj_cpf', documento.trim()).maybeSingle();
  return semNormalizar ?? null;
}
