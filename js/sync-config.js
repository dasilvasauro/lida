// Identificação do Lida nas nuvens da pessoa. Não são segredos (o login usa PKCE / código de
// aparelho, sem senha de app): só dizem ao Dropbox e à Microsoft que app está pedindo acesso.
// Como registrar e preencher: README, seção "Sincronizar com Dropbox, OneDrive ou Nextcloud".
// Vazio = a opção aparece como "não configurada nesta versão".
export const syncConfig = {
  // Dropbox: App Console > Create app > Scoped access > App folder. Copie o "App key".
  dropboxAppKey: '',
  // Microsoft: portal do Azure > Registros de aplicativo > Novo registro. Copie o "ID do aplicativo (cliente)".
  microsoftClientId: '',
};
