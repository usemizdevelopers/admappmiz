import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, FileText, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadToPrivateBucket, removeFromPrivateBucket } from '../../lib/privateStorage';
import { useSignedUrl } from '../../lib/useSignedUrl';
import { MotionButton } from '../../components/MotionButton';
import { SectionHeading } from '../../components/SectionHeading';
import { Dropzone } from '../../components/Dropzone';
import { Toggle } from '../../components/Toggle';
import type { Peca, RecursoMaterial } from '../../lib/types';

const TIPOS_AREA: RecursoMaterial['tipo_area'][] = ['comercial', 'marketing'];
const TIPOS_ARQUIVO: RecursoMaterial['tipo_arquivo'][] = ['pdf', 'zip', 'imagem', 'video'];

export function RecursoMaterialForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipoArea, setTipoArea] = useState<RecursoMaterial['tipo_area']>('comercial');
  const [tipoArquivo, setTipoArquivo] = useState<RecursoMaterial['tipo_arquivo']>('pdf');
  const [tamanhoLegivel, setTamanhoLegivel] = useState('');
  const [urlArquivo, setUrlArquivo] = useState<string | null>(null);
  const [vimeoInput, setVimeoInput] = useState('');
  const [pecaRelacionadaId, setPecaRelacionadaId] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [capaUrl, setCapaUrl] = useState<string | null>(null);

  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingArquivo, setUploadingArquivo] = useState(false);
  const [uploadingCapa, setUploadingCapa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const arquivoSignedUrl = useSignedUrl('materiais', tipoArquivo !== 'video' ? urlArquivo : null);
  const capaSignedUrl = useSignedUrl('materiais', capaUrl);

  useEffect(() => {
    supabase
      .from('pecas')
      .select('*')
      .order('nome')
      .then(({ data }) => setPecas(data ?? []));
  }, []);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('recursos_materiais')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setTitulo(data.titulo);
          setDescricao(data.descricao ?? '');
          setTipoArea(data.tipo_area);
          setTipoArquivo(data.tipo_arquivo);
          setTamanhoLegivel(data.tamanho_legivel ?? '');
          setUrlArquivo(data.url_arquivo);
          if (data.tipo_arquivo === 'video') setVimeoInput(data.url_arquivo ?? '');
          setPecaRelacionadaId(data.peca_relacionada_id ?? '');
          setAtivo(data.ativo);
          setCapaUrl(data.capa_url);
        }
        setLoading(false);
      });
  }, [id]);

  async function handleArquivoFiles(files: File[]) {
    const file = files[0];
    if (!file || !id) return;
    setUploadingArquivo(true);
    try {
      if (urlArquivo) await removeFromPrivateBucket('materiais', urlArquivo);
      const path = await uploadToPrivateBucket('materiais', file, id);
      await supabase.from('recursos_materiais').update({ url_arquivo: path }).eq('id', id);
      setUrlArquivo(path);
    } catch (err) {
      alert('Erro ao enviar arquivo: ' + (err as Error).message);
    } finally {
      setUploadingArquivo(false);
    }
  }

  async function handleCapaFiles(files: File[]) {
    const file = files[0];
    if (!file || !id) return;
    setUploadingCapa(true);
    try {
      if (capaUrl) await removeFromPrivateBucket('materiais', capaUrl);
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = await uploadToPrivateBucket('materiais', file, id, `capa.${ext}`);
      await supabase.from('recursos_materiais').update({ capa_url: path }).eq('id', id);
      setCapaUrl(path);
    } catch (err) {
      alert('Erro ao enviar capa: ' + (err as Error).message);
    } finally {
      setUploadingCapa(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      titulo,
      descricao: descricao || null,
      tipo_area: tipoArea,
      tipo_arquivo: tipoArquivo,
      tamanho_legivel: tamanhoLegivel || null,
      peca_relacionada_id: pecaRelacionadaId || null,
      ativo,
      ...(tipoArquivo === 'video' ? { url_arquivo: vimeoInput || null } : {}),
    };

    if (isEdit) {
      const { error } = await supabase.from('recursos_materiais').update(payload).eq('id', id);
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      navigate('/materiais');
    } else {
      const { data, error } = await supabase.from('recursos_materiais').insert(payload).select().single();
      setSaving(false);
      if (error) {
        setError(error.message);
        return;
      }
      navigate(`/materiais/${data.id}`, { replace: true });
    }
  }

  if (loading) return <p>Carregando...</p>;

  const acceptArquivo =
    tipoArquivo === 'pdf' ? 'application/pdf' : tipoArquivo === 'imagem' ? 'image/*' : '.zip';

  return (
    <div>
      <div className="page-header page-header-with-subtitle">
        <div>
          <h2>{isEdit ? 'Editar material' : 'Novo material'}</h2>
          <p className="page-subtitle">
            {isEdit
              ? 'Atualize as informações do material e gerencie os arquivos vinculados.'
              : 'Preencha os dados do novo material.'}
          </p>
        </div>
        <Link to="/materiais" className="back-link accent-violet">
          <ArrowLeft size={14} strokeWidth={1.75} />
          Voltar
        </Link>
      </div>

      <div className="peca-form-layout">
        <div className="section-card">
          <SectionHeading icon={FileText} title="Informações do material" />
          <form className="entity-form" onSubmit={handleSubmit}>
            <label htmlFor="material-titulo">Título</label>
            <input id="material-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />

            <label htmlFor="material-descricao">Descrição</label>
            <textarea
              id="material-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
            />

            <div className="field-row">
              <div>
                <label htmlFor="material-area">Área</label>
                <select
                  id="material-area"
                  value={tipoArea}
                  onChange={(e) => setTipoArea(e.target.value as RecursoMaterial['tipo_area'])}
                >
                  {TIPOS_AREA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="material-tipo">Tipo de arquivo</label>
                <select
                  id="material-tipo"
                  value={tipoArquivo}
                  onChange={(e) => setTipoArquivo(e.target.value as RecursoMaterial['tipo_arquivo'])}
                >
                  {TIPOS_ARQUIVO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label htmlFor="material-tamanho">Tamanho (texto livre, ex: "12,4 MB")</label>
            <input id="material-tamanho" value={tamanhoLegivel} onChange={(e) => setTamanhoLegivel(e.target.value)} />

            <label htmlFor="material-peca">Peça relacionada (opcional)</label>
            <select id="material-peca" value={pecaRelacionadaId} onChange={(e) => setPecaRelacionadaId(e.target.value)}>
              <option value="">— nenhuma —</option>
              {pecas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>

            <div className="toggle-field-wrap">
              <Toggle id="material-ativo" label="Ativo" checked={ativo} onChange={setAtivo} />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <MotionButton type="submit" variant="gold" disabled={saving}>
              <Save size={15} strokeWidth={1.75} />
              {saving ? 'Salvando...' : 'Salvar'}
            </MotionButton>
          </form>
        </div>

        <div className="peca-form-right">
          <div className="section-card">
            <SectionHeading
              icon={FolderOpen}
              title="Arquivos"
              subtitle="Faça upload dos arquivos do material e da imagem de capa."
            />

            {tipoArquivo === 'video' ? (
              <>
                <label htmlFor="material-vimeo">ID ou URL de embed do Vimeo</label>
                <input
                  id="material-vimeo"
                  value={vimeoInput}
                  onChange={(e) => setVimeoInput(e.target.value)}
                  placeholder="ex: 1234567890"
                />
              </>
            ) : isEdit && id ? (
              <>
                <label>Arquivo ({tipoArquivo})</label>
                <Dropzone
                  accept={acceptArquivo}
                  uploading={uploadingArquivo}
                  onFiles={handleArquivoFiles}
                  iconBadge
                  label="Arraste e solte o arquivo aqui"
                  actionLabel="Escolher arquivo"
                />
                <div className="file-status-row">
                  <FileText size={16} strokeWidth={1.75} />
                  {arquivoSignedUrl ? (
                    <a href={arquivoSignedUrl} target="_blank" rel="noreferrer">
                      Ver arquivo atual
                    </a>
                  ) : (
                    'Nenhum arquivo escolhido'
                  )}
                </div>
              </>
            ) : (
              <p className="hint">Salve o material primeiro para anexar o arquivo.</p>
            )}

            {isEdit && id && (
              <>
                <label className="label-spaced">Imagem de capa (opcional)</label>
                <div className="upload-with-preview">
                  <Dropzone
                    accept="image/*"
                    uploading={uploadingCapa}
                    onFiles={handleCapaFiles}
                    iconBadge
                    imageIcon
                    label="Arraste e solte a imagem aqui"
                    actionLabel="Escolher arquivo"
                  />
                  <div className="preview-col">
                    <p className="preview-label">Pré-visualização</p>
                    <div className="preview-box">
                      {capaSignedUrl ? (
                        <img src={capaSignedUrl} alt="Capa" />
                      ) : (
                        <>
                          <ImageIcon size={22} strokeWidth={1.5} />
                          <span>Nenhuma imagem selecionada</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="file-status-row">
                  <FileText size={16} strokeWidth={1.75} />
                  {capaSignedUrl ? (
                    <a href={capaSignedUrl} target="_blank" rel="noreferrer">
                      Ver capa atual
                    </a>
                  ) : (
                    'Nenhum arquivo escolhido'
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
