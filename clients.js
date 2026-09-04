// js/clients.js
// Gestion du module Clients (Liste, Formulaire, Détails)

const clientsModule = {
  // Liste locale pour la recherche sans requêter la DB à chaque touche
  allClients: [],

  init: function() {
    console.log('Clients module initialized');
  },

  // Charger et afficher la liste complète des clients
  loadList: function() {
    dbModule.getAll('clients').then(clients => {
      // Trier par nom par défaut
      this.allClients = clients.sort((a, b) => a.nom.localeCompare(b.nom));
      this.displayList(this.allClients);
    });
  },

  // Afficher la liste dans le HTML
  displayList: function(clients) {
    const listCont = document.getElementById('clientsList');
    if (!listCont) return;
    listCont.innerHTML = '';

    if (clients.length === 0) {
      listCont.innerHTML = '<div class="empty-state"><div class="icon">👤</div>Auncun client enregistré.</div>';
      return;
    }

    clients.forEach(client => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.onclick = () => app.goTo('client-detail', { clientId: client.id });
      
      const details = document.createElement('div');
      details.innerHTML = `
        <div class="list-item-title">${client.nom} ${client.prenom}</div>
        <div class="list-item-sub">${client.phone || client.email || 'Pas de contact'}</div>
      `;
      
      const arrow = document.createElement('div');
      arrow.className = 'list-item-meta';
      arrow.textContent = '❯';
      
      item.appendChild(details);
      item.appendChild(arrow);
      listCont.appendChild(item);
    });
  },

  // Rechercher des clients (recherche locale)
  search: function(query) {
    if (!query) {
      this.displayList(this.allClients);
      return;
    }
    const q = query.toLowerCase();
    const filtered = this.allClients.filter(c => 
      c.nom.toLowerCase().includes(q) || 
      c.prenom.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
    this.displayList(filtered);
  },

  // Charger et afficher les détails d'un client
  loadDetail: function(clientId) {
    app.currentClientId = clientId;
    
    dbModule.get('clients', clientId).then(client => {
      if (!client) {
        console.error('Client not found:', clientId);
        app.goTo('clients');
        return;
      }

      // Remplir les informations de base
      document.getElementById('cdName').textContent = `${client.nom} ${client.prenom}`;
      document.getElementById('cdContact').textContent = `${client.phone || ''} ${client.email ? ' - ' + client.email : ''}`;
      document.getElementById('cdAddress').textContent = client.address || 'Pas d\'adresse';
      document.getElementById('cdNotes').textContent = client.notes || '';

      // Charger les appareils du client
      devicesModule.loadListByClient(clientId);
      
      // Charger l'historique des interventions du client
      interventionsModule.loadListByClient(clientId);
    });
  },

  // Préparer le formulaire pour un nouveau client
  resetForm: function() {
    app.currentClientId = null;
    document.getElementById('modalClientTitle').textContent = 'Nouveau client';
    document.getElementById('btnDeleteClient').style.display = 'none';
    
    // Vider les champs
    document.getElementById('clientNom').value = '';
    document.getElementById('clientPrenom').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientAddress').value = '';
    document.getElementById('clientNotes').value = '';
  },

  // Charger les données dans le formulaire pour modification
  loadForm: function(clientId) {
    dbModule.get('clients', clientId).then(client => {
      if (!client) return;
      app.currentClientId = clientId;
      document.getElementById('modalClientTitle').textContent = 'Modifier client';
      document.getElementById('btnDeleteClient').style.display = 'block';
      
      // Remplir les champs
      document.getElementById('clientNom').value = client.nom;
      document.getElementById('clientPrenom').value = client.prenom;
      document.getElementById('clientPhone').value = client.phone || '';
      document.getElementById('clientEmail').value = client.email || '';
      document.getElementById('clientAddress').value = client.address || '';
      document.getElementById('clientNotes').value = client.notes || '';
    });
  },

  // Enregistrer (Création ou Modification)
  save: function() {
    const nom = document.getElementById('clientNom').value.trim();
    const prenom = document.getElementById('clientPrenom').value.trim();

    if (!nom || !prenom) {
      app.showToast('Le nom et le prénom sont obligatoires.');
      return;
    }

    const clientData = {
      id: app.currentClientId || Date.now().toString(), // Créer un ID unique si nouveau
      nom: nom,
      prenom: prenom,
      phone: document.getElementById('clientPhone').value.trim(),
      email: document.getElementById('clientEmail').value.trim().toLowerCase(),
      address: document.getElementById('clientAddress').value.trim(),
      notes: document.getElementById('clientNotes').value.trim(),
      dateCreated: app.currentClientId ? undefined : new Date().toISOString()
    };

    dbModule.save('clients', clientData).then(() => {
      app.showToast(app.currentClientId ? 'Client modifié !' : 'Client créé !');
      app.closeModal('modal-client');
      
      // Rafraîchir l'affichage
      if (app.currentSection === 'clients') {
        this.loadList();
      } else if (app.currentSection === 'client-detail') {
        this.loadDetail(clientData.id);
      } else if (app.currentSection === 'dashboard') {
        app.loadDashboardStats();
      }
    }).catch(error => {
      console.error('Error saving client:', error);
      app.showToast('Erreur lors de l\'enregistrement.');
    });
  },

  // Modifier le client actuel (ouvre la modale depuis les détails)
  editCurrent: function() {
    if (app.currentClientId) {
      app.openModal('modal-client', { clientId: app.currentClientId });
    }
  },

  // Supprimer le client actuel
  deleteCurrent: function() {
    if (!app.currentClientId) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ? Tous ses appareils et interventions liés seront conservés mais orphelins.')) {
      return;
    }

    dbModule.delete('clients', app.currentClientId).then(() => {
      app.showToast('Client supprimé.');
      app.closeModal('modal-client');
      app.goTo('clients');
    }).catch(error => {
      console.error('Error deleting client:', error);
      app.showToast('Erreur lors de la suppression.');
    });
  },

  // Afficher la petite liste sur le tableau de bord
  displayDashboardList: function(clients) {
    const listCont = document.getElementById('dashboardClients');
    if (!listCont) return;
    listCont.innerHTML = '';

    // Prendre les 3 derniers créés
    const lastClients = clients
      .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
      .slice(0, 3);

    if (lastClients.length === 0) {
      listCont.innerHTML = '<div style="font-size:0.8rem;color:var(--text-secondary);text-align:center;padding:10px">Aucun client.</div>';
      return;
    }

    lastClients.forEach(client => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.style.padding = '10px';
      item.onclick = () => app.goTo('client-detail', { clientId: client.id });
      item.innerHTML = `
        <div class="list-item-title" style="font-size:0.85rem">${client.nom} ${client.prenom}</div>
        <div class="list-item-meta">❯</div>
      `;
      listCont.appendChild(item);
    });
  }
};
