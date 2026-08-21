import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Search, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { buscarLojistaPorDocumento } from '../../lib/profileSearch';
import { formatBRL } from '../../lib/currency';
import { MotionButton } from '../../components/MotionButton';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { FormField } from '../../components/FormField';
import { CurrencyInput } from '../../components/CurrencyInput';
import { Alert } from '../../components/Alert';
import { SortableTh } from '../../components/SortableTh';
import { Pagination } from '../../components/Pagination';
import type { CompraRegistrada, Profile } from '../../lib/types';

type SortField = 'data' | 'lojista' | 'valor';

type HistoricoLinha = CompraRegistrada & {
  lojistaNome: string;
  lancadoPorNome: string;
};

const PAGE_SIZE = 10;

export function LancarCompraPage() {
  const { profile: adminProfile } = useAuth();

  const [documento, setDocumento] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [buscaFeita, setBuscaFeita] = useState(false);
  const [lojista, setLojista] = useState<Profile | null>(null);
  const [totalAcumulado, setTotalAcumulado] = useState(0);
  const [erroBusca, setErroBusca] = useState<string | null>(null);

  const [valorCentavos, setValorCentavos] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'success' | 'danger'; texto: string } | null>(null);

  const [historico, setHistorico] = useState<HistoricoLinha[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [sortField, setSortField] = useState<SortField>('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  async function carregarHistorico() {
    setCarregandoHistorico(true);
    const { data, error } = await supabase
      .from('compras_registradas')
      .select('*')
      .order('data_compra', { ascending: false });

    if (error || !data) {
      setHistorico([]);
      setCarregandoHistorico(false);
      return;
    }

    const idsUnicos = Array.from(new Set(data.flatMap((c) => [c.profile_id, c.lancado_por])));
    const { data: perfis } = await supabase.from('profiles').select('id, nome, nome_loja').in('id', idsUnicos);
    const nomesPorId = new Map((perfis ?? []).map((p) => [p.id, p.nome_loja || p.nome || '—']));

    setHistorico(
      data.map((c) => ({
        ...c,
        lojistaNome: nomesPorId.get(c.profile_id) ?? '—',
        lancadoPorNome: nomesPorId.get(c.lancado_por) ?? '—',
      }))
    );
    setCarregandoHistorico(false);
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function handleBuscar(e: FormEvent) {
    e.preventDefault();
    if (!documento.trim()) return;

    setBuscando(true);
    setErroBusca(null);
    setFeedback(null);
    setLojista(null);
    setValorCentavos(0);

    try {
      const encontrada = await buscarLojistaPorDocumento(documento);
      setLojista(encontrada);
      setBuscaFeita(true);

      if (encontrada) {
        const { data } = await supabase
          .from('compras_registradas')
          .select('valor_reais')
          .eq('profile_id', encontrada.id);
        const total = (data ?? []).reduce((soma, c) => soma + Number(c.valor_reais), 0);
        setTotalAcumulado(total);
      } else {
        setTotalAcumulado(0);
      }
    } catch (err) {
      setErroBusca('Erro ao buscar lojista: ' + (err as Error).message);
    } finally {
      setBuscando(false);
    }
  }

  async function confirmarLancamento() {
    if (!lojista || !adminProfile) return;
    setSalvando(true);
    setConfirmOpen(false);

    const valorReais = valorCentavos / 100;
    const { error } = await supabase.from('compras_registradas').insert({
      profile_id: lojista.id,
      valor_reais: valorReais,
      lancado_por: adminProfile.id,
    });

    setSalvando(false);

    if (error) {
      setFeedback({ tipo: 'danger', texto: 'Erro ao lançar compra: ' + error.message });
      return;
    }

    setFeedback({
      tipo: 'success',
      texto: `Compra de ${formatBRL(valorReais)} lançada para ${lojista.nome_loja || lojista.nome}. Os pontos, se houver, já foram calculados automaticamente.`,
    });
    setTotalAcumulado((t) => t + valorReais);
    setValorCentavos(0);
    carregarHistorico();
  }

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'data' ? 'desc' : 'asc');
    }
    setPage(1);
  }

  const historicoOrdenado = useMemo(() => {
    const getValor: Record<SortField, (h: HistoricoLinha) => string | number> = {
      data: (h) => h.data_compra,
      lojista: (h) => h.lojistaNome,
      valor: (h) => Number(h.valor_reais),
    };
    const extrair = getValor[sortField];
    return [...historico].sort((a, b) => {
      const va = extrair(a);
      const vb = extrair(b);
      if (va === vb) return 0;
      const cmp = va > vb ? 1 : -1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [historico, sortField, sortDir]);

  const pageCount = Math.max(1, Math.ceil(historicoOrdenado.length / PAGE_SIZE));
  const pageClamped = Math.min(page, pageCount);
  const paginados = historicoOrdenado.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);
  const stagger = paginados.length <= 20;

  return (
    <div className="content-card">
      <PageHeader
        icon={DollarSign}
        title="Lançar Compra"
        subtitle="Busque a lojista pelo CNPJ/CPF e registre o valor da compra. Os pontos são calculados automaticamente pelo sistema."
      />

      <SectionCard title="Buscar lojista">
        <form className="entity-form busca-lojista-row" onSubmit={handleBuscar}>
          <FormField label="CNPJ ou CPF da lojista" htmlFor="documento" required>
            <input
              id="documento"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Digite o CNPJ ou CPF"
              required
            />
          </FormField>
          <MotionButton variant="primary" type="submit" disabled={buscando || !documento.trim()}>
            <Search size={16} strokeWidth={1.75} />
            {buscando ? 'Buscando...' : 'Buscar'}
          </MotionButton>
        </form>

        {erroBusca && <Alert variant="danger">{erroBusca}</Alert>}

        {buscaFeita && !erroBusca && !lojista && (
          <Alert variant="danger">Nenhuma lojista encontrada com esse CNPJ/CPF. Verifique o número digitado.</Alert>
        )}

        {lojista && (
          <div className="lojista-encontrada">
            <div className="lojista-encontrada-icon">
              <Store size={20} strokeWidth={1.5} />
            </div>
            <div className="lojista-encontrada-info">
              <strong>{lojista.nome_loja || lojista.nome}</strong>
              {lojista.nome_loja && lojista.nome && <span>{lojista.nome}</span>}
            </div>
            <div className="count-badge">Total acumulado: {formatBRL(totalAcumulado)}</div>
          </div>
        )}
      </SectionCard>

      {lojista && (
        <SectionCard title="Registrar valor da compra">
          <FormField label="Valor da compra" htmlFor="valor" required>
            <CurrencyInput id="valor" valueCentavos={valorCentavos} onChange={setValorCentavos} />
          </FormField>

          <MotionButton
            variant="gold"
            onClick={() => setConfirmOpen(true)}
            disabled={valorCentavos <= 0 || salvando}
          >
            <DollarSign size={15} strokeWidth={1.75} />
            {salvando ? 'Lançando...' : 'Lançar compra'}
          </MotionButton>

          {feedback && <Alert variant={feedback.tipo}>{feedback.texto}</Alert>}
        </SectionCard>
      )}

      <div className="section-card historico-section">
        <h3 className="section-card-title">Histórico de lançamentos</h3>

        <table className="data-table">
          <thead>
            <tr>
              <SortableTh field="data" label="Data" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableTh
                field="lojista"
                label="Lojista"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortableTh field="valor" label="Valor" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <th>Lançado por</th>
            </tr>
          </thead>
          <tbody>
            {paginados.map((h, idx) => (
              <motion.tr
                key={h.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: stagger ? idx * 0.03 : 0 }}
              >
                <td>{new Date(`${h.data_compra}T00:00:00`).toLocaleDateString('pt-BR')}</td>
                <td>{h.lojistaNome}</td>
                <td>{formatBRL(Number(h.valor_reais))}</td>
                <td>{h.lancadoPorNome}</td>
              </motion.tr>
            ))}
            {!carregandoHistorico && paginados.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhuma compra lançada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          page={pageClamped}
          pageCount={pageCount}
          totalItems={historicoOrdenado.length}
          itemLabel={historicoOrdenado.length === 1 ? 'compra' : 'compras'}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirmar lançamento"
        message={`Lançar compra de ${formatBRL(valorCentavos / 100)} para ${
          lojista?.nome_loja || lojista?.nome
        }? Essa ação não pode ser desfeita.`}
        confirmLabel="Lançar compra"
        onConfirm={confirmarLancamento}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
