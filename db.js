const DB_NAME = 'AssistantNumeriqueDB';
const DB_VERSION = 1;

const dbModule = {
  db: null,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('clients')) {
          const cs = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
          cs.createIndex('nom', 'nom', { unique: false });
          cs.createIndex('prenom', 'prenom', { unique: false });
        }
        if (!db.objectStoreNames.contains('devices')) {
          const ds = db.createObjectStore('devices', { keyPath: 'id', autoIncrement: true });
          ds.createIndex('clientId', 'clientId', { unique: false });
          ds.createIndex('brand', 'brand', { unique: false });
          ds.createIndex('model', 'model', { unique: false });
          ds.createIndex('category', 'category', { unique: false });
        }
        if (!db.objectStoreNames.contains('interventions')) {
          const is = db.createObjectStore('interventions', { keyPath: 'id', autoIncrement: true });
          is.createIndex('clientId', 'clientId', { unique: false });
          is.createIndex('deviceId', 'deviceId', { unique: false });
          is.createIndex('date', 'date', { unique: false });
          is.createIndex('status', 'status', { unique: false });
          is.createIndex('category', 'category', { unique: false });
        }
        if (!db.objectStoreNames.contains('checklists')) {
          db.createObjectStore('checklists', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('documentation')) {
          const doc = db.createObjectStore('documentation', { keyPath: 'id', autoIncrement: true });
          doc.createIndex('category', 'category', { unique: false });
          doc.createIndex('deviceId', 'deviceId', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  },

  // Generic CRUD
  async getAll(store) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const os = tx.objectStore(store);
      const req = os.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async get(store, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async put(store, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(store, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async clear(store) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getByIndex(store, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const idx = tx.objectStore(store).index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  // Settings helpers
  async getSetting(key, defaultValue = null) {
    const val = await this.get('settings', key);
    return val ? val.value : defaultValue;
  },

  async setSetting(key, value) {
    await this.put('settings', { key, value });
  },

  // Demo data
  async loadDemoData() {
    const existing = await this.getAll('clients');
    if (existing.length > 0) {
      if (!confirm('Des données existent déjà. Les remplacer par les données de démonstration ?')) return;
      await this.clear('clients');
      await this.clear('devices');
      await this.clear('interventions');
      await this.clear('checklists');
      await this.clear('documentation');
    }

    const clientId = await this.put('clients', {
      nom: 'Dupont', prenom: 'Jean', phone: '06 12 34 56 78',
      email: 'jean.dupont@email.fr', address: '12 Rue des Lilas, 75000 Paris',
      notes: 'Client régulier, préfère les explications simples.',
      createdAt: Date.now() - 86400000 * 30,
      lastIntervention: Date.now() - 86400000 * 2
    });

    const dev1 = await this.put('devices', {
      clientId, category: 'smartphone', brand: 'Samsung', model: 'Galaxy A55',
      modelNum: 'SM-A556B', os: 'Android 14', serial: '',
      notes: 'Acheté en janvier 2025', createdAt: Date.now() - 86400000 * 30
    });
    const dev2 = await this.put('devices', {
      clientId, category: 'imprimante', brand: 'HP', model: 'DeskJet 2820e',
      modelNum: '', os: '', serial: '',
      notes: 'Imprimante Wi-Fi, encre HP 305', createdAt: Date.now() - 86400000 * 30
    });
    const dev3 = await this.put('devices', {
      clientId, category: 'ordinateur', brand: 'HP', model: 'Pavilion',
      modelNum: '', os: 'Windows 11', serial: '',
      notes: 'PC portable 15"', createdAt: Date.now() - 86400000 * 30
    });

    await this.put('interventions', {
      clientId, deviceId: dev1, category: 'smartphone',
      problem: 'Le client ne reçoit plus ses notifications WhatsApp.',
      diagnostic: 'Notifications désactivées dans les paramètres système.',
      solution: 'Réactivation des notifications WhatsApp dans Paramètres > Applications > WhatsApp > Notifications.',
      result: 'Résolu', material: '', timeSpent: '15 min',
      notes: 'Client satisfait, lui montré comment vérifier.',
      status: 'resolu', date: Date.now() - 86400000 * 2,
      checklist: [], photos: []
    });

    await this.put('interventions', {
      clientId, deviceId: dev2, category: 'imprimante',
      problem: 'Imprimante non détectée sur le réseau Wi-Fi.',
      diagnostic: 'Imprimante connectée à un ancien réseau 2.4GHz, box changée.',
      solution: 'Réinitialisation Wi-Fi de l'imprimante, reconnexion via HP Smart.',
      result: 'Résolu', material: '', timeSpent: '25 min',
      notes: 'Test d'impression OK.',
      status: 'resolu', date: Date.now() - 86400000 * 10,
      checklist: [], photos: []
    });

    await this.put('interventions', {
      clientId, deviceId: dev3, category: 'ordinateur',
      problem: 'PC très lent au démarrage.',
      diagnostic: 'Trop de programmes au démarrage, disque presque plein.',
      solution: 'Désactivation des programmes inutiles au démarrage, nettoyage disque, désinstallation de logiciels obsolètes.',
      result: 'Amélioration notable', material: '', timeSpent: '45 min',
      notes: 'Conseillé upgrade SSD.',
      status: 'resolu', date: Date.now() - 86400000 * 15,
      checklist: [], photos: []
    });

    await this.put('checklists', {
      title: 'Nouveau smartphone',
      items: [
        { text: 'Carte SIM', checked: false },
        { text: 'Compte Google/Apple', checked: false },
        { text: 'Wi-Fi', checked: false },
        { text: 'Applications essentielles', checked: false },
        { text: 'Contacts', checked: false },
        { text: 'Photos', checked: false },
        { text: 'Sauvegarde activée', checked: false },
        { text: 'WhatsApp', checked: false },
        { text: 'Mises à jour', checked: false }
      ],
      createdAt: Date.now()
    });

    await this.put('checklists', {
      title: 'Nouveau PC',
      items: [
        { text: 'Windows Update', checked: false },
        { text: 'Antivirus', checked: false },
        { text: 'Compte utilisateur', checked: false },
        { text: 'Navigateur (Chrome/Firefox)', checked: false },
        { text: 'E-mail configuré', checked: false },
        { text: 'Imprimante', checked: false },
        { text: 'Sauvegarde', checked: false },
        { text: 'Photos transférées', checked: false },
        { text: 'Applications principales', checked: false }
      ],
      createdAt: Date.now()
    });

    // Documentation de démo
    const docs = [
      { category: 'smartphone', title: 'Samsung Galaxy A55 - Manuel utilisateur', source: 'Samsung', url: 'https://www.samsung.com/fr/support/model/SM-A556BZKDEUB/', deviceId: dev1 },
      { category: 'imprimante', title: 'HP DeskJet 2820e - Assistance', source: 'HP', url: 'https://support.hp.com/fr-fr/product/hp-deskjet-2800e-all-in-one-printer-series/2100182525', deviceId: dev2 },
      { category: 'imprimante', title: 'HP DeskJet 2820e - Connexion Wi-Fi', source: 'HP', url: 'https://support.hp.com/fr-fr/document/ish_1776645-1639799-16', deviceId: dev2 },
      { category: 'ordinateur', title: 'Windows 11 - Support Microsoft', source: 'Microsoft', url: 'https://support.microsoft.com/fr-fr/windows', deviceId: dev3 },
      { category: 'application', title: 'WhatsApp - Transfert de photos', source: 'WhatsApp FAQ', url: 'https://faq.whatsapp.com/', deviceId: null },
      { category: 'application', title: 'Google Photos - Aide', source: 'Google', url: 'https://support.google.com/photos', deviceId: null }
    ];

    for (const d of docs) {
      await this.put('documentation', { ...d, id: undefined, createdAt: Date.now() });
    }

    app.toast('Données de démonstration chargées');
    app.refreshAll();
  },

  async clearAll() {
    if (!confirm('⚠️ SUPPRIMER TOUTES LES DONNÉES ? Cette action est irréversible.')) return;
    const stores = ['clients', 'devices', 'interventions', 'checklists', 'documentation'];
    for (const s of stores) await this.clear(s);
    app.toast('Toutes les données ont été supprimées');
    app.refreshAll();
  },

  async exportData() {
    const data = {};
    for (const s of ['clients', 'devices', 'interventions', 'checklists', 'documentation', 'settings']) {
      data[s] = await this.getAll(s);
    }
    // Ne jamais exporter les clés API
    if (data.settings) {
      data.settings = data.settings.filter(s => !s.key.includes('apiKey') && !s.key.includes('google'));
    }
    return data;
  },

  async importData(data) {
    for (const s of ['clients', 'devices', 'interventions', 'checklists', 'documentation']) {
      if (data[s]) {
        await this.clear(s);
        for (const item of data[s]) {
          delete item.id;
          await this.put(s, item);
        }
      }
    }
    if (data.settings) {
      for (const item of data.settings) {
        if (!item.key.includes('apiKey') && !item.key.includes('google')) {
          await this.put('settings', item);
        }
      }
    }
  }
};
