// js/documentation.js
// Gestion du module Documentation (Mémos techniques, Recherche)

const documentationModule = {
  // Liste locale pour la recherche
  allMemos: [],
  // Catégorie actuellement filtrée
  currentCategory: '',

  init: function() {
    console.log('Documentation module initialized');
    // Charger des données par défaut si la table est vide (première utilisation)
    this.checkAndLoadDefaultMemos();
  },

  // Charger et afficher la liste des mémos
  loadList: function() {
    dbModule.getAll('documentation').then(memos => {
      // Trier par titre par défaut
      this.allMemos = memos.sort((a, b) => a.title.localeCompare(b.title));
      
      // Appliquer le filtre de catégorie si présent
      let filteredMemos = this.allMemos;
      if (this.currentCategory) {
        filteredMemos = this.allMemos.filter(m => m.category === this.currentCategory);
      }
      
      this.displayList(filteredMemos);
    });
  },

  // Afficher la liste dans le HTML
  displayList: function(memos) {
    const listCont = document.getElementById('documentationList');
    if (!listCont) return;
    listCont.innerHTML = '';

    if (memos.length === 0) {
      let message = 'Aucun mémo technique trouvé.';
      if (this.currentCategory) {
        message = `Aucun mémo dans la catégorie "${devicesModule.categories[this.currentCategory] || this.currentCategory}".`;
      }
      listCont.innerHTML = `<div class="empty-state"><div class="icon">📚</div>${message}</div>`;
      return;
    }

    memos.forEach(memo => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cursor = 'pointer';
      // card.onclick = () => this.showMemoDetail(memo.id); // Pour plus tard

      const titleCont = document.createElement('div');
      titleCont.className = 'card-title';
      titleCont.style = 'display:flex;justify-content:space-between;align-items:center';
      
      const categoryIcon = devicesModule.categories[memo.category] ? devicesModule.categories[memo.category].split(' ')[0] : '📄';
      
      titleCont.innerHTML = `
        <span>${categoryIcon} ${memo.title}</span>
        <span style="font-size:0.75rem;color:var(--text-secondary);font-weight:normal">${memo.tags.join(', ')}</span>
      `;
      
      const contentCont = document.createElement('div');
      contentCont.className = 'card-content';
      contentCont.style = 'font-size:0.9rem;white-space:pre-wrap;color:var(--text-secondary)';
      
      // Tronquer le contenu pour l'aperçu si trop long (3 lignes environ)
      let previewContent = memo.content;
      if (previewContent.length > 150) {
        previewContent = previewContent.substring(0, 147) + '...';
      }
      contentCont.textContent = previewContent;

      card.appendChild(titleCont);
      card.appendChild(contentCont);
      listCont.appendChild(card);
    });
  },

  // Rechercher des mémos (recherche locale)
  search: function(query) {
    if (!query) {
      this.loadList(); // Recharger avec filtres éventuels
      return;
    }
    const q = query.toLowerCase();
    
    // Rechercher dans le titre, le contenu et les tags
    const filtered = this.allMemos.filter(m => 
      m.title.toLowerCase().includes(q) || 
      m.content.toLowerCase().includes(q) ||
      m.tags.some(tag => tag.toLowerCase().includes(q))
    );
    
    // Si une catégorie est sélectionnée, on restreint la recherche à cette catégorie
    let finalFiltered = filtered;
    if (this.currentCategory) {
      finalFiltered = filtered.filter(m => m.category === this.currentCategory);
    }
    
    this.displayList(finalFiltered);
  },

  // Filtrer par catégorie
  filter: function(category) {
    this.currentCategory = category;
    
    // Mettre à jour l'état visuel des boutons
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    if (category) {
      // Trouver le bouton cliqué (pas simple sans ID, on utilise le onclick)
      const clickedBtn = Array.from(document.querySelectorAll('.category-btn')).find(btn => btn.getAttribute('onclick').includes(`'${category}'`));
      if (clickedBtn) clickedBtn.classList.add('active');
    } else {
      // Bouton "Tout"
      const allBtn = Array.from(document.querySelectorAll('.category-btn')).find(btn => btn.getAttribute('onclick').includes(`''`));
      if (allBtn) allBtn.classList.add('active');
    }

    this.loadList();
  },

  // --- Initialisation des données par défaut ---
  checkAndLoadDefaultMemos: function() {
    dbModule.getAll('documentation').then(memos => {
      if (memos.length === 0) {
        console.log('Loading default documentation mémos...');
        const defaultMemos = [
          {
            id: 'memo1',
            category: 'ordinateur',
            title: 'Vérification Ordinateur Lent',
            tags: ['performance', 'windows', 'lenteur'],
            content: '1. Vérifier l\'espace disque disponible (min 15%).\n2. Scanner antivirus complet.\n3. Nettoyer les fichiers temporaires (ccleaner ou outil Windows).\n4. Désactiver les programmes inutiles au démarrage (Gestionnaire des tâches > Démarrage).\n5. Vérifier les mises à jour Windows Update.'
          },
          {
            id: 'memo2',
            category: 'smartphone',
            title: 'Configuration E-mail (IMAP/SMTP)',
            tags: ['email', 'configuration', 'smartphone'],
            content: 'Serveur Entrant (IMAP) :\n- Serveur : imap.orange.fr (ou free.fr, etc.)\n- Port : 993\n- Sécurité : SSL/TLS\n\nServeur Sortant (SMTP) :\n- Serveur : smtp.orange.fr\n- Port : 465\n- Sécurité : SSL/TLS\n- Authentification requise.'
          },
          {
            id: 'memo3',
            category: 'reseau',
            title: 'Réinitialisation Box Internet',
            tags: ['internet', 'connexion', 'box'],
            content: '1. Débrancher l\'alimentation électrique de la box.\n2. Attendre 30 secondes.\n3. Rebrancher l\'alimentation.\n4. Attendre le redémarrage complet (voyants fixes).\n5. Si problème persiste, utiliser le bouton "Reset" (trou d\'aiguille) en maintenant 10s.'
          },
          {
            id: 'memo4',
            category: 'photo',
            title: 'Transférer Photos Smartphone vers PC',
            tags: ['photos', 'transfert', 'windows'],
            content: 'Via Câble USB :\n1. Connecter le smartphone au PC via USB.\n2. Sur le smartphone, déverrouiller et choisir le mode "Transfert de fichiers" (ou MTP) dans les notifications USB.\n3. Sur le PC, ouvrir l\'Explorateur de fichiers > Ce PC > [Nom Smartphone] > Internal Storage > DCIM > Camera.\n4. Copier-coller les photos.'
          },
          {
            id: 'memo5',
            category: 'imprimante',
            title: 'Nettoyage Têtes d\'Impression',
            tags: ['imprimante', 'qualité', 'hp'],
            content: 'Généralement via le logiciel de l\'imprimante sur PC ou le panneau de contrôle.\nPour HP :\n1. Ouvrir l\'application "HP Smart" ou le logiciel HP sur le PC.\n2. Aller dans "Paramètres" > "Outils de qualité d\'impression".\n3. Choisir "Nettoyer les têtes d\'impression".'
          },
          {
            id: 'memo6',
            category: 'application',
            title: 'Bloquer un Contact WhatsApp',
            tags: ['whatsapp', 'sécurité', 'bloquer'],
            content: '1. Ouvrir WhatsApp.\n2. Aller dans la discussion avec le contact.\n3. Appuyer sur le nom du contact en haut.\n4. Descendre tout en bas et appuyer sur "Bloquer [Nom]".'
          },
           {
            id: 'memo7',
            category: 'ordinateur',
            title: 'Scanner et réparer les fichiers système Windows',
            tags: ['sfc', 'chkdsk', 'réparation', 'windows'],
            content: '1. Ouvrir l\'invite de commande (cmd) en tant qu\'administrateur.\n2. Taper `sfc /scannow` et appuyer sur Entrée.\n3. Attendre la fin du scan et les réparations.\n4. Pour réparer le disque, taper `chkdsk c: /f /r` et valider (nécessite un redémarrage).'
          },
          {
            id: 'memo8',
            category: 'tablette',
            title: 'Forcer le redémarrage (iPad)',
            tags: ['ipad', 'bloqué', 'reset'],
            content: 'Si l\'iPad est bloqué :\n1. Maintenir enfoncés simultanément le bouton d\'alimentation (haut) et le bouton Home (bas).\n2. Maintenir jusqu\'à ce que le logo Apple apparaisse.\n3. Relâcher les boutons.'
          }
        ];

        // Enregistrer les mémos par défaut
        const promises = defaultMemos.map(memo => dbModule.save('documentation', memo));
        Promise.all(promises).then(() => {
          console.log('Default documentation memos loaded.');
          // Rafraîchir l'affichage si on est sur la bonne section
          if (app.currentSection === 'documentation') this.loadList();
        });
      }
    });
  }
};
