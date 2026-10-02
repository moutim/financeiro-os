import { useSyncExternalStore } from 'react';

/**
 * Onde o usuário está, para escolher as instruções da gaveta de instalação:
 * - ios: iPhone (Safari, Chrome etc.) — só dá para instalar pelo menu Compartilhar
 * - android: celular Android — pode ter o pedido nativo de instalação (beforeinstallprompt)
 * - inapp: navegador embutido de outro app (Instagram, Facebook...) — não instala, precisa abrir no navegador
 */
export type InstallPlatform = 'ios' | 'android' | 'inapp';

/** Evento do Chrome/Android que permite abrir o pedido de instalação pelo nosso botão */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|BytedanceWebview|musical_ly|Line\/|; wv\)/;

function detectPlatform(): InstallPlatform | null {
  const ua = navigator.userAgent;
  const isIPhone = /iPhone|iPod/.test(ua);
  const isAndroidPhone = /Android/.test(ua) && /Mobile/.test(ua);
  if (!isIPhone && !isAndroidPhone) return null;
  if (IN_APP_BROWSER.test(ua)) return 'inapp';
  return isIPhone ? 'ios' : 'android';
}

/** Aberto pelo ícone da tela inicial (modo app), e não pelo navegador */
function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS antigo não suporta o display-mode acima
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// ─── Pedido nativo de instalação (Android) ────────────────────────────────────
// Guardado no nível do módulo: o Chrome dispara o evento uma vez só, às vezes
// antes de a gaveta montar.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let wasInstalled = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // a nossa gaveta substitui a barrinha de instalação do Chrome
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    wasInstalled = true;
    notify();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const standaloneQuery = window.matchMedia('(display-mode: standalone)');
  standaloneQuery.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    standaloneQuery.removeEventListener('change', listener);
  };
}

// No servidor (e na hidratação) nada é exibido; o cliente re-renderiza com os valores reais
const getServerNull = () => null;
const getServerFalse = () => false;

export function useInstallPrompt() {
  const platform = useSyncExternalStore(subscribe, detectPlatform, getServerNull);
  const isStandalone = useSyncExternalStore(subscribe, () => detectStandalone() || wasInstalled, getServerFalse);
  const canPromptInstall = useSyncExternalStore(subscribe, () => deferredPrompt !== null, getServerFalse);

  /** Abre o pedido nativo de instalação; devolve true se o usuário aceitou */
  const promptInstall = async (): Promise<boolean> => {
    const prompt = deferredPrompt;
    if (!prompt) return false;
    // o evento só pode ser usado uma vez
    deferredPrompt = null;
    notify();
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome === 'accepted';
  };

  return { platform, isStandalone, canPromptInstall, promptInstall };
}
