import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { MotionButton } from '../../components/MotionButton';
import { Chip } from '../../components/Chip';
import type { PecaTamanho } from '../../lib/types';

export function PecaTamanhosSection({ pecaId }: { pecaId: string }) {
  const [tamanhos, setTamanhos] = useState<PecaTamanho[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoValor, setNovoValor] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('peca_tamanhos')
      .select('*')
      .eq('peca_id', pecaId)
      .order('ordem');
    if (!error) setTamanhos(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pecaId]);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!novoValor.trim()) return;
    const ordem = tamanhos.length === 0 ? 0 : Math.max(...tamanhos.map((t) => t.ordem)) + 1;
    const { error } = await supabase
      .from('peca_tamanhos')
      .insert({ peca_id: pecaId, valor: novoValor.trim(), ordem });
    if (error) {
      alert('Erro ao adicionar: ' + error.message);
      return;
    }
    setNovoValor('');
    await load();
  }

  async function remover(tamanho: PecaTamanho) {
    const { error } = await supabase.from('peca_tamanhos').delete().eq('id', tamanho.id);
    if (error) {
      alert('Erro ao remover: ' + error.message);
      return;
    }
    await load();
  }

  if (loading) return <p>Carregando tamanhos...</p>;

  return (
    <>
      <ul className="tag-list">
        <AnimatePresence>
          {tamanhos.map((t) => (
            <Chip key={t.id} onRemove={() => remover(t)}>
              {t.valor}
            </Chip>
          ))}
        </AnimatePresence>
        {tamanhos.length === 0 && <li>Nenhum tamanho cadastrado.</li>}
      </ul>
      <form className="inline-form" onSubmit={adicionar}>
        <input
          placeholder="ex: P, M, G, 38, 40"
          value={novoValor}
          onChange={(e) => setNovoValor(e.target.value)}
        />
        <MotionButton type="submit">Adicionar</MotionButton>
      </form>
    </>
  );
}
