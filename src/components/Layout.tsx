import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { BookMarked, LogOut, Shirt, ShoppingBag, UserCheck, ShieldCheck, BookOpen, FileText, Star, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { MotionButton } from './MotionButton';

const NAV_ITEMS = [
  { to: '/pecas', label: 'Peças', icon: Shirt },
  { to: '/colecoes', label: 'Coleções', icon: ShoppingBag },
  { to: '/cadastros', label: 'Cadastros', icon: UserCheck },
  { to: '/cnpjs', label: 'CNPJs reconhecidos', icon: ShieldCheck },
  { to: '/cursos', label: 'Cursos', icon: BookOpen },
  { to: '/materiais', label: 'Materiais', icon: FileText },
  { to: '/indicacoes', label: 'Indicações', icon: Star },
  { to: '/gamificacao', label: 'Gamificação', icon: Trophy },
];

export function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="dashboard-header">
        <div className="brand-wordmark">
          <span className="brand-logo">MjZ</span>
          <h1>Painel Admin MIZ</h1>
        </div>
        <div>
          <span className="session-pill">
            <BookMarked size={14} strokeWidth={1.75} />
            {profile?.nome ?? profile?.id}
          </span>
          <MotionButton className="btn-outline-neutral" onClick={() => signOut()}>
            <LogOut size={15} strokeWidth={1.75} />
            Sair
          </MotionButton>
        </div>
      </header>
      <nav className="app-nav">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
      <main className="app-main">{children}</main>
    </div>
  );
}
