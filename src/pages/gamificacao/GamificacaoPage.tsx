import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { PontoEvento } from '../../lib/types';

type EventoComLojista = PontoEvento & { profiles: { nome: string | null; nome_loja: string | null } | null };
type LojistaComEventos = { id: string; nome: string };

const LABELS_ACAO: Record<string, string> = {
  abrir_app: 'Abrir o app',
  solicitar_orcamento: 'Solicitar orçamento',
  favoritar_peca: 'Favoritar peça',
  usar_ia: 'Usar IA',
  assistir_25: 'Assistir aula — 25%',
  assistir_50: 'Assistir aula — 50%',
  assistir_90: 'Assistir aula — 90%',
  streak_7_dias: 'Sequência de 7 dias',
};

function labelAcao(tipo: string) {
  return LABELS_ACAO[tipo] ?? tipo;
}

export function GamificacaoPage() {
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState('');
  const [eventosPeriodo, setEventosPeriodo] = useState<EventoComLojista[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(true);

  const [lojistas, setLojistas] = useState<LojistaComEventos[]>([]);
  const [lojistaSelecionada, setLojistaSelecionada] = useState('');
  const [extrato, setExtrato] = useState<PontoEvento[]>([]);
  const [loadingExtrato, setLoadingExtrato] = useState(false);

  useEffect(() => {
    supabase
      .from('pontos_eventos')
      .select('periodo')
      .then(({ data }) => {
        const unicos = [...new Set((data ?? []).map((r) => r.periodo))].sort().reverse();
        setPeriodos(unicos);
        if (unicos.length > 0) setPeriodoSelecionado(unicos[0]);
        else setLoadingRanking(false);
      });

    // Lista quem realmente tem eventos registrados (não filtra por role — histórico de
    // teste pode existir em contas admin, e a lista precisa refletir a realidade do banco).
    supabase
      .from('pontos_eventos')
      .select('profile_id, profiles(nome, nome_loja)')
      .then(({ data }) => {
        const porId = new Map<string, LojistaComEventos>();
        for (const row of (data ?? []) as unknown as EventoComLojista[]) {
          if (!porId.has(row.profile_id)) {
            porId.set(row.profile_id, {
              id: row.profile_id,
              nome: row.profiles?.nome_loja ?? row.profiles?.nome ?? row.profile_id,
            });
          }
        }
        setLojistas([...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome)));
      });
  }, []);

  useEffect(() => {
    if (!periodoSelecionado) return;
    setLoadingRanking(true);
    supabase
      .from('pontos_eventos')
      .select('*, profiles(nome, nome_loja)')
      .eq('periodo', periodoSelecionado)
      .then(({ data }) => {
        setEventosPeriodo((data ?? []) as EventoComLojista[]);
        setLoadingRanking(false);
      });
  }, [periodoSelecionado]);

  useEffect(() => {
    if (!lojistaSelecionada) {
      setExtrato([]);
      return;
    }
    setLoadingExtrato(true);
    supabase
      .from('pontos_eventos')
      .select('*')
      .eq('profile_id', lojistaSelecionada)
      .order('data_evento', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setExtrato(data ?? []);
        setLoadingExtrato(false);
      });
  }, [lojistaSelecionada]);

  const ranking = Object.values(
    eventosPeriodo.reduce<Record<string, { profileId: string; nome: string; pontos: number }>>((acc, ev) => {
      const key = ev.profile_id;
      const nome = ev.profiles?.nome_loja ?? ev.profiles?.nome ?? ev.profile_id;
      if (!acc[key]) acc[key] = { profileId: key, nome, pontos: 0 };
      acc[key].pontos += ev.pontos;
      return acc;
    }, {})
  ).sort((a, b) => b.pontos - a.pontos);

  const totalExtrato = extrato.reduce((sum, e) => sum + e.pontos, 0);

  return (
    <div>
      <div className="page-header">
        <h2>Gamificação (somente leitura)</h2>
      </div>

      <section className="sub-section sub-section-wide">
        <h3>Ranking mensal</h3>
        {periodos.length > 0 && (
          <select value={periodoSelecionado} onChange={(e) => setPeriodoSelecionado(e.target.value)}>
            {periodos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
        {loadingRanking ? (
          <p>Carregando...</p>
        ) : ranking.length === 0 ? (
          <p className="hint">Nenhum ponto registrado neste período.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Lojista</th>
                <th>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, idx) => (
                <tr key={r.profileId}>
                  <td>{idx + 1}</td>
                  <td>{r.nome}</td>
                  <td>{r.pontos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="sub-section sub-section-wide">
        <h3>Extrato por lojista</h3>
        <select value={lojistaSelecionada} onChange={(e) => setLojistaSelecionada(e.target.value)}>
          <option value="">— selecione uma lojista —</option>
          {lojistas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nome}
            </option>
          ))}
        </select>

        {lojistaSelecionada && (
          <>
            {loadingExtrato ? (
              <p>Carregando...</p>
            ) : extrato.length === 0 ? (
              <p className="hint">Nenhum evento de pontos registrado para esta lojista.</p>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ação</th>
                      <th>Pontos</th>
                      <th>Data</th>
                      <th>Período</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extrato.map((e) => (
                      <tr key={e.id}>
                        <td>{labelAcao(e.tipo_acao)}</td>
                        <td>{e.pontos}</td>
                        <td>{new Date(e.data_evento).toLocaleDateString('pt-BR')}</td>
                        <td>{e.periodo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>
                  <strong>Total: {totalExtrato} pontos</strong> ({extrato.length} evento
                  {extrato.length === 1 ? '' : 's'})
                </p>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
