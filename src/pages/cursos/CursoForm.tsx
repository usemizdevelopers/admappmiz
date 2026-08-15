import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, Info, Box } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadToPrivateBucket, removeFromPrivateBucket } from '../../lib/privateStorage';
import { useSignedUrl } from '../../lib/useSignedUrl';
import { MotionButton } from '../../components/MotionButton';
import { Checkbox } from '../../components/Checkbox';
import { SectionHeading } from '../../components/SectionHeading';
import { Dropzone } from '../../components/Dropzone';
import type { Curso } from '../../lib/types';
import { CursoModulosSection } from './CursoModulosSection';

const CATEGORIAS: NonNullable<Curso['categoria']>[] = ['vendas', 'produtos', 'gestao', 'marketing'];

export function CursoForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<Curso['categoria']>('vendas');
  const [duracaoMin, setDuracaoMin] = useState('');
  const [isNovo, setIsNovo] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const thumbSignedUrl = useSignedUrl('academia', thumbnailUrl);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('cursos')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setTitulo(data.titulo);
          setDescricao(data.descricao ?? '');
          setCategoria(data.categoria);
          setDuracaoMin(data.duracao_min?.toString() ?? '');
          setIsNovo(data.is_novo);
          setAtivo(data.ativo);
          setThumbnailUrl(data.thumbnail_url);
        }
        setLoading(false);
      });
  }, [id]);

  async function handleThumbUpload(files: File[]) {
    const file = files[0];
    if (!file || !id) return;
    setUploadingThumb(true);
    try {
      if (thumbnailUrl) await removeFromPrivateBucket('academia', thumbnailUrl);
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = await uploadToPrivateBucket('academia', file, id, `capa.${ext}`);
      await supabase.from('cursos').update({ thumbnail_url: path }).eq('id', id);
      setThumbnailUrl(path);
    } catch (err) {
      alert('Erro ao enviar capa: ' + (err as Error).message);
    } finally {
      setUploadingThumb(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      titulo,
      descricao: descricao || null,
      categoria,
      duracao_min: duracaoMin ? Number(duracaoMin) : null,
      is_novo: isNovo,
      ativo,
    };

    if (isEdit) {
      const { error } = await supabase.from('cursos').update(payload).eq('id', id);
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      navigate('/cursos');
    } else {
      const { data, error } = await supabase.from('cursos').insert(payload).select().single();
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      navigate(`/cursos/${data.id}`, { replace: true });
    }
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <div className="page-header page-header-with-subtitle">
        <div>
          <h2>{isEdit ? 'Editar curso' : 'Novo curso'}</h2>
          <p className="page-subtitle">
            {isEdit ? 'Atualize as informações e os módulos do curso.' : 'Preencha os dados do novo curso.'}
          </p>
        </div>
        <Link to="/cursos" className="back-link">
          <ArrowLeft size={14} strokeWidth={1.75} />
          Voltar
        </Link>
      </div>

      <div className="peca-form-layout">
        <div className="section-card">
          <SectionHeading icon={Info} title="Informações do curso" />
          <form className="entity-form" onSubmit={handleSubmit}>
            <label htmlFor="curso-titulo">Título</label>
            <input id="curso-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />

            <label htmlFor="curso-descricao">Descrição</label>
            <textarea
              id="curso-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
            />

            <div className="field-row">
              <div>
                <label htmlFor="curso-categoria">Categoria</label>
                <select
                  id="curso-categoria"
                  value={categoria ?? ''}
                  onChange={(e) => setCategoria(e.target.value as Curso['categoria'])}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="curso-duracao">Duração (minutos)</label>
                <input
                  id="curso-duracao"
                  type="number"
                  min="0"
                  value={duracaoMin}
                  onChange={(e) => setDuracaoMin(e.target.value)}
                />
              </div>
            </div>

            <div className="field-row">
              <Checkbox
                id="curso-novo"
                label="Marcar como novo"
                checked={isNovo}
                accentColor="var(--gold)"
                onChange={(e) => setIsNovo(e.target.checked)}
              />
              <Checkbox
                id="curso-ativo"
                label="Ativo"
                checked={ativo}
                accentColor="var(--gold)"
                onChange={(e) => setAtivo(e.target.checked)}
              />
            </div>

            {isEdit && id ? (
              <>
                <label>Imagem de capa</label>
                <div className="cover-upload-row">
                  {thumbSignedUrl && <img src={thumbSignedUrl} alt="Capa" className="cover-thumb-preview" />}
                  <Dropzone
                    accept="image/*"
                    uploading={uploadingThumb}
                    onFiles={handleThumbUpload}
                    label="Selecione um arquivo ou arraste e solte aqui"
                    actionLabel="Escolher arquivo"
                  />
                </div>
              </>
            ) : (
              <p className="hint">Salve o curso primeiro para adicionar a capa e os módulos.</p>
            )}

            {error && <p className="auth-error">{error}</p>}

            <MotionButton type="submit" variant="gold" disabled={saving}>
              <Save size={15} strokeWidth={1.75} />
              {saving ? 'Salvando...' : 'Salvar'}
            </MotionButton>
          </form>
        </div>

        {isEdit && id ? (
          <div className="peca-form-right">
            <div className="section-card">
              <SectionHeading icon={Box} title="Módulos" />
              <CursoModulosSection cursoId={id} />
            </div>
          </div>
        ) : (
          <div className="peca-form-right">
            <div className="section-card">
              <SectionHeading icon={Box} title="Módulos" />
              <p className="hint">Salve o curso primeiro para adicionar módulos.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
