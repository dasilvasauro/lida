// Telas antes do app: escolher como usar, entrar com Google, criar a senha, desbloquear
// e trazer os dados do Lida anterior.
import * as cloud from '../core/cloud.js';
import * as legacy from '../core/legacy.js';
import { createKey, unlockKey } from '../lib/crypto.js';
import { uid, esc, fmtInt } from '../lib/util.js';
import { icon } from '../ui/ui.js';
import { isNative } from '../native.js';

let host;
function screen(html) {
  const boot = document.getElementById('boot');
  if (boot) {
    boot.classList.add('out');
    setTimeout(() => boot.remove(), 450);
  }
  host = document.getElementById('gate');
  host.hidden = false;
  host.innerHTML = html.includes('data-intro') ? `<div class="gate-card">${html}</div>` : `<div class="gate-card"><img class="gate-logo" src="icons/pwa-192x192.png" alt="" width="60" height="60"><h1>Lida</h1>${html}</div>`;
  host.querySelector('input')?.focus();
  return host;
}
const err = (msg) => {
  const e = host.querySelector('.gate-err');
  if (e) {
    e.textContent = msg;
    e.hidden = !msg;
  }
};
const busy = (on) => host.querySelectorAll('button, input').forEach((b) => (b.disabled = on));
export const closeGate = () => {
  const g = document.getElementById('gate');
  g.hidden = true;
  g.innerHTML = '';
};
export function loading(text) {
  screen(`<p class="gate-lead">${esc(text)}</p>`);
}

const passFields = (confirm, label = 'Senha do Lida') => `
  <label class="field"><span>${label}</span><input name="p1" type="password" autocomplete="${confirm ? 'new-password' : 'current-password'}" minlength="${confirm ? 8 : 1}" required></label>
  ${confirm ? `<label class="field"><span>Repita a senha</span><input name="p2" type="password" autocomplete="new-password" required></label>` : ''}`;

const cloudAvailable = () => cloud.googleAvailable();

/* ---------- Apresentação (primeira abertura) ---------- */
const SLIDES = [
  {
    title: 'Seu dia, em ordem',
    text: 'Tarefas com prioridade, data, horário e subtarefas. Planeje a semana e veja só o que importa hoje.',
    art: `<div class="art-card">
      <div class="art-task"><i class="c p1"></i><span>Revisar a proposta</span><em>10:00</em></div>
      <div class="art-task done"><i class="c p2">${icon('check')}</i><span>Responder e-mails</span></div>
      <div class="art-task"><i class="c p3"></i><span>Caminhada de 30 min</span><em>18:30</em></div>
    </div>`,
  },
  {
    title: 'Cada passo conta',
    text: 'Concluir rende XP e ouro. Suba de nível, ganhe títulos e troque o ouro por vantagens na Loja.',
    art: `<div class="art-card art-level"><div class="lvl-badge">7</div><div class="grow"><b>Nível 7 · Praticante</b><div class="bar"><i style="width:68%"></i></div></div><span class="art-pop">+75 XP</span></div>`,
  },
  {
    title: 'Hábitos que ficam',
    text: 'Hábitos com metas e sequências, água e o que você quer largar. Incentivo em vez de cobrança.',
    art: `<div class="art-card art-habit"><span class="art-ring">📚</span><div class="grow"><b>Ler</b><span class="art-dots">${'<i></i>'.repeat(6)}<i class="o"></i></span></div><span class="art-flame">${icon('flame')}12</span></div>`,
  },
  {
    title: 'Foco quando precisa',
    text: 'Pomodoro, modo foco para tarefas com tempo e um lugar para esvaziar a mente antes de organizar.',
    art: `<div class="art-card art-focus"><div class="art-clock"><b>25:00</b><small>Foco</small></div><div class="art-chips"><span>Ligar para o banco</span><span>Ideia de presente</span><span>Agendar dentista</span></div></div>`,
  },
  {
    title: 'Seus dados, só seus',
    text: 'Funciona sem internet. Se sincronizar, tudo vai cifrado com a sua senha: nem quem guarda os dados consegue ler.',
    art: `<div class="art-card art-lock"><span class="art-shield">${icon('lock')}</span><div class="art-tags"><span>${icon('phone')}Offline</span><span>${icon('cloud')}Sincroniza</span><span>${icon('shield')}Cifrado</span></div></div>`,
  },
];

export function intro() {
  return new Promise((resolve) => {
    const h = screen(`<div class="intro" data-intro>
      <div class="intro-brand"><img src="icons/pwa-192x192.png" alt="" width="32" height="32"><b>Lida</b></div>
      <div class="intro-track" data-track>${SLIDES.map((sl, i) => `<section class="intro-slide" aria-roledescription="slide" aria-label="${i + 1} de ${SLIDES.length}"><div class="intro-art">${sl.art}</div><h2>${sl.title}</h2><p>${sl.text}</p></section>`).join('')}</div>
      <div class="intro-dots" role="tablist">${SLIDES.map((_, i) => `<button type="button" role="tab" aria-label="Ir para ${i + 1}" data-dot="${i}"></button>`).join('')}</div>
      <div class="intro-actions"><button type="button" class="gate-link" data-skip>Pular</button><button type="button" class="btn primary" data-next>Próximo</button></div>
    </div>`);
    h.querySelector('.gate-card').classList.add('wide');
    const track = h.querySelector('[data-track]');
    const dots = [...h.querySelectorAll('[data-dot]')];
    const next = h.querySelector('[data-next]');
    let cur = 0;
    const done = () => {
      try {
        localStorage.setItem('lida.intro', '1');
      } catch {
        /* sem armazenamento */
      }
      resolve();
    };
    const paint = () => {
      dots.forEach((d, i) => d.setAttribute('aria-selected', i === cur));
      next.textContent = cur === SLIDES.length - 1 ? 'Começar' : 'Próximo';
      track.querySelectorAll('.intro-slide').forEach((sl, i) => sl.classList.toggle('on', i === cur));
    };
    const go = (i) => track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
    track.addEventListener('scroll', () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== cur) {
        cur = i;
        paint();
      }
    }, { passive: true });
    dots.forEach((d, i) => (d.onclick = () => go(i)));
    next.onclick = () => (cur < SLIDES.length - 1 ? go(cur + 1) : done());
    h.querySelector('[data-skip]').onclick = done;
    h.querySelector('[data-intro]').onkeydown = (e) => {
      if (e.key === 'ArrowRight') go(Math.min(SLIDES.length - 1, cur + 1));
      if (e.key === 'ArrowLeft') go(Math.max(0, cur - 1));
    };
    paint();
    next.focus();
  });
}

// Resultado de todas as telas: { sid, key, wrap, mode, uid, user, legacy }
// legacy: dados do Lida anterior a importar (ou null).
export function welcome() {
  return new Promise((resolve) => {
    const h = screen(`
      <p class="gate-lead">Tarefas e hábitos num só lugar, com uma pequena recompensa a cada passo concluído.</p>
      <div class="gate-actions">
        ${cloudAvailable() ? `<button type="button" class="btn primary wide" data-google>${googleIcon()}Continuar com Google</button>` : ''}
        <button type="button" class="btn ${cloudAvailable() ? 'ghost' : 'primary'} wide" data-local>Usar só neste aparelho</button>
      </div>
      ${isNative() && cloud.cloudConfigured() && !cloud.googleAvailable() ? `<p class="gate-note">Este APK foi gerado sem a configuração do Firebase, então o login com Google não está disponível nele. Os dados ficam neste aparelho.</p>` : ''}
      <p class="gate-err"${cloud.getConfigError() ? '' : ' hidden'}>${esc(cloud.getConfigError())}</p>
      <button type="button" class="gate-link" data-demo>${icon('flask')}Explorar com dados de exemplo</button>`);
    h.querySelector('[data-local]').onclick = () => createLocal().then(resolve);
    h.querySelector('[data-demo]').onclick = () => {
      localStorage.setItem('lida.demo', '1');
      location.reload();
    };
    h.querySelector('[data-google]')?.addEventListener('click', async () => {
      busy(true);
      try {
        const user = await cloud.signIn();
        if (!user) return; // redirecionando
        resolve(await afterGoogle(user));
      } catch (e) {
        busy(false);
        err(e.code === 'auth/popup-closed-by-user' ? '' : e.code?.startsWith('auth/native') || e.code === 'auth/no-token' ? e.message : 'Não foi possível entrar. Verifique a conexão e tente de novo.');
      }
    });
  });
}

export async function afterGoogle(user) {
  loading('Abrindo sua conta…');
  const profile = await cloud.getProfile(user.uid);
  if (profile?.personal) return unlockCloud(user, profile.personal);
  // Primeira vez no Lida 3: procura o cofre da versão anterior.
  let vault = null;
  try {
    vault = await cloud.legacyVault(user.uid);
  } catch {
    vault = null;
  }
  if (vault) {
    const L = await openVault(vault);
    return createCloud(user, L);
  }
  const L = await offerLocal();
  return createCloud(user, L);
}

function formScreen(lead, fields, submitLabel, onSubmit, { back, extra = '' } = {}) {
  return new Promise((resolve) => {
    const h = screen(`<p class="gate-lead">${lead}</p><form class="form" data-f>${fields}<p class="gate-err" hidden></p>
      <button class="btn primary wide">${submitLabel}</button>${extra}${back ? `<button type="button" class="gate-link" data-back>Voltar</button>` : ''}</form>`);
    h.querySelector('[data-back]')?.addEventListener('click', () => back().then(resolve));
    h.querySelector('[data-skip]')?.addEventListener('click', () => resolve(null));
    h.querySelector('[data-f]').onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.p2 && f.p1.value !== f.p2.value) return err('As senhas não conferem.');
      err('');
      busy(true);
      try {
        resolve(await onSubmit(f));
      } catch (ex) {
        busy(false);
        err(ex.code === 'bad-pass' ? 'Senha incorreta.' : ex.message || 'Algo deu errado. Tente de novo.');
      }
    };
  });
}

const NEW_PASS = 'Crie a senha do Lida. Ela cifra suas tarefas e hábitos neste aparelho e antes de qualquer envio para a nuvem.';
const PASS_NOTE = '<p class="gate-note">Guarde bem esta senha: ela não pode ser recuperada. Você vai usá-la ao entrar num aparelho novo.</p>';

async function createLocal() {
  const r = await formScreen(NEW_PASS, passFields(true) + PASS_NOTE, 'Criar senha', async (f) => {
    const { key, wrap } = await createKey(f.p1.value);
    return { sid: uid(20), key, wrap, mode: 'local', uid: 'local', user: null };
  }, { back: welcome });
  if ('legacy' in r) return r; // voltou à tela inicial e concluiu por outro caminho
  r.legacy = await offerLocal();
  return r;
}

async function createCloud(user, L) {
  const lead = L ? 'Agora crie a senha do Lida 3. Pode ser a mesma Chave Mestra, se preferir guardar uma senha só.' : NEW_PASS;
  return formScreen(lead, passFields(true) + PASS_NOTE, 'Criar senha', async (f) => {
    const { key, wrap } = await createKey(f.p1.value);
    const sid = uid(20);
    await cloud.createSpace(sid, wrap, user.uid, { kind: 'personal' });
    return { sid, key, wrap, mode: 'cloud', uid: user.uid, user, legacy: L };
  });
}

async function unlockCloud(user, sid) {
  const sp = await cloud.getSpace(sid);
  if (!sp) throw new Error('Não foi possível abrir o seu espaço na nuvem.');
  return formScreen(`Que bom ter você de volta${user.displayName ? `, ${esc(user.displayName.split(' ')[0])}` : ''}. Digite a senha do Lida para abrir seus dados neste aparelho.`, passFields(false), 'Desbloquear', async (f) => {
    const key = await unlockKey(f.p1.value, sp.wrap);
    return { sid, key, wrap: sp.wrap, mode: 'cloud', uid: user.uid, user, legacy: null };
  });
}

/* ---------- Dados do Lida anterior ---------- */
function facts(L) {
  const s = legacy.summary(L);
  const row = (label, v) => `<div><span>${label}</span><b>${v}</b></div>`;
  return `<div class="gate-facts">${row('Tarefas', fmtInt(s.tasks))}${row('Hábitos', fmtInt(s.habits))}${row('Rotinas', fmtInt(s.routines))}${row('Ouro', fmtInt(s.gold))}${row('XP', fmtInt(s.xp))}</div>`;
}

// Cofre da nuvem: pede a Chave Mestra, decifra e confirma.
function openVault(vault) {
  return formScreen(
    'Encontramos seus dados do Lida anterior. Digite a sua Chave Mestra para trazê-los para cá.',
    passFields(false, 'Chave Mestra'),
    'Continuar',
    async (f) => confirmImport(await legacy.decryptVault(vault, f.p1.value)),
    { extra: `<button type="button" class="gate-link" data-skip>Começar do zero</button>` },
  );
}

async function offerLocal() {
  let L = null;
  try {
    L = await legacy.readLocalLegacy();
  } catch {
    L = null;
  }
  if (!L || (!L.tasks.length && !L.habits?.habits?.length)) return null;
  return confirmImport(L);
}

function confirmImport(L) {
  return new Promise((resolve) => {
    const h = screen(`<p class="gate-lead">Estes dados do Lida anterior vão ser trazidos para a nova versão. Notas, Feeds e Atalhos deixaram de existir e ficam de fora.</p>
      ${facts(L)}
      <div class="gate-actions"><button type="button" class="btn primary wide" data-yes>Importar</button>
      <button type="button" class="btn ghost wide" data-no>Começar do zero</button></div>`);
    h.querySelector('[data-yes]').onclick = () => resolve(L);
    h.querySelector('[data-no]').onclick = () => resolve(null);
  });
}

/* ---------- Abrir de novo ---------- */
export function unlock(wrap) {
  return formScreen('Digite a senha do Lida para abrir.', passFields(false), 'Desbloquear', async (f) => unlockKey(f.p1.value, wrap));
}

export function signInAgain() {
  return new Promise((resolve) => {
    const h = screen(`<p class="gate-lead">Sua sessão do Google expirou neste aparelho. Entre de novo para continuar sincronizando.</p>
      <div class="gate-actions"><button type="button" class="btn primary wide" data-google>${googleIcon()}Continuar com Google</button>
      <button type="button" class="btn ghost wide" data-offline>Continuar sem sincronizar</button></div><p class="gate-err" hidden></p>`);
    h.querySelector('[data-offline]').onclick = () => resolve(null);
    h.querySelector('[data-google]').onclick = async () => {
      busy(true);
      try {
        const u = await cloud.signIn();
        if (u) resolve(u);
      } catch {
        busy(false);
        err('Não foi possível entrar.');
      }
    };
  });
}

function googleIcon() {
  return `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.83h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.98-4.32 2.98-7.33z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.07a10 10 0 0 0 0 8.96z"/><path fill="#EA4335" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98z"/></svg>`;
}
