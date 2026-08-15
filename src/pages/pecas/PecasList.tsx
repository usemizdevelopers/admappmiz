import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shirt, Plus, CheckCircle2, AlertCircle, Image as ImageIcon, Trash2, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { removeFromPecasBucketByUrl } from '../../lib/storage';
import { MotionButton } from '../../components/MotionButton';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PageHeader } from '../../components/PageHeader';
import { SearchInput } from '../../components/SearchInput';
import { Select } from '../../components/Select';
import { StatusPill } from '../../components/StatusPill';
import { SortableTh } from '../../components/SortableTh';
import { Pagination } from '../../components/Pagination';
import type { Peca } from '../../lib/types';

type PecaComExtras = Peca & {
  colecoes: { nome: string } | null;
  peca_imagens: { url: string; ordem: number }[];
};

type SortField = 'nome' | 'codigo_referencia' | 'colecao' | 'categoria' | 'esgotado' | 'ativa';

const PAGE_SIZE = 10;

export function PecasList() {
  const [pecas, setPecas] = useState<PecaComExtras[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pecaParaExcluir, setPecaParaExcluir] = useState<Peca | null>(null);

  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'' | 'ativa' | 'inativa'>('');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('pecas')
      .select('*, colecoes(nome), peca_imagens(url, ordem)')
      .order('nome');
    if (error) {
      setError(error.message);
    } else {
      setPecas(data as PecaComExtras[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(peca: Peca, field: 'ativa' | 'esgotado') {
    const { error } = await supabase
      .from('pecas')
      .update({ [field]: !peca[field] })
      .eq('id', peca.id);
    if (error) {
      alert('Erro ao atualizar: ' + error.message);
      return;
    }
    load();
  }

  async function confirmarRemocao() {
    const peca = pecaParaExcluir;
    if (!peca) return;
    setPecaParaExcluir(null);

    const { data: imagens } = await supabase.from('peca_imagens').select('url').eq('peca_id', peca.id);
    for (const img of imagens ?? []) {
      await removeFromPecasBucketByUrl(img.url);
    }

    const { error } = await supabase.from('pecas').delete().eq('id', peca.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }
    load();
  }

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  }

  const categorias = useMemo(
    () => [...new Set(pecas.map((p) => p.categoria).filter((c): c is string => Boolean(c)))].sort(),
    [pecas]
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let lista = pecas.filter((p) => {
      const bateBusca =
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        (p.codigo_referencia ?? '').toLowerCase().includes(termo) ||
        (p.categoria ?? '').toLowerCase().includes(termo);
      const bateCategoria = !categoriaFiltro || p.categoria === categoriaFiltro;
      const bateStatus = !statusFiltro || (statusFiltro === 'ativa' ? p.ativa : !p.ativa);
      return bateBusca && bateCategoria && bateStatus;
    });

    lista = [...lista].sort((a, b) => {
      let va: string | boolean;
      let vb: string | boolean;
      if (sortField === 'colecao') {
        va = a.colecoes?.nome ?? '';
        vb = b.colecoes?.nome ?? '';
      } else if (sortField === 'esgotado' || sortField === 'ativa') {
        va = a[sortField];
        vb = b[sortField];
      } else {
        va = (a[sortField] ?? '') as string;
        vb = (b[sortField] ?? '') as string;
      }
      if (va === vb) return 0;
      const cmp = va > vb ? 1 : -1;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return lista;
  }, [pecas, busca, categoriaFiltro, statusFiltro, sortField, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageClamped = Math.min(page, pageCount);
  const paginadas = filtradas.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);
  const stagger = paginadas.length <= 20;

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="auth-error">Erro: {error}</p>;

  return (
    <div className="content-card">
      <PageHeader
        icon={Shirt}
        title="Peças"
        subtitle="Gerencie suas peças e acompanhe a disponibilidade e status."
        action={
          <Link to="/pecas/novo" className="btn-primary">
            <Plus size={16} strokeWidth={2} />
            Nova peça
          </Link>
        }
      />

      <div className="filters-bar">
        <SearchInput
          placeholder="Buscar por nome, código ou categoria..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={categoriaFiltro}
          onChange={(e) => {
            setCategoriaFiltro(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={statusFiltro}
          onChange={(e) => {
            setStatusFiltro(e.target.value as '' | 'ativa' | 'inativa');
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          <option value="ativa">Ativas</option>
          <option value="inativa">Inativas</option>
        </Select>
        <Select value={sortField} onChange={(e) => handleSort(e.target.value as SortField)}>
          <option value="nome">Ordenar por: Nome (A–Z)</option>
          <option value="codigo_referencia">Ordenar por: Código</option>
          <option value="colecao">Ordenar por: Coleção</option>
          <option value="categoria">Ordenar por: Categoria</option>
        </Select>
        <SlidersHorizontal size={18} strokeWidth={1.75} color="var(--text-secondary)" />
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <SortableTh field="nome" label="Nome" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortableTh
              field="codigo_referencia"
              label="Código"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableTh field="colecao" label="Coleção" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortableTh
              field="categoria"
              label="Categoria"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableTh
              field="esgotado"
              label="Esgotado"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableTh field="ativa" label="Ativa" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {paginadas.map((p, idx) => {
            const capa = [...p.peca_imagens].sort((a, b) => a.ordem - b.ordem)[0];
            return (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: stagger ? idx * 0.03 : 0 }}
              >
                <td>
                  <div className="name-cell">
                    {capa ? (
                      <img className="thumb" src={capa.url} alt="" />
                    ) : (
                      <span className="thumb-placeholder">
                        <ImageIcon size={18} strokeWidth={1.5} />
                      </span>
                    )}
                    <Link to={`/pecas/${p.id}`}>{p.nome}</Link>
                  </div>
                </td>
                <td>{p.codigo_referencia}</td>
                <td>{p.colecoes?.nome ?? '—'}</td>
                <td>{p.categoria}</td>
                <td>
                  <StatusPill
                    variant={p.esgotado ? 'danger' : 'success'}
                    icon={p.esgotado ? AlertCircle : CheckCircle2}
                    onClick={() => toggle(p, 'esgotado')}
                  >
                    {p.esgotado ? 'Esgotado' : 'Disponível'}
                  </StatusPill>
                </td>
                <td>
                  <StatusPill
                    variant={p.ativa ? 'positive' : 'neutral'}
                    dot
                    onClick={() => toggle(p, 'ativa')}
                  >
                    {p.ativa ? 'Ativa' : 'Inativa'}
                  </StatusPill>
                </td>
                <td>
                  <MotionButton variant="danger" onClick={() => setPecaParaExcluir(p)}>
                    <Trash2 size={13} strokeWidth={1.75} />
                    Excluir
                  </MotionButton>
                </td>
              </motion.tr>
            );
          })}
          {paginadas.length === 0 && (
            <tr>
              <td colSpan={7}>Nenhuma peça encontrada.</td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination
        page={pageClamped}
        pageCount={pageCount}
        totalItems={filtradas.length}
        itemLabel="peças"
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <ConfirmModal
        open={pecaParaExcluir !== null}
        title="Excluir peça"
        message={`Excluir a peça "${pecaParaExcluir?.nome}"? Essa ação não pode ser desfeita.`}
        onConfirm={confirmarRemocao}
        onCancel={() => setPecaParaExcluir(null)}
      />
    </div>
  );
}
