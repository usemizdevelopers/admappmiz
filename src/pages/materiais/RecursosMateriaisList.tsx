import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, Trash2, SlidersHorizontal } from 'lucide-react';
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
import type { RecursoMaterial } from '../../lib/types';

type SortField = 'titulo' | 'tipo_area' | 'tipo_arquivo' | 'ativo';

const PAGE_SIZE = 10;

function MaterialThumb({ path }: { path: string | null }) {
  const url = useSignedUrl('materiais', path);
  if (!url) {
    return (
      <span className="thumb-placeholder">
        <FileText size={18} strokeWidth={1.5} />
      </span>
    );
  }
  return <img className="thumb" src={url} alt="" />;
}

export function RecursosMateriaisList() {
  const [materiais, setMateriais] = useState<RecursoMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materialParaExcluir, setMaterialParaExcluir] = useState<RecursoMaterial | null>(null);

  const [busca, setBusca] = useState('');
  const [areaFiltro, setAreaFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'' | 'ativo' | 'inativo'>('');
  const [sortField, setSortField] = useState<SortField>('titulo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('recursos_materiais').select('*').order('titulo');
    if (error) {
      setError(error.message);
    } else {
      setMateriais(data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleAtivo(m: RecursoMaterial) {
    const { error } = await supabase.from('recursos_materiais').update({ ativo: !m.ativo }).eq('id', m.id);
    if (error) {
      alert('Erro ao atualizar: ' + error.message);
      return;
    }
    load();
  }

  async function confirmarRemocao() {
    const m = materialParaExcluir;
    if (!m) return;
    setMaterialParaExcluir(null);

    if (m.tipo_arquivo !== 'video' && m.url_arquivo) await removeFromPrivateBucket('materiais', m.url_arquivo);
    if (m.capa_url) await removeFromPrivateBucket('materiais', m.capa_url);

    const { error } = await supabase.from('recursos_materiais').delete().eq('id', m.id);
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

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    let lista = materiais.filter((m) => {
      const bateBusca = !termo || m.titulo.toLowerCase().includes(termo);
      const bateArea = !areaFiltro || m.tipo_area === areaFiltro;
      const bateTipo = !tipoFiltro || m.tipo_arquivo === tipoFiltro;
      const bateStatus = !statusFiltro || (statusFiltro === 'ativo' ? m.ativo : !m.ativo);
      return bateBusca && bateArea && bateTipo && bateStatus;
    });

    lista = [...lista].sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (va === vb) return 0;
      const cmp = va > vb ? 1 : -1;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return lista;
  }, [materiais, busca, areaFiltro, tipoFiltro, statusFiltro, sortField, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageClamped = Math.min(page, pageCount);
  const paginadas = filtradas.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);
  const stagger = paginadas.length <= 20;

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="auth-error">Erro: {error}</p>;

  return (
    <div className="content-card">
      <PageHeader
        icon={FileText}
        title="Material Comercial e de Marketing"
        subtitle="Gerencie arquivos e materiais por área, tipo e status."
        action={
          <Link to="/materiais/novo" className="btn-primary">
            <Plus size={16} strokeWidth={2} />
            Novo material
          </Link>
        }
      />

      <div className="filters-bar">
        <SearchInput
          placeholder="Buscar por título do material..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={areaFiltro}
          onChange={(e) => {
            setAreaFiltro(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todas as áreas</option>
          <option value="comercial">comercial</option>
          <option value="marketing">marketing</option>
        </Select>
        <Select
          value={tipoFiltro}
          onChange={(e) => {
            setTipoFiltro(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos os tipos</option>
          <option value="pdf">pdf</option>
          <option value="zip">zip</option>
          <option value="imagem">imagem</option>
          <option value="video">video</option>
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
          <option value="tipo_area">Ordenar por: Área</option>
          <option value="tipo_arquivo">Ordenar por: Tipo</option>
        </Select>
        <SlidersHorizontal size={18} strokeWidth={1.75} color="var(--text-secondary)" />
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <SortableTh field="titulo" label="Título" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortableTh field="tipo_area" label="Área" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <SortableTh
              field="tipo_arquivo"
              label="Tipo"
              sortField={sortField}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortableTh field="ativo" label="Status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {paginadas.map((m, idx) => (
            <motion.tr
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: stagger ? idx * 0.03 : 0 }}
            >
              <td>
                <div className="name-cell">
                  <MaterialThumb path={m.capa_url} />
                  <Link to={`/materiais/${m.id}`}>{m.titulo}</Link>
                </div>
              </td>
              <td>{m.tipo_area}</td>
              <td>{m.tipo_arquivo}</td>
              <td>
                <StatusPill variant={m.ativo ? 'positive' : 'neutral'} dot onClick={() => toggleAtivo(m)}>
                  {m.ativo ? 'Ativo' : 'Inativo'}
                </StatusPill>
              </td>
              <td>
                <MotionButton variant="danger" onClick={() => setMaterialParaExcluir(m)}>
                  <Trash2 size={13} strokeWidth={1.75} />
                  Excluir
                </MotionButton>
              </td>
            </motion.tr>
          ))}
          {paginadas.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhum material encontrado.</td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination
        page={pageClamped}
        pageCount={pageCount}
        totalItems={filtradas.length}
        itemLabel={filtradas.length === 1 ? 'material' : 'materiais'}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <ConfirmModal
        open={materialParaExcluir !== null}
        title="Excluir material"
        message={`Excluir o material "${materialParaExcluir?.titulo}"? Essa ação não pode ser desfeita.`}
        onConfirm={confirmarRemocao}
        onCancel={() => setMaterialParaExcluir(null)}
      />
    </div>
  );
}
