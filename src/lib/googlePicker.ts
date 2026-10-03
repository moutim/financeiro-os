import { getSession } from 'next-auth/react';

/**
 * Seletor de arquivos do Google (Google Picker).
 *
 * O login pede só a permissão drive.file: o app enxerga apenas as planilhas que
 * a própria conta criou ou escolheu neste seletor. O convidado de uma meta
 * compartilhada escolhe aqui, uma vez, a planilha de quem criou a meta, e o
 * Google libera o acesso do app só a ela.
 */

interface PickerResponse {
  action: string;
  docs?: { id: string }[];
}

interface DocsView {
  setFileIds(fileIds: string): DocsView;
  setMode(mode: string): DocsView;
}

interface PickerBuilder {
  addView(view: DocsView): PickerBuilder;
  setOAuthToken(token: string): PickerBuilder;
  setDeveloperKey(key: string): PickerBuilder;
  setAppId(appId: string): PickerBuilder;
  setLocale(locale: string): PickerBuilder;
  setTitle(title: string): PickerBuilder;
  setCallback(callback: (data: PickerResponse) => void): PickerBuilder;
  build(): { setVisible(visible: boolean): void };
}

interface PickerApi {
  PickerBuilder: new () => PickerBuilder;
  DocsView: new (viewId: string) => DocsView;
  ViewId: { SPREADSHEETS: string };
  DocsViewMode: { LIST: string };
  Action: { PICKED: string; CANCEL: string };
}

declare global {
  interface Window {
    gapi?: { load(api: string, options: { callback: () => void; onerror: () => void }): void };
    google?: { picker?: PickerApi };
  }
}

let pickerLoading: Promise<PickerApi> | null = null;

function loadPicker(): Promise<PickerApi> {
  pickerLoading ??= new Promise<PickerApi>((resolve, reject) => {
    const fail = () => reject(new Error('Não foi possível carregar o seletor do Google.'));
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.onerror = fail;
    script.onload = () => window.gapi?.load('picker', {
      callback: () => (window.google?.picker ? resolve(window.google.picker) : fail()),
      onerror: fail,
    });
    document.head.appendChild(script);
  }).catch((err) => {
    pickerLoading = null; // permite tentar de novo
    throw err;
  });
  return pickerLoading;
}

async function fetchPickerConfig(): Promise<{ apiKey: string; appId: string }> {
  const res = await fetch('/api/google-picker', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Seletor do Google indisponível.');
  return data;
}

/**
 * Abre o seletor mostrando só a planilha `spreadsheetId` (já compartilhada com
 * esta conta). Resolve `true` quando a pessoa a seleciona, o que libera o
 * acesso do app a ela, e `false` se o seletor for fechado.
 */
export async function requestSpreadsheetAccess(spreadsheetId: string): Promise<boolean> {
  // getSession busca a sessão de novo, renovando o token do Google se ele já expirou
  const [picker, config, session] = await Promise.all([loadPicker(), fetchPickerConfig(), getSession()]);
  if (!session?.accessToken) throw new Error('Sessão expirada. Entre novamente.');

  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.SPREADSHEETS)
      .setFileIds(spreadsheetId)
      .setMode(picker.DocsViewMode.LIST);

    new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(session.accessToken)
      .setDeveloperKey(config.apiKey)
      .setAppId(config.appId)
      .setLocale('pt-BR')
      .setTitle('Selecione a planilha da meta compartilhada')
      .setCallback((data) => {
        if (data.action === picker.Action.PICKED) resolve(!!data.docs?.some((doc) => doc.id === spreadsheetId));
        else if (data.action === picker.Action.CANCEL) resolve(false);
      })
      .build()
      .setVisible(true);
  });
}
