import { supabase } from './supabase';

/**
 * 'academia' e 'materiais' são buckets privados: a leitura só é liberada para
 * arquivos cuja pasta seja o id de uma linha real em cursos/recursos_materiais.
 * Por isso a linha (curso/módulo/material) precisa existir ANTES do upload —
 * mesma ordem já usada em peca_imagens (Peças).
 */
export type PrivateBucket = 'academia' | 'materiais';

export async function uploadToPrivateBucket(
  bucket: PrivateBucket,
  file: File,
  folder: string,
  fixedName?: string
): Promise<string> {
  const filename = fixedName ?? `${Date.now()}-${file.name}`;
  const path = `${folder}/${filename}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: Boolean(fixedName) });
  if (error) throw error;
  return path;
}

export async function getSignedUrl(bucket: PrivateBucket, path: string | null, expiresIn = 3600): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function removeFromPrivateBucket(bucket: PrivateBucket, path: string | null): Promise<void> {
  if (!path) return;
  await supabase.storage.from(bucket).remove([path]);
}
