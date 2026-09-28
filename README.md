<div align="center">
  <h1>Financeiro OS</h1>
  <p><strong>Controle financeiro pessoal, do seu jeito.</strong></p>
</div>

<br />

O **Financeiro OS** é um sistema de controle financeiro projetado com foco absoluto na experiência do usuário, privacidade e minimalismo. Inspirado no design de software da Apple e no conceito de *Liquid Glass*, a aplicação oferece uma interface fluida, translúcida e incrivelmente natural.

O maior diferencial? **Ele usa o seu próprio Google Drive como banco de dados.** Todas as suas informações financeiras são salvas diretamente numa planilha criada automaticamente na sua conta do Google. Nós não guardamos seus dados. Você está sempre no controle.

## ✨ Destaques

- 🎨 **Design Premium & Liquid Glass:** Interfaces com efeito de desfoque, transições suaves, *hover effects* responsivos e tipografia refinada.
- 📱 **Experiência Nativa no Mobile:** Layout projetado pensando nos mínimos detalhes do celular, incluindo um menu de navegação flutuante em formato de "cápsula" (*Pill Shape*) ao estilo iOS.
- 🔒 **Privacidade Absoluta:** O banco de dados é uma planilha do **Google Sheets** que só você tem acesso. Nada fica no servidor.
- ⚡ **Zero Configuração:** Autenticação instantânea (NextAuth). Assim que você faz login, o sistema configura e estrutura o seu mês automaticamente.
- 📊 **Análises Visuais Inteligentes:** Gráficos interativos para você ter um raio-X completo das despesas por categoria, cartões de crédito e evolução de metas.

## 🛠 Tecnologias Utilizadas

- **[Next.js](https://nextjs.org/)** (App Router)
- **[NextAuth.js](https://next-auth.js.org/)** (Autenticação Google OAuth)
- **[React](https://react.dev/) + TypeScript**
- **[Google Sheets API](https://developers.google.com/sheets/api)** (Como base de dados)
- **[Lucide React](https://lucide.dev/)** (Ícones SVG)
- **Vanilla CSS**

## 🚀 Como Rodar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/moutim/financeiro-os.git
cd financeiro-os
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o arquivo `.env.local` na raiz do projeto e defina as variáveis (veja a seção de Variáveis de Ambiente).

4. Inicie o servidor local:
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

## 🔐 Variáveis de Ambiente

Para que o login e a criação de planilhas funcionem, as seguintes chaves são obrigatórias no `.env.local`:

```env
# Google OAuth (Gerado no Google Cloud Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
```

> **Atenção para produção (Vercel):** Não esqueça de adicionar o domínio final de produção em `NEXTAUTH_URL` nas configurações de ambiente da Vercel, e autorizar essa mesma URL no painel OAuth do Google Cloud Console.

---
<div align="center">
  <p>Feito para ser simples, bonito e direto ao ponto.</p>
</div>
