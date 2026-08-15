import { supabase } from './supabase';

const BUCKET = 'pecas';

export async function uploadToPecasBucket(file: File, folder: string): Promise<string> {
  const path = `${folder}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function removeFromPecasBucketByUrl(publicUrl: string): Promise<void> {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}
