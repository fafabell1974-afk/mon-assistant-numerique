const settingsModule = {
  async load() {
    document.getElementById('setCompany').value = await dbModule.getSetting('company', '');
    document.getElementById('setName').value = await dbModule.getSetting('name', '');
    document.getElementById('setPhone').value = await dbModule.getSetting('phone', '');
    document.getElementById('setEmail').value = await dbModule.getSetting('email', '');
    document.getElementById('aiProvider').value = await dbModule.getSetting('aiProvider', '');
    document.getElementById('aiApiKey').value = await dbModule.getSetting('aiApiKey', '');
    document.getElementById('aiModel').value = await dbModule.getSetting('aiModel', '');
    if (await dbModule.getSetting('autoLock', false)) {
      const t = document.getElementById('autoLockToggle');
      if (t) t.classList.add('active');
    }
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      const t = document.getElementById('darkModeToggle');
      if (t) t.classList.add('active');
    }
  },

  async save() {
    await dbModule.setSetting('company', document.getElementById('setCompany').value);
    await dbModule.setSetting('name', document.getElementById('setName').value);
    await dbModule.setSetting('phone', document.getElementById('setPhone').value);
    await dbModule.setSetting('email', document.getElementById('setEmail').value);
    await dbModule.setSetting('aiProvider', document.getElementById('aiProvider').value);
    await dbModule.setSetting('aiApiKey', document.getElementById('aiApiKey').value);
    await dbModule.setSetting('aiModel', document.getElementById('aiModel').value);
  },

  async toggleDark() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      await dbModule.setSetting('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      await dbModule.setSetting('theme', 'dark');
    }
    document.getElementById('darkModeToggle').classList.toggle('active');
  }
};
