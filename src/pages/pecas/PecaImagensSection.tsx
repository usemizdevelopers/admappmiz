import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { removeFromPecasBucketByUrl, uploadToPecasBucket } from '../../lib/storage';
import { MotionButton } from '../../components/MotionButton';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Dropzone } from '../../components/Dropzone';
import type { PecaImagem } from '../../lib/types';

export function PecaImagensSection({ pecaId }: { pecaId: string }) {
  const [imagens, setImagens] = useState<PecaImagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imagemParaRemover, setImagemParaRemover] = useState<PecaImagem | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('peca_imagens')
      .select('*')
      .eq('peca_id', pecaId)
      .order('ordem');
    if (!error) setImagens(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pecaId]);

  async function processUpload(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    try {
      let nextOrdem = imagens.length === 0 ? 0 : Math.max(...imagens.map((i) => i.ordem)) + 1;
      for (const file of files) {
        const url = await uploadToPecasBucket(file, pecaId);
        const { error } = await supabase
          .from('peca_imagens')
          .insert({ peca_id: pecaId, url, ordem: nextOrdem });
        if (error) throw error;
        nextOrdem += 1;
      }
      await load();
    } catch (err) {
      alert('Erro ao enviar imagem: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function confirmarRemocao() {
    const img = imagemParaRemover;
    if (!img) return;
    setImagemParaRemover(null);
    const { error } = await supabase.from('peca_imagens').delete().eq('id', img.id);
    if (error) {
      alert('Erro ao remover: ' + error.message);
      return;
    }
    await removeFromPecasBucketByUrl(img.url);
    await load();
  }

  async function mover(img: PecaImagem, direction: -1 | 1) {
    const idx = imagens.findIndex((i) => i.id === img.id);
    const swapWith = imagens[idx + direction];
    if (!swapWith) return;
    await supabase.from('peca_imagens').update({ ordem: swapWith.ordem }).eq('id', img.id);
    await supabase.from('peca_imagens').update({ ordem: img.ordem }).eq('id', swapWith.id);
    await load();
  }

  if (loading) return <p>Carregando imagens...</p>;

  return (
    <>
      <div className="image-gallery">
        {imagens.map((img, idx) => (
          <motion.div key={img.id} className="image-item" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <img src={img.url} alt="" />
            <div className="image-actions">
              <MotionButton className="icon-btn-sm" disabled={idx === 0} onClick={() => mover(img, -1)}>
                <ArrowUp size={14} strokeWidth={1.75} />
              </MotionButton>
              <MotionButton
                className="icon-btn-sm"
                disabled={idx === imagens.length - 1}
                onClick={() => mover(img, 1)}
              >
                <ArrowDown size={14} strokeWidth={1.75} />
              </MotionButton>
              <MotionButton variant="danger" onClick={() => setImagemParaRemover(img)}>
                <Trash2 size={13} strokeWidth={1.75} />
                Remover
              </MotionButton>
            </div>
          </motion.div>
        ))}
        {imagens.length === 0 && <p className="hint">Nenhuma imagem cadastrada.</p>}
      </div>

      <Dropzone
        accept="image/*"
        multiple
        uploading={uploading}
        onFiles={processUpload}
        label="Arraste imagens aqui ou clique para escolher"
        hint="Vários arquivos de uma vez são permitidos"
      />

      <ConfirmModal
        open={imagemParaRemover !== null}
        title="Remover imagem"
        message="Remover esta imagem da peça?"
        confirmLabel="Remover"
        onConfirm={confirmarRemocao}
        onCancel={() => setImagemParaRemover(null)}
      />
    </>
  );
}
