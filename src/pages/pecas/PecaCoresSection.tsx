import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { MotionButton } from '../../components/MotionButton';
import { Chip } from '../../components/Chip';
import type { PecaCor } from '../../lib/types';

export function PecaCoresSection({ pecaId }: { pecaId: string }) {
  const [cores, setCores] = useState<PecaCor[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoValor, setNovoValor] = useState('#000000');
  const [novoNome, setNovoNome] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('peca_cores')
      .select('*')
      .eq('peca_id', pecaId)
      .order('ordem');
    if (!error) setCores(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pecaId]);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const ordem = cores.length === 0 ? 0 : Math.max(...cores.map((c) => c.ordem)) + 1;
    const { error } = await supabase
      .from('peca_cores')
      .insert({ peca_id: pecaId, valor: novoValor, nome: novoNome || null, ordem });
    if (error) {
      alert('Erro ao adicionar: ' + error.message);
      return;
    }
    setNovoNome('');
    await load();
  }

  async function remover(cor: PecaCor) {
    const { error } = await supabase.from('peca_cores').delete().eq('id', cor.id);
    if (error) {
      alert('Erro ao remover: ' + error.message);
      return;
    }
    await load();
  }

  if (loading) return <p>Carregando cores...</p>;

  return (
    <>
      <ul className="tag-list">
        <AnimatePresence>
          {cores.map((c) => (
            <Chip key={c.id} swatch={c.valor} onRemove={() => remover(c)}>
              {c.nome ?? c.valor}
            </Chip>
          ))}
        </AnimatePresence>
        {cores.length === 0 && <li>Nenhuma cor cadastrada.</li>}
      </ul>
      <form className="inline-form" onSubmit={adicionar}>
        <input
          type="color"
          value={novoValor}
          onChange={(e) => setNovoValor(e.target.value)}
          title="Cor"
        />
        <input
          placeholder="Nome da cor (ex: Off-white)"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
        />
        <MotionButton type="submit">Adicionar</MotionButton>
      </form>
    </>
  );
}
