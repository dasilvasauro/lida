// Ponte com o app Android (Capacitor).
// O mesmo código roda na web e dentro do APK. Na web, isNative() é falso e os plugins
// devolvem null: cada módulo decide o que fazer sem eles (ex.: notificações só com o app aberto).
//
// O núcleo do Capacitor (js/vendor/capacitor.js, ~9 KB) é carregado pelo index.html. Dentro do
// APK, o Android injeta a ponte nativa antes da página, e registerPlugin('Nome') devolve um proxy
// que chama o código nativo do plugin. Não há etapa de build: nada de import de pacotes npm aqui.

// Endereço público do app (links de convite precisam abrir na web, não em https://localhost).
export const WEB_URL = 'https://dasilvasauro.github.io/lida/';

const core = () => window.capacitorExports || null;

export const isNative = () => {
  try {
    return !!core()?.Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
};

export const platform = () => (isNative() ? core().Capacitor.getPlatform() : 'web');

const cache = new Map();
export function plugin(name) {
  if (!isNative()) return null;
  if (!cache.has(name)) cache.set(name, core().registerPlugin(name));
  return cache.get(name);
}

// Chama um método de plugin sem derrubar o app se o plugin faltar ou falhar.
export async function call(name, method, args) {
  const p = plugin(name);
  if (!p) return null;
  try {
    return await p[method](args);
  } catch (e) {
    console.warn(`[nativo] ${name}.${method}`, e);
    return null;
  }
}
