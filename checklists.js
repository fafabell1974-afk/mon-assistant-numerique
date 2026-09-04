// js/checklists.js
// Gestion du module Checklists (Modèles, Utilisation dans les interventions)

const checklistsModule = {
  // Liste locale pour la recherche
  allChecklists: [],

  init: function() {
    console.log('Checklists module initialized');
    // Charger des données par défaut si la table est vide
    this.checkAndLoadDefaultChecklists();
  },

  // Charger et afficher la liste des modèles de checklists
  loadList: function() {
    dbModule.getAll('checklists').then(checklists => {
      // Trier par titre par défaut
      this.allChecklists = checklists.sort((a, b) => a.title.localeCompare(b.title));
      this.displayList(this.allChecklists);
    });
  },

  // Afficher la liste dans le HTML
  displayList: function(checklists) {
    const listCont = document.getElementById('checklistsList');
    if (!listCont) return;
    listCont.innerHTML = '';

    if (checklists.length === 0) {
      listCont.innerHTML = '<div class="empty-state"><div class="icon">📋</div>Aucun modèle de checklist enregistré.</div>';
      return;
    }

    checklists.forEach(cl => {
      const card = document.createElement('div');
      card.className = 'card';
      // card.onclick = () => this.showMemoDetail(cl.id); // Pour plus tard

      const titleCont = document.createElement('div');
      titleCont.className = 'card-title';
      titleCont.textContent = `📋 ${cl.title}`;
      
      const contentCont = document.createElement('div');
      contentCont.className = 'card-content';
      
      // Afficher les premières tâches pour l'aperçu
      const itemsList = document.createElement('ul');
      itemsList.style = 'font-size:0.85rem;color:var(--text-secondary);list-style:none;padding:0;margin:0';
      
      const maxItems = 3;
      cl.items.slice(0, maxItems).forEach(item => {
        const li = document.createElement('li');
        li.textContent = `⬛ ${item.task}`;
        itemsList.appendChild(li);
      });
      
      if (cl.items.length > maxItems) {
        const li = document.createElement('li');
        li.textContent = `... (+${cl.items.length - maxItems} autres)`;
        li.style.fontStyle = 'italic';
        itemsList.appendChild(li);
      }
      
      contentCont.appendChild(itemsList);

      const btnRow = document.createElement('div');
      btnRow.className = 'btn-row';
      btnRow.style = 'margin-top:10px';
      
      const useBtn = document.createElement('button');
      useBtn.className = 'btn btn-secondary btn-sm';
      useBtn.textContent = '➕ Utiliser dans une intervention';
      useBtn.onclick = () => interventionsModule.addChecklistToWizard(cl);
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger btn-sm';
      deleteBtn.textContent = '🗑️';
      deleteBtn.onclick = () => this.delete(cl.id);
      
      btnRow.appendChild(useBtn);
      btnRow.appendChild(deleteBtn);
      
      card.appendChild(titleCont);
      card.appendChild(contentCont);
      card.appendChild(btnRow);
      listCont.appendChild(card);
    });
  },

  // Créer une nouvelle checklist (ouvre le wizard)
  create: function() {
    app.showToast('Fonctionnalité non implémentée dans cette version simplifiée.');
    // Dans une version complète, ceci ouvrirait un formulaire pour créer une checklist
  },
  
  // Supprimer un modèle de checklist
  delete: function(checklistId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce modèle de checklist ?')) {
      return;
    }

    dbModule.delete('checklists', checklistId).then(() => {
      app.showToast('Modèle supprimé.');
      this.loadList();
    }).catch(error => {
      console.error('Error deleting checklist model:', error);
      app.showToast('Erreur lors de la suppression.');
    });
  },

  // --- Initialisation des données par défaut ---
  checkAndLoadDefaultChecklists: function() {
    dbModule.getAll('checklists').then(checklists => {
      if (checklists.length === 0) {
        console.log('Loading default checklist models...');
        const defaultChecklists = [
          {
            id: 'cl1',
            date: new Date().toISOString(),
            title: 'Vérification Ordinateur Lent',
            items: [
              { task: 'Vérifier espace disque disponible (min 15%)', done: false },
              { task: 'Scanner antivirus complet (Windows Defender)', done: false },
              { task: 'Nettoyer fichiers temporaires (Outil Windows)', done: false },
              { task: 'Désactiver programmes inutiles au démarrage (Gestionnaire)', done: false },
              { task: 'Vérifier mises à jour Windows Update', done: false },
              { task: 'Vérifier état de santé disque dur (CrystalDiskInfo/SMART)', done: false },
              { task: 'Lancer nettoyage de disque approfondi', done: false }
            ]
          },
          {
            id: 'cl2',
            date: new Date().toISOString(),
            title: 'Configuration E-mail',
            items: [
              { task: 'Recueillir adresse e-mail complète', done: false },
              { task: 'Recueillir mot de passe du compte', done: false },
              { task: 'Identifier les serveurs (IMAP/SMTP/POP)', done: false },
              { task: 'Configurer serveur entrant (IMAP/Port/Sécurité)', done: false },
              { task: 'Configurer serveur sortant (SMTP/Port/Sécurité)', done: false },
              { task: 'Tester envoi d\'e-mail (Sortant)', done: false },
              { task: 'Tester réception d\'e-mail (Entrant)', done: false },
              { task: 'Configurer synchronisation (Calendrier/Contacts)', done: false }
            ]
          },
          {
            id: 'cl3',
            date: new Date().toISOString(),
            title: 'Installation Imprimante Wi-Fi',
            items: [
              { task: 'Connecter l\'imprimante au secteur', done: false },
              { task: 'Recueillir SSID et clé Wi-Fi du client', done: false },
              { task: 'Connecter l\'imprimante au Wi-Fi (via écran/bouton WPS)', done: false },
              { task: 'Vérifier connexion sur l\'imprimante (adresse IP)', done: false },
              { task: 'Installer pilotes/application sur l\'ordinateur du client', done: false },
              { task: 'Installer application sur le smartphone/tablette (HP Smart/Epson iPrint)', done: false },
              { task: 'Lancer impression test depuis PC', done: false },
              { task: 'Lancer impression test depuis smartphone', done: false },
              { task: 'Lancer scan test vers PC', done: false }
            ]
          },
          {
            id: 'cl4',
            date: new Date().toISOString(),
            title: 'Premiers Pas Smartphone',
            items: [
              { task: 'Recueillir/Créer compte Google (ou Apple ID)', done: false },
              { task: 'Configurer Wi-Fi du client', done: false },
              { task: 'Configurer synchronisation Google Contacts', done: false },
              { task: 'Désinstaller applications inutiles (bloatware)', done: false },
              { task: 'Installer WhatsApp et migrer les discussions', done: false },
              { task: 'Installer applications bancaires/transport', done: false },
              { task: 'Configurer application E-mail Orange', done: false },
              { task: 'Expliquer gestes de base (Accueil/Retour/Menu)', done: false },
              { task: 'Expliquer gestion volume et luminosité', done: false },
              { task: 'Configurer sauvegarde automatique (Photos)', done: false }
            ]
          }
        ];

        // Enregistrer les checklists par défaut
        const promises = defaultChecklists.map(cl => dbModule.save('checklists', cl));
        Promise.all(promises).then(() => {
          console.log('Default checklist models loaded.');
          // Rafraîchir l'affichage si on est sur la bonne section
          if (app.currentSection === 'checklists') this.loadList();
        });
      }
    });
  }
};
