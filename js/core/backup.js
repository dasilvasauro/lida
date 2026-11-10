// Backup .lida: todos os registros (com as versões de cada campo), cifrados com uma senha.
// Importar JUNTA com o que já existe (mesma regra da sincronização: vence a versão mais nova de
// cada campo), então serve para restaurar, para levar os dados a outro aparelho e para trocar de
// versão do Lida (com Google ↔ sem Google). Sem a senha, o arquivo é ilegível.
import { app, personal } from '../state.js';
import { sealWithPassword, openWithPassword } from '../lib/crypto.js';
import { today } from '../lib/clock.js';

export const BACKUP_FORMAT = 'lida-backup';

export async function exportBackup(pass) {
  const records = personal.allRecords().map((r) => ({ id: r.id, type: r.type, u: r.u, by: r.by, del: !!r.del, ...(r.del ? {} : { data: r.data, fv: r.fv, fb: r.fb, fp: r.fp, fd: r.fd, cb: r.cb, ca: r.ca }) }));
  const body = await sealWithPassword(pass, { records });
  const pkg = { format: BACKUP_FORMAT, v: 1, app: app.version, at: Date.now(), count: records.filter((r) => !r.del).length, ...body };
  return { name: `lida-backup-${today()}.lida`, text: JSON.stringify(pkg) };
}

export function readBackupHeader(text) {
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch {
    throw new Error('Este arquivo não é um backup do Lida.');
  }
  if (pkg?.format !== BACKUP_FORMAT || !pkg.wrap || !pkg.ct) throw new Error('Este arquivo não é um backup do Lida.');
  return pkg;
}

export async function importBackup(text, pass) {
  const pkg = readBackupHeader(text);
  let body;
  try {
    body = await openWithPassword(pass, pkg);
  } catch (e) {
    throw new Error(e.code === 'bad-pass' ? 'Senha incorreta para este backup.' : 'O arquivo está corrompido.');
  }
  const list = (body.records || []).filter((r) => r && r.id && r.type);
  await personal.importPlain(list);
  // O que veio do arquivo entra na fila de envio: na conta Google, sobe para a nuvem e para os outros aparelhos.
  await personal.queue(list.map((r) => r.id));
  return { count: list.filter((r) => !r.del).length, from: pkg.app, at: pkg.at };
}
