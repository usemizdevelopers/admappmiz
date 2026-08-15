import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import type { ClienteIndicada, Profile } from '../../lib/types';

type IndicacaoComLojista = ClienteIndicada & { profiles: { nome: string | null; nome_loja: string | null } | null };

export function IndicacoesList() {
  const [indicacoes, setIndicacoes] = useState<IndicacaoComLojista[]>([]);
  const [lojistas, setLojistas] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileId, setProfileId] = useState('');
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes_indicadas')
      .select('*, profiles(nome, nome_loja)')
      .order('indicado_em', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setIndicacoes(data as IndicacaoComLojista[]);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'parceira')
      .eq('status_cadastro', 'approved')
      .order('nome_loja')
      .then(({ data }) => setLojistas(data ?? []));
  }, []);

  async function criar(e: FormEvent) {
    e.preventDefault();
    if (!profileId || !nome.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('clientes_indicadas')
      .insert({ profile_id: profileId, nome: nome.trim(), contato: contato.trim() || null });
    setSaving(false);
    if (error) {
      alert('Erro ao criar indicação: ' + error.message);
      return;
    }
    setNome('');
    setContato('');
    load();
  }

  async function remover(indicacao: ClienteIndicada) {
    if (!confirm(`Remover a indicação de "${indicacao.nome}"?`)) return;
    const { error } = await supabase.from('clientes_indicadas').delete().eq('id', indicacao.id);
    if (error) {
      alert('Erro ao remover: ' + error.message);
      return;
    }
    load();
  }

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="auth-error">Erro: {error}</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Indicação de Clientes</h2>
      </div>

      <form className="entity-form" onSubmit={criar}>
        <label>Lojista</label>
        <select value={profileId} onChange={(e) => setProfileId(e.target.value)} required>
          <option value="">— selecione —</option>
          {lojistas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome_loja ?? l.nome ?? l.id}
            </option>
          ))}
        </select>

        <label>Nome da cliente</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} required />

        <label>Contato</label>
        <input value={contato} onChange={(e) => setContato(e.target.value)} placeholder="telefone, WhatsApp, etc." />

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Criar indicação'}
        </button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contato</th>
            <th>Lojista</th>
            <th>Data</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {indicacoes.map((i) => (
            <tr key={i.id}>
              <td>{i.nome}</td>
              <td>{i.contato ?? '—'}</td>
              <td>{i.profiles?.nome_loja ?? i.profiles?.nome ?? '—'}</td>
              <td>{new Date(i.indicado_em).toLocaleDateString('pt-BR')}</td>
              <td>
                <button type="button" className="btn-danger" onClick={() => remover(i)}>
                  Remover
                </button>
              </td>
            </tr>
          ))}
          {indicacoes.length === 0 && (
            <tr>
              <td colSpan={5}>Nenhuma indicação cadastrada.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
