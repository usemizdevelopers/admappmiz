import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import type { CnpjReconhecido } from '../../lib/types';

export function CnpjsList() {
  const [cnpjs, setCnpjs] = useState<CnpjReconhecido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [novoCnpj, setNovoCnpj] = useState('');
  const [novoNomeLoja, setNovoNomeLoja] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('cnpjs_reconhecidos').select('*').order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setCnpjs(data);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!novoCnpj.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('cnpjs_reconhecidos')
      .insert({ cnpj_cpf: novoCnpj.trim(), nome_loja: novoNomeLoja.trim() || null });
    setSaving(false);
    if (error) {
      alert('Erro ao adicionar: ' + error.message);
      return;
    }
    setNovoCnpj('');
    setNovoNomeLoja('');
    load();
  }

  async function remover(c: CnpjReconhecido) {
    if (!confirm(`Remover "${c.cnpj_cpf}" da lista de CNPJs reconhecidos? Novos cadastros com esse documento deixarão de ser aprovados automaticamente.`))
      return;
    const { error } = await supabase.from('cnpjs_reconhecidos').delete().eq('id', c.id);
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
        <h2>CNPJs reconhecidos</h2>
      </div>
      <p className="hint">
        Lojistas que se cadastrarem com um destes CNPJs/CPFs recebem aprovação imediata, sem passar pela fila de
        Aprovação de Cadastro.
      </p>

      <form className="inline-form cnpjs-form" onSubmit={adicionar}>
        <input placeholder="CNPJ ou CPF" value={novoCnpj} onChange={(e) => setNovoCnpj(e.target.value)} required />
        <input
          placeholder="Nome da loja (opcional)"
          value={novoNomeLoja}
          onChange={(e) => setNovoNomeLoja(e.target.value)}
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Adicionando...' : 'Adicionar'}
        </button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>CNPJ/CPF</th>
            <th>Nome da loja</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {cnpjs.map((c) => (
            <tr key={c.id}>
              <td>{c.cnpj_cpf}</td>
              <td>{c.nome_loja ?? '—'}</td>
              <td>
                <button type="button" className="btn-danger" onClick={() => remover(c)}>
                  Remover
                </button>
              </td>
            </tr>
          ))}
          {cnpjs.length === 0 && (
            <tr>
              <td colSpan={3}>Nenhum CNPJ reconhecido cadastrado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
