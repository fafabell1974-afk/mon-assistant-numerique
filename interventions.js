// js/interventions.js
// Gestion du module Interventions (Liste, Détails, Assistant/Wizard)

const interventionsModule = {
  // Liste locale pour la recherche
  allInterventions: [],
  // Liste des filtres actuels
  filters: { client: '', status: '', category: '' },
  
  // Dictionnaire des statuts avec leurs labels et classes CSS
  statusMap: {
    'en-cours': { label: 'En cours', class: 'status-pending' },
    'resolu': { label: 'Résolu', class: 'status-done' },
    'non-resolu': { label: 'Non résolu', class: 'status-failed' },
    'a-revoir': { label: 'À revoir', class: 'status-review' }
  },

  init: function() {
    console.log('Interventions module initialized');
  },

  // Charger et afficher la liste complète des interventions
  loadList: function() {
    dbModule.getAll('interventions').then(interventions => {
      // Trier par date décroissante (plus récente en premier)
      this.allInterventions = interventions.sort((a, b) => new Date(b.date) - new Date(a.date));
      this.displayList(this.allInterventions);
    });
  },

  // Afficher la liste dans le HTML
  displayList: function(interventions) {
    const listCont = document.getElementById('interventionsList');
    if (!listCont) return;
    listCont.innerHTML = '';

    if (interventions.length === 0) {
      listCont.innerHTML = '<div class="empty-state"><div class="icon">🔧</div>Aucune intervention enregistrée.</div>';
      return;
    }

    interventions.forEach(int => {
      const item = document.createElement('div');
      item.className = 'list-item';
      item.onclick = () => app.goTo('intervention-detail', { interventionId: int.id });
      
      const details = document.createElement('div');
      details.innerHTML = `
        <div class="list-item-title">${int.title}</div>
        <div class="list-item-sub">${new Date(int.date).toLocaleDateString('fr-FR')} ${int.clientNom ? ' - ' + int.clientNom : ''}</div>
      `;
      
      const meta = document.createElement('div');
      meta.className = 'list-item-meta';
      
      const statusSpan = document.createElement('span');
      const statusInfo = this.statusMap[int.status] || { label: int.status, class: '' };
      statusSpan.className = `status-badge ${statusInfo.class}`;
      statusSpan.textContent = statusInfo.label;
      
      const arrow = document.createTextNode(' ❯');
      
      meta.appendChild(statusSpan);
      meta.appendChild(arrow);
      item.appendChild(details);
      item.appendChild(meta);
      listCont.appendChild(item);
    });
  },

  // Charger l'historique des interventions pour un client
  loadListByClient: function(clientId) {
    dbModule.getAllByIndex('interventions', 'clientId', clientId).then(interventions => {
      this.displayDetailList(interventions, 'cdHistory');
    });
  },

  // Charger l'historique des interventions pour un appareil
  loadListByDevice: function(deviceId) {
    dbModule.getAllByIndex('interventions', 'deviceId', deviceId).then(interventions => {
      this.displayDetailList(interventions, 'ddInterventions');
    });
  },

  // Afficher une liste simplifiée (pour les fiches détails)
  displayDetailList: function(interventions, containerId) {
    const listCont = document.getElementById(containerId);
    if (!listCont) return;
    listCont.innerHTML = '';

    if (interventions.length === 0) {
      listCont.innerHTML = '<div style="font-size:0.85rem;color:var(--text-secondary);padding:8px 0">Aucune intervention.</div>';
      return;
    }

    interventions.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(int => {
      const item = document.createElement('div');
      item.className = 'list-item list-item-sm';
      item.onclick = () => app.goTo('intervention-detail', { interventionId: int.id });
      
      const statusInfo = this.statusMap[int.status] || { label: int.status, class: '' };
      
      item.innerHTML = `
        <div class="list-item-title">${new Date(int.date).toLocaleDateString('fr-FR')} - ${int.title}</div>
        <div class="list-item-meta">
          <span class="status-badge status-badge-sm ${statusInfo.class}">${statusInfo.label}</span> ❯
        </div>
      `;
      listCont.appendChild(item);
    });
  },

  // Charger et afficher les détails d'une intervention
  loadDetail: function(interventionId) {
    app.currentInterventionId = interventionId;
    
    dbModule.get('interventions', interventionId).then(int => {
      if (!int) {
        console.error('Intervention not found:', interventionId);
        app.goTo('interventions');
        return;
      }

      const content = document.getElementById('idContent');
      if (!content) return;

      const statusInfo = this.statusMap[int.status] || { label: int.status, class: '' };
      
      // Chercher les infos client et appareil en parallèle
      Promise.all([
        int.clientId ? dbModule.get('clients', int.clientId) : Promise.resolve(null),
        int.deviceId ? dbModule.get('devices', int.deviceId) : Promise.resolve(null)
      ]).then(([client, device]) => {
        
        let clientHtml = '<span style="color:var(--text-secondary)">Aucun client associé</span>';
        if (client) {
          clientHtml = `<a href="#" onclick="app.goTo('client-detail', {clientId:'${client.id}'})">${client.nom} ${client.prenom}</a>`;
        }

        let deviceHtml = '<span style="color:var(--text-secondary)">Aucun appareil associé</span>';
        if (device) {
          deviceHtml = `<a href="#" onclick="app.goTo('device-detail', {deviceId:'${device.id}'})">${device.brand} ${device.model}</a>`;
        }

        // Formater les checklists si présentes
        let checklistsHtml = '';
        if (int.checklists && int.checklists.length > 0) {
          checklistsHtml = '<div style="margin-top:12px"><strong>Checklists :</strong><ul style="margin-top:4px;list-style:none;padding:0">';
          int.checklists.forEach(cl => {
            checklistsHtml += `<li style="font-size:0.85rem;margin-bottom:2px"> ${cl.done ? '✅' : '⬛'} ${cl.title}</li>`;
          });
          checklistsHtml += '</ul></div>';
        }
        
        // Formater les photos si présentes
        let photosHtml = '';
        if (int.photos && int.photos.length > 0) {
          photosHtml = '<div style="margin-top:12px"><strong>Photos :</strong><div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(80px, 1fr));gap:6px;margin-top:4px">';
          int.photos.forEach(photoBase64 => {
            photosHtml += `<img src="${photoBase64}" style="width:100%;height:60px;object-fit:cover;border-radius:4px" onclick="app.openPhotoViewer('${photoBase64}')">`;
          });
          photosHtml += '</div></div>';
        }

        content.innerHTML = `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:start">
              <h2>${int.title}</h2>
              <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
            </div>
            <p style="margin-top:4px"><span style="color:var(--text-secondary)">Date :</span> ${new Date(int.date).toLocaleString('fr-FR')}</p>
            <p style="margin-top:8px"><span style="color:var(--text-secondary)">Client :</span> ${clientHtml}</p>
            <p style="margin-top:2px"><span style="color:var(--text-secondary)">Appareil :</span> ${deviceHtml}</p>
            <p style="margin-top:2px"><span style="color:var(--text-secondary)">Durée :</span> ${int.duration} min</p>
          </div>
          
          <div class="card">
            <p><strong>Description du problème :</strong></p>
            <p style="font-size:0.9rem;margin-top:4px;white-space:pre-wrap">${int.description}</p>
          </div>
          
          <div class="card">
            <p><strong>Diagnostic / Solution technique :</strong></p>
            <p style="font-size:0.9rem;margin-top:4px;white-space:pre-wrap;color:var(--primary)">${int.diagnostic || 'Non renseigné'}</p>
          </div>
          
          <div class="card">
            <p><strong>Actions effectuées :</strong></p>
            <p style="font-size:0.9rem;margin-top:4px;white-space:pre-wrap">${int.actions}</p>
            ${checklistsHtml}
            ${photosHtml}
          </div>
          
          <div class="card">
            <p><strong>Compte-rendu pour le client :</strong></p>
            <p style="font-size:0.9rem;margin-top:4px;white-space:pre-wrap;background:var(--bg);padding:10px;border-radius:4px">${int.compteRenduClient}</p>
          </div>
          
          <div class="btn-row" style="margin-top:16px">
            <button class="btn btn-primary" onclick="interventionsModule.resumeWizard('${int.id}')" ${int.status === 'resolu' ? 'disabled' : ''}>✏️ Modifier / Continuer</button>
            <button class="btn btn-danger" onclick="interventionsModule.deleteCurrent()">🗑️ Supprimer</button>
          </div>
        `;
      });
    });
  },

  // === WIZARD (ASSISTANT ÉTAPE PAR ÉTAPE) ===

  wizardData: {}, // Stockage temporaire des données du wizard
  currentStep: 1,
  
  // Démarrer le wizard
  startWizard: function(clientId, deviceId) {
    this.currentStep = 1;
    this.wizardData = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      clientId: clientId || null,
      deviceId: deviceId || null,
      status: 'en-cours',
      checklists: [],
      photos: []
    };
    app.goTo('intervention-wizard');
    this.showStep(1);
  },
  
  // Reprendre un wizard (depuis la fiche détail)
  resumeWizard: function(interventionId) {
    dbModule.get('interventions', interventionId).then(int => {
      if (!int) return;
      this.currentStep = 1;
      this.wizardData = int;
      app.goTo('intervention-wizard');
      this.showStep(1);
    });
  },

  // Afficher une étape spécifique du wizard
  showStep: function(step) {
    this.currentStep = step;
    
    // Mettre à jour l'en-tête du wizard (steps)
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`ws${step}`).classList.add('active');
    
    // Charger le contenu de l'étape
    this.loadStepContent(step);
  },
  
  nextStep: function() {
    this.saveCurrentStepData(); // Enregistrer les données de l'étape actuelle
    this.showStep(this.currentStep + 1);
  },
  
  prevStep: function() {
    this.saveCurrentStepData();
    this.showStep(this.currentStep - 1);
  },

  // Charger le HTML de l'étape
  loadStepContent: function(step) {
    const cont = document.getElementById('wizardContent');
    cont.innerHTML = '';
    
    let html = '';
    
    switch(step) {
      case 1: // Sélection du Client
        html = `
          <h3>Étape 1 : Qui est le client ?</h3>
          <div class="form-group">
            <select id="wzClient" onchange="interventionsModule.onWizardClientChange(this.value)">
              <option value="">-- Choisir un client --</option>
              <option value="NEW">➕ Nouveau client</option>
            </select>
          </div>
          <div class="btn-row" style="margin-top:16px">
            <button class="btn btn-primary" onclick="interventionsModule.nextStep()" id="wzNext1" disabled>Suivant →</button>
          </div>
        `;
        cont.innerHTML = html;
        this.populateClientSelect();
        break;
        
      case 2: // Sélection de l'Appareil
        html = `
          <h3>Étape 2 : Sur quel appareil ?</h3>
          <p style="font-size:0.85rem;margin-bottom:8px">Client : <strong id="wzClientName">...</strong></p>
          <div class="form-group">
            <select id="wzDevice" onchange="interventionsModule.onWizardDeviceChange(this.value)">
              <option value="">-- Choisir un appareil --</option>
              <option value="NEW">➕ Nouvel appareil</option>
              <option value="NONE">❌ Pas d'appareil spécifique</option>
            </select>
          </div>
          <div class="btn-row" style="margin-top:16px">
            <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
            <button class="btn btn-primary" onclick="interventionsModule.nextStep()" id="wzNext2" disabled>Suivant →</button>
          </div>
        `;
        cont.innerHTML = html;
        this.populateDeviceSelect();
        break;
        
      case 3: // Description du Problème
        html = `
          <h3>Étape 3 : Quel est le problème ?</h3>
          <div class="form-group">
            <label>Titre rapide (Ex: Problème imprimante)</label>
            <input type="text" id="wzTitle" placeholder="Donnez un titre à cette intervention">
          </div>
          <div class="form-group">
            <label>Description détaillée (Les mots du client)</label>
            <textarea id="wzDescription" style="height:150px" placeholder="Que se passe-t-il ? Que fait l'appareil (ou pas) ?"></textarea>
          </div>
          <div class="btn-row" style="margin-top:16px">
            <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
            <button class="btn btn-primary" onclick="interventionsModule.nextStep()">Suivant →</button>
          </div>
        `;
        cont.innerHTML = html;
        // Remplir si données déjà présentes
        if (this.wizardData.title) document.getElementById('wzTitle').value = this.wizardData.title;
        if (this.wizardData.description) document.getElementById('wzDescription').value = this.wizardData.description;
        break;
        
      case 4: // Diagnostic / Solution technique
        html = `
          <h3>Étape 4 : Diagnostic technique</h3>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px">Ce que vous avez trouvé, la solution technique.</p>
          <div class="form-group">
            <textarea id="wzDiagnostic" style="height:200px;color:var(--primary)" placeholder="Expliquez techniquement le problème et la solution à apporter."></textarea>
          </div>
          <div class="btn-row" style="margin-top:16px">
            <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
            <button class="btn btn-primary" onclick="interventionsModule.nextStep()">Suivant →</button>
          </div>
        `;
        cont.innerHTML = html;
        if (this.wizardData.diagnostic) document.getElementById('wzDiagnostic').value = this.wizardData.diagnostic;
        break;
        
      case 5: // Aide à la recherche (IA / Doc)
        html = `
          <h3>Étape 5 : Outils d'aide</h3>
          <div class="btn-row">
            <button class="btn btn-secondary" onclick="app.goTo('ai', {prompt: interventionsModule.wizardData.description, clientId: interventionsModule.wizardData.clientId, deviceId: interventionsModule.wizardData.deviceId})">🤖 Demander à l'IA</button>
            <button class="btn btn-secondary" onclick="app.goTo('documentation')">📚 Voir la documentation</button>
          </div>
          <p style="margin-top:16px;font-size:0.85rem;color:var(--text-secondary)">Appuyez sur "Suivant" une fois votre recherche terminée.</p>
          <div class="btn-row" style="margin-top:16px">
            <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
            <button class="btn btn-primary" onclick="interventionsModule.nextStep()">Suivant →</button>
          </div>
        `;
        cont.innerHTML = html;
        break;
        
      case 6: // Actions effectuées (Checklists, Photos)
        html = `
          <h3>Étape 6 : Intervention en cours</h3>
          <div class="form-group">
            <label>Durée estimée (minutes)</label>
            <input type="number" id="wzDuration" value="30" step="15" min="15">
          </div>
          <div class="form-group">
            <label>Actions effectuées</label>
            <textarea id="wzActions" style="height:120px" placeholder="Décrivez les manipulations faites..."></textarea>
          </div>
          
          <div style="margin-top:16px">
            <button class="btn btn-sm btn-secondary" onclick="interventionsModule.openChecklistSelection()">📋 Ajouter checklist</button>
            <div id="wzChecklistsCont" style="margin-top:8px"></div>
          </div>
          
          <div style="margin-top:16px">
            <button class="btn btn-sm btn-secondary" onclick="interventionsModule.capturePhoto()">📷 Prendre photo</button>
            <div id="wzPhotosCont" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(70px, 1fr));gap:6px;margin-top:8px"></div>
          </div>
          
          <div class="btn-row" style="margin-top:16px">
            <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
            <button class="btn btn-primary" onclick="interventionsModule.nextStep()">Suivant →</button>
          </div>
        `;
        cont.innerHTML = html;
        if (this.wizardData.duration) document.getElementById('wzDuration').value = this.wizardData.duration;
        if (this.wizardData.actions) document.getElementById('wzActions').value = this.wizardData.actions;
        this.updateWizardChecklistsDisplay();
        this.updateWizardPhotosDisplay();
        break;
        
      case 7: // Compte-rendu Client et Statut
        html = `
          <h3>Étape 7 : Compte-rendu pour le client</h3>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:8px">Rédigez le texte qui sera affiché sur la facture ou le rapport.</p>
          <div class="form-group">
            <textarea id="wzCRClient" style="height:180px" placeholder="Monsieur, j'ai effectué... La solution est..."></textarea>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="interventionsModule.generateClientCR()">🤖 Générer via IA</button>
          
          <div class="form-group" style="margin-top:16px">
            <label>Statut final de l'intervention</label>
            <select id="wzStatus">
              <option value="en-cours" class="status-pending">En cours</option>
              <option value="resolu" class="status-done">✅ Résolu</option>
              <option value="non-resolu" class="status-failed">❌ Non résolu</option>
              <option value="a-revoir" class="status-review">À revoir</option>
            </select>
          </div>
          
          <div class="btn-row" style="margin-top:20px">
            <button class="btn btn-secondary" onclick="interventionsModule.prevStep()">← Précédent</button>
            <button class="btn btn-success" onclick="interventionsModule.finishWizard()">💾 Terminer & Enregistrer</button>
          </div>
        `;
        cont.innerHTML = html;
        if (this.wizardData.compteRenduClient) document.getElementById('wzCRClient').value = this.wizardData.compteRenduClient;
        if (this.wizardData.status) document.getElementById('wzStatus').value = this.wizardData.status;
        break;
    }
  },
  
  // Enregistrer les données de l'étape actuelle avant de changer
  saveCurrentStepData: function() {
    switch(this.currentStep) {
      case 1:
        this.wizardData.clientId = document.getElementById('wzClient').value;
        if (this.wizardData.clientId === 'NEW') this.wizardData.clientId = null;
        break;
      case 2:
        this.wizardData.deviceId = document.getElementById('wzDevice').value;
        if (this.wizardData.deviceId === 'NONE') this.wizardData.deviceId = null;
        if (this.wizardData.deviceId === 'NEW') this.wizardData.deviceId = null;
        break;
      case 3:
        this.wizardData.title = document.getElementById('wzTitle').value.trim();
        this.wizardData.description = document.getElementById('wzDescription').value.trim();
        break;
      case 4:
        this.wizardData.diagnostic = document.getElementById('wzDiagnostic').value.trim();
        break;
      case 6:
        this.wizardData.duration = parseInt(document.getElementById('wzDuration').value) || 30;
        this.wizardData.actions = document.getElementById('wzActions').value.trim();
        // Checklists et photos sont déjà dans wizardData via leurs fonctions respectives
        break;
      case 7:
        this.wizardData.compteRenduClient = document.getElementById('wzCRClient').value.trim();
        this.wizardData.status = document.getElementById('wzStatus').value;
        break;
    }
    
    // Enregistrer temporairement dans la DB pour ne pas perdre si l'app ferme
    dbModule.save('interventions', this.wizardData);
  },

  // === Utilitaires pour le Wizard ===

  populateClientSelect: function() {
    const select = document.getElementById('wzClient');
    dbModule.getAll('clients').then(clients => {
      clients.sort((a, b) => a.nom.localeCompare(b.nom)).forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.nom} ${client.prenom}`;
        if (client.id === this.wizardData.clientId) option.selected = true;
        select.appendChild(option);
      });
      if (this.wizardData.clientId) this.onWizardClientChange(this.wizardData.clientId);
    });
  },
  
  onWizardClientChange: function(value) {
    const nextBtn = document.getElementById('wzNext1');
    if (value === 'NEW') {
      nextBtn.disabled = true;
      app.openModal('modal-client'); // Ouvrir pour créer
    } else if (value) {
      nextBtn.disabled = false;
    } else {
      nextBtn.disabled = true;
    }
  },
  
  populateDeviceSelect: function() {
    const select = document.getElementById('wzDevice');
    
    dbModule.get('clients', this.wizardData.clientId).then(client => {
      if (client) document.getElementById('wzClientName').textContent = `${client.nom} ${client.prenom}`;
      
      dbModule.getAllByIndex('devices', 'clientId', this.wizardData.clientId).then(devices => {
        devices.sort((a, b) => a.brand.localeCompare(b.brand)).forEach(device => {
          const option = document.createElement('option');
          option.value = device.id;
          option.textContent = `${devicesModule.categories[device.category].split(' ')[0]} ${device.brand} ${device.model}`;
          if (device.id === this.wizardData.deviceId) option.selected = true;
          select.appendChild(option);
        });
        if (this.wizardData.deviceId || document.getElementById('wzDevice').value) {
          this.onWizardDeviceChange(document.getElementById('wzDevice').value || this.wizardData.deviceId);
        }
      });
    });
  },
  
  onWizardDeviceChange: function(value) {
    const nextBtn = document.getElementById('wzNext2');
    if (value === 'NEW') {
      nextBtn.disabled = true;
      app.openModal('modal-device', { clientId: this.wizardData.clientId });
    } else if (value) {
      nextBtn.disabled = false;
    } else {
      nextBtn.disabled = true;
    }
  },

  // --- Gestion Checklists dans le Wizard ---
  openChecklistSelection: function() {
    // Cette partie nécessiterait une modale pour choisir parmi les checklists existantes
    // Pour simplifier ici, on va charger une checklist "Générale"
    if (!confirm('Ajouter la checklist générale "Ordinateur Lent" ?')) return;
    
    // Checklist factice pour la démo
    const fakeCL = {
      title: "Vérification Ordinateur Lent",
      items: [
        { task: "Vérifier espace disque", done: false },
        { task: "Scanner Antivirus", done: false },
        { task: "Nettoyer fichiers temporaires", done: false },
        { task: "Vérifier programmes au démarrage", done: false }
      ]
    };
    
    this.addChecklistToWizard(fakeCL);
  },
  
  addChecklistToWizard: function(checklist) {
    checklist.items.forEach(item => {
      this.wizardData.checklists.push({
        title: checklist.title + ' - ' + item.task,
        done: item.done
      });
    });
    this.updateWizardChecklistsDisplay();
  },
  
  updateWizardChecklistsDisplay: function() {
    const cont = document.getElementById('wzChecklistsCont');
    if (!cont) return;
    cont.innerHTML = '';
    
    this.wizardData.checklists.forEach((item, index) => {
      const div = document.createElement('div');
      div.style = 'display:flex;align-items:center;margin-bottom:4px;font-size:0.85rem';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.done;
      checkbox.style.marginRight = '8px';
      checkbox.onchange = (e) => {
        this.wizardData.checklists[index].done = e.target.checked;
        dbModule.save('interventions', this.wizardData);
      };
      
      const label = document.createElement('span');
      label.textContent = item.title;
      
      const remove = document.createElement('span');
      remove.textContent = ' 🗑️';
      remove.style = 'margin-left:auto;cursor:pointer;opacity:0.5';
      remove.onclick = () => {
        this.wizardData.checklists.splice(index, 1);
        this.updateWizardChecklistsDisplay();
        dbModule.save('interventions', this.wizardData);
      };
      
      div.appendChild(checkbox);
      div.appendChild(label);
      div.appendChild(remove);
      cont.appendChild(div);
    });
  },

  // --- Gestion Photos dans le Wizard ---
  capturePhoto: function() {
    const input = document.getElementById('photoInput');
    if (input) input.click();
  },
  
  handlePhoto: function(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Pour une vraie app, il faudrait compresser l'image avant de la stocker (trop lourd pour IndexedDB)
        this.wizardData.photos.push(e.target.result);
        this.updateWizardPhotosDisplay();
        dbModule.save('interventions', this.wizardData);
      };
      reader.readAsDataURL(input.files[0]);
    }
  },
  
  updateWizardPhotosDisplay: function() {
    const cont = document.getElementById('wzPhotosCont');
    if (!cont) return;
    cont.innerHTML = '';
    
    this.wizardData.photos.forEach((photoBase64, index) => {
      const div = document.createElement('div');
      div.style.position = 'relative';
      
      const img = document.createElement('img');
      img.src = photoBase64;
      img.style = 'width:100%;height:60px;object-fit:cover;border-radius:4px';
      
      const remove = document.createElement('span');
      remove.textContent = '×';
      remove.style = 'position:absolute;top:-4px;right:-4px;background:rgba(255,255,255,0.7);color:red;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:bold';
      remove.onclick = () => {
        this.wizardData.photos.splice(index, 1);
        this.updateWizardPhotosDisplay();
        dbModule.save('interventions', this.wizardData);
      };
      
      div.appendChild(img);
      div.appendChild(remove);
      cont.appendChild(div);
    });
  },

  // --- IA pour Compte-rendu ---
  generateClientCR: function() {
    if (!confirm('Générer le compte-rendu client via l\'IA en se basant sur le diagnostic ?')) return;
    
    app.showToast('Génération IA en cours...');
    
    // Simuler un appel IA
    setTimeout(() => {
      const cr = `Monsieur, suite à votre demande, j'ai pris en charge votre appareil. Le diagnostic technique a révélé le problème suivant : ${this.wizardData.diagnostic}. J'ai effectué les actions nécessaires (${this.wizardData.actions}) pour résoudre la situation. L'appareil est désormais fonctionnel. Cordialement.`;
      document.getElementById('wzCRClient').value = cr;
      app.showToast('Compte-rendu généré.');
    }, 2000);
  },

  // === Finir le Wizard et Enregistrer ===
  finishWizard: function() {
    this.saveCurrentStepData(); // Sauvegarder la dernière étape
    
    if (!this.wizardData.title) {
      this.wizardData.title = `Intervention du ${new Date(this.wizardData.date).toLocaleDateString('fr-FR')}`;
    }
    
    // Aller chercher le nom du client pour l'afficher plus vite dans la liste
    dbModule.get('clients', this.wizardData.clientId).then(client => {
      if (client) {
        this.wizardData.clientNom = `${client.nom} ${client.prenom}`;
      }
      
      // Enregistrement final
      dbModule.save('interventions', this.wizardData).then(() => {
        app.showToast('Intervention enregistrée !');
        app.goTo('intervention-detail', { interventionId: this.wizardData.id });
      });
    });
  },
  
  // === Suppression ===
  deleteCurrent: function() {
    if (!app.currentInterventionId) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      return;
    }

    dbModule.delete('interventions', app.currentInterventionId).then(() => {
      app.showToast('Intervention supprimée.');
      app.goTo('interventions');
    });
  }
};
