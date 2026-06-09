/* ============================================================
   PAGES — MDT v5  (partie 1/2)
   Dashboard · Citoyens · Casiers
   ============================================================ */

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
registerPage('dashboard', async el => {
  el.innerHTML = pageHeader('West Elizabeth Law Enforcement', 'Tableau de Bord',
    isCommander() ? `<span class="badge badge-gold" style="padding:.4rem .9rem;font-size:.75rem;">⭐ Commander</span>` : '');
  try {
    const [citizens, warrants, reports, enquetes, annonceDoc] = await Promise.all([
      getAll('citizens'), getAll('warrants'), getAll('reports'), getAll('enquetes'),
      getOne('config', 'annonces'),
    ]);
    const wanted  = citizens.filter(c => c.status === 'Wanted').length;
    const active  = warrants.filter(w => w.status === 'Actif').length;
    const pending = reports.filter(r => r.status === 'En attente').length;
    const openEnq = enquetes.length;
    const annonces = annonceDoc?.items || [];

    el.innerHTML += `
      <div class="stats-grid">
        <div class="stat-card urgent"><div class="stat-value">${active}</div><div class="stat-label">Mandats Actifs</div></div>
        <div class="stat-card urgent"><div class="stat-value">${wanted}</div><div class="stat-label">Individus Recherchés</div></div>
        <div class="stat-card"><div class="stat-value">${pending}</div><div class="stat-label">Rapports en Attente</div></div>
        <div class="stat-card gold"><div class="stat-value">${citizens.length}</div><div class="stat-label">Citoyens</div></div>
        <div class="stat-card"><div class="stat-value">${openEnq}</div><div class="stat-label">Enquêtes</div></div>
      </div>

      <!-- ANNONCES -->
      <div class="card" style="border-left:4px solid var(--gold);margin-bottom:1.5rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem;margin-bottom:.85rem;">
          <div class="card-title" style="margin-bottom:0;border-bottom:none;padding-bottom:0;">
            📢 Annonces du Command's Office
          </div>
          ${isCommander() ? `<button class="btn btn-primary btn-sm" onclick="openAnnonceModal()">+ Nouvelle annonce</button>` : ''}
        </div>
        <div id="annonces-list">
          ${annonces.length ? annonces.map((a,i) => `
            <div style="background:var(--parchment);border:1px solid var(--border);border-left:3px solid var(--gold);padding:.85rem 1rem;margin-bottom:.6rem;position:relative;">
              <div style="font-family:var(--font-display);font-size:.95rem;font-weight:700;color:var(--leather);margin-bottom:.35rem;">${esc(a.title)}</div>
              <div id="annonce-text-${i}" style="font-size:.9rem;line-height:1.65;white-space:pre-wrap;"></div>
              <div class="text-muted" style="margin-top:.5rem;">
                ${esc(a.author)} · ${esc(a.grade)} · ${a.date||''}
              </div>
              ${isCommander() ? `
                <div style="position:absolute;top:.6rem;right:.6rem;display:flex;gap:.35rem;">
                  <button class="btn btn-secondary btn-sm" onclick="openAnnonceModal(${i})">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteAnnonce(${i})">✕</button>
                </div>` : ''}
            </div>`).join('')
          : '<p class="text-muted">Aucune annonce en cours.</p>'}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1.25rem;">
        <div class="card">
          <div class="card-title">⚠ Mandats Actifs</div>
          ${warrants.filter(w=>w.status==='Actif').slice(0,5).map(w=>`
            <div class="warrant-card">
              <div>
                <div class="warrant-name">${esc(w.suspectName)}</div>
                <div class="warrant-details">${esc(w.crime)}</div>
                <div class="warrant-details">Prime : ${w.bounty?'$'+w.bounty:'—'}</div>
              </div>
              ${statusBadge(w.level)}
            </div>`).join('') || '<p class="text-muted">Aucun mandat actif.</p>'}
        </div>
        <div class="card">
          <div class="card-title">📋 Rapports Récents</div>
          ${reports.slice(0,6).map(r=>`
            <div style="padding:.5rem 0;border-bottom:1px solid rgba(160,128,64,.2);">
              <div class="report-list-title">${esc(r.title)}</div>
              <div class="text-muted">${formatDate(r.createdAt)} · ${esc(r.createdBy)} · ${statusBadge(r.status)}</div>
            </div>`).join('') || '<p class="text-muted">Aucun rapport.</p>'}
        </div>
      </div>`;

    // Injection sécurisée des textes d'annonces
    annonces.forEach((a, i) => {
      const el2 = document.getElementById(`annonce-text-${i}`);
      if (el2) el2.textContent = a.text || '';
    });

  } catch(e) { el.innerHTML += `<div class="notice notice-error">Erreur : ${esc(e.message)}</div>`; }
});

// ── Annonces CRUD ─────────────────────────────────────────────
window.openAnnonceModal = async function(editIndex = null) {
  const doc = await getOne('config', 'annonces');
  const items = doc?.items || [];
  const existing = editIndex !== null ? items[editIndex] : null;

  openModal(existing ? 'Modifier l'annonce' : 'Nouvelle Annonce', `
    <div class="form-group" style="margin-bottom:1rem;">
      <label>Titre *</label>
      <input type="text" id="ann-title">
    </div>
    <div class="form-group">
      <label>Contenu *</label>
      <textarea id="ann-text" style="min-height:130px;" placeholder="Rédigez votre annonce…"></textarea>
    </div>
  `, async () => {
    const title = document.getElementById('ann-title').value.trim();
    const text  = document.getElementById('ann-text').value.trim();
    if (!title || !text) return showToast('Titre et contenu obligatoires.', 'error');
    setModalLoading(true);
    try {
      const newItem = {
        title, text,
        author: window.currentSession.name,
        grade:  window.currentSession.grade,
        date:   new Date().toLocaleDateString('fr-FR'),
      };
      let newItems;
      if (editIndex !== null) {
        newItems = [...items];
        newItems[editIndex] = newItem;
      } else {
        newItems = [newItem, ...items];
      }
      // Upsert dans config/annonces
      await db.collection('config').doc('annonces').set({ items: newItems });
      await addLog('ANNONCE', `Annonce ${editIndex !== null ? 'modifiée' : 'créée'} — ${title}`);
      closeModal();
      showToast('Annonce enregistrée.', 'success');
      refreshPage();
    } catch(e) { showToast('Erreur : ' + e.message, 'error'); }
    finally { setModalLoading(false); }
  }, existing ? 'Modifier' : 'Publier');

  setTimeout(() => {
    if (existing) {
      document.getElementById('ann-title').value = existing.title || '';
      document.getElementById('ann-text').value  = existing.text  || '';
    }
  }, 50);
};

window.deleteAnnonce = async function(index) {
  if (!confirm('Supprimer cette annonce ?')) return;
  try {
    const doc  = await getOne('config', 'annonces');
    const items = (doc?.items || []).filter((_, i) => i !== index);
    await db.collection('config').doc('annonces').set({ items });
    await addLog('ANNONCE', 'Annonce supprimée');
    showToast('Annonce supprimée.', 'success');
    refreshPage();
  } catch(e) { showToast('Erreur : ' + e.message, 'error'); }
};

// ═══════════════════════════════════════════════════════════
// CITOYENS (avec photo)
// ═══════════════════════════════════════════════════════════
registerPage('citizens', async el => {
  el.innerHTML = pageHeader('Registre du Territoire', 'Gestion des Citoyens',
    `<button class="btn btn-primary" onclick="openCitizenModal()">+ Nouveau Citoyen</button>`);
  try {
    const all = await getAll('citizens');
    renderCitizenTable(el, all, '');
  } catch(e) { el.innerHTML += `<div class="notice notice-error">${esc(e.message)}</div>`; }
});

function renderCitizenTable(el, all, query) {
  const filtered = query
    ? all.filter(c => [c.name,c.occupation,c.domicile,c.telegram].join(' ').toLowerCase().includes(query.toLowerCase()))
    : all;
  let wrap = el.querySelector('.data-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'data-wrap'; el.appendChild(wrap); }
  wrap.innerHTML = `
    <div class="search-bar">
      <div class="form-group" style="flex:1;margin-bottom:0;">
        <label>Rechercher</label>
        <input type="search" id="citizen-search" placeholder="Nom, profession, domicile…" value="${esc(query)}">
      </div>
    </div>
    <div class="card" style="padding:0;">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nom</th><th>Naissance</th><th>Profession</th><th>Domicile</th><th>Télégramme</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            ${filtered.length ? filtered.map(c=>`<tr>
              <td class="fw-bold">${esc(c.name)}</td>
              <td>${formatDate(c.dob)}</td>
              <td>${esc(c.occupation||'—')}</td>
              <td>${esc(c.domicile||'—')}</td>
              <td>${c.telegram?`<span style="font-family:var(--font-stamp);font-size:.75rem;">${esc(c.telegram)}</span>`:'—'}</td>
              <td>${statusBadge(c.status)}</td>
              <td><div class="btn-group">
                <button class="btn btn-secondary btn-sm" onclick="viewCitizen('${c.id}')">Fiche</button>
                <button class="btn btn-secondary btn-sm" onclick="filterRecords('${esc(c.name).replace(/'/g,"\\'")}')">Casier</button>
                <button class="btn btn-secondary btn-sm" onclick="openCitizenModal('${c.id}')">Modifier</button>
                ${isCommander()?`<button class="btn btn-danger btn-sm" onclick="deleteCitizen('${c.id}','${esc(c.name).replace(/'/g,"\\'")}')">Suppr.</button>`:''}
              </div></td>
            </tr>`).join('') : emptyRow(7)}
          </tbody>
        </table>
      </div>
      <div class="table-footer"><span>${filtered.length} citoyen(s)</span></div>
    </div>`;
  document.getElementById('citizen-search')?.addEventListener('input', async e => {
    const fresh = await getAll('citizens');
    renderCitizenTable(el, fresh, e.target.value);
  });
}

window.viewCitizen = async function(id) {
  const c = await getOne('citizens', id);
  if (!c) return;
  openModal('Fiche Citoyen', `
    <div class="document-header">
      <div class="document-title">${esc(c.name)}</div>
      <div class="document-ref">Dossier — West Elizabeth Law Enforcement</div>
    </div>
    ${c.photos?.length ? `
      <div style="text-align:center;margin-bottom:1rem;">
        <img src="${esc(c.photos[0].url)}" alt="Photo"
          style="max-height:150px;max-width:100%;object-fit:cover;border:2px solid var(--border);cursor:pointer;"
          onclick="openPhotoViewer('${esc(c.photos[0].url)}','${esc(c.name)}')">
      </div>` : ''}
    ${[
      ['Date de naissance', formatDate(c.dob)],
      ['Profession',        c.occupation||'—'],
      ['Lieu d\'habitation',c.domicile||'—'],
      ['Télégramme',        c.telegram||'—'],
      ['Affiliation',       c.affiliationName||'—'],
      ['Statut',            c.status],
      ['Notes',             c.notes||'—'],
    ].map(([l,v])=>`
      <div class="doc-field">
        <span class="doc-field-label">${l}</span>
        <span class="doc-field-value">${l==='Statut'?statusBadge(v):(l==='Affiliation'&&v!=='—'?`<span style="color:var(--bordeaux);font-weight:600;">🔴 ${esc(String(v))}</span>`:esc(String(v)))}</span>
      </div>`).join('')}
    ${photoGalleryHtml(c.photos||[], 'citizens', id)}
    <div id="citizen-weapons-section" style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px dashed var(--border);">
      <div style="font-family:var(--font-stamp);font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--leather);margin-bottom:.6rem;">🔫 Armes enregistrées</div>
      <div id="citizen-weapons-list"><p class="text-muted">Chargement…</p></div>
    </div>
  `);
  // Charger les armes du citoyen après l'affichage de la modale
  setTimeout(async () => {
    const wList = document.getElementById('citizen-weapons-list');
    if (!wList) return;
    try {
      const allWeapons = await getAll('weapons');
      const owned = allWeapons.filter(w => w.owner === c.name);
      if (!owned.length) {
        wList.innerHTML = '<p class="text-muted">Aucune arme enregistrée.</p>';
      } else {
        wList.innerHTML = owned.map(w => `
          <div style="display:flex;align-items:center;gap:.75rem;padding:.45rem .5rem;border-bottom:1px solid rgba(160,128,64,.2);font-size:.88rem;">
            <span style="font-family:var(--font-stamp);font-size:.72rem;color:var(--sepia);">${esc(w.serial)}</span>
            <span>${esc(w.type)} ${w.model ? '— '+esc(w.model) : ''}</span>
            <span style="margin-left:auto;">${statusBadge(w.status)}</span>
          </div>`).join('');
      }
    } catch(e) { wList.innerHTML = '<p class="text-muted">Erreur de chargement.</p>'; }
  }, 100);
  await addLog('CONSULTATION', `Fiche citoyen — ${c.name}`);
};

window.openCitizenModal = async function(id=null) {
  const c = id ? await getOne('citizens',id) : null;
  openModal(c?'Modifier Citoyen':'Nouveau Citoyen', `
    <div class="form-grid">
      <div class="form-group full"><label>Nom complet *</label><input type="text" id="f-name"></div>
      <div class="form-group"><label>Date de naissance</label><input type="date" id="f-dob"></div>
      <div class="form-group"><label>Profession</label><input type="text" id="f-occ"></div>
      <div class="form-group full"><label>Lieu d'habitation</label><input type="text" id="f-domicile"></div>
      <div class="form-group full"><label>Télégramme</label><input type="text" id="f-telegram" placeholder="@pseudonyme ou adresse télégraphique"></div>
      <div class="form-group full"><label>Affiliation (groupe illégal)</label><select id="f-affiliation"></select></div>
      <div class="form-group"><label>Statut</label>
        <select id="f-status">${['Clean','Suspect','Wanted'].map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
      <div class="form-group full"><label>Notes</label><textarea id="f-notes"></textarea></div>
    </div>
  `, async () => {
    const name = document.getElementById('f-name').value.trim();
    if (!name) return showToast('Nom obligatoire.','error');
    setModalLoading(true);
    try {
      const affSel = document.getElementById('f-affiliation');
      const affVal = affSel ? affSel.value : '';
      const affName = affSel ? affSel.options[affSel.selectedIndex]?.text || '' : '';
      const data = {
        name,
        dob:         document.getElementById('f-dob').value,
        occupation:  document.getElementById('f-occ').value,
        domicile:    document.getElementById('f-domicile').value,
        telegram:    document.getElementById('f-telegram').value,
        affiliation: affVal === '__none__' ? '' : affVal,
        affiliationName: affVal === '__none__' ? '' : affName.replace(/ 🔴.*/, '').trim(),
        status:      document.getElementById('f-status').value,
        notes:       document.getElementById('f-notes').value,
      };
      if (c) { await updateDoc('citizens',c.id,data); await addLog('MODIFICATION',`Citoyen modifié — ${name}`); }
      else   { await createDoc('citizens',{...data,photos:[]}); await addLog('CRÉATION',`Citoyen créé — ${name}`); }
      closeModal(); showToast('Enregistré.','success'); refreshPage();
    } catch(e) { showToast('Erreur : '+e.message,'error'); }
    finally { setModalLoading(false); }
  }, c?'Modifier':'Enregistrer');
  // Injection sécurisée des valeurs + chargement groupes pour affiliation
  setTimeout(async () => {
    // Peupler le select affiliation
    const groupes = await getAll('groupes');
    const affSel = document.getElementById('f-affiliation');
    if (affSel) {
      affSel.innerHTML = '<option value="__none__">— Aucune affiliation —</option>' +
        groupes.map(g => `<option value="${g.id}" ${c?.affiliation === g.id ? 'selected' : ''}>${esc(g.nom)} 🔴</option>`).join('');
    }
    if (c) {
      document.getElementById('f-name').value    = c.name||'';
      document.getElementById('f-dob').value     = c.dob||'';
      document.getElementById('f-occ').value     = c.occupation||'';
      document.getElementById('f-domicile').value= c.domicile||'';
      document.getElementById('f-telegram').value= c.telegram||'';
      document.getElementById('f-notes').value   = c.notes||'';
      const sel = document.getElementById('f-status');
      if (sel) sel.value = c.status||'Clean';
    }
  }, 50);
};

window.deleteCitizen = async function(id, name) {
  if (!isCommander()||!confirm(`Supprimer ${name} ?`)) return;
  try { await deleteDoc('citizens',id); await addLog('SUPPRESSION',`Citoyen supprimé — ${name}`); showToast('Supprimé.','success'); refreshPage(); }
  catch(e) { showToast('Erreur : '+e.message,'error'); }
};

window.filterRecords = function(name) {
  navigateTo('records');
  setTimeout(() => {
    const s = document.getElementById('record-search');
    if (s) { s.value = name; s.dispatchEvent(new Event('input')); }
  }, 400);
};

// ═══════════════════════════════════════════════════════════
// CASIERS JUDICIAIRES (liste code pénal + modification)
// ═══════════════════════════════════════════════════════════
registerPage('records', async el => {
  el.innerHTML = pageHeader('Bureau des Archives', 'Casiers Judiciaires',
    `<button class="btn btn-primary" onclick="openRecordModal()">+ Nouveau Casier</button>`);
  try {
    const all = await getAll('records');
    renderRecordTable(el, all, '');
  } catch(e) { el.innerHTML += `<div class="notice notice-error">${esc(e.message)}</div>`; }
});

function renderRecordTable(el, all, query) {
  const filtered = query
    ? all.filter(r=>[r.citizenName,...(r.facts||[])].join(' ').toLowerCase().includes(query.toLowerCase()))
    : all;
  let wrap = el.querySelector('.data-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className='data-wrap'; el.appendChild(wrap); }
  wrap.innerHTML = `
    <div class="search-bar">
      <div class="form-group" style="flex:1;margin-bottom:0;">
        <label>Rechercher</label>
        <input type="search" id="record-search" placeholder="Nom, infraction…" value="${esc(query)}">
      </div>
    </div>
    <div class="card" style="padding:0;">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Individu</th><th>Date</th><th>Faits retenus</th><th>Amende</th><th>Peine</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>
            ${filtered.length ? filtered.map(r=>`<tr>
              <td class="fw-bold">${esc(r.citizenName)}</td>
              <td>${formatDate(r.date)}</td>
              <td style="max-width:220px;font-size:.8rem;line-height:1.5;">
                ${(r.facts||[r.offense]).filter(Boolean).map(f=>`<div>• ${esc(f)}</div>`).join('') || '—'}
              </td>
              <td>${r.fine?'$'+r.fine:'—'}</td>
              <td>${esc(r.sentence||'—')}</td>
              <td>${statusBadge(r.status)}</td>
              <td><div class="btn-group">
                <button class="btn btn-secondary btn-sm" onclick="viewRecord('${r.id}')">Voir & Photos</button>
                <button class="btn btn-secondary btn-sm" onclick="openRecordModal('${r.id}')">Modifier</button>
                ${isCommander()?`<button class="btn btn-danger btn-sm" onclick="deleteRecord('${r.id}','${esc(r.citizenName).replace(/'/g,"\\'")}')">Suppr.</button>`:''}
              </div></td>
            </tr>`).join('') : emptyRow(7)}
          </tbody>
        </table>
      </div>
      <div class="table-footer"><span>${filtered.length} casier(s)</span></div>
    </div>`;
  document.getElementById('record-search')?.addEventListener('input', async e => {
    const fresh = await getAll('records'); renderRecordTable(el, fresh, e.target.value);
  });
}

window.openRecordModal = async function(id=null) {
  const citizens = await getAll('citizens');
  const r = id ? await getOne('records',id) : null;
  const selectedFacts = r?.facts || [];

  openModal(r?'Modifier le Casier':'Nouveau Casier Judiciaire', `
    <div class="form-grid">
      <div class="form-group full"><label>Individu *</label>
        <select id="r-citizen">
          <option value="">— Sélectionner —</option>
          ${citizens.map(c=>`<option value="${c.id}||${esc(c.name)}" ${r?.citizenName===c.name?'selected':''}>${esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Date</label><input type="date" id="r-date" value="${r?.date||nowDate()}"></div>
      <div class="form-group"><label>Amende ($)</label><input type="text" id="r-fine" value="${r?.fine||''}"></div>
      <div class="form-group"><label>Peine prononcée</label><input type="text" id="r-sentence" value="${r?.sentence||''}" placeholder="Ex: 2 ans, Pendaison…"></div>
      <div class="form-group"><label>Statut</label>
        <select id="r-status">${['Fugitif','En prison','Purgée','Décédé'].map(s=>`<option ${(r?.status||'Fugitif')===s?'selected':''}>${s}</option>`).join('')}</select>
      </div>
    </div>
    <div style="margin-top:1rem;">
      <label style="font-family:var(--font-stamp);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--leather);display:block;margin-bottom:.5rem;">
        Faits retenus * (sélectionner dans le code pénal)
      </label>
      <div id="penal-picker" style="max-height:320px;overflow-y:auto;border:1px solid var(--border);padding:.75rem;background:var(--cream);"></div>
    </div>
  `, async () => {
    const citizenVal = document.getElementById('r-citizen').value;
    const facts = getSelectedFacts('penal-picker');
    if (!citizenVal) return showToast('Sélectionnez un individu.','error');
    if (!facts.length) return showToast('Sélectionnez au moins un fait retenu.','error');
    const [cid, cname] = citizenVal.split('||');
    setModalLoading(true);
    try {
      const data = {
        citizenId: cid, citizenName: cname,
        date:     document.getElementById('r-date').value,
        facts,
        offense:  facts[0], // compatibilité
        fine:     parseInt(document.getElementById('r-fine').value)||0,
        sentence: document.getElementById('r-sentence').value,
        status:   document.getElementById('r-status').value,
      };
      if (r) { await updateDoc('records',r.id,data); await addLog('MODIFICATION',`Casier modifié — ${cname}`); }
      else   { await createDoc('records',{...data,photos:[]}); await addLog('CRÉATION',`Casier créé — ${cname}`); }
      closeModal(); showToast('Casier enregistré.','success'); refreshPage();
    } catch(e) { showToast('Erreur : '+e.message,'error'); }
    finally { setModalLoading(false); }
  }, r?'Modifier':'Enregistrer');

  setTimeout(() => buildPenalCodePicker('penal-picker', selectedFacts), 60);
};

window.deleteRecord = async function(id, name) {
  if (!isCommander()||!confirm(`Supprimer ce casier pour ${name} ?`)) return;
  try { await deleteDoc('records',id); await addLog('SUPPRESSION',`Casier supprimé — ${name}`); showToast('Supprimé.','success'); refreshPage(); }
  catch(e) { showToast('Erreur : '+e.message,'error'); }
};

// ── Fiche casier judiciaire avec photos ────────────────────────
window.viewRecord = async function(id) {
  const r = await getOne('records', id);
  if (!r) return;
  openModal('Casier Judiciaire', `
    <div class="document-header">
      <div class="document-title">${esc(r.citizenName)}</div>
      <div class="document-ref">Casier judiciaire — West Elizabeth Law Enforcement</div>
    </div>
    <div class="doc-field"><span class="doc-field-label">Date</span><span class="doc-field-value">${formatDate(r.date)}</span></div>
    <div class="doc-field"><span class="doc-field-label">Amende</span><span class="doc-field-value">${r.fine ? '$'+r.fine : '—'}</span></div>
    <div class="doc-field"><span class="doc-field-label">Peine</span><span class="doc-field-value">${esc(r.sentence||'—')}</span></div>
    <div class="doc-field"><span class="doc-field-label">Statut</span><span class="doc-field-value">${statusBadge(r.status)}</span></div>
    <div style="margin-top:1rem;">
      <div class="text-muted" style="margin-bottom:.5rem;">Faits retenus</div>
      <div style="background:var(--parchment);border:1px solid var(--border);padding:.75rem 1rem;">
        ${(r.facts||[r.offense]).filter(Boolean).map(f=>`
          <div style="padding:.25rem 0;border-bottom:1px solid rgba(160,128,64,.15);font-size:.88rem;">• ${esc(f)}</div>
        `).join('')}
      </div>
    </div>
    <div class="doc-field" style="margin-top:.75rem;"><span class="doc-field-label">Rédigé par</span><span class="doc-field-value">${esc(r.createdBy)} — ${esc(r.createdByGrade)}</span></div>
    ${photoGalleryHtml(r.photos||[], 'records', id)}
  `);
  await addLog('CONSULTATION', `Casier consulté — ${r.citizenName}`);
};
