// js/app.js
// Logique principale de l'application et gestion de la navigation

const app = {
  currentSection: 'dashboard',
  currentClientId: null,
  currentDeviceId: null,
  currentInterventionId: null,

  init: function() {
    console.log('App initialization...');
    
    // Initialisation des modules
    dbModule.init();
    clientsModule.init();
    devicesModule.init();
    interventionsModule.init();
    documentationModule.init();
    checklistsModule.init();
    aiModule.init();
    googleDriveModule.init();
    backupModule.init();
    securityModule.init();
    settingsModule.init();

    // Gestion du statut en ligne/hors ligne
    window.addEventListener('online', this.updateOnlineStatus.bind(this));
    window.addEventListener('offline', this.updateOnlineStatus.bind(this));
    this.updateOnlineStatus();

    // Charger les stats du tableau de bord
    this.loadDashboardStats();

    // Vérifier si un code PIN est requis
    securityModule.checkPinRequired();
  },

  // Gestion de la navigation entre les sections
  goTo: function(sectionId, data) {
    console.log(`Navigating to section: ${sectionId}`);
    
    // Cacher toutes les sections
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    // Afficher la section demandée
    const targetSection = document.getElementById(`sec-${sectionId}`);
    if (targetSection) {
      targetSection.classList.add('active');
    } else {
      console.error(`Section not found: sec-${sectionId}`);
      return;
    }

    // Mettre à jour l'état de la navigation du bas
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-target="${sectionId}"]`);
    if (navItem) {
      navItem.classList.add('active');
    }

    // Mettre à jour l'URL (optionnel, mais utile pour le bouton 'retour')
    // history.pushState({ section: sectionId }, '', `#${sectionId}`);

    this.currentSection = sectionId;

    // Charger les données spécifiques à la section si nécessaire
    switch(sectionId) {
      case 'dashboard':
        this.loadDashboardStats();
        break;
      case 'clients':
        clientsModule.loadList();
        break;
      case 'devices':
        devicesModule.loadList();
        break;
      case 'interventions':
        interventionsModule.loadList();
        break;
      case 'documentation':
        documentationModule.loadList();
        break;
      case 'checklists':
        checklistsModule.loadList();
        break;
      case 'settings':
        settingsModule.load();
        break;
      case 'ai':
        aiModule.resetForm();
        break;
      case 'intervention-wizard':
        // Lancer l'assistant d'intervention si les données sont fournies
        if (data && data.clientId) {
          interventionsModule.startWizard(data.clientId, data.deviceId);
        } else if (!data) {
          interventionsModule.startWizard();
        }
        break;
      case 'client-detail':
        if (data && data.clientId) {
          clientsModule.loadDetail(data.clientId);
        }
        break;
      case 'device-detail':
        if (data && data.deviceId) {
          devicesModule.loadDetail(data.deviceId);
        }
        break;
      case 'intervention-detail':
        if (data && data.interventionId) {
          interventionsModule.loadDetail(data.interventionId);
        }
        break;
    }
  },

  // Charger les statistiques sur le tableau de bord
  loadDashboardStats: function() {
    dbModule.getAll('clients').then(clients => {
      document.getElementById('statClients').textContent = clients.length;
      clientsModule.displayDashboardList(clients);
    });

    dbModule.getAll('interventions').then(interventions => {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayInterventions = interventions.filter(int => int.date.startsWith(todayStr));
      const doneInterventions = interventions.filter(int => int.status === 'resolu');
      const pendingInterventions = interventions.filter(int => int.status === 'en-cours');

      document.getElementById('statToday').textContent = todayInterventions.length;
      document.getElementById('statDone').textContent = doneInterventions.length;
      document.getElementById('statPending').textContent = pendingInterventions.length;

      interventionsModule.displayDashboardList(interventions);
    });
  },

  // Afficher les notifications (toasts)
  showToast: function(message) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  },

  // Gestion de l'état de connexion
  updateOnlineStatus: function() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    if (!statusDot || !statusText) return;

    if (navigator.onLine) {
      statusDot.classList.add('online');
      statusText.textContent = 'En ligne';
    } else {
      statusDot.classList.remove('online');
      statusText.textContent = 'Hors ligne';
    }
  },

  // Ouvrir une modale
  openModal: function(modalId, data) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      
      // Gérer l'état de la modale en fonction des données fournies
      if (modalId === 'modal-client') {
        if (data && data.clientId) {
          clientsModule.loadForm(data.clientId);
        } else {
          clientsModule.resetForm();
        }
      } else if (modalId === 'modal-device') {
        if (data && data.deviceId) {
          devicesModule.loadForm(data.deviceId);
        } else if (data && data.clientId) {
          devicesModule.resetForm(data.clientId);
        } else {
          devicesModule.resetForm();
        }
      } else if (modalId === 'modal-filters') {
        interventionsModule.loadFilters();
      }
    } else {
      console.error(`Modal not found: ${modalId}`);
    }
  },

  // Fermer une modale
  closeModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }
};

// Initialisation de l'application au chargement de la page
window.addEventListener('DOMContentLoaded', app.init.bind(app));

// Gestion du bouton 'retour' du navigateur
window.addEventListener('popstate', (event) => {
  if (event.state && event.state.section) {
    // Si un code PIN est requis, ne pas autoriser la navigation via popstate
    if (securityModule.pinRequired) {
      app.goTo('dashboard'); // Rediriger vers le tableau de bord verrouillé
      return;
    }
    app.goTo(event.state.section, null, true); // true = ne pas pousser un nouvel état
  } else {
    app.goTo('dashboard', null, true);
  }
});
