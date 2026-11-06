// Ajustes: conta, aparência, sons, vibração, lembretes e sobre.
import { app, P, personal, displayName } from '../state.js';
import { THEMES, THEME_ORDER, themeName, isFreeTheme, FONTS, FONT_ORDER, SIZES, applyAppearance, storedAppearance, swatch } from '../ui/theme.js';
import { soundPrefs, setSoundPrefs, play } from '../core/sound.js';
import { hapticsOn, setHaptics, hapticsSupported, haptic } from '../ui/haptics.js';
import * as notify from '../core/notify.js';
import { isNative } from '../native.js';
import { cloudConfigured } from '../core/cloud.js';
import { esc, fmtInt } from '../lib/util.js';
import { icon, toast, confirmDialog, promptDialog } from '../ui/ui.js';
import { avatar } from './common.js';

const toggle = (name, on, label) => `<span class="toggle"><input type="checkbox" data-${name}${on ? ' checked' : ''} aria-label="${esc(label)}"><i></i></span>`;

function themeOwned(id, S) {
  if (isFreeTheme(id)) return true;
  const u = THEMES[id]?.unlock || {};
  if (u.level && S.money.level >= u.level) return true;
  return (S.walletMeta.themes || []).includes(id);
}
function lockLabel(id) {
  const u = THEMES[id]?.unlock || {};
  if (u.level) return `${icon('lock')}Nível ${u.level}`;
  if (u.price) return `${icon('coin')}${fmtInt(u.price)} na Loja`;
  return '';
}

export const settingsView = {
  title: 'Ajustes',
  sub: () => '',
  render(el) {
    const S = P();
    const ap = storedAppearance();
    const sp = soundPrefs();
    const np = notify.notifyPrefs();
    const name = displayName() || (app.mode === 'cloud' ? 'Sua conta' : 'Você');
    const sub = app.demo ? 'Modo demo: dados de exemplo, só neste navegador' : app.mode === 'cloud' ? app.user?.email || 'Conta Google' : 'Somente neste aparelho';
    const requirePass = localStorage.getItem('lida.requirePass') === '1';

    el.innerHTML = `
      <section class="set-group"><h2>Conta</h2><div class="set-list">
        <div class="set-user">${avatar(52)}<div class="grow"><b>${esc(name)}</b><span>${esc(sub)}</span></div><button type="button" class="btn small" data-name>${icon('edit')}Nome</button></div>
        ${!app.demo && app.mode === 'local' && cloudConfigured() && !isNative() ? `<button type="button" class="set-row" data-connect>${icon('cloud')}<span class="grow">Conectar conta Google<small>Sincronize entre aparelhos. Os dados continuam cifrados com a sua senha.</small></span>${icon('right', 'sm')}</button>` : ''}
        ${!app.demo ? `<label class="set-row">${icon('lock')}<span class="grow">Pedir senha ao abrir<small>Mais privacidade em aparelhos compartilhados</small></span>${toggle('reqpass', requirePass, 'Pedir senha ao abrir')}</label>
        <button type="button" class="set-row" data-pass>${icon('edit')}<span class="grow">Alterar senha</span>${icon('right', 'sm')}</button>` : ''}
      </div></section>

      <section class="set-group"><h2>Tema</h2>
        <div class="themes">${THEME_ORDER.map((id) => {
          const owned = themeOwned(id, S);
          const on = ap.theme === id;
          return `<button type="button" class="theme-opt${on ? ' on' : ''}${owned ? '' : ' locked'}" data-theme="${id}" aria-pressed="${on}"${owned ? '' : ' aria-disabled="true"'}>${swatch(id)}<span>${esc(themeName(id))}</span>${id === 'sistema' ? '<small>Segue o aparelho</small>' : owned ? '' : `<small>${lockLabel(id)}</small>`}</button>`;
        }).join('')}</div>
      </section>

      <section class="set-group"><h2>Fonte</h2>
        <div class="fonts">${FONT_ORDER.map((id) => {
          const f = FONTS[id];
          const on = ap.font === id;
          return `<button type="button" class="font-opt${on ? ' on' : ''}" data-font="${id}" aria-pressed="${on}"><span class="aa" style="font-family:${esc(f.stack)}">Aa</span><span class="grow"><b style="font-family:${esc(f.stack)}">${esc(f.name)}</b><small>${esc(f.note)}</small></span>${on ? icon('check') : ''}</button>`;
        }).join('')}</div>
        <div class="field size-field"><span>Tamanho do texto</span>
          <div class="seg small" role="radiogroup" aria-label="Tamanho do texto">${Object.entries(SIZES).map(([k, v]) => `<button type="button" role="radio" aria-checked="${ap.size === k}" class="${ap.size === k ? 'on' : ''}" data-size="${k}">${v.name}</button>`).join('')}</div></div>
      </section>

      <section class="set-group"><h2>Sons e vibração</h2><div class="set-list">
        <label class="set-row">${icon(sp.on ? 'volume' : 'mute')}<span class="grow">Sons<small>Ao concluir tarefas, ganhar XP e subir de nível</small></span>${toggle('sound', sp.on, 'Sons')}</label>
        <div class="set-row"${sp.on ? '' : ' hidden'}><span class="grow">Volume<input type="range" min="0.1" max="1" step="0.05" value="${sp.volume}" data-volume aria-label="Volume dos sons"></span><button type="button" class="btn small" data-hear>Ouvir</button></div>
        ${hapticsSupported() || isNative() ? `<label class="set-row">${icon('phone')}<span class="grow">Vibração<small>Um toque leve ao marcar e concluir</small></span>${toggle('haptics', hapticsOn(), 'Vibração')}</label>` : ''}
      </div></section>

      <section class="set-group"><h2>Lembretes</h2><div class="set-list" data-notify>
        <label class="set-row">${icon('bell')}<span class="grow">Lembretes<small>${isNative() ? 'Agendados no próprio celular: funcionam sem internet e com o app fechado' : 'No navegador, chegam enquanto o Lida estiver aberto (mesmo em outra aba)'}</small></span>${toggle('notify', np.on, 'Lembretes')}</label>
        <div data-notify-more${np.on ? '' : ' hidden'}>
          <label class="set-row"><span class="grow">Tarefas com horário<small>Na hora marcada em cada tarefa</small></span>${toggle('ntasks', np.tasks, 'Lembretes de tarefas')}</label>
          <label class="set-row"><span class="grow">Fechamento do dia<small>Um aviso para revisar o dia e planejar o seguinte</small></span><input type="time" value="${esc(np.dailyAt)}" data-dailyat aria-label="Horário do fechamento do dia"${np.daily ? '' : ' disabled'}>${toggle('ndaily', np.daily, 'Fechamento do dia')}</label>
          <div class="set-row" data-perm hidden></div>
          <button type="button" class="set-row" data-test>${icon('bell')}<span class="grow">Enviar um lembrete de teste<small>Chega em 5 segundos</small></span></button>
        </div>
      </div></section>

      <section class="set-group"><h2>Sobre</h2><div class="set-list">
        <div class="set-row"><span class="grow">Lida<small>Versão ${esc(app.version)}${isNative() ? ' · Android' : ''}</small></span><span class="val">${fmtInt(personal.stats().live)} registros</span></div>
        ${app.demo ? `<button type="button" class="set-row" data-demo>${icon('flask')}<span class="grow">Sair do modo demo<small>Volta para a tela inicial. Os dados de exemplo continuam guardados.</small></span></button>` : ''}
        ${!app.demo ? `<button type="button" class="set-row danger-text" data-exit>${icon(app.mode === 'cloud' ? 'logout' : 'lock')}<span class="grow">${app.mode === 'cloud' ? 'Sair da conta' : 'Bloquear agora'}</span></button>` : ''}
      </div></section>`;

    bind(el, S);
    permRow(el);
  },
};

function bind(el, S) {
  const rerender = () => settingsView.render(el);
  const ap = () => storedAppearance();

  el.querySelectorAll('[data-theme]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.theme;
      if (!themeOwned(id, S)) return toast(THEMES[id]?.unlock?.level ? `Este tema é liberado no nível ${THEMES[id].unlock.level}.` : 'Este tema estará na Loja.');
      applyAppearance({ ...ap(), theme: id });
      haptic('tick');
      rerender();
    }),
  );
  el.querySelectorAll('[data-font]').forEach((b) =>
    b.addEventListener('click', () => {
      applyAppearance({ ...ap(), font: b.dataset.font });
      haptic('tick');
      rerender();
    }),
  );
  el.querySelectorAll('[data-size]').forEach((b) =>
    b.addEventListener('click', () => {
      applyAppearance({ ...ap(), size: b.dataset.size });
      rerender();
    }),
  );

  el.querySelector('[data-sound]').onchange = (e) => {
    setSoundPrefs({ on: e.target.checked });
    if (e.target.checked) play('complete');
    rerender();
  };
  el.querySelector('[data-volume]').onchange = (e) => {
    setSoundPrefs({ volume: Number(e.target.value) });
    play('complete');
  };
  el.querySelector('[data-hear]').onclick = () => {
    play('complete');
    setTimeout(() => play('coin'), 450);
    setTimeout(() => play('levelup'), 1000);
  };
  el.querySelector('[data-haptics]')?.addEventListener('change', (e) => {
    setHaptics(e.target.checked);
    if (e.target.checked) haptic('done');
  });

  el.querySelector('[data-notify]').addEventListener('change', async (e) => {
    const t = e.target;
    if (t.matches('[data-notify]')) {
      if (t.checked) {
        const p = await notify.requestPermission();
        if (p !== 'granted') {
          t.checked = false;
          return toast(p === 'unsupported' ? 'Este navegador não mostra notificações.' : 'Permissão negada. Libere as notificações do Lida nas configurações do aparelho.', { ms: 5000 });
        }
      }
      notify.setNotifyPrefs({ on: t.checked });
    } else if (t.matches('[data-ntasks]')) notify.setNotifyPrefs({ tasks: t.checked });
    else if (t.matches('[data-ndaily]')) notify.setNotifyPrefs({ daily: t.checked });
    else if (t.matches('[data-dailyat]')) notify.setNotifyPrefs({ dailyAt: t.value || '21:00' });
    else return;
    app.actions.reschedule();
    rerender();
  });
  el.querySelector('[data-test]').onclick = async () => {
    await notify.testNotification();
    toast('Lembrete de teste agendado para daqui a 5 segundos.');
  };

  el.querySelector('[data-name]').onclick = async () => {
    const v = await promptDialog('Como podemos chamar você?', { label: 'Nome', value: displayName() });
    if (v == null) return;
    const prefs = personal.get('prefs');
    await personal.save('prefs', { ...(prefs ? stripView(prefs) : {}), name: v || undefined }, 'prefs');
  };
  el.querySelector('[data-connect]')?.addEventListener('click', () => app.actions.connectGoogle());
  el.querySelector('[data-reqpass]')?.addEventListener('change', (e) => app.actions.setRequirePass(e.target.checked));
  el.querySelector('[data-pass]')?.addEventListener('click', () => app.actions.changePass());
  el.querySelector('[data-demo]')?.addEventListener('click', () => app.actions.toggleDemo());
  el.querySelector('[data-exit]')?.addEventListener('click', async () => {
    if (app.mode !== 'cloud') return app.actions.lock();
    if (await confirmDialog('Sair da conta neste aparelho? Os dados locais são apagados daqui, mas continuam salvos na nuvem.', { ok: 'Sair', danger: true, title: 'Sair da conta' })) app.actions.signOut();
  });
}

const stripView = (v) => Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'id' && !k.startsWith('_')));

// Estado da permissão e, no Android 12+, dos alarmes exatos.
async function permRow(el) {
  const row = el.querySelector('[data-perm]');
  if (!row || !notify.notifyPrefs().on) return;
  const p = await notify.permission();
  const exact = await notify.exactAlarm();
  if (p !== 'granted') {
    row.hidden = false;
    row.innerHTML = `${icon('info')}<span class="grow">Notificações bloqueadas<small>Libere as notificações do Lida nas configurações do ${isNative() ? 'Android' : 'navegador'}.</small></span>`;
  } else if (exact === 'denied') {
    row.hidden = false;
    row.innerHTML = `${icon('info')}<span class="grow">Horário aproximado<small>Sem a permissão "Alarmes e lembretes", o Android pode atrasar os lembretes em alguns minutos.</small></span><button type="button" class="btn small" data-exact>Permitir</button>`;
    row.querySelector('[data-exact]').onclick = () => notify.openExactAlarmSettings();
  }
}

