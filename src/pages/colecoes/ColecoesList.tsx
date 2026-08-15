import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Plus, Trash2, SlidersHorizontal } from 'lucide-react';
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
import type { Colecao } from '../../lib/types';

type SortField = 'nome' | 'tipo' | 'ativa';

const PAGE_SIZE = 10;

export function ColecoesList() {
  const [colecoes, setColecoes] = useState<Colecao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colecaoParaExcluir, setColecaoParaExcluir] = useState<Colecao | null>(null);

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'' | 'ativa' | 'inativa'>('');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('colecoes').select('*').order('nome');
    if (error) {
      setError(error.message);
    } else {
      setColecoes(data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleAtiva(colecao: Colecao) {
    const { error } = await supabase.from('colecoes').update({ ativa: !colecao.ativa }).eq('id', colecao.id);
    if (error) {
      alert('Erro ao atualizar: ' + error.message);
      return;
    }
    load();
  }

  async function confirmarRemocao() {
    const colecao = colecaoParaExcluir;
    if (!colecao) return;
    setColecaoParaExcluir(null);

    const { error } = await supabase.from('colecoes').delete().eq('id', colecao.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      return;
    }

    if (colecao.imagem_url) {
      await removeFromPecasBucketByUrl(colecao.imagem_url);
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

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let lista = colecoes.filter((c) => {
      const bateBusca = !termo || c.nome.toLowerCase().includes(termo);
      const bateStatus = !statusFiltro || (statusFiltro === 'ativa' ? c.ativa : !c.ativa);
      return bateBusca && bateStatus;
    });

    lista = [...lista].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (va === vb) return 0;
      const cmp = va > vb ? 1 : -1;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return lista;
  }, [colecoes, busca, statusFiltro, sortField, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageClamped = Math.min(page, pageCount);
  const paginadas = filtradas.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);
  const stagger = paginadas.length <= 20;

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="auth-error">Erro: {error}</p>;

  return (
    <div className="content-card">
      <PageHeader
        icon={ShoppingBag}
        title="Coleções"
        subtitle="Gerencie as coleções cadastradas e seus status."
        action={
          <Link to="/colecoes/novo" className="btn-primary">
            <Plus size={16} strokeWidth={2} />
            Nova coleção
          </Link>
        }
      />

      <div className="filters-bar">
        <SearchInput
          placeholder="Buscar por nome da coleção..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPage(1);
          }}
        />
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
          <option value="tipo">Ordenar por: Tipo</option>
        </Select>
        <SlidersHorizontal size={18} strokeWidth={1.75} color="var(--text-secondary)" />
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <SortableTh field="nome" label="Nome" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortableTh field="tipo" label="Tipo" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortableTh field="ativa" label="Status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {paginadas.map((c, idx) => (
            <motion.tr
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: stagger ? idx * 0.03 : 0 }}
            >
              <td>
                <div className="name-cell">
                  {c.imagem_url ? (
                    <img className="thumb" src={c.imagem_url} alt="" />
                  ) : (
                    <span className="thumb-placeholder">
                      <ShoppingBag size={18} strokeWidth={1.5} />
                    </span>
                  )}
                  <Link to={`/colecoes/${c.id}`}>{c.nome}</Link>
                </div>
              </td>
              <td>{c.tipo}</td>
              <td>
                <StatusPill variant={c.ativa ? 'positive' : 'neutral'} dot onClick={() => toggleAtiva(c)}>
                  {c.ativa ? 'Ativa' : 'Inativa'}
                </StatusPill>
              </td>
              <td>
                <MotionButton variant="danger" onClick={() => setColecaoParaExcluir(c)}>
                  <Trash2 size={13} strokeWidth={1.75} />
                  Excluir
                </MotionButton>
              </td>
            </motion.tr>
          ))}
          {paginadas.length === 0 && (
            <tr>
              <td colSpan={4}>Nenhuma coleção encontrada.</td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination
        page={pageClamped}
        pageCount={pageCount}
        totalItems={filtradas.length}
        itemLabel={filtradas.length === 1 ? 'coleção' : 'coleções'}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <ConfirmModal
        open={colecaoParaExcluir !== null}
        title="Excluir coleção"
        message={`Excluir a coleção "${colecaoParaExcluir?.nome}"? Essa ação não pode ser desfeita.`}
        onConfirm={confirmarRemocao}
        onCancel={() => setColecaoParaExcluir(null)}
      />
    </div>
  );
}
