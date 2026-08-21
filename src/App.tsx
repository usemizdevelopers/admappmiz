import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { AcessoNegado } from './pages/AcessoNegado';
import { PecasList } from './pages/pecas/PecasList';
import { PecaForm } from './pages/pecas/PecaForm';
import { ColecoesList } from './pages/colecoes/ColecoesList';
import { ColecaoForm } from './pages/colecoes/ColecaoForm';
import { CadastrosList } from './pages/cadastros/CadastrosList';
import { CnpjsList } from './pages/cnpjs/CnpjsList';
import { CursosList } from './pages/cursos/CursosList';
import { CursoForm } from './pages/cursos/CursoForm';
import { RecursosMateriaisList } from './pages/materiais/RecursosMateriaisList';
import { RecursoMaterialForm } from './pages/materiais/RecursoMaterialForm';
import { IndicacoesList } from './pages/indicacoes/IndicacoesList';
import { LancarCompraPage } from './pages/lancarcompra/LancarCompraPage';
import { GamificacaoPage } from './pages/gamificacao/GamificacaoPage';

function AdminArea() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Navigate to="/pecas" replace />} />
        <Route path="pecas" element={<PecasList />} />
        <Route path="pecas/novo" element={<PecaForm />} />
        <Route path="pecas/:id" element={<PecaForm />} />
        <Route path="colecoes" element={<ColecoesList />} />
        <Route path="colecoes/novo" element={<ColecaoForm />} />
        <Route path="colecoes/:id" element={<ColecaoForm />} />
        <Route path="cadastros" element={<CadastrosList />} />
        <Route path="cnpjs" element={<CnpjsList />} />
        <Route path="cursos" element={<CursosList />} />
        <Route path="cursos/novo" element={<CursoForm />} />
        <Route path="cursos/:id" element={<CursoForm />} />
        <Route path="materiais" element={<RecursosMateriaisList />} />
        <Route path="materiais/novo" element={<RecursoMaterialForm />} />
        <Route path="materiais/:id" element={<RecursoMaterialForm />} />
        <Route path="indicacoes" element={<IndicacoesList />} />
        <Route path="lancar-compra" element={<LancarCompraPage />} />
        <Route path="gamificacao" element={<GamificacaoPage />} />
        <Route path="*" element={<Navigate to="/pecas" replace />} />
      </Routes>
    </Layout>
  );
}

function Gate() {
  const { session, profile, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="auth-screen">Carregando...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/acesso-negado"
        element={session && !isAdmin ? <AcessoNegado /> : <Navigate to="/" replace />}
      />
      <Route
        path="/*"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : !profile || !isAdmin ? (
            <Navigate to="/acesso-negado" replace />
          ) : (
            <AdminArea />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
