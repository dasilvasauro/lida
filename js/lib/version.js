// Número da versão para comparar (o mesmo versionCode do APK): 3.0.0-alfa.14 → 300000140.
// Sempre cresce: maior.menor.correção, depois alfa < beta < rc < final, depois o número
// (alfa.9.1 → 91). Cabe no limite do Android (2.100.000.000) até a versão 20.
export function versionCode(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-(alfa|alpha|beta|rc)\.(\d+)(?:\.(\d+))?)?$/.exec(String(v || '').trim());
  if (!m) throw new Error(`Versão fora do formato (ex.: 3.0.0-alfa.14): ${v}`);
  const [, ma, mi, pa, stage, n = '0', sub = '0'] = m;
  if (+mi > 99 || +pa > 99 || +n > 299 || +sub > 9) throw new Error(`Versão grande demais para o versionCode: ${v}`);
  const st = { alfa: 0, alpha: 0, beta: 3000, rc: 6000 }[stage] ?? 9000;
  return +ma * 100_000_000 + +mi * 1_000_000 + +pa * 10_000 + st + +n * 10 + +sub;
}
