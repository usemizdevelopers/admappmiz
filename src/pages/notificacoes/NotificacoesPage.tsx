import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { enviarNotificacao } from '../../lib/pushNotifications';
import { MotionButton } from '../../components/MotionButton';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PageHeader } from '../../components/PageHeader';
import { SectionCard } from '../../components/SectionCard';
import { FormField } from '../../components/FormField';
import { Alert } from '../../components/Alert';
import { SortableTh } from '../../components/SortableTh';
import { Pagination } from '../../components/Pagination';
import type { Notificacao } from '../../lib/types';

type SortField = 'data' | 'titulo';

type HistoricoLinha = Notificacao & { enviadoPorNome: string };

const PAGE_SIZE = 10;

export function NotificacoesPage() {
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'success' | 'danger'; texto: string } | null>(null);

  const [historico, setHistorico] = useState<HistoricoLinha[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [sortField, setSortField] = useState<SortField>('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  async function carregarHistorico() {
    setCarregandoHistorico(true);
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      setHistorico([]);
      setCarregandoHistorico(false);
      return;
    }

    const idsAdmins = Array.from(new Set(data.map((n) => n.enviado_por)));
    const { data: perfis } = await supabase.from('profiles').select('id, nome, nome_loja').in('id', idsAdmins);
    const nomesPorId = new Map((perfis ?? []).map((p) => [p.id, p.nome || p.nome_loja || '—']));

    setHistorico(data.map((n) => ({ ...n, enviadoPorNome: nomesPorId.get(n.enviado_por) ?? '—' })));
    setCarregandoHistorico(false);
  }

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function confirmarEnvio() {
    setConfirmOpen(false);
    setEnviando(true);
    setFeedback(null);

    try {
      const resultado = await enviarNotificacao(titulo, mensagem);
      const erros = resultado.tickets.filter((t) => t.status === 'error');

      if (resultado.tokensEnviados === 0) {
        setFeedback({
          tipo: 'success',
          texto: 'Notificação registrada. Nenhum dispositivo com token cadastrado ainda, então não há para quem enviar o push agora.',
        });
      } else if (erros.length > 0) {
        setFeedback({
          tipo: 'danger',
          texto: `Notificação registrada. Enviada para ${resultado.tokensEnviados - erros.length} de ${resultado.tokensEnviados} dispositivo(s) — ${erros.length} falharam.`,
        });
      } else {
        setFeedback({
          tipo: 'success',
          texto: `Notificação enviada para ${resultado.tokensEnviados} dispositivo(s).`,
        });
      }
      setTitulo('');
      setMensagem('');
    } catch (err) {
      setFeedback({ tipo: 'danger', texto: 'Erro ao enviar notificação: ' + (err as Error).message });
    }

    setEnviando(false);
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
    const extrair: Record<SortField, (h: HistoricoLinha) => string> = {
      data: (h) => h.created_at,
      titulo: (h) => h.titulo,
    };
    const getValor = extrair[sortField];
    return [...historico].sort((a, b) => {
      const va = getValor(a);
      const vb = getValor(b);
      if (va === vb) return 0;
      const cmp = va > vb ? 1 : -1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [historico, sortField, sortDir]);

  const pageCount = Math.max(1, Math.ceil(historicoOrdenado.length / PAGE_SIZE));
  const pageClamped = Math.min(page, pageCount);
  const paginados = historicoOrdenado.slice((pageClamped - 1) * PAGE_SIZE, pageClamped * PAGE_SIZE);
  const stagger = paginados.length <= 20;

  const podeEnviar = titulo.trim().length > 0 && mensagem.trim().length > 0 && !enviando;

  return (
    <div className="content-card">
      <PageHeader
        icon={Bell}
        title="Enviar Notificação"
        subtitle="Envie um aviso por push para todas as lojistas com o app instalado. Não tem como desfazer depois de enviado."
      />

      <SectionCard title="Nova notificação">
        <div className="entity-form">
          <FormField label="Título" htmlFor="notif-titulo" required>
            <input
              id="notif-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Nova coleção disponível"
              maxLength={80}
            />
          </FormField>

          <FormField label="Mensagem" htmlFor="notif-mensagem" required>
            <textarea
              id="notif-mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Escreva a mensagem que vai aparecer na notificação"
              rows={3}
            />
          </FormField>
        </div>

        <MotionButton variant="gold" onClick={() => setConfirmOpen(true)} disabled={!podeEnviar}>
          <Send size={15} strokeWidth={1.75} />
          {enviando ? 'Enviando...' : 'Enviar notificação'}
        </MotionButton>

        {feedback && <Alert variant={feedback.tipo}>{feedback.texto}</Alert>}
      </SectionCard>

      <div className="section-card historico-section">
        <h3 className="section-card-title">Histórico de notificações</h3>

        <table className="data-table">
          <thead>
            <tr>
              <SortableTh field="data" label="Data" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <SortableTh field="titulo" label="Título" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              <th>Mensagem</th>
              <th>Enviado por</th>
            </tr>
          </thead>
          <tbody>
            {paginados.map((n, idx) => (
              <motion.tr
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: stagger ? idx * 0.03 : 0 }}
              >
                <td>{new Date(n.created_at).toLocaleString('pt-BR')}</td>
                <td>{n.titulo}</td>
                <td>{n.mensagem}</td>
                <td>{n.enviadoPorNome}</td>
              </motion.tr>
            ))}
            {!carregandoHistorico && paginados.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhuma notificação enviada ainda.</td>
              </tr>
            )}
          </tbody>
        </table>

        <Pagination
          page={pageClamped}
          pageCount={pageCount}
          totalItems={historicoOrdenado.length}
          itemLabel={historicoOrdenado.length === 1 ? 'notificação' : 'notificações'}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Enviar notificação"
        message={`Enviar "${titulo}" para todas as lojistas com o app instalado? Essa ação não pode ser desfeita.`}
        confirmLabel="Enviar"
        onConfirm={confirmarEnvio}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
