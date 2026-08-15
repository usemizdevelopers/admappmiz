import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, Info, Images, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadToPecasBucket } from '../../lib/storage';
import { MotionButton } from '../../components/MotionButton';
import { Checkbox } from '../../components/Checkbox';
import { SectionHeading } from '../../components/SectionHeading';
import { Dropzone } from '../../components/Dropzone';
import type { Colecao } from '../../lib/types';

const TIPOS: Colecao['tipo'][] = ['essenciais', 'colecoes', 'novidades', 'mais_vendidos'];

export function ColecaoForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<Colecao['tipo']>('colecoes');
  const [ativa, setAtiva] = useState(true);
  const [tone, setTone] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('colecoes')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setNome(data.nome);
          setTipo(data.tipo);
          setAtiva(data.ativa);
          setTone(data.tone ?? '');
          setImagemUrl(data.imagem_url ?? '');
        }
        setLoading(false);
      });
  }, [id]);

  async function handleImageFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const folder = id ? `colecoes/${id}` : `colecoes/_novas`;
      const url = await uploadToPecasBucket(file, folder);
      setImagemUrl(url);
    } catch (err) {
      alert('Erro ao enviar imagem: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { nome, tipo, ativa, tone, imagem_url: imagemUrl || null };

    const result = isEdit
      ? await supabase.from('colecoes').update(payload).eq('id', id)
      : await supabase.from('colecoes').insert(payload);

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    navigate('/colecoes');
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <div className="page-header page-header-with-subtitle">
        <div>
          <h2>{isEdit ? 'Editar coleção' : 'Nova coleção'}</h2>
          <p className="page-subtitle">
            {isEdit
              ? 'Atualize as informações da coleção e gerencie sua imagem de capa.'
              : 'Preencha os dados da nova coleção.'}
          </p>
        </div>
        <Link to="/colecoes" className="back-link">
          <ArrowLeft size={14} strokeWidth={1.75} />
          Voltar
        </Link>
      </div>

      <div className="section-card">
        <div className="split-columns">
          <div>
            <SectionHeading icon={Info} title="Informações da coleção" />
            <form className="entity-form" onSubmit={handleSubmit}>
              <label htmlFor="colecao-nome">Nome</label>
              <input id="colecao-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />

              <label htmlFor="colecao-tipo">Tipo</label>
              <select id="colecao-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as Colecao['tipo'])}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <Checkbox
                id="colecao-ativa"
                label="Ativa"
                checked={ativa}
                onChange={(e) => setAtiva(e.target.checked)}
              />

              <label htmlFor="colecao-tone">
                Tone (token visual usado no app mobile — obrigatório no banco; valores já em uso: surfaceAlt, dark,
                rose, brand)
              </label>
              <input
                id="colecao-tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="ex: surfaceAlt"
                required
              />

              {error && <p className="auth-error">{error}</p>}

              <MotionButton type="submit" variant="primary" disabled={saving}>
                <Save size={15} strokeWidth={1.75} />
                {saving ? 'Salvando...' : 'Salvar'}
              </MotionButton>
            </form>
          </div>

          <div>
            <SectionHeading icon={Images} title="Imagem de capa" />
            {imagemUrl && <img src={imagemUrl} alt="Capa" className="cover-preview" />}
            <Dropzone
              accept="image/*"
              uploading={uploading}
              onFiles={handleImageFiles}
              label="Arraste uma imagem aqui ou clique para escolher"
              hint="PNG ou JPG • recomendação de capa"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden-file-input"
              onChange={(e) => handleImageFiles(Array.from(e.target.files ?? []))}
            />
            <MotionButton variant="outline-neutral" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} strokeWidth={1.75} />
              Escolher arquivo
            </MotionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
