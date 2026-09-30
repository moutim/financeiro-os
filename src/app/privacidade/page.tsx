import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacidadePage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 32 }}>
        <ArrowLeft size={20} />
        Voltar
      </Link>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>Política de Privacidade</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <p><strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
        
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>1. Introdução</h2>
          <p>A privacidade dos seus dados é de extrema importância para o Financeiro OS. Esta política descreve como as informações são tratadas quando você utiliza nossa plataforma.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>2. Dados Coletados</h2>
          <p>O Financeiro OS funciona como uma interface para a sua própria conta do Google. <strong>Nós não armazenamos seus dados financeiros em nossos servidores.</strong></p>
          <p>Quando você faz login com o Google, nós solicitamos acesso para:</p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li>Ver seu endereço de e-mail e informações básicas de perfil.</li>
            <li>Criar e editar planilhas no seu Google Drive (exclusivo para as planilhas criadas pelo app).</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>3. Uso das Informações</h2>
          <p>O acesso ao Google Sheets é utilizado estritamente para:</p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li>Criar a planilha base do Financeiro OS.</li>
            <li>Ler, adicionar e atualizar suas transações, categorias e metas financeiras dentro dessa planilha.</li>
          </ul>
          <p>Nenhuma informação da sua planilha é compartilhada com terceiros ou analisada por nossa equipe.</p>
          <p style={{ marginTop: 12 }}>
            O uso e a transferência de informações recebidas das APIs do Google para qualquer outro aplicativo estarão de acordo com a{' '}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>
              Política de Dados do Usuário dos Serviços de API do Google
            </a>
            , incluindo os requisitos de Uso Limitado.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>4. Armazenamento e Segurança</h2>
          <p>Todos os seus dados financeiros ficam armazenados de forma segura e privada no <strong>seu próprio Google Drive</strong>. A segurança e proteção desses dados é garantida pela infraestrutura do Google.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>5. Seus Direitos e Revogação de Acesso</h2>
          <p>Como os dados são seus, você tem controle total. Você pode, a qualquer momento:</p>
          <ul style={{ paddingLeft: 24, marginTop: 8 }}>
            <li>Apagar a planilha diretamente no seu Google Drive.</li>
            <li>Revogar o acesso do Financeiro OS à sua conta do Google nas configurações de segurança da sua conta Google (https://myaccount.google.com/permissions).</li>
          </ul>
        </section>
        
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>6. Contato</h2>
          <p>Se tiver dúvidas sobre esta política de privacidade, entre em contato conosco.</p>
        </section>
      </div>
    </div>
  );
}
