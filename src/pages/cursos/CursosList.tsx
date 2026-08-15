import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Trash2, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { removeFromPrivateBucket } from '../../lib/privateStorage';
import { useSignedUrl } from '../../lib/useSignedUrl';
import { MotionButton } from '../../components/MotionButton';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PageHeader } from '../../components/PageHeader';
import { SearchInput } from '../../components/SearchInput';
import { Select } from '../../components/Select';
import { StatusPill } from '../../components/StatusPill';
import { SortableTh } from '../../components/SortableTh';
import { Pagination } from '../../components/Pagination';
import type { Curso } from '../../lib/types';

type SortField = 'titulo' | 'categoria' | 'duracao_min' | 'is_novo' | 'ativo';

const PAGE_SIZE = 10;

function CursoThumb({ path }: { path: string | null }) {
  const url = useSignedUrl('academia', path);
  if (!url) {
    return (
      <span className="thumb-placeholder">
        <BookOpen size={18} strokeWidth={1.5} />
      </span>
    );
  }
  return <img className="thumb" src={url} alt="" />;
}

export function CursosList() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursoParaExcluir, setCursoParaExcluir] = useState<Curso | null>(null);

  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'' | 'ativo' | 'inativo'>('');
  const [sortField, setSortField] = useState<SortField>('titulo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('cursos').select('*').order('titulo');
    if (error) {
      setError(error.message);
    } else {
      setCursos(data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleAtivo(curso: Curso) {
    const { error } = await supabase.from('cursos').update({ ativo: !curso.ativo }).eq('id', curso.id);
    if (error) {
      alert('Erro ao atualizar: ' + error.message);
      return;
    }
    load();
  }

  async function confirmarRemocao() {
    const curso = cursoParaExcluir;
    if (!curso) return;
    setCursoParaExcluir(null);

    const { data: modulos } = await supabase
      .from('curso_modulos')
      .select('url_conteudo, tipo')
      .eq('curso_id', curso.id);
    for (const m of modulos ?? []) {
      if (m.tipo === 'pdf') await removeFromPrivateBucket('academia', m.url_conteudo);
    }
    if (curso.thumbnail_url) await removeFromPrivateBucket('academia', curso.thumbnail_url);

    const { error } = await supabase.from('cursos').delete().eq('id', curso.id);
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
    () =>
      [...new Set(cursos.map((c) => c.categoria).filter((c): c is NonNullable<Curso['categoria']> => Boolean(c)))].sort(),
    [cursos]
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let lista = cursos.filter((c) => {
      const bateBusca = !termo || c.titulo.toLowerCase().includes(termo);
      const bateCategoria = !categoriaFiltro || c.categoria === categoriaFiltro;
      const bateStatus = !statusFiltro || (statusFiltro === 'ativo' ? c.ativo : !c.ativo);
      return bateBusca && bateCategoria && bateStatus;
    });

    lista = [...lista].sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      if (va === vb) return 0;
      const cmp = va > vb ? 1 : -1;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return lista;
  }, [cursos, busca, categoriaFiltro, statusFiltro, sortField, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageClamped = Math.min(page, pageCount);
  const paginadas = filtradas.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);
  const stagger = paginadas.length <= 20;

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="auth-error">Erro: {error}</p>;

  return (
    <div className="content-card">
      <PageHeader
        icon={BookOpen}
        title="Cursos (Academia)"
        subtitle="Gerencie os cursos cadastrados e acompanhe categorias, duração e status."
        action={
          <Link to="/cursos/novo" className="btn-primary">
            <Plus size={16} strokeWidth={2} />
            Novo curso
          </Link>
        }
      />

      <div className="filters-bar">
        <SearchInput
          placeholder="Buscar por título do curso..."
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
            setStatusFiltro(e.target.value as '' | 'ativo' | 'inativo');
            setPage(1);
          }}
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </Select>
        <Select value={sortField} onChange={(e) => handleSort(e.target.value as SortField)}>
          <option value="titulo">Ordenar por: Título (A–Z)</option>
          <option value="categoria">Ordenar por: Categoria</option>
          <option value="duracao_min">Ordenar por: Duração</option>
        </Select>
        <SlidersHorizontal size={18} strokeWidth={1.75} color="var(--text-secondary)" />
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <SortableTh field="titulo" label="Título" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortableTh
              field="categoria"
              label="Categoria"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableTh
              field="duracao_min"
              label="Duração"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableTh field="is_novo" label="Novo" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortableTh field="ativo" label="Status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
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
                  <CursoThumb path={c.thumbnail_url} />
                  <Link to={`/cursos/${c.id}`}>{c.titulo}</Link>
                </div>
              </td>
              <td>{c.categoria}</td>
              <td>{c.duracao_min ? `${c.duracao_min} min` : '—'}</td>
              <td>
                {c.is_novo ? (
                  <span className="pill pill-highlight">Sim</span>
                ) : (
                  <span className="dash">—</span>
                )}
              </td>
              <td>
                <StatusPill variant={c.ativo ? 'positive' : 'neutral'} dot onClick={() => toggleAtivo(c)}>
                  {c.ativo ? 'Ativo' : 'Inativo'}
                </StatusPill>
              </td>
              <td>
                <MotionButton variant="danger" onClick={() => setCursoParaExcluir(c)}>
                  <Trash2 size={13} strokeWidth={1.75} />
                  Excluir
                </MotionButton>
              </td>
            </motion.tr>
          ))}
          {paginadas.length === 0 && (
            <tr>
              <td colSpan={6}>Nenhum curso encontrado.</td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination
        page={pageClamped}
        pageCount={pageCount}
        totalItems={filtradas.length}
        itemLabel={filtradas.length === 1 ? 'curso' : 'cursos'}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <ConfirmModal
        open={cursoParaExcluir !== null}
        title="Excluir curso"
        message={`Excluir o curso "${cursoParaExcluir?.titulo}"? Isso também remove os módulos associados. Essa ação não pode ser desfeita.`}
        onConfirm={confirmarRemocao}
        onCancel={() => setCursoParaExcluir(null)}
      />
    </div>
  );
}
