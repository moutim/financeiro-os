import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermosPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 32 }}>
        <ArrowLeft size={20} />
        Voltar
      </Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>Termos de Serviço</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
        
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>1. Aceitação dos Termos</h2>
          <p>Ao acessar e utilizar o Financeiro OS, você concorda em cumprir e ficar vinculado a estes Termos de Serviço e à nossa Política de Privacidade. Se você não concorda com alguma parte destes termos, não deverá usar o serviço.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>2. Descrição do Serviço</h2>
          <p>O Financeiro OS é uma interface web que facilita a visualização e gestão de finanças pessoais conectada a uma planilha do Google Sheets. O serviço não atua como banco, instituição financeira ou consultor de investimentos.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>3. Responsabilidades do Usuário</h2>
          <p>O usuário é responsável por:</p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li>Manter a segurança da sua própria conta do Google.</li>
            <li>Garantir a precisão dos dados inseridos.</li>
            <li>Não utilizar a plataforma para atividades ilícitas ou fraudulentas.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>4. Disponibilidade e Limitação de Responsabilidade</h2>
          <p>O serviço é fornecido "no estado em que se encontra", sem garantias de qualquer tipo. O Financeiro OS depende das APIs do Google, portanto, eventuais interrupções nos serviços do Google podem afetar o funcionamento da plataforma.</p>
          <p>Nós não nos responsabilizamos por perdas financeiras, perda de dados na sua planilha ou qualquer dano direto ou indireto resultante do uso do serviço.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>5. Modificações no Serviço e nos Termos</h2>
          <p>Reservamo-nos o direito de modificar ou descontinuar o serviço a qualquer momento. Também podemos atualizar estes termos periodicamente. O uso contínuo da plataforma após as alterações constitui aceitação dos novos termos.</p>
        </section>
      </div>
    </div>
  );
}
