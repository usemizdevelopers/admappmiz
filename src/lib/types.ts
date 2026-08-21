export type PontoEvento = {
  id: string;
  profile_id: string;
  tipo_acao: string;
  pontos: number;
  referencia_id: string | null;
  data_evento: string;
  periodo: string;
  created_at: string;
};

export type Colecao = {
  id: string;
  nome: string;
  tipo: 'essenciais' | 'colecoes' | 'novidades' | 'mais_vendidos';
  ativa: boolean;
  tone: string | null;
  imagem_url: string | null;
  created_at: string;
};

export type Peca = {
  id: string;
  nome: string;
  codigo_referencia: string | null;
  colecao_id: string | null;
  categoria: string | null;
  composicao: string | null;
  diferenciais: string | null;
  como_vender: string | null;
  esgotado: boolean;
  ativa: boolean;
  tone: string | null;
  created_at: string;
};

export type PecaImagem = {
  id: string;
  peca_id: string;
  url: string;
  ordem: number;
  created_at: string;
};

export type PecaCor = {
  id: string;
  peca_id: string;
  valor: string;
  nome: string | null;
  ordem: number;
};

export type PecaTamanho = {
  id: string;
  peca_id: string;
  valor: string;
  ordem: number;
};

export type CnpjReconhecido = {
  id: string;
  cnpj_cpf: string;
  nome_loja: string | null;
  created_at: string;
};

export type ClienteIndicada = {
  id: string;
  profile_id: string;
  nome: string;
  contato: string | null;
  indicado_em: string;
};

export type Curso = {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: 'vendas' | 'produtos' | 'gestao' | 'marketing' | null;
  thumbnail_url: string | null;
  duracao_min: number | null;
  is_novo: boolean;
  ativo: boolean;
  tone: string | null;
  created_at: string;
};

export type CursoModulo = {
  id: string;
  curso_id: string;
  titulo: string;
  tipo: 'video' | 'pdf';
  url_conteudo: string | null;
  ordem: number;
  created_at: string;
};

export type RecursoMaterial = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo_area: 'comercial' | 'marketing';
  tipo_arquivo: 'pdf' | 'zip' | 'imagem' | 'video';
  tamanho_legivel: string | null;
  url_arquivo: string | null;
  peca_relacionada_id: string | null;
  ativo: boolean;
  tone: string | null;
  capa_url: string | null;
  created_at: string;
};

export type CompraRegistrada = {
  id: string;
  profile_id: string;
  valor_reais: number;
  data_compra: string;
  lancado_por: string;
  created_at: string;
};

export type Profile = {
  id: string;
  nome: string | null;
  nome_loja: string | null;
  cnpj_cpf: string | null;
  whatsapp: string | null;
  status_cadastro: 'pending' | 'approved' | 'rejected';
  aprovado_em: string | null;
  aprovado_por: string | null;
  aprovacao_automatica: boolean;
  role: 'parceira' | 'admin';
  created_at: string;
  instagram: string | null;
  endereco_rua: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
};
