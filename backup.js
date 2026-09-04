const backupModule = {
  async export() {
    const data = await dbModule.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assistant-numerique-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    app.toast('Export téléchargé');
  },

  import() {
    document.getElementById('importFile').click();
  },

  async handleImport(input) {
    const file = input.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.clients || !Array.isArray(data.clients)) throw new Error('Fichier invalide');
      if (!confirm('Cela remplacera toutes les données actuelles. Continuer ?')) return;
      await dbModule.importData(data);
      app.toast('Import réussi');
      app.refreshAll();
    } catch (e) {
      app.toast('Erreur import: ' + e.message);
    }
    input.value = '';
  }
};
