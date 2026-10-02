// Fica fora do themeStore para o layout (Server Component) importar sem puxar o zustand

/** Chave do tema no localStorage (persist do useThemeStore) */
export const THEME_STORAGE_KEY = 'finance-os-theme';

/** Cor da barra do navegador/status bar no celular, acompanhando o --bg de cada tema */
export const THEME_COLOR_LIGHT = '#F2F2F7';
export const THEME_COLOR_DARK = '#000000';

/**
 * Roda no <head> antes da 1ª pintura: aplica o tema escuro salvo no localStorage,
 * evitando a página abrir clara e só escurecer depois da hidratação.
 * O /login fica sempre claro, como no ThemeProvider.
 */
export const THEME_INIT_SCRIPT = `(function(){try{if(location.pathname==='/login')return;var s=JSON.parse(localStorage.getItem('${THEME_STORAGE_KEY}')||'null');if(s&&s.state&&s.state.isDarkMode)document.documentElement.classList.add('dark')}catch(e){}})()`;
