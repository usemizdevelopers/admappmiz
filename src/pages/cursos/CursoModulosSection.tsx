import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadToPrivateBucket, removeFromPrivateBucket } from '../../lib/privateStorage';
import { useSignedUrl } from '../../lib/useSignedUrl';
import { MotionButton } from '../../components/MotionButton';
import type { CursoModulo } from '../../lib/types';

function ModuloRow({ modulo, onChanged, isFirst, isLast, onMove }: {
  modulo: CursoModulo;
  onChanged: () => void;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const [titulo, setTitulo] = useState(modulo.titulo);
  const [vimeoId, setVimeoId] = useState(modulo.tipo === 'video' ? modulo.url_conteudo ?? '' : '');
  const [uploading, setUploading] = useState(false);
  const pdfSignedUrl = useSignedUrl('academia', modulo.tipo === 'pdf' ? modulo.url_conteudo : null);

  async function salvarTitulo() {
    if (titulo === modulo.titulo) return;
    await supabase.from('curso_modulos').update({ titulo }).eq('id', modulo.id);
    onChanged();
  }

  async function mudarTipo(novoTipo: CursoModulo['tipo']) {
    if (novoTipo === modulo.tipo) return;
    if (modulo.tipo === 'pdf' && modulo.url_conteudo) {
      await removeFromPrivateBucket('academia', modulo.url_conteudo);
    }
    await supabase.from('curso_modulos').update({ tipo: novoTipo, url_conteudo: null }).eq('id', modulo.id);
    onChanged();
  }

  async function salvarVimeoId() {
    await supabase.from('curso_modulos').update({ url_conteudo: vimeoId || null }).eq('id', modulo.id);
    onChanged();
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (modulo.url_conteudo) await removeFromPrivateBucket('academia', modulo.url_conteudo);
      const path = await uploadToPrivateBucket('academia', file, modulo.curso_id, `${modulo.id}-${file.name}`);
      await supabase.from('curso_modulos').update({ url_conteudo: path }).eq('id', modulo.id);
      onChanged();
    } catch (err) {
      alert('Erro ao enviar PDF: ' + (err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function remover() {
    if (!confirm(`Remover o módulo "${modulo.titulo}"?`)) return;
    if (modulo.tipo === 'pdf' && modulo.url_conteudo) {
      await removeFromPrivateBucket('academia', modulo.url_conteudo);
    }
    await supabase.from('curso_modulos').delete().eq('id', modulo.id);
    onChanged();
  }

  return (
    <motion.div className="modulo-row" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="modulo-row-top">
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={salvarTitulo} />
        <select value={modulo.tipo} onChange={(e) => mudarTipo(e.target.value as CursoModulo['tipo'])}>
          <option value="video">vídeo (Vimeo)</option>
          <option value="pdf">PDF</option>
        </select>
        <MotionButton className="icon-btn-sm" disabled={isFirst} onClick={() => onMove(-1)}>
          <ArrowUp size={14} strokeWidth={1.75} />
        </MotionButton>
        <MotionButton className="icon-btn-sm" disabled={isLast} onClick={() => onMove(1)}>
          <ArrowDown size={14} strokeWidth={1.75} />
        </MotionButton>
        <MotionButton variant="danger" onClick={remover}>
          <Trash2 size={13} strokeWidth={1.75} />
          Remover
        </MotionButton>
      </div>

      {modulo.tipo === 'video' ? (
        <div className="modulo-row-content">
          <input
            placeholder="ID do vídeo no Vimeo (ex: 1234567890)"
            value={vimeoId}
            onChange={(e) => setVimeoId(e.target.value)}
            onBlur={salvarVimeoId}
          />
        </div>
      ) : (
        <div className="modulo-row-content">
          {pdfSignedUrl && (
            <a href={pdfSignedUrl} target="_blank" rel="noreferrer">
              Ver PDF atual
            </a>
          )}
          <input type="file" accept="application/pdf" onChange={handlePdfUpload} disabled={uploading} />
          {uploading && <span>Enviando...</span>}
        </div>
      )}
    </motion.div>
  );
}

export function CursoModulosSection({ cursoId }: { cursoId: string }) {
  const [modulos, setModulos] = useState<CursoModulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoTitulo, setNovoTitulo] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('curso_modulos')
      .select('*')
      .eq('curso_id', cursoId)
      .order('ordem');
    if (!error) setModulos(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursoId]);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!novoTitulo.trim()) return;
    const ordem = modulos.length === 0 ? 0 : Math.max(...modulos.map((m) => m.ordem)) + 1;
    const { error } = await supabase
      .from('curso_modulos')
      .insert({ curso_id: cursoId, titulo: novoTitulo.trim(), tipo: 'video', ordem });
    if (error) {
      alert('Erro ao adicionar módulo: ' + error.message);
      return;
    }
    setNovoTitulo('');
    load();
  }

  async function mover(modulo: CursoModulo, direction: -1 | 1) {
    const idx = modulos.findIndex((m) => m.id === modulo.id);
    const swapWith = modulos[idx + direction];
    if (!swapWith) return;
    await supabase.from('curso_modulos').update({ ordem: swapWith.ordem }).eq('id', modulo.id);
    await supabase.from('curso_modulos').update({ ordem: modulo.ordem }).eq('id', swapWith.id);
    load();
  }

  if (loading) return <p>Carregando módulos...</p>;

  return (
    <>
      <div className="modulo-list">
        {modulos.map((m, idx) => (
          <ModuloRow
            key={m.id}
            modulo={m}
            onChanged={load}
            isFirst={idx === 0}
            isLast={idx === modulos.length - 1}
            onMove={(dir) => mover(m, dir)}
          />
        ))}
        {modulos.length === 0 && <p className="hint">Nenhum módulo cadastrado.</p>}
      </div>
      <form className="inline-form" onSubmit={adicionar}>
        <input
          placeholder="Título do novo módulo"
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
        />
        <MotionButton type="submit" variant="gold">
          Adicionar
        </MotionButton>
      </form>
    </>
  );
}
