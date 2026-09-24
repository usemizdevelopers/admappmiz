import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type Profile = {
  id: string;
  nome: string | null;
  nome_loja: string | null;
  role: string;
  status_cadastro: string;
};

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // true assim que já temos um perfil carregado pra sessão atual — usado pra
  // diferenciar "acabou de logar" (precisa do loading gate) de "Supabase só
  // revalidando o token em segundo plano" (não precisa, e não pode: mostrar o
  // gate de novo remontaria a tela inteira e perderia formulários em edição).
  const profileCarregadoRef = useRef(false);

  async function loadProfile(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome, nome_loja, role, status_cadastro')
      .eq('id', userId)
      .single();

    if (error) return false;
    setProfile(data);
    return true;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        profileCarregadoRef.current = await loadProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (!session?.user) {
        setProfile(null);
        profileCarregadoRef.current = false;
        return;
      }

      if (profileCarregadoRef.current) {
        // Já tínhamos perfil pra essa sessão — isso é só revalidação de
        // bastidor (ex: TOKEN_REFRESHED ao voltar pra aba). Atualiza o
        // perfil sem tocar em "loading", pra não remontar a tela inteira.
        // Se a busca falhar aqui, mantém o perfil anterior em vez de
        // derrubar um admin já logado por causa de um erro de rede passageiro.
        await loadProfile(session.user.id);
        return;
      }

      // Primeira vez recebendo essa sessão (login de verdade) — aqui sim
      // precisa do gate, senão o Gate roteia pra /acesso-negado por um
      // instante antes do perfil (e o role=admin) chegar.
      setLoading(true);
      profileCarregadoRef.current = await loadProfile(session.user.id);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ session, profile, loading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook colocated with its provider
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>');
  }
  return ctx;
}
