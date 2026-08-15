import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, Box, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MotionButton } from '../../components/MotionButton';
import { FormField } from '../../components/FormField';
import { Checkbox } from '../../components/Checkbox';
import { SectionCard } from '../../components/SectionCard';
import { StatusPill } from '../../components/StatusPill';
import type { Colecao } from '../../lib/types';
import { PecaImagensSection } from './PecaImagensSection';
import { PecaCoresSection } from './PecaCoresSection';
import { PecaTamanhosSection } from './PecaTamanhosSection';

const TONE_OPCOES = ['surfaceAlt', 'dark', 'rose', 'brand'];

export function PecaForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [codigoReferencia, setCodigoReferencia] = useState('');
  const [colecaoId, setColecaoId] = useState('');
  const [categoria, setCategoria] = useState('');
  const [composicao, setComposicao] = useState('');
  const [diferenciais, setDiferenciais] = useState('');
  const [comoVender, setComoVender] = useState('');
  const [esgotado, setEsgotado] = useState(false);
  const [ativa, setAtiva] = useState(true);
  const [tone, setTone] = useState('');

  const [colecoes, setColecoes] = useState<Colecao[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('colecoes')
      .select('*')
      .order('nome')
      .then(({ data }) => setColecoes(data ?? []));
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('pecas')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setNome(data.nome);
          setCodigoReferencia(data.codigo_referencia ?? '');
          setColecaoId(data.colecao_id ?? '');
          setCategoria(data.categoria ?? '');
          setComposicao(data.composicao ?? '');
          setDiferenciais(data.diferenciais ?? '');
          setComoVender(data.como_vender ?? '');
          setEsgotado(data.esgotado);
          setAtiva(data.ativa);
          setTone(data.tone ?? '');
        }
        setLoading(false);
      });
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      nome,
      codigo_referencia: codigoReferencia,
      colecao_id: colecaoId || null,
      categoria: categoria || null,
      composicao: composicao || null,
      diferenciais: diferenciais || null,
      como_vender: comoVender || null,
      esgotado,
      ativa,
      tone,
    };

    if (isEdit) {
      const { error } = await supabase.from('pecas').update(payload).eq('id', id);
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      navigate('/pecas');
    } else {
      const { data, error } = await supabase.from('pecas').insert(payload).select().single();
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      navigate(`/pecas/${data.id}`, { replace: true });
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>{isEdit ? 'Editar peça' : 'Nova peça'}</h2>
        <Link to="/pecas" className="back-link">
          <ArrowLeft size={14} strokeWidth={1.75} />
          Voltar
        </Link>
      </div>

      <div className="peca-form-layout">
        <div className="section-card">
          <form className="entity-form form-grid" onSubmit={handleSubmit}>
            <FormField label="Nome" htmlFor="peca-nome" required>
              <input id="peca-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </FormField>

            <FormField label="Código de referência" htmlFor="peca-codigo" required>
              <input
                id="peca-codigo"
                value={codigoReferencia}
                onChange={(e) => setCodigoReferencia(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Coleção" htmlFor="peca-colecao">
              <select id="peca-colecao" value={colecaoId} onChange={(e) => setColecaoId(e.target.value)}>
                <option value="">— nenhuma —</option>
                {colecoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Categoria" htmlFor="peca-categoria">
              <input
                id="peca-categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="ex: blusas, calças"
              />
            </FormField>

            <FormField label="Composição" htmlFor="peca-composicao" span="full">
              <textarea id="peca-composicao" value={composicao} onChange={(e) => setComposicao(e.target.value)} rows={2} />
            </FormField>

            <FormField label="Diferenciais" htmlFor="peca-diferenciais" span="full">
              <textarea
                id="peca-diferenciais"
                value={diferenciais}
                onChange={(e) => setDiferenciais(e.target.value)}
                rows={2}
              />
            </FormField>

            <FormField label="Como vender" htmlFor="peca-como-vender" span="full">
              <textarea
                id="peca-como-vender"
                value={comoVender}
                onChange={(e) => setComoVender(e.target.value)}
                rows={2}
              />
            </FormField>

            <div className="form-field span-full checkbox-row">
              <Checkbox
                id="peca-esgotado"
                label="Esgotado"
                checked={esgotado}
                onChange={(e) => setEsgotado(e.target.checked)}
              />
              <Checkbox id="peca-ativa" label="Ativa" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
            </div>

            <FormField
              label="Tone (token visual usado no app mobile — efeito exato ainda não confirmado, escolha conscientemente)"
              htmlFor="peca-tone"
              required
              span="full"
            >
              <select id="peca-tone" value={tone} onChange={(e) => setTone(e.target.value)} required>
                <option value="" disabled>
                  — selecione —
                </option>
                {TONE_OPCOES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormField>

            {error && (
              <div className="form-field span-full">
                <p className="auth-error">{error}</p>
              </div>
            )}

            <div className="form-field span-full form-actions">
              <MotionButton type="submit" variant="primary" disabled={saving}>
                <Save size={15} strokeWidth={1.75} />
                {saving ? 'Salvando...' : 'Salvar'}
              </MotionButton>
            </div>
          </form>
        </div>

        {isEdit && id ? (
          <div className="peca-form-right">
            <SectionCard title="Imagens">
              <PecaImagensSection pecaId={id} />
            </SectionCard>
            <SectionCard title="Cores">
              <PecaCoresSection pecaId={id} />
            </SectionCard>
            <SectionCard title="Tamanhos">
              <PecaTamanhosSection pecaId={id} />
            </SectionCard>
            <SectionCard title="Status da peça">
              <div className="status-card-row">
                <StatusPill variant={ativa ? 'positive' : 'neutral'} dot>
                  {ativa ? 'Ativa' : 'Inativa'}
                </StatusPill>
                <span className="info-badge">
                  {esgotado ? <AlertCircle size={14} strokeWidth={1.75} /> : <Box size={14} strokeWidth={1.75} />}
                  {esgotado ? 'Esgotado' : 'Estoque disponível'}
                </span>
              </div>
            </SectionCard>
          </div>
        ) : (
          <div className="peca-form-right">
            <SectionCard title="Imagens, cores e tamanhos">
              <p className="hint">Salve a peça primeiro para adicionar imagens, cores e tamanhos.</p>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
