import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, Clock, Store, CreditCard, Phone, Calendar, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { MotionButton } from '../../components/MotionButton';
import { SearchInput } from '../../components/SearchInput';
import { Select } from '../../components/Select';
import type { Profile } from '../../lib/types';

type StatusFiltro = 'pending' | 'approved' | 'rejected' | '';

const STATUS_LABEL: Record<Exclude<StatusFiltro, ''>, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
};

const STATUS_LABEL_PLURAL: Record<StatusFiltro, string> = {
  pending: 'pendentes',
  approved: 'aprovados',
  rejected: 'recusados',
  '': 'no total',
};

const STATUS_PILL_VARIANT: Record<Exclude<StatusFiltro, ''>, 'highlight' | 'positive' | 'danger'> = {
  pending: 'highlight',
  approved: 'positive',
  rejected: 'danger',
};

export function CadastrosList() {
  const { profile: adminProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('pending');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setProfiles(data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function aprovar(p: Profile) {
    if (!confirm(`Aprovar o cadastro de "${p.nome}" (${p.nome_loja})?`)) return;
    setProcessando(p.id);
    const { error } = await supabase
      .from('profiles')
      .update({
        status_cadastro: 'approved',
        aprovado_em: new Date().toISOString(),
        aprovado_por: adminProfile?.id ?? null,
        aprovacao_automatica: false,
      })
      .eq('id', p.id);
    setProcessando(null);
    if (error) {
      alert('Erro ao aprovar: ' + error.message);
      return;
    }
    load();
  }

  async function recusar(p: Profile) {
    if (
      !confirm(
        `Recusar o cadastro de "${p.nome}" (${p.nome_loja})? Essa ação pode ser revertida depois via banco, mas não tem desfazer nesta tela.`
      )
    )
      return;
    setProcessando(p.id);
    const { error } = await supabase.from('profiles').update({ status_cadastro: 'rejected' }).eq('id', p.id);
    setProcessando(null);
    if (error) {
      alert('Erro ao recusar: ' + error.message);
      return;
    }
    load();
  }

  const pendentesCount = useMemo(() => profiles.filter((p) => p.status_cadastro === 'pending').length, [profiles]);

  const porStatus = useMemo(
    () => (statusFiltro ? profiles.filter((p) => p.status_cadastro === statusFiltro) : profiles),
    [profiles, statusFiltro]
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return porStatus;
    return porStatus.filter(
      (p) =>
        (p.nome ?? '').toLowerCase().includes(termo) ||
        (p.nome_loja ?? '').toLowerCase().includes(termo) ||
        (p.cnpj_cpf ?? '').toLowerCase().includes(termo) ||
        (p.whatsapp ?? '').toLowerCase().includes(termo)
    );
  }, [porStatus, busca]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="auth-error">Erro: {error}</p>;

  return (
    <div>
      <div className="page-title-block">
        <h2>Aprovação de Cadastro</h2>
        <p className="page-subtitle">Revise os novos cadastros recebidos antes de aprová-los no sistema.</p>
      </div>

      <div className="content-card">
        <div className="filters-bar filters-bar-flush">
          <SearchInput
            placeholder="Buscar por nome, CNPJ ou WhatsApp..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Select icon={Filter} value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovados</option>
            <option value="rejected">Recusados</option>
            <option value="">Todos</option>
          </Select>
          <span className="count-badge">
            <Clock size={14} strokeWidth={1.75} />
            {pendentesCount} cadastro{pendentesCount === 1 ? '' : 's'} aguardando aprovação
          </span>
        </div>
      </div>

      <div className="cadastro-cards">
        {filtrados.map((p, idx) => (
          <motion.div
            key={p.id}
            className="cadastro-card-v2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
          >
            <span className="cadastro-icon">
              <Store size={22} strokeWidth={1.5} />
            </span>
            <div className="cadastro-body">
              <p className="cadastro-title">
                {p.nome ? `${p.nome}${p.nome_loja ? ` — ${p.nome_loja}` : ''}` : 'Cadastro sem nome informado'}
              </p>
              <div className="cadastro-meta-row">
                <div className="meta-item">
                  <CreditCard size={14} strokeWidth={1.75} />
                  <div>
                    <span className="meta-label">CNPJ/CPF</span>
                    <span className="meta-value">{p.cnpj_cpf || 'Não informado'}</span>
                  </div>
                </div>
                <div className="meta-item">
                  <Phone size={14} strokeWidth={1.75} />
                  <div>
                    <span className="meta-label">WhatsApp</span>
                    <span className="meta-value">{p.whatsapp || 'Não informado'}</span>
                  </div>
                </div>
                <div className="meta-item">
                  <Calendar size={14} strokeWidth={1.75} />
                  <div>
                    <span className="meta-label">Cadastrada em</span>
                    <span className="meta-value">{new Date(p.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            </div>
            <span className={`pill pill-${STATUS_PILL_VARIANT[p.status_cadastro]}`}>
              <span className="pill-dot" />
              {STATUS_LABEL[p.status_cadastro]}
            </span>
            {p.status_cadastro === 'pending' && (
              <div className="cadastro-actions-v2">
                <MotionButton variant="gold" disabled={processando === p.id} onClick={() => aprovar(p)}>
                  Aprovar
                </MotionButton>
                <MotionButton variant="danger" disabled={processando === p.id} onClick={() => recusar(p)}>
                  Recusar
                </MotionButton>
              </div>
            )}
          </motion.div>
        ))}
        {filtrados.length === 0 && (
          <div className="content-card">
            <p className="hint">Nenhum cadastro encontrado.</p>
          </div>
        )}
      </div>

      <div className="cadastros-footer-card">
        <FileText size={14} strokeWidth={1.75} />
        Mostrando {filtrados.length} de {porStatus.length} cadastros {STATUS_LABEL_PLURAL[statusFiltro]}
      </div>
    </div>
  );
}
