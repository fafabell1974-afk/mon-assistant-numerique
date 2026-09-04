// js/ai.js
// Gestion de l'intégration avec l'Assistant IA

const aiModule = {
  // Configuration locale (clés stockées dans IndexedDB via settingsModule)
  config: {
    provider: '', // openai, gemini, mistral
    apiKey: '',
    model: ''
  },
  
  init: function() {
    console.log('AI module initialized');
    this.loadConfig();
  },
  
  // Charger la configuration IA depuis les paramètres
  loadConfig: function() {
    dbModule.get('settings', 'aiProvider').then(res => if(res) this.config.provider = res.value);
    dbModule.get('settings', 'aiApiKey').then(res => if(res) this.config.apiKey = res.value);
    dbModule.get('settings', 'aiModel').then(res => if(res) this.config.model = res.value);
  },
  
  // Réinitialiser le formulaire IA
  resetForm: function() {
    document.getElementById('aiClientSelect').value = '';
    document.getElementById('aiDeviceSelect').innerHTML = '<option value="">-- Appareil --</option>';
    document.getElementById('aiPrompt').value = '';
    document.getElementById('aiResponse').innerHTML = '';
  },
  
  // Charger les appareils d'un client dans le sélecteur
  loadClientDevices: function(clientId) {
    const deviceSelect = document.getElementById('aiDeviceSelect');
    deviceSelect.innerHTML = '<option value="">-- Appareil --</option>';
    
    if (!clientId) return;
    
    dbModule.getAllByIndex('devices', 'clientId', clientId).then(devices => {
      devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = `${devicesModule.categories[device.category].split(' ')[0]} ${device.brand} ${device.model}`;
        deviceSelect.appendChild(option);
      });
    });
  },
  
  // Poser une question à l'IA
  ask: function() {
    const prompt = document.getElementById('aiPrompt').value.trim();
    if (!prompt) {
      app.showToast('Veuillez décrire le problème.');
      return;
    }
    
    if (!this.config.apiKey) {
      if(confirm('Clé API IA non configurée. Voulez-vous la configurer maintenant ?')) {
        app.goTo('settings');
      }
      return;
    }
    
    const askBtn = document.getElementById('aiAskBtn');
    askBtn.disabled = true;
    askBtn.textContent = '⏳ Recherche...';
    document.getElementById('aiResponse').innerHTML = '<div class="loading-state">L\'IA réfléchit...</div>';
    
    // Obtenir le contexte (client/appareil)
    const clientId = document.getElementById('aiClientSelect').value;
    const deviceId = document.getElementById('aiDeviceSelect').value;
    
    // Anonymiser le contexte avant l'envoi
    this.getAnonymizedContext(clientId, deviceId).then(context => {
      const fullPrompt = `${context}\n\nDescription du problème technique :\n${prompt}`;
      
      this.callApi(fullPrompt).then(response => {
        askBtn.disabled = false;
        askBtn.textContent = '💬 Demander à l\'IA';
        this.displayResponse(response);
      }).catch(error => {
        askBtn.disabled = false;
        askBtn.textContent = '💬 Demander à l\'IA';
        this.displayError(error);
      });
    });
  },
  
  // Anonymiser les données client/appareil
  getAnonymizedContext: function(clientId, deviceId) {
    return new Promise((resolve) => {
      let context = 'Contexte : ';
      const promises = [];
      
      if (clientId) promises.push(dbModule.get('clients', clientId));
      else promises.push(Promise.resolve(null));
      
      if (deviceId) promises.push(dbModule.get('devices', deviceId));
      else promises.push(Promise.resolve(null));
      
      Promise.all(promises).then(([client, device]) => {
        if (client) context += `Client anonyme (ID: ${client.id.substring(0,4)}), `;
        else context += 'Client inconnu, ';
        
        if (device) context += `Appareil: ${device.brand} ${device.model} (${device.os || 'OS inconnu'}), `;
        else context += 'Appareil inconnu. ';
        
        resolve(context);
      });
    });
  },
  
  // Appel à l'API du fournisseur d'IA
  callApi: function(prompt) {
    switch(this.config.provider) {
      case 'openai': return this.callOpenAi(prompt);
      // case 'gemini': return this.callGemini(prompt);
      // case 'mistral': return this.callMistral(prompt);
      default: return Promise.reject(new Error('Fournisseur IA non pris en charge.'));
    }
  },
  
  // Appel spécifique à OpenAI
  callOpenAi: function(prompt) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const model = this.config.model || 'gpt-4o-mini';
    
    const body = {
      model: model,
      messages: [
        { role: 'system', content: 'Tu es un assistant technique expert pour assistant numérique à domicile. Propose des diagnostics clairs, des étapes de résolution concrètes et des points de vigilance.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    };
    
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(body)
    }).then(response => {
      if (!response.ok) {
        return response.json().then(err => {
          throw new Error(err.error?.message || 'Erreur API OpenAI');
        });
      }
      return response.json();
    }).then(data => {
      return data.choices[0].message.content;
    });
  },
  
  // Afficher la réponse de l'IA
  displayResponse: function(response) {
    const respCont = document.getElementById('aiResponse');
    respCont.innerHTML = `<div class="card-title">Solution suggérée</div><div class="card-content markdown-body" style="font-size:0.9rem;white-space:pre-wrap;margin-top:10px">${this.formatMarkdown(response)}</div>`;
  },
  
  // Afficher une erreur
  displayError: function(error) {
    const respCont = document.getElementById('aiResponse');
    respCont.innerHTML = `<div class="danger-state"><strong>Erreur :</strong> ${error.message}</div>`;
    console.error('AI Error:', error);
  },
  
  // Formater succinctement le Markdown en HTML (pour démo)
  formatMarkdown: function(text) {
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br>');
  },
  
  // Effacer le formulaire
  clear: function() {
    this.resetForm();
  },
  
  // Tester la connexion (dans les paramètres)
  testConnection: function() {
    this.loadConfig();
    if (!this.config.apiKey) {
      app.showToast('Clé API non configurée.');
      return;
    }
    
    app.showToast('Test de connexion en cours...');
    this.callApi('Ceci est un test de connexion pour l\'application Assistant Numérique. Réponds simplement "Connecté !".').then(resp => {
      if (resp.includes('Connecté !')) app.showToast('Connexion IA réussie ! ✅');
      else app.showToast('Connexion réussie, mais réponse inattendue.');
    }).catch(err => {
      app.showToast(`Échec de connexion : ${err.message}`);
    });
  }
};
