// js/devices.js
// Gestion du module Appareils (Liste, Formulaire, Détails)

const devicesModule = {
  // Liste locale pour la recherche
  allDevices: [],
  // Dictionnaire des catégories avec leurs icônes
  categories: {
    'ordinateur': '💻 Ordinateur',
    'smartphone': '📱 Smartphone',
    'tablette': '📱 Tablette',
    'imprimante': '🖨️ Imprimante',
    'reseau': '🌐 Réseau',
    'photo': '📷 Photos',
    'application': '💬 Application'
  },

  init: function() {
    console.log('Devices module initialized');
  },

  // Charger et afficher la liste complète des appareils
  loadList: function() {
    dbModule.getAll('devices').then(devices => {
      // Trier par marque puis modèle par défaut
      this.allDevices = devices.sort((a, b) => {
        if (a.brand.localeCompare(b.brand) !== 0) {
          return a.brand.localeCompare(b.brand);
        }
        return a.model.localeCompare(b.model);
      });
      this.displayList(this.allDevices);
    });
  },

  // Afficher la liste dans le HTML
  displayList: function(devices) {
    const listCont = document.getElementById('devicesList');
    if (!listCont) return;
    listCont.innerHTML = '';

    if (devices.length === 0) {
      listCont.innerHTML = '<div class="empty-state"><div class="icon">📱</div>Aucun appareil enregistré.</div>';
      return;
    }

    devices.forEach(device => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.onclick = () => app.goTo('device-detail', { deviceId: device.id });
      
      const details = document.createElement('div');
      details.innerHTML = `
        <div class="list-item-title">${device.brand} ${device.model}</div>
        <div class="list-item-sub">${this.categories[device.category] || 'Autre'}</div>
      `;
      
      const arrow = document.createElement('div');
      arrow.className = 'list-item-meta';
      arrow.textContent = '❯';
      
      item.appendChild(details);
      item.appendChild(arrow);
      listCont.appendChild(item);
    });
  },

  // Rechercher des appareils (recherche locale)
  search: function(query) {
    if (!query) {
      this.displayList(this.allDevices);
      return;
    }
    const q = query.toLowerCase();
    const filtered = this.allDevices.filter(d => 
      d.brand.toLowerCase().includes(q) || 
      d.model.toLowerCase().includes(q) ||
      (d.serial && d.serial.toLowerCase().includes(q))
    );
    this.displayList(filtered);
  },

  // Charger la liste des appareils pour un client spécifique (dans la page détail client)
  loadListByClient: function(clientId) {
    dbModule.getAllByIndex('devices', 'clientId', clientId).then(devices => {
      const listCont = document.getElementById('cdDevices');
      if (!listCont) return;
      listCont.innerHTML = '';

      if (devices.length === 0) {
        listCont.innerHTML = '<div style="font-size:0.85rem;color:var(--text-secondary);padding:8px 0">Aucun appareil.</div>';
        return;
      }

      devices.forEach(device => {
        const item = document.createElement('div');
        item.className = 'list-item list-item-sm';
        item.onclick = () => app.goTo('device-detail', { deviceId: device.id });
        item.innerHTML = `
          <div class="list-item-title">${this.categories[device.category].split(' ')[0]} ${device.brand} ${device.model}</div>
          <div class="list-item-meta">❯</div>
        `;
        listCont.appendChild(item);
      });
    });
  },

  // Charger et afficher les détails d'un appareil
  loadDetail: function(deviceId) {
    app.currentDeviceId = deviceId;
    
    dbModule.get('devices', deviceId).then(device => {
      if (!device) {
        console.error('Device not found:', deviceId);
        app.goTo('devices');
        return;
      }

      const content = document.getElementById('ddContent');
      if (!content) return;

      // Chercher le nom du client associé
      let clientName = 'Aucun client';
      dbModule.get('clients', device.clientId).then(client => {
        if (client) {
          clientName = `<a href="#" onclick="app.goTo('client-detail', {clientId:'${client.id}'})">${client.nom} ${client.prenom}</a>`;
        }
        
        content.innerHTML = `
          <h2>${this.categories[device.category].split(' ')[0]} ${device.brand} ${device.model}</h2>
          <p style="margin-top:4px"><span style="color:var(--text-secondary)">Catégorie :</span> ${this.categories[device.category] || 'Autre'}</p>
          <p style="margin-top:2px"><span style="color:var(--text-secondary)">S/N :</span> ${device.serial || 'Non renseigné'}</p>
          <p style="margin-top:2px"><span style="color:var(--text-secondary)">OS :</span> ${device.os || 'Non renseigné'}</p>
          <p style="margin-top:8px"><span style="color:var(--text-secondary)">Client :</span> ${clientName}</p>
          <div style="margin-top:12px;background:var(--bg-card-meta);padding:10px;border-radius:6px;font-size:0.9rem">
            ${device.notes ? '<strong>Notes :</strong><br>' + device.notes : 'Aucune note sur cet appareil.'}
          </div>
        `;
      });
      
      // Charger l'historique des interventions sur cet appareil
      interventionsModule.loadListByDevice(deviceId);
    });
  },

  // Préparer le formulaire pour un nouvel appareil
  resetForm: function(clientId) {
    app.currentDeviceId = null;
    document.getElementById('modalDeviceTitle').textContent = 'Nouvel appareil';
    document.getElementById('btnDeleteDevice').style.display = 'none';
    
    // Vider les champs
    document.getElementById('deviceCategory').value = '';
    document.getElementById('deviceBrand').value = '';
    document.getElementById('deviceModel').value = '';
    document.getElementById('deviceSerial').value = '';
    document.getElementById('deviceOS').value = '';
    document.getElementById('deviceNotes').value = '';

    // Pré-sélectionner le client si fourni (ex: depuis détail client)
    this.populateClientSelect(clientId);
  },

  // Charger les données dans le formulaire pour modification
  loadForm: function(deviceId) {
    dbModule.get('devices', deviceId).then(device => {
      if (!device) return;
      app.currentDeviceId = deviceId;
      document.getElementById('modalDeviceTitle').textContent = 'Modifier appareil';
      document.getElementById('btnDeleteDevice').style.display = 'block';
      
      // Remplir les champs
      document.getElementById('deviceCategory').value = device.category;
      document.getElementById('deviceBrand').value = device.brand;
      document.getElementById('deviceModel').value = device.model;
      document.getElementById('deviceSerial').value = device.serial || '';
      document.getElementById('deviceOS').value = device.os || '';
      document.getElementById('deviceNotes').value = device.notes || '';

      // Charger la liste des clients et sélectionner le bon
      this.populateClientSelect(device.clientId);
    });
  },

  // Remplir la liste déroulante des clients dans le formulaire
  populateClientSelect: function(selectedClientId) {
    const select = document.getElementById('deviceClient');
    if (!select) return;
    select.innerHTML = '<option value="">-- Aucun --</option>';

    dbModule.getAll('clients').then(clients => {
      // Trier par nom
      clients.sort((a, b) => a.nom.localeCompare(b.nom)).forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.nom} ${client.prenom}`;
        if (client.id === selectedClientId) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    });
  },

  // Enregistrer (Création ou Modification)
  save: function() {
    const category = document.getElementById('deviceCategory').value;
    const brand = document.getElementById('deviceBrand').value.trim();
    const model = document.getElementById('deviceModel').value.trim();

    if (!category || !brand || !model) {
      app.showToast('La catégorie, la marque et le modèle sont obligatoires.');
      return;
    }

    const deviceData = {
      id: app.currentDeviceId || Date.now().toString(),
      category: category,
      brand: brand,
      model: model,
      serial: document.getElementById('deviceSerial').value.trim(),
      os: document.getElementById('deviceOS').value.trim(),
      clientId: document.getElementById('deviceClient').value || null,
      notes: document.getElementById('deviceNotes').value.trim(),
      dateCreated: app.currentDeviceId ? undefined : new Date().toISOString()
    };

    dbModule.save('devices', deviceData).then(() => {
      app.showToast(app.currentDeviceId ? 'Appareil modifié !' : 'Appareil créé !');
      app.closeModal('modal-device');
      
      // Rafraîchir l'affichage
      if (app.currentSection === 'devices') {
        this.loadList();
      } else if (app.currentSection === 'device-detail') {
        this.loadDetail(deviceData.id);
      } else if (app.currentSection === 'client-detail' && deviceData.clientId) {
        // Si on a créé l'appareil depuis la fiche client, on rafraîchit la liste des appareils du client
        this.loadListByClient(deviceData.clientId);
      }
    }).catch(error => {
      console.error('Error saving device:', error);
      app.showToast('Erreur lors de l\'enregistrement.');
    });
  },

  // Modifier l'appareil actuel (ouvre la modale depuis les détails)
  editCurrent: function() {
    if (app.currentDeviceId) {
      app.openModal('modal-device', { deviceId: app.currentDeviceId });
    }
  },

  // Supprimer l'appareil actuel
  deleteCurrent: function() {
    if (!app.currentDeviceId) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet appareil ?')) {
      return;
    }

    dbModule.delete('devices', app.currentDeviceId).then(() => {
      app.showToast('Appareil supprimé.');
      app.closeModal('modal-device');
      app.goTo('devices');
    }).catch(error => {
      console.error('Error deleting device:', error);
      app.showToast('Erreur lors de la suppression.');
    });
  }
};
