const googleDriveModule = {
  CLIENT_ID: '',
  SCOPES: 'https://www.googleapis.com/auth/drive.file',
  tokenClient: null,
  accessToken: null,

  init() {
    if (!navigator.onLine) return;
    // Charger les scripts Google de manière asynchrone
    if (typeof gapi === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => gapi.load('client', () => {});
      document.head.appendChild(script);
    }
    if (typeof google === 'undefined') {
      const gsi = document.createElement('script');
      gsi.src = 'https://accounts.google.com/gsi/client';
      gsi.onload = () => this.initTokenClient();
      document.head.appendChild(gsi);
    } else {
      this.initTokenClient();
    }
  },

  initTokenClient() {
    if (!google?.accounts?.oauth2 || !this.CLIENT_ID) return;
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse.access_token) {
          this.accessToken = tokenResponse.access_token;
          app.toast('Google Drive connecté');
          document.getElementById('gdriveStatus').textContent = '✅ Connecté';
        }
      }
    });
  },

  connect() {
    if (!this.CLIENT_ID) {
      app.toast('Configurez CLIENT_ID dans js/google-drive.js');
      return;
    }
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      app.toast('Chargement Google... réessayez dans quelques secondes');
    }
  },

  async backup() {
    if (!this.accessToken) { app.toast('Connectez-vous à Google Drive d'abord'); return; }
    try {
      const data = await dbModule.exportData();
      const fileName = `assistant-numerique-backup-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
      const metadata = { name: fileName, mimeType: 'application/json' };
      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const multipartRequestBody =
        delimiter + 'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter + 'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(data) +
        close_delim;

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.accessToken,
          'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        body: multipartRequestBody
      });
      if (response.ok) app.toast('☁️ Sauvegarde Drive OK');
      else throw new Error('Upload échoué: ' + response.status);
    } catch (e) { app.toast('Erreur Drive: ' + e.message); }
  },

  async list() {
    if (!this.accessToken) { app.toast('Connectez-vous à Google Drive d'abord'); return; }
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("name contains 'assistant-numerique-backup'") + '&fields=files(id,name,createdTime)&orderBy=createdTime desc', {
        headers: { 'Authorization': 'Bearer ' + this.accessToken }
      });
      const data = await res.json();
      if (!data.files?.length) { app.toast('Aucune sauvegarde trouvée'); return; }
      let html = '<h4 style="margin-bottom:8px">Sauvegardes Drive</h4>';
      html += data.files.slice(0,10).map(f => `<div class="doc-item"><strong>${f.name}</strong><div class="doc-source">${new Date(f.createdTime).toLocaleString('fr-FR')}</div></div>`).join('');
      document.getElementById('gdriveStatus').innerHTML = html;
    } catch (e) { app.toast('Erreur: ' + e.message); }
  }
};
