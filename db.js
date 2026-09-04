// js/db.js
// Gestion de la base de données locale (IndexedDB)

const dbModule = {
  dbName: 'assistantNumDB',
  dbVersion: 1,
  db: null,

  // Initialisation et ouverture de la base de données
  init: function() {
    console.log('Initializing database...');
    
    return new Promise((resolve, reject) => {
      // Ouvre la base de données
      const request = indexedDB.open(this.dbName, this.dbVersion);

      // Gère la création ou la mise à jour de la structure de la base
      request.onupgradeneeded = (event) => {
        this.db = event.target.result;
        console.log('Database upgrade needed, creating object stores...');

        // Création des tables (object stores) si elles n'existent pas

        // Table Clients
        if (!this.db.objectStoreNames.contains('clients')) {
          const store = this.db.createObjectStore('clients', { keyPath: 'id' });
          store.createIndex('nom_prenom', ['nom', 'prenom'], { unique: false });
          store.createIndex('email', 'email', { unique: false });
        }

        // Table Appareils
        if (!this.db.objectStoreNames.contains('devices')) {
          const store = this.db.createObjectStore('devices', { keyPath: 'id' });
          store.createIndex('clientId', 'clientId', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('brand_model', ['brand', 'model'], { unique: false });
        }

        // Table Interventions
        if (!this.db.objectStoreNames.contains('interventions')) {
          const store = this.db.createObjectStore('interventions', { keyPath: 'id' });
          store.createIndex('clientId', 'clientId', { unique: false });
          store.createIndex('deviceId', 'deviceId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }

        // Table Documentation (mémos techniques)
        if (!this.db.objectStoreNames.contains('documentation')) {
          const store = this.db.createObjectStore('documentation', { keyPath: 'id' });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Table Checklists
        if (!this.db.objectStoreNames.contains('checklists')) {
          const store = this.db.createObjectStore('checklists', { keyPath: 'id' });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }

        // Table Paramètres (Configuration)
        if (!this.db.objectStoreNames.contains('settings')) {
          this.db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Table Sécurité (PIN hash, etc.)
        if (!this.db.objectStoreNames.contains('security')) {
          this.db.createObjectStore('security', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('Database opened successfully');
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Database error:', event.target.error);
        reject(event.target.error);
      };
    });
  },

  // Méthode générique pour ajouter ou mettre à jour un enregistrement
  save: function(storeName, data) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data); // put() ajoute si n'existe pas, met à jour si existe

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Méthode générique pour récupérer un enregistrement par son ID
  get: function(storeName, id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Méthode générique pour récupérer tous les enregistrements d'une table
  getAll: function(storeName) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Méthode générique pour supprimer un enregistrement par son ID
  delete: function(storeName, id) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Méthode pour récupérer des enregistrements via un index
  getAllByIndex: function(storeName, indexName, query) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(query);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  // Méthode pour supprimer toutes les données de toutes les tables (Réinitialisation)
  clearAll: function() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer TOUTES les données de l\'application ? Cette action est irréversible.')) {
      return;
    }

    const stores = ['clients', 'devices', 'interventions', 'documentation', 'checklists', 'settings', 'security'];
    const transaction = this.db.transaction(stores, 'readwrite');
    
    stores.forEach(storeName => {
      transaction.objectStore(storeName).clear();
    });

    transaction.oncomplete = () => {
      app.showToast('Toutes les données ont été supprimées.');
      setTimeout(() => location.reload(), 1500); // Recharger l'appli après suppression
    };

    transaction.onerror = (event) => {
      console.error('Error clearing database:', event.target.error);
      app.showToast('Une erreur est survenue lors de la suppression.');
    };
  },

  // Méthode pour charger des données de démonstration (pour tester)
  loadDemoData: function() {
    if (!confirm('Voulez-vous charger des données de démonstration ? Vos données actuelles ne seront pas supprimées.')) {
      return;
    }
    
    // Vous pouvez définir ici des objets de démo pour clients, appareils, etc.
    // Et utiliser dbModule.save() pour les insérer.
    
    console.log('Demo data loading not implemented in this simplified version.');
    app.showToast('Fonctionnalité non implémentée dans cette version simplifiée.');
  }
};
