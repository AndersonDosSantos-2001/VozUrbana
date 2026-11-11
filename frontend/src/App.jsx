import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header } from './components/layout/Header';
import { SidebarMenu } from './components/layout/SidebarMenu';
import { ModalCompletarCpf } from './components/layout/ModalCompletarCpf';
import { LoginCadastro } from './pages/LoginCadastro';
import { HomeFeed } from './pages/HomeFeed';
import { NovaDenuncia } from './pages/NovaDenuncia';
import { MinhasDenuncias } from './pages/MinhasDenuncias';
import { PainelGrafico } from './pages/PainelGrafico';
import { PainelGabinete } from './pages/PainelGabinete';
import { DespachoGabinete } from './pages/DespachoGabinete';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function AppShell() {
  const [menuAberto, setMenuAberto] = useState(false);
  const { modalCpfAberto, fecharModalCpf } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-superficie-fundo flex flex-col relative shadow-2xl overflow-x-hidden">
        <Header aoAbrirMenu={() => setMenuAberto(true)} />

        <SidebarMenu
          aberto={menuAberto}
          aoFechar={() => setMenuAberto(false)}
        />

        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<HomeFeed />} />
            <Route path="/login" element={<LoginCadastro />} />
            <Route path="/nova-denuncia" element={<NovaDenuncia />} />
            <Route path="/minhas-denuncias" element={<MinhasDenuncias />} />
            <Route path="/graficos" element={<PainelGrafico />} />
            <Route path="/gabinete/triagem" element={<PainelGabinete />} />
            <Route path="/gabinete/denuncias/:id" element={<DespachoGabinete />} />
            <Route path="*" element={<HomeFeed />} />
          </Routes>
        </main>

        <ModalCompletarCpf
          aberto={modalCpfAberto}
          aoFechar={fecharModalCpf}
        />
      </div>
    </div>
  );
}

export function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
