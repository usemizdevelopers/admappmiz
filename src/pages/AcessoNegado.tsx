import { useAuth } from '../contexts/AuthContext';

export function AcessoNegado() {
  const { profile, signOut } = useAuth();

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Acesso negado</h1>
        <p>
          Esta conta{profile?.nome ? ` (${profile.nome})` : ''} não tem permissão de
          administrador. O Painel Admin MIZ é restrito à equipe interna.
        </p>
        <p className="auth-subtitle">
          Se você acredita que deveria ter acesso, fale com quem administra o sistema.
        </p>
        <button type="button" onClick={() => signOut()}>
          Sair
        </button>
      </div>
    </div>
  );
}
