// js/settings.js
// Gestion du module Paramètres (Configuration, PIN, IA, Drive)

const settingsModule = {
  // Liste des champs à gérer dans le formulaire de paramètres
  fields: [
    'pinEnabled', 'pinHash',
    'aiProvider', 'aiApiKey', 'aiModel',
    'driveSyncEnabled', 'driveClientId', 'driveApiKey'
  ],

  init: function() {
    console.log('Settings module initialized');
  },

  // Charger les paramètres depuis la DB et remplir le formulaire
  load: function() {
    console.log('Loading settings...');
    
    // Pour chaque champ, récupérer sa valeur dans IndexedDB
    const promises = this.fields.map(field => dbModule.get('settings', field));
    
    Promise.all(promises).then(results => {
      // Transformer le tableau de résultats en objet clé:valeur
      const settings = {};
      this.fields.forEach((field, index) => {
        if (results[index]) {
          settings[field] = results[index].value;
        }
      });
      
      this.display(settings);
    });
  },

  // Afficher les paramètres dans le formulaire HTML
  display: function(settings) {
    // === SÉCURITÉ (PIN) ===
    const pinEnabled = settings.pinEnabled || false;
    document.getElementById('pinEnabled').checked = pinEnabled;
    this.togglePinFields(pinEnabled);
    
    // === ASSISTANT IA ===
    document.getElementById('aiProvider').value = settings.aiProvider || 'openai';
    document.getElementById('aiApiKey').value = settings.aiApiKey || '';
    document.getElementById('aiModel').value = settings.aiModel || 'gpt-4o-mini';
    
    // === SYNCHRONISATION DRIVE ===
    const driveEnabled = settings.driveSyncEnabled || false;
    document.getElementById('driveEnabled').checked = driveEnabled;
    this.toggleDriveFields(driveEnabled);
    document.getElementById('driveClientId').value = settings.driveClientId || '';
    document.getElementById('driveApiKey').value = settings.driveApiKey || '';
  },

  // Enregistrer tous les paramètres
  save: function() {
    console.log('Saving settings...');
    const promises = [];
    
    // === SÉCURITÉ (PIN) ===
    const pinEnabled = document.getElementById('pinEnabled').checked;
    promises.push(dbModule.save('settings', { key: 'pinEnabled', value: pinEnabled }));
    
    // Gérer le changement de PIN
    const newPin = document.getElementById('newPin').value.trim();
    const confirmPin = document.getElementById('confirmPin').value.trim();
    
    if (newPin) {
      if (newPin !== confirmPin) {
        app.showToast('Les codes PIN ne correspondent pas.');
        return;
      }
      if (newPin.length < 4) {
        app.showToast('Le code PIN doit faire au moins 4 chiffres.');
        return;
      }
      // Pour la démo, on stocke en clair, mais il faudrait hasher !
      promises.push(dbModule.save('settings', { key: 'pinHash', value: newPin }));
      document.getElementById('newPin').value = ''; // Vider les champs
      document.getElementById('confirmPin').value = '';
    } else if (pinEnabled && !settingsModule.currentPinExists()) {
        app.showToast('Veuillez définir un code PIN pour activer la sécurité.');
        return;
    }
    
    // === ASSISTANT IA ===
    const aiProvider = document.getElementById('aiProvider').value;
    const aiApiKey = document.getElementById('aiApiKey').value.trim();
    const aiModel = document.getElementById('aiModel').value.trim();
    
    promises.push(dbModule.save('settings', { key: 'aiProvider', value: aiProvider }));
    promises.push(dbModule.save('settings', { key: 'aiApiKey', value: aiApiKey }));
    promises.push(dbModule.save('settings', { key: 'aiModel', value: aiModel }));
    
    // === SYNCHRONISATION DRIVE ===
    const driveEnabled = document.getElementById('driveEnabled').checked;
    const driveClientId = document.getElementById('driveClientId').value.trim();
    const driveApiKey = document.getElementById('driveApiKey').value.trim();
    
    promises.push(dbModule.save('settings', { key: 'driveSyncEnabled', value: driveEnabled }));
    promises.push(dbModule.save('settings', { key: 'driveClientId', value: driveClientId }));
    promises.push(dbModule.save('settings', { key: 'driveApiKey', value: driveApiKey }));
    
    // Attendre que tout soit enregistré
    Promise.all(promises).then(() => {
      app.showToast('Paramètres enregistrés ! ✅');
      
      // Mettre à jour les modules concernés
      aiModule.loadConfig();
      // googleDriveModule.loadConfig();
      securityModule.checkPinRequired(); // Re-vérifier la sécurité si PIN activé
      
      app.goTo('dashboard'); // Retour au tableau de bord
    }).catch(error => {
      console.error('Error saving settings:', error);
      app.showToast('Erreur lors de l\'enregistrement.');
    });
  },

  // --- Utilitaires ---
  
  // Activer/Désactiver les champs PIN
  togglePinFields: function(enabled) {
    const fields = document.getElementById('pinFields');
    if (fields) fields.style.display = enabled ? 'block' : 'none';
  },
  
  // Activer/Désactiver les champs Drive
  toggleDriveFields: function(enabled) {
    const fields = document.getElementById('driveFields');
    if (fields) fields.style.display = enabled ? 'block' : 'none';
  },
  
  // Vérifier si un PIN existe déjà
  currentPinExists: function() {
      // Dans cette version démo simplifiée, on va juste vérifier si pinHash est en DB
      // Dans securityModule, on a déjà cette logique, on l'appelle indirectement
      return securityModule.currentPinHash !== null;
  },

  // Réinitialiser complètement l'application
  clearApp: function() {
    dbModule.clearAll(); // Appelle la confirmation et la suppression complète de IndexedDB
  },
  
  // Tester la connexion IA (appelle aiModule)
  testAiConnection: function() {
    // Il faut d'abord enregistrer les modifs avant de tester
    this.saveAiSettings().then(() => {
        aiModule.testConnection();
    });
  },
  
  // Enregistrer juste les paramètres IA avant de tester
  saveAiSettings: function() {
      const promises = [];
      promises.push(dbModule.save('settings', { key: 'aiProvider', value: document.getElementById('aiProvider').value }));
      promises.push(dbModule.save('settings', { key: 'aiApiKey', value: document.getElementById('aiApiKey').value.trim() }));
      promises.push(dbModule.save('settings', { key: 'aiModel', value: document.getElementById('aiModel').value.trim() }));
      return Promise.all(promises);
  }
};
