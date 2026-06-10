/* ============================================================
   PAGES — MDT v5  (partie 2/2)
   Rapports · Mandats · Armes · Propriétés · Personnel · Enquêtes · Logs
   ============================================================ */

// ═══════════════════════════════════════════════════════════
// RAPPORTS D'INCIDENT
// ═══════════════════════════════════════════════════════════
registerPage('reports', async el => {
  el.innerHTML = pageHeader('Bureau des Incidents', "Rapports d'Incident",
    `<button class="btn btn-primary" onclick="openReportModal()">+ Nouveau Rapport</button>`);
  if (!isCommander()) {
    el.innerHTML += `<div class="notice notice-info mb-2">✏️ Modifiable tant que non approuvé — Approbation réservée au Commander.</div>`;
  }
  try {
    const reports = await getAll('reports');
    if (!reports.length) { el.innerHTML += '<div class="card"><p class="text-muted">Aucun rapport.</p></div>'; return; }
    const pending  = reports.filter(r=>r.status==='En attente');
    const approved = reports.filter(r=>r.status==='Approuvé');
    if (pending.length) {
      const s = document.createElement('div');
      s.innerHTML = `<div class="page-eyebrow" style="margin-bottom:.75rem;">En attente (${pending.length})</div>`;
      el.appendChild(s);
      pending.forEach(r => el.appendChild(buildReportCard(r)));
    }
    if (approved.length) {
      const s = document.createElement('div'); s.style.marginTop='1.5rem';
      s.innerHTML = `<div class="page-eyebrow" style="margin-bottom:.75rem;">Approuvés (${approved.length})</div>`;
      el.appendChild(s);
      approved.forEach(r => el.appendChild(buildReportCard(r)));
    }
  } catch(e) { el.innerHTML += `<div class="notice notice-error">${esc(e.message)}</div>`; }
});

function buildReportCard(r) {
  const isPending = r.status === 'En attente';
  const canEdit   = isPending || isCommander(); // Commander peut toujours modifier
  const card = document.createElement('div');
  card.className = 'card';
  card.style.borderLeft = `4px solid ${isPending?'var(--gold)':'var(--green)'}`;
  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:.75rem;">
      <div>
        <div class="report-list-title">${esc(r.title)}</div>
        <div class="text-muted">${formatDate(r.createdAt)} · ${esc(r.createdBy)} · ${esc(r.createdByGrade)}
          ${r.updatedBy?`<span style="opacity:.65;"> · modifié par ${esc(r.updatedBy)}</span>`:''}</div>
        ${r.enqueteId?`<div class="text-muted" style="margin-top:.2rem;">🔍 Lié à l'enquête : ${esc(r.enqueteName||r.enqueteId)}</div>`:''}
      </div>
      <div class="btn-group">
        ${statusBadge(r.status)}
        <button class="btn btn-secondary btn-sm" onclick="viewReport('${r.id}')">Voir & Photos</button>
        ${canEdit?`<button class="btn btn-secondary btn-sm" onclick="editReport('${r.id}')">✏️ Modifier</button>`:''}
        ${isPending&&isCommander()?`<button class="btn btn-primary btn-sm" onclick="approveReport('${r.id}')">✅ Approuver</button>`:''}
        ${isCommander()?`<button class="btn btn-danger btn-sm" onclick="deleteReport('${r.id}')">Suppr.</button>`:''}
      </div>
    </div>
    <p style="font-size:.88rem;line-height:1.65;">${esc((r.narrative||'').substring(0,220))}${(r.narrative||'').length>220?'…':''}</p>
    ${(r.photos||[]).length?`<div class="text-muted" style="margin-top:.4rem;">📷 ${r.photos.length} photo(s)</div>`:''}`;
  return card;
}

window.viewReport = async function(id) {
  const r = await getOne('reports',id);
  if (!r) return;
  const isPending = r.status==='En attente';
  const canEdit = isPending || isCommander();
  openModal("Rapport d'Incident", `
    <div class="document-header">
      <div class="document-title">Rapport d'Incident Officiel</div>
      <div class="document-ref">West Elizabeth Law Enforcement</div>
    </div>
    ${[['Titre',r.title],['Date',formatDate(r.date||r.createdAt)],['Département',r.dept||'—'],['Statut',r.status],
       ['Enquête liée',r.enqueteName||'—']]
      .map(([l,v])=>`<div class="doc-field"><span class="doc-field-label">${l}</span><span class="doc-field-value">${l==='Statut'?statusBadge(v):esc(String(v))}</span></div>`).join('')}
    <div style="margin-top:1.25rem;">
      <div class="text-muted" style="margin-bottom:.5rem;">Récit des faits</div>
      <div id="view-narrative" class="narrative-content" style="line-height:1.75;font-size:.92rem;"></div>
    </div>
    <div class="signature-block">
      <div class="signature-field">
        <div class="signature-line">${esc(r.createdBy)}</div>
        <div class="signature-label">Rédacteur · ${esc(r.createdByGrade)}</div>
      </div>
      <div class="signature-field">
        <div class="signature-line">${esc(r.approvedBy||'')}</div>
        <div class="signature-label">${r.approvedBy?`Approuvé · ${esc(r.approvedByGrade)}`:"<span style='opacity:.4;'>En attente</span>"}</div>
      </div>
    </div>
    ${photoGalleryHtml(r.photos||[],'reports',id)}
  `);
  setTimeout(() => {
    const el = document.getElementById('view-narrative');
    if (el) {
      // Afficher le HTML riche si présent, sinon texte brut
      if (r.narrative && r.narrative.includes('<')) {
        el.innerHTML = r.narrative;
      } else {
        el.textContent = r.narrative || '';
      }
    }
    const footer = document.getElementById('modal-footer');
    if (footer) {
      const btns = [];
      // Bouton export PNG — uniquement sur les rapports approuvés
      if (r.status === 'Approuvé') {
        btns.push(`<button class="btn btn-secondary" onclick="exportReportPNG('${id}')">📥 Exporter en PNG</button>`);
      }
      if (canEdit) btns.push(`<button class="btn btn-secondary" onclick="closeModal();editReport('${id}')">✏️ Modifier</button>`);
      if (isPending&&isCommander()) btns.push(`<button class="btn btn-primary" onclick="closeModal();approveReport('${id}')">✅ Approuver</button>`);
      if (isCommander()) btns.push(`<button class="btn btn-danger" onclick="closeModal();deleteReport('${id}')">Supprimer</button>`);
      if (btns.length) footer.insertAdjacentHTML('afterbegin', btns.join(''));
    }
  }, 40);
  await addLog('CONSULTATION',`Rapport consulté — ${r.title}`);
};

window.editReport = async function(id) {
  const r = await getOne('reports',id);
  if (!r) return;
  // Commander peut toujours modifier ; agents seulement si En attente
  if (!isCommander() && r.status==='Approuvé')
    return showToast('Rapport approuvé — modification réservée au Commander.','error');
  const depts = Object.values(DEPARTMENTS).map(d=>d.label);
  const enquetes = await getAll('enquetes');
  openModal('Modifier le Rapport', `
    <div class="notice notice-warn mb-2">✏️ ${isCommander()
      ? 'Commander : modification autorisée même après approbation.'
      : 'Modifiable jusqu\'à approbation par le Commander.'}</div>
    <div class="form-grid">
      <div class="form-group full"><label>Titre *</label><input type="text" id="re-title"></div>
      <div class="form-group"><label>Date</label><input type="date" id="re-date" value="${r.date||''}"></div>
      <div class="form-group"><label>Département</label>
        <select id="re-dept">${depts.map(d=>`<option ${d===r.dept?'selected':''}>${d}</option>`).join('')}</select>
      </div>
      <div class="form-group full"><label>Lier à une enquête</label>
        <select id="re-enquete">
          <option value="">— Aucune —</option>
          ${enquetes.map(e=>`<option value="${e.id}||${esc(e.name)}" ${r.enqueteId===e.id?'selected':''}>${esc(e.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full">
        <label>Récit des faits *</label>
        <div class="quill-wrapper" id="re-quill-wrapper">
          <div id="re-quill-editor"></div>
        </div>
      </div>
    </div>
    <div class="notice notice-info mt-1">✒ Rédigé par : <strong>${esc(r.createdBy)}</strong> — ${esc(r.createdByGrade)}</div>
  `, async () => {
    const title = document.getElementById('re-title').value.trim();
    const quillEdit = window._quillEdit;
    const narrative = quillEdit ? quillEdit.root.innerHTML : '';
    const narrativeText = quillEdit ? quillEdit.getText().trim() : '';
    if (!title || !narrativeText) return showToast('Titre et récit obligatoires.','error');
    const enqueteVal = document.getElementById('re-enquete').value;
    const [enqId, enqName] = enqueteVal ? enqueteVal.split('||') : ['',''];
    setModalLoading(true);
    try {
      await updateDoc('reports',id,{
        title, date:document.getElementById('re-date').value,
        dept:document.getElementById('re-dept').value,
        narrative,
        enqueteId:enqId||'', enqueteName:enqName||'',
      });
      // Si lié à une enquête, ajouter la ref dans l'enquête
      if (enqId) {
        const enq = await getOne('enquetes',enqId);
        const refs = enq?.reportRefs||[];
        if (!refs.find(x=>x.id===id)) {
          await updateDoc('enquetes',enqId,{ reportRefs:[...refs,{id,title}] });
        }
      }
      await addLog('MODIFICATION',`Rapport modifié — ${title}`);
      closeModal(); showToast('Rapport mis à jour.','success'); refreshPage();
    } catch(e) { showToast('Erreur : '+e.message,'error'); }
    finally { setModalLoading(false); }
  }, 'Enregistrer');
  setTimeout(() => {
    const t = document.getElementById('re-title');
    if (t) t.value = r.title || '';
    if (typeof Quill === 'undefined') return;
    window._quillEdit = new Quill('#re-quill-editor', {
      theme: 'snow',
      modules: {
        toolbar: [
  [{ 'header': [1, 2, 3, false] }],
  [{ 'size': ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'align': [] }],
  ['blockquote', 'clean']
]
      }
    });
    // Injecter le contenu existant (HTML ou texte brut)
    if (r.narrative) {
      window._quillEdit.root.innerHTML = r.narrative;
    }
  }, 80);
};

window.approveReport = async function(id) {
  if (!isCommander()) return showToast('Approbation réservée au Commander.','error');
  const r = await getOne('reports',id);
  if (!r||!confirm(`Approuver "${r.title}" ?`)) return;
  try {
    await updateDoc('reports',id,{ status:'Approuvé', approvedBy:window.currentSession.name, approvedByGrade:window.currentSession.grade });
    await addLog('APPROBATION',`Rapport approuvé — ${r.title}`);
    showToast('Approuvé.','success'); refreshPage();
  } catch(e) { showToast('Erreur : '+e.message,'error'); }
};

window.deleteReport = async function(id) {
  if (!isCommander()||!confirm('Supprimer ce rapport ?')) return;
  try {
    // Retirer la référence dans l'enquête liée avant de supprimer
    const r = await getOne('reports', id);
    if (r?.enqueteId) {
      const enq = await getOne('enquetes', r.enqueteId);
      if (enq) {
        const updatedRefs = (enq.reportRefs||[]).filter(ref => ref.id !== id);
        await updateDoc('enquetes', r.enqueteId, { reportRefs: updatedRefs });
      }
    }
    await deleteDoc('reports', id);
    await addLog('SUPPRESSION', `Rapport supprimé — ${r?.title||id}`);
    showToast('Supprimé.','success');
    refreshPage();
  }
  catch(e) { showToast('Erreur : '+e.message,'error'); }
};

window.openReportModal = async function() {
  const depts = Object.values(DEPARTMENTS).map(d=>d.label);
  const enquetes = await getAll('enquetes');
  const s = window.currentSession;
  openModal("Nouveau Rapport d'Incident", `
    <div class="form-grid">
      <div class="form-group full"><label>Titre *</label><input type="text" id="rp-title" placeholder="Ex: Attaque de diligence…"></div>
      <div class="form-group"><label>Date</label><input type="date" id="rp-date" value="${nowDate()}"></div>
      <div class="form-group"><label>Département</label>
        <select id="rp-dept">${depts.map(d=>`<option ${d===getDeptLabel(s.dept)?'selected':''}>${d}</option>`).join('')}</select>
      </div>
      <div class="form-group full"><label>Lier à une enquête (optionnel)</label>
        <select id="rp-enquete">
          <option value="">— Aucune —</option>
          ${enquetes.map(e=>`<option value="${e.id}||${esc(e.name)}">${esc(e.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full">
        <label>Récit des faits *</label>
        <div class="quill-wrapper" id="rp-quill-wrapper">
          <div id="rp-quill-editor"></div>
        </div>
      </div>
    </div>
    <div class="notice notice-info mt-1">✒ Signature : <strong>${esc(s.name)}</strong> — ${esc(s.grade)}</div>
    <div class="notice notice-warn">⏳ En attente d'approbation par le Commander.</div>
  `, async () => {
    const title = document.getElementById('rp-title').value.trim();
    const quillCreate = window._quillCreate;
    const narrative = quillCreate ? quillCreate.root.innerHTML : '';
    const narrativeText = quillCreate ? quillCreate.getText().trim() : '';
    if (!title || !narrativeText) return showToast('Titre et récit obligatoires.','error');
    const enqueteVal = document.getElementById('rp-enquete').value;
    const [enqId, enqName] = enqueteVal ? enqueteVal.split('||') : ['',''];
    setModalLoading(true);
    try {
      const docId = await createDoc('reports',{
        title, date:document.getElementById('rp-date').value,
        dept:document.getElementById('rp-dept').value,
        narrative, status:'En attente',
        approvedBy:'', approvedByGrade:'',
        enqueteId:enqId||'', enqueteName:enqName||'',
        photos:[],
      });
      if (enqId) {
        const enq = await getOne('enquetes',enqId);
        const refs = enq?.reportRefs||[];
        await updateDoc('enquetes',enqId,{ reportRefs:[...refs,{id:docId,title}] });
      }
      await addLog('CRÉATION',`Rapport rédigé — ${title}`);
      closeModal();
      showToast('Rapport soumis.','success');
      refreshPage();
      setTimeout(()=>viewReport(docId), 600);
    } catch(e) { showToast('Erreur : '+e.message,'error'); }
    finally { setModalLoading(false); }
  }, 'Soumettre');

  // Init Quill après rendu de la modale
  setTimeout(() => {
    if (typeof Quill === 'undefined') return;
    window._quillCreate = new Quill('#rp-quill-editor', {
      theme: 'snow',
      placeholder: 'Décrivez l\'incident avec précision…',
      modules: {
        toolbar: [
  [{ 'header': [1, 2, 3, false] }],
  [{ 'size': ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'align': [] }],
  ['blockquote', 'clean']
]
      }
    });
  }, 80);
};

// ═══════════════════════════════════════════════════════════
// MANDATS D'ARRÊT
// ═══════════════════════════════════════════════════════════
registerPage('warrants', async el => {
  el.innerHTML = pageHeader('Bureau des Mandats',"Mandats d'Arrêt",
    `<button class="btn btn-primary" onclick="openWarrantModal()">+ Émettre un Mandat</button>`);
  el.innerHTML += `
    <div class="tabs">
      <button class="tab active" onclick="loadWarrants(this,'Actif')">Actifs</button>
      <button class="tab" onclick="loadWarrants(this,'Expiré')">Clos</button>
      <button class="tab" onclick="loadWarrants(this,'all')">Tous</button>
    </div><div id="warrant-list"></div>`;
  loadWarrants(el.querySelector('.tab.active'),'Actif');
});

window.loadWarrants = async function(btn,filter) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  btn?.classList.add('active');
  const listEl = document.getElementById('warrant-list');
  if (!listEl) return;
  listEl.innerHTML = '<p class="text-muted" style="padding:1rem;">Chargement…</p>';
  try {
    const all = await getAll('warrants');
    const items = filter==='all'?all:all.filter(w=>w.status===filter);
    listEl.innerHTML = items.length ? items.map(w=>`
      <div class="warrant-card ${w.status!=='Actif'?'inactive':''}">
        <div style="flex:1;">
          <div class="warrant-name">${esc(w.suspectName)}</div>
          <div class="warrant-details">${esc(w.crime)}</div>
          <div class="warrant-details">Émis par ${esc(w.createdBy)} · ${formatDate(w.createdAt)}</div>
          ${(w.photos||[]).length?`<div class="warrant-details">📷 ${w.photos.length} photo(s)</div>`:''}
        </div>
        <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:.4rem;">
          ${statusBadge(w.level)}
          <span style="font-family:var(--font-display);font-size:1.2rem;font-weight:900;color:var(--bordeaux);">${w.bounty?'$'+w.bounty:'—'}</span>
          ${statusBadge(w.status)}
          <div class="btn-group" style="justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="viewWarrant('${w.id}')">Voir & Photos</button>
            ${w.status==='Actif'?`<button class="btn btn-danger btn-sm" onclick="closeWarrant('${w.id}')">Clôturer</button>`:''}
            ${isCommander()?`<button class="btn btn-danger btn-sm" onclick="deleteWarrant('${w.id}')">Suppr.</button>`:''}
          </div>
        </div>
      </div>`).join('')
    : '<p class="text-muted" style="padding:1rem;">Aucun mandat.</p>';
  } catch(e) { listEl.innerHTML=`<div class="notice notice-error">${esc(e.message)}</div>`; }
};

window.viewWarrant = async function(id) {
  const w = await getOne('warrants',id);
  if (!w) return;
  openModal("Mandat d'Arrêt", `
    <div class="document-header">
      <div class="document-title">Mandat d'Arrêt</div>
      <div class="document-ref">West Elizabeth Law Enforcement — ${formatDate(w.createdAt)}</div>
    </div>
    ${[['Individu',w.suspectName],['Infraction(s)',w.crime],['Niveau',w.level],['Prime',w.bounty?'$'+w.bounty:'—'],['Statut',w.status],['Émis par',`${w.createdBy} — ${w.createdByGrade}`]]
      .map(([l,v])=>`<div class="doc-field"><span class="doc-field-label">${l}</span><span class="doc-field-value">${['Statut','Niveau'].includes(l)?statusBadge(v):esc(String(v))}</span></div>`).join('')}
    <div class="signature-block">
      <div class="signature-field">
        <div class="signature-line">${esc(w.createdBy)}</div>
        <div class="signature-label">Signataire · ${esc(w.createdByGrade)}</div>
      </div>
    </div>
    ${photoGalleryHtml(w.photos||[],'warrants',id)}
  `);
  await addLog('CONSULTATION',`Mandat consulté — ${w.suspectName}`);
};

window.closeWarrant = async function(id) {
  if (!confirm('Clôturer ce mandat ?')) return;
  try { await updateDoc('warrants',id,{status:'Expiré'}); await addLog('CLÔTURE',`Mandat clôturé`); showToast('Clôturé.','success'); loadWarrants(document.querySelector('.tab.active'),'Actif'); }
  catch(e) { showToast('Erreur : '+e.message,'error'); }
};

window.deleteWarrant = async function(id) {
  if (!isCommander()||!confirm('Supprimer ce mandat ?')) return;
  try { await deleteDoc('warrants',id); await addLog('SUPPRESSION','Mandat supprimé'); showToast('Supprimé.','success'); refreshPage(); }
  catch(e) { showToast('Erreur : '+e.message,'error'); }
};

window.openWarrantModal = async function() {
  const citizens = await getAll('citizens');
  const s = window.currentSession;
  openModal("Émettre un Mandat d'Arrêt", `
    <div class="form-grid">
      <div class="form-group full"><label>Individu (registre)</label>
        <select id="w-suspect-sel"><option value="">— Sélectionner (optionnel) —</option>
          ${citizens.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label>Ou nom libre *</label><input type="text" id="w-suspect-free" placeholder="Si non enregistré"></div>
      <div class="form-group"><label>Niveau</label><select id="w-level"><option>Vivant</option><option>Mort ou Vif</option></select></div>
      <div class="form-group"><label>Prime ($)</label><input type="text" id="w-bounty" placeholder="0"></div>
      <div class="form-group full"><label>Motif(s) *</label><input type="text" id="w-crime" placeholder="Ex: Meurtre, Vol…"></div>
    </div>
    <div class="notice notice-info mt-1">✒ Émis au nom de : <strong>${esc(s.name)}</strong> — ${esc(s.grade)}</div>
  `, async () => {
    const name = document.getElementById('w-suspect-free').value.trim()||document.getElementById('w-suspect-sel').value;
    const crime = document.getElementById('w-crime').value.trim();
    if (!name||!crime) return showToast('Suspect et motif obligatoires.','error');
    setModalLoading(true);
    try {
      const docId = await createDoc('warrants',{ suspectName:name, crime, level:document.getElementById('w-level').value, bounty:parseInt(document.getElementById('w-bounty').value)||0, status:'Actif', photos:[] });
      await addLog('ÉMISSION',`Mandat émis — ${name}`);
      closeModal(); showToast('Mandat émis.','success');
      refreshPage();
      setTimeout(()=>viewWarrant(docId), 600);
    } catch(e) { showToast('Erreur : '+e.message,'error'); }
    finally { setModalLoading(false); }
  },'Émettre');
};

// ═══════════════════════════════════════════════════════════
// ARMES
// ═══════════════════════════════════════════════════════════
registerPage('weapons', async el => {
  el.innerHTML = pageHeader('Registre des Armes','Gestion des Armes',
    `<button class="btn btn-primary" onclick="openWeaponModal()">+ Enregistrer</button>`);
  try {
    const weapons = await getAll('weapons');
    el.innerHTML += `
      <div class="card" style="padding:0;">
        <div class="table-wrap"><table>
          <thead><tr><th>N° Série</th><th>Type</th><th>Modèle</th><th>Propriétaire</th><th>Date</th><th>Statut</th>${isCommander()?'<th>Actions</th>':''}</tr></thead>
          <tbody>${weapons.length?weapons.map(w=>`<tr>
            <td style="font-family:var(--font-stamp);font-size:.78rem;">${esc(w.serial)}</td>
            <td>${esc(w.type)}</td><td>${esc(w.model||'—')}</td><td>${esc(w.owner||'—')}</td>
            <td>${formatDate(w.date||w.createdAt)}</td><td>${statusBadge(w.status)}</td>
            ${isCommander()?`<td><button class="btn btn-danger btn-sm" onclick="deleteWeapon('${w.id}','${esc(w.serial).replace(/'/g,"\\'")}')">Suppr.</button></td>`:''}
          </tr>`).join(''):emptyRow(isCommander()?7:6)}</tbody>
        </table></div>
        <div class="table-footer"><span>${weapons.length} arme(s)</span></div>
      </div>`;
  } catch(e) { el.innerHTML+=`<div class="notice notice-error">${esc(e.message)}</div>`; }
});

window.openWeaponModal = async function() {
  const citizens = await getAll('citizens');
  openModal('Enregistrer une Arme',`
    <div class="form-grid">
      <div class="form-group"><label>N° de série *</label><input type="text" id="wp-serial"></div>
      <div class="form-group"><label>Type</label>
        <select id="wp-type">${['Révolver','Pistolet','Fusil','Fusil à pompe','Carabine','Couteau','Autre'].map(t=>`<option>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Modèle</label><input type="text" id="wp-model"></div>
      <div class="form-group full"><label>Propriétaire (citoyen enregistré)</label>
        <select id="wp-owner-sel">
          <option value="">— Sélectionner un citoyen —</option>
          ${citizens.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label>Ou propriétaire libre (si non enregistré)</label>
        <input type="text" id="wp-owner-free" placeholder="Nom libre">
      </div>
      <div class="form-group"><label>Date</label><input type="date" id="wp-date" value="${nowDate()}"></div>
      <div class="form-group"><label>Statut</label>
        <select id="wp-status">${['En service','Confisqué','Perdu','Détruit'].map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
    </div>`,async()=>{
    const serial = document.getElementById('wp-serial').value.trim();
    if (!serial) return showToast('N° de série obligatoire.','error');
    const ownerFromList = document.getElementById('wp-owner-sel').value;
    const ownerFree     = document.getElementById('wp-owner-free').value.trim();
    const owner = ownerFree || ownerFromList;
    setModalLoading(true);
    try {
      await createDoc('weapons',{
        serial,
        type:   document.getElementById('wp-type').value,
        model:  document.getElementById('wp-model').value,
        owner,
        date:   document.getElementById('wp-date').value,
        status: document.getElementById('wp-status').value,
      });
      await addLog('CRÉATION',`Arme enregistrée — ${serial} — ${owner||'—'}`);
      closeModal(); showToast('Enregistrée.','success'); refreshPage();
    }catch(e){ showToast('Erreur : '+e.message,'error'); }
    finally{ setModalLoading(false); }
  },'Enregistrer');
};

window.deleteWeapon = async function(id,serial) {
  if(!isCommander()||!confirm(`Supprimer l'arme ${serial} ?`)) return;
  try{await deleteDoc('weapons',id);await addLog('SUPPRESSION',`Arme supprimée — ${serial}`);showToast('Supprimée.','success');refreshPage();}
  catch(e){showToast('Erreur : '+e.message,'error');}
};

// ═══════════════════════════════════════════════════════════
// PROPRIÉTÉS
// ═══════════════════════════════════════════════════════════
registerPage('properties', async el => {
  el.innerHTML = pageHeader('Registre Foncier','Gestion des Propriétés',
    `<button class="btn btn-primary" onclick="openPropertyModal()">+ Nouvelle Propriété</button>`);
  try {
    const props = await getAll('properties');
    if (!props.length){el.innerHTML+='<div class="card"><p class="text-muted">Aucune propriété.</p></div>';return;}
    const grid = document.createElement('div');
    grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;';
    props.forEach(p=>{
      const card=document.createElement('div'); card.className='card';
      card.innerHTML=`<div class="card-title">${esc(p.name)}</div>
        ${[['Type',p.type],['Propriétaire',p.owner||'—'],['Adresse',p.address||'—'],['Statut',p.status],['Notes',p.notes||'—']]
          .map(([l,v])=>`<div class="doc-field"><span class="doc-field-label">${l}</span><span class="doc-field-value">${l==='Statut'?statusBadge(v):esc(String(v))}</span></div>`).join('')}
        ${isCommander()?`<div style="margin-top:.75rem;"><button class="btn btn-danger btn-sm" onclick="deleteProperty('${p.id}','${esc(p.name).replace(/'/g,"\\'")}')">Supprimer</button></div>`:''}`;
      grid.appendChild(card);
    });
    el.appendChild(grid);
  }catch(e){el.innerHTML+=`<div class="notice notice-error">${esc(e.message)}</div>`;}
});

window.openPropertyModal = async function() {
  const citizens = await getAll('citizens');
  openModal('Nouvelle Propriété',`
    <div class="form-grid">
      <div class="form-group full"><label>Nom *</label><input type="text" id="pr-name"></div>
      <div class="form-group full"><label>Adresse</label><input type="text" id="pr-addr"></div>
      <div class="form-group full"><label>Propriétaire (citoyen enregistré)</label>
        <select id="pr-owner-sel">
          <option value="">— Sélectionner un citoyen —</option>
          ${citizens.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label>Ou propriétaire libre (si non enregistré)</label>
        <input type="text" id="pr-owner-free" placeholder="Nom libre">
      </div>
      <div class="form-group"><label>Type</label>
        <select id="pr-type">${['Ranch','Résidence','Appartement','Commerce','Terrain','Autre'].map(t=>`<option>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Statut</label>
        <select id="pr-status">${['Actif','Saisie','Abandonné','Sous surveillance'].map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
      <div class="form-group full"><label>Notes</label><textarea id="pr-notes"></textarea></div>
    </div>`,async()=>{
    const name = document.getElementById('pr-name').value.trim();
    if (!name) return showToast('Nom obligatoire.','error');
    const ownerFromList = document.getElementById('pr-owner-sel').value;
    const ownerFree     = document.getElementById('pr-owner-free').value.trim();
    const owner = ownerFree || ownerFromList;
    setModalLoading(true);
    try {
      await createDoc('properties',{
        name,
        address: document.getElementById('pr-addr').value,
        owner,
        type:    document.getElementById('pr-type').value,
        status:  document.getElementById('pr-status').value,
        notes:   document.getElementById('pr-notes').value,
      });
      await addLog('CRÉATION',`Propriété — ${name}`);
      closeModal(); showToast('Enregistrée.','success'); refreshPage();
    } catch(e){ showToast('Erreur : '+e.message,'error'); }
    finally{ setModalLoading(false); }
  },'Enregistrer');
};

window.deleteProperty=async function(id,name){
  if(!isCommander()||!confirm(`Supprimer ${name} ?`)) return;
  try{await deleteDoc('properties',id);await addLog('SUPPRESSION',`Propriété supprimée — ${name}`);showToast('Supprimée.','success');refreshPage();}
  catch(e){showToast('Erreur : '+e.message,'error');}
};

// ═══════════════════════════════════════════════════════════
// PERSONNEL (avec fiche cliquable + télégramme + modif Commander)
// ═══════════════════════════════════════════════════════════
registerPage('personnel', async el => {
  el.innerHTML = pageHeader('Registre du Personnel','Personnel FDO',
    isCommander() ? `
      <button class="btn btn-primary" onclick="openAddPersonnelModal()">+ Ajouter</button>
      <button class="btn btn-secondary" onclick="openPasswordModal()">🔒 Mots de passe</button>` : '');
  try {
    const agents = await getAll('personnel');
    if (!agents.length){el.innerHTML+='<div class="card"><p class="text-muted">Aucun agent.</p></div>';return;}
    for (const [deptKey,dept] of Object.entries(DEPARTMENTS)) {
      const deptAgents = agents.filter(a=>getGradeDept(a.grade)===deptKey);
      if (!deptAgents.length) continue;
      const section=document.createElement('div'); section.className='card';
      section.innerHTML=`<div class="card-title">${dept.icon} ${dept.label} (${deptAgents.length})</div>
        <div class="officers-grid">
          ${deptAgents.map(a=>`
            <div class="officer-card" onclick="viewPersonnel('${a.id}')" style="cursor:pointer;" title="Voir la fiche">
              <div class="officer-avatar">${getGradeIcon(a.grade)}</div>
              <div style="flex:1;">
                <div class="officer-name">${esc(a.name)}</div>
                <div class="officer-rank">${esc(a.grade)}</div>
                <div style="margin-top:.35rem;display:flex;gap:.4rem;flex-wrap:wrap;">
                  ${statusBadge(a.status||'En service')}
                  ${a.telegram?`<span class="text-muted">${esc(a.telegram)}</span>`:''}
                </div>
              </div>
              ${isCommander()?`<div class="btn-group" style="flex-direction:column;gap:.3rem;">
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openEditPersonnelModal('${a.id}')">✏️</button>
                <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deletePersonnel('${a.id}','${esc(a.name).replace(/'/g,"\\'")}')">✕</button>
              </div>`:''}
            </div>`).join('')}
        </div>`;
      el.appendChild(section);
    }
  }catch(e){el.innerHTML+=`<div class="notice notice-error">${esc(e.message)}</div>`;}
});

window.viewPersonnel = async function(id) {
  const a = await getOne('personnel',id);
  if (!a) return;
  openModal('Fiche Agent',`
    <div class="document-header">
      <div class="document-title">${esc(a.name)}</div>
      <div class="document-ref">${esc(a.grade)} · ${getDeptLabel(getGradeDept(a.grade))}</div>
    </div>
    ${[['Grade',a.grade],['Statut',a.status||'En service'],['Département',getDeptLabel(getGradeDept(a.grade))],['Télégramme',a.telegram||'—'],['Date d\'entrée',formatDate(a.joined)],['Notes',a.notes||'—']]
      .map(([l,v])=>`<div class="doc-field"><span class="doc-field-label">${l}</span><span class="doc-field-value">${l==='Statut'?statusBadge(v):esc(String(v))}</span></div>`).join('')}
  `);
};

window.openAddPersonnelModal = function() {
  openModal('Ajouter un Agent',`
    <div class="form-grid">
      <div class="form-group full"><label>Nom *</label><input type="text" id="pe-name"></div>
      <div class="form-group full"><label>Grade *</label><select id="pe-grade"></select></div>
      <div class="form-group full"><label>Télégramme</label><input type="text" id="pe-telegram" placeholder="@pseudo"></div>
      <div class="form-group"><label>Statut</label><select id="pe-status">${['En service','Congé','Suspendu','Retraite'].map(s=>`<option>${s}</option>`).join('')}</select></div>
      <div class="form-group"><label>Date d'entrée</label><input type="date" id="pe-joined" value="${nowDate()}"></div>
      <div class="form-group full"><label>Notes</label><textarea id="pe-notes"></textarea></div>
    </div>`,async()=>{
    const name=document.getElementById('pe-name').value.trim();
    const grade=document.getElementById('pe-grade').value;
    if(!name||!grade) return showToast('Nom et grade obligatoires.','error');
    setModalLoading(true);
    try{await createDoc('personnel',{name,grade,telegram:document.getElementById('pe-telegram').value,status:document.getElementById('pe-status').value,joined:document.getElementById('pe-joined').value,notes:document.getElementById('pe-notes').value});
      await addLog('CRÉATION',`Agent ajouté — ${name}`);closeModal();showToast('Agent ajouté.','success');refreshPage();}
    catch(e){showToast('Erreur : '+e.message,'error');}finally{setModalLoading(false);}
  },'Ajouter');
  setTimeout(()=>buildGradeSelect('pe-grade','',true),50);
};

window.openEditPersonnelModal = async function(id) {
  const a = await getOne('personnel',id);
  if (!a) return;
  openModal('Modifier la Fiche Agent',`
    <div class="form-grid">
      <div class="form-group full"><label>Nom *</label><input type="text" id="pe-name"></div>
      <div class="form-group full"><label>Grade *</label><select id="pe-grade"></select></div>
      <div class="form-group full"><label>Télégramme</label><input type="text" id="pe-telegram"></div>
      <div class="form-group"><label>Statut</label><select id="pe-status">${['En service','Congé','Suspendu','Retraite'].map(s=>`<option ${(a.status||'En service')===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div class="form-group"><label>Date d'entrée</label><input type="date" id="pe-joined"></div>
      <div class="form-group full"><label>Notes</label><textarea id="pe-notes"></textarea></div>
    </div>`,async()=>{
    const name=document.getElementById('pe-name').value.trim();
    const grade=document.getElementById('pe-grade').value;
    if(!name||!grade) return showToast('Nom et grade obligatoires.','error');
    setModalLoading(true);
    try{await updateDoc('personnel',id,{name,grade,telegram:document.getElementById('pe-telegram').value,status:document.getElementById('pe-status').value,joined:document.getElementById('pe-joined').value,notes:document.getElementById('pe-notes').value});
      await addLog('MODIFICATION',`Fiche agent modifiée — ${name}`);closeModal();showToast('Modifié.','success');refreshPage();}
    catch(e){showToast('Erreur : '+e.message,'error');}finally{setModalLoading(false);}
  },'Enregistrer');
  setTimeout(()=>{
    buildGradeSelect('pe-grade',a.grade,true);
    document.getElementById('pe-name').value    = a.name||'';
    document.getElementById('pe-telegram').value= a.telegram||'';
    document.getElementById('pe-joined').value  = a.joined||'';
    document.getElementById('pe-notes').value   = a.notes||'';
  },50);
};

window.deletePersonnel = async function(id,name) {
  if(!isCommander()||!confirm(`Retirer ${name} du registre ?`)) return;
  try{await deleteDoc('personnel',id);await addLog('SUPPRESSION',`Agent retiré — ${name}`);showToast('Retiré.','success');refreshPage();}
  catch(e){showToast('Erreur : '+e.message,'error');}
};

window.openPasswordModal = function() {
  openModal('🔒 Modifier les Mots de Passe',`
    <div class="notice notice-warn mb-2">Les mots de passe sont hashés SHA-256 — jamais lisibles en clair.</div>
    <div style="margin-bottom:1.5rem;">
      <div class="card-title" style="margin-bottom:.75rem;">Mot de passe Agents</div>
      <div class="form-grid">
        <div class="form-group"><label>Nouveau mot de passe</label><input type="password" id="pwd-agent"></div>
        <div class="form-group"><label>Confirmer</label><input type="password" id="pwd-agent2"></div>
      </div>
      <button class="btn btn-primary btn-sm mt-1" onclick="applyPasswordChange('agent')">Appliquer</button>
    </div>
    <div>
      <div class="card-title" style="margin-bottom:.75rem;">Mot de passe Commander</div>
      <div class="form-grid">
        <div class="form-group"><label>Nouveau mot de passe</label><input type="password" id="pwd-cmd"></div>
        <div class="form-group"><label>Confirmer</label><input type="password" id="pwd-cmd2"></div>
      </div>
      <button class="btn btn-primary btn-sm mt-1" onclick="applyPasswordChange('commander')">Appliquer</button>
    </div>`);
};

window.applyPasswordChange = async function(type) {
  const a = document.getElementById(`pwd-${type==='commander'?'cmd':'agent'}`).value;
  const b = document.getElementById(`pwd-${type==='commander'?'cmd2':'agent2'}`).value;
  if (!a) return showToast('Saisir un mot de passe.','error');
  if (a!==b) return showToast('Les mots de passe ne correspondent pas.','error');
  if (a.length<6) return showToast('Minimum 6 caractères.','error');
  try { await changePassword(type,a); showToast(`Mot de passe ${type} mis à jour.`,'success'); }
  catch(e) { showToast('Erreur : '+e.message,'error'); }
};

// ═══════════════════════════════════════════════════════════
// ENQUÊTES
// ═══════════════════════════════════════════════════════════
registerPage('enquetes', async el => {
  el.innerHTML = pageHeader('Bureau des Investigations','Enquêtes',
    `<button class="btn btn-primary" onclick="openEnqueteModal()">+ Nouvelle Enquête</button>`);
  try {
    const enquetes = await getAll('enquetes');
    if (!enquetes.length){el.innerHTML+='<div class="card"><p class="text-muted">Aucune enquête ouverte.</p></div>';return;}
    enquetes.forEach(enq=>{
      const card=document.createElement('div'); card.className='card';
      card.style.borderLeft='4px solid var(--sepia)';
      card.innerHTML=`
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:.75rem;">
          <div>
            <div style="font-family:var(--font-display);font-size:1.1rem;font-weight:700;color:var(--leather);">🔍 ${esc(enq.name)}</div>
            <div class="text-muted">Responsable : ${esc(enq.responsable||'—')} · Territoire : ${esc(enq.territoire||'—')}</div>
          </div>
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm" onclick="viewEnquete('${enq.id}')">Voir la fiche</button>
            ${can('edit_enquete')?`<button class="btn btn-secondary btn-sm" onclick="openEnqueteModal('${enq.id}')">Modifier</button>`:''}
            ${isCommander()?`<button class="btn btn-danger btn-sm" onclick="deleteEnquete('${enq.id}','${esc(enq.name).replace(/'/g,"\\'")}')">Suppr.</button>`:''}
          </div>
        </div>
        <p style="font-size:.88rem;line-height:1.65;">${esc((enq.description||'').substring(0,200))}${(enq.description||'').length>200?'…':''}</p>
        ${(enq.reportRefs||[]).length?`<div class="text-muted" style="margin-top:.4rem;">📋 ${enq.reportRefs.length} rapport(s) lié(s)</div>`:''}`;
      el.appendChild(card);
    });
  }catch(e){el.innerHTML+=`<div class="notice notice-error">${esc(e.message)}</div>`;}
});

window.viewEnquete = async function(id) {
  const enq = await getOne('enquetes',id);
  if (!enq) return;
  const refs = enq.reportRefs||[];
  openModal(`Enquête — ${enq.name}`,`
    <div class="document-header">
      <div class="document-title">🔍 ${esc(enq.name)}</div>
      <div class="document-ref">West Elizabeth Law Enforcement — Enquête</div>
    </div>
    ${[['Responsable',enq.responsable||'—'],['Territoire',enq.territoire||'—']]
      .map(([l,v])=>`<div class="doc-field"><span class="doc-field-label">${l}</span><span class="doc-field-value">${esc(String(v))}</span></div>`).join('')}
    <div style="margin-top:1rem;">
      <div class="text-muted" style="margin-bottom:.4rem;">Description</div>
      <p id="enq-desc" style="font-size:.92rem;line-height:1.7;"></p>
    </div>
    ${enq.notes?`<div style="margin-top:.75rem;"><div class="text-muted" style="margin-bottom:.4rem;">Notes</div><p id="enq-notes" style="font-size:.88rem;line-height:1.65;"></p></div>`:''}
    <div style="margin-top:1.25rem;">
      <div class="text-muted" style="margin-bottom:.5rem;">📋 Rapports liés (${refs.length})</div>
      ${refs.length?refs.map(r=>`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem .5rem;border-bottom:1px solid rgba(160,128,64,.2);">
          <span style="font-size:.88rem;">${esc(r.title)}</span>
          <button class="btn btn-secondary btn-sm" onclick="viewReport('${r.id}')">Voir</button>
        </div>`).join(''):`<p class="text-muted">Aucun rapport lié.</p>`}
    </div>
    <div style="margin-top:1rem;">
      <button class="btn btn-primary btn-sm" onclick="closeModal();openReportModal()">+ Ajouter un rapport lié</button>
    </div>
  `);
  setTimeout(()=>{
    const d=document.getElementById('enq-desc');
    const n=document.getElementById('enq-notes');
    if(d) d.textContent=enq.description||'';
    if(n) n.textContent=enq.notes||'';
  },40);
  await addLog('CONSULTATION',`Enquête consultée — ${enq.name}`);
};

window.openEnqueteModal = async function(id=null) {
  const enq = id?await getOne('enquetes',id):null;
  const agents = await getAll('personnel');
  openModal(enq?'Modifier l\'Enquête':'Nouvelle Enquête',`
    <div class="form-grid">
      <div class="form-group full"><label>Nom de l'enquête *</label><input type="text" id="enq-name"></div>
      <div class="form-group full"><label>Responsable</label>
        <select id="enq-resp">
          <option value="">— Sélectionner —</option>
          ${agents.map(a=>`<option value="${esc(a.name)}" ${enq?.responsable===a.name?'selected':''}>${esc(a.name)} — ${esc(a.grade)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label>Territoire revendiqué</label><input type="text" id="enq-territoire" placeholder="Ex: Scarlett Meadows, Tall Trees…"></div>
      <div class="form-group full"><label>Description *</label><textarea id="enq-desc" style="min-height:120px;"></textarea></div>
      <div class="form-group full"><label>Notes</label><textarea id="enq-notes" style="min-height:80px;"></textarea></div>
    </div>`,async()=>{
    const name=document.getElementById('enq-name').value.trim();
    const description=document.getElementById('enq-desc').value.trim();
    if(!name||!description) return showToast('Nom et description obligatoires.','error');
    setModalLoading(true);
    try{
      const data={name,responsable:document.getElementById('enq-resp').value,territoire:document.getElementById('enq-territoire').value,description,notes:document.getElementById('enq-notes').value};
      if(enq){await updateDoc('enquetes',enq.id,data);await addLog('MODIFICATION',`Enquête modifiée — ${name}`);}
      else   {await createDoc('enquetes',{...data,reportRefs:[]});await addLog('CRÉATION',`Enquête créée — ${name}`);}
      closeModal();showToast('Enregistrée.','success');refreshPage();
    }catch(e){showToast('Erreur : '+e.message,'error');}finally{setModalLoading(false);}
  },enq?'Modifier':'Créer');
  setTimeout(()=>{
    if(enq){
      document.getElementById('enq-name').value       = enq.name||'';
      document.getElementById('enq-territoire').value = enq.territoire||'';
      document.getElementById('enq-desc').value       = enq.description||'';
      document.getElementById('enq-notes').value      = enq.notes||'';
    }
  },50);
};

window.deleteEnquete = async function(id,name) {
  if(!isCommander()||!confirm(`Supprimer l'enquête "${name}" ?`)) return;
  try{await deleteDoc('enquetes',id);await addLog('SUPPRESSION',`Enquête supprimée — ${name}`);showToast('Supprimée.','success');refreshPage();}
  catch(e){showToast('Erreur : '+e.message,'error');}
};

// ═══════════════════════════════════════════════════════════
// CODE PÉNAL (ouvre nouvel onglet)
// ═══════════════════════════════════════════════════════════
registerPage('penal', async el => {
  el.innerHTML = pageHeader('Législation du Territoire','Code Pénal');
  el.innerHTML += `
    <div class="card" style="text-align:center;padding:3rem 2rem;">
      <div style="font-size:3rem;margin-bottom:1rem;">⚖️</div>
      <div style="font-family:var(--font-display);font-size:1.3rem;font-weight:700;color:var(--leather);margin-bottom:.75rem;">
        West Elizabeth Laws
      </div>
      <p style="font-size:.95rem;line-height:1.7;max-width:480px;margin:0 auto 1.5rem;">
        Le code pénal complet du territoire de West Elizabeth est disponible sur le registre officiel en ligne.
      </p>
      <a href="https://thebllazer.gitbook.io/we-laws" target="_blank" rel="noopener" class="btn btn-primary" style="font-size:.85rem;padding:.75rem 2rem;">
        Ouvrir le Code Pénal ↗
      </a>
    </div>`;
  await addLog('CONSULTATION','Code pénal consulté');
});

// ═══════════════════════════════════════════════════════════
// JOURNAL DES ACTIONS
// ═══════════════════════════════════════════════════════════
registerPage('logs', async el => {
  if (!isCommander()){el.innerHTML='<div class="notice notice-error">Accès réservé au Commander.</div>';return;}
  el.innerHTML = pageHeader('Traçabilité','Journal des Actions');
  try {
    const logs = await getLogs(50);
    el.innerHTML += `
      <div class="card" style="padding:0;">
        <div style="padding:.75rem 1.5rem;background:var(--leather);color:var(--gold);font-family:var(--font-stamp);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;">
          ${logs.length} entrée(s) — 50 dernières actions
        </div>
        <div style="padding:.75rem 1.5rem;">
          ${logs.length?logs.map(l=>`
            <div class="log-entry">
              <div class="log-time">${formatDateTime(l.timestamp)}<br><span style="color:var(--bordeaux);font-size:.62rem;">${esc(l.action)}</span></div>
              <div><span class="log-actor">${esc(l.agentName)}</span> <span class="text-muted">(${esc(l.agentGrade)})</span> — ${esc(l.detail)}</div>
            </div>`).join('')
          :'<p class="text-muted">Aucune action.</p>'}
        </div>
      </div>`;
  }catch(e){el.innerHTML+=`<div class="notice notice-error">${esc(e.message)}</div>`;}
});

// ═══════════════════════════════════════════════════════════
// GROUPES ILLÉGAUX
// ═══════════════════════════════════════════════════════════
registerPage('groupes', async el => {
  el.innerHTML = pageHeader('Bureau du Renseignement', 'Groupes Illégaux',
    '<button class="btn btn-primary" onclick="openGroupeModal()">+ Nouveau Groupe</button>');
  try {
    const [groupes, citizens, reports, enquetes] = await Promise.all([
      getAll('groupes'), getAll('citizens'), getAll('reports'), getAll('enquetes')
    ]);
    if (!groupes.length) {
      el.innerHTML += '<div class="card"><p class="text-muted">Aucun groupe enregistré.</p></div>';
      return;
    }
    groupes.forEach(g => renderGroupeCard(el, g, citizens, reports, enquetes));
  } catch(e) {
    el.innerHTML += '<div class="notice notice-error">' + esc(e.message) + '</div>';
  }
});

function renderGroupeCard(el, g, citizens, reports, enquetes) {
  // Membres automatiques : citoyens affiliés à ce groupe
  const membres = citizens.filter(c => c.affiliation === g.id);
  // Rapports et enquêtes liés
  const linkedReports  = (g.reportRefs  || []).map(ref => reports.find(r => r.id === ref.id)).filter(Boolean);
  const linkedEnquetes = (g.enqueteRefs || []).map(ref => enquetes.find(e => e.id === ref.id)).filter(Boolean);

  const card = document.createElement('div');
  card.className = 'card';
  card.style.borderLeft = '4px solid var(--bordeaux)';

  // Membres HTML
  const membresHtml = membres.length
    ? membres.map(c => `<span style="background:var(--parchment);border:1px solid var(--bordeaux);padding:.25rem .7rem;font-size:.84rem;cursor:pointer;color:var(--bordeaux);" onclick="viewCitizen('${c.id}')">${esc(c.name)}</span>`).join('')
    : `<p class="text-muted" style="font-size:.85rem;">Aucun citoyen affilié.<br><span style="opacity:.75;">Modifiez une fiche citoyen pour définir l'affiliation.</span></p>`;

  // Rapports liés HTML
  const reportsHtml = linkedReports.length
    ? linkedReports.map(r => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem .5rem;border-bottom:1px solid rgba(160,128,64,.18);font-size:.87rem;">
          <span>${esc(r.title)} ${statusBadge(r.status)}</span>
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm" onclick="viewReport('${r.id}')">Voir</button>
            <button class="btn btn-danger btn-sm" onclick="unlinkFromGroupe('${g.id}','report','${r.id}')">✕</button>
          </div>
        </div>`).join('')
    : '<p class="text-muted" style="font-size:.84rem;">Aucun rapport lié.</p>';

  // Enquêtes liées HTML
  const enquetesHtml = linkedEnquetes.length
    ? linkedEnquetes.map(e => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem .5rem;border-bottom:1px solid rgba(160,128,64,.18);font-size:.87rem;">
          <span>🔍 ${esc(e.name)} — ${esc(e.responsable || '—')}</span>
          <div class="btn-group">
            <button class="btn btn-secondary btn-sm" onclick="viewEnquete('${e.id}')">Voir</button>
            <button class="btn btn-danger btn-sm" onclick="unlinkFromGroupe('${g.id}','enquete','${e.id}')">✕</button>
          </div>
        </div>`).join('')
    : '<p class="text-muted" style="font-size:.84rem;">Aucune enquête liée.</p>';

  // Bouton suppression (commander uniquement)
  const delBtn = isCommander()
    ? `<button class="btn btn-danger btn-sm" onclick="deleteGroupe('${g.id}','${esc(g.nom).replace(/'/g, "\\'")}')">Suppr.</button>`
    : '';

  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:.85rem;">
      <div>
        <div style="font-family:var(--font-display);font-size:1.15rem;font-weight:900;color:var(--bordeaux);">🔴 ${esc(g.nom)}</div>
        <div class="text-muted" style="margin-top:.2rem;">Comté : ${esc(g.comte || '—')}</div>
      </div>
      <div class="btn-group">
        <button class="btn btn-secondary btn-sm" onclick="openGroupeModal('${g.id}')">✏️ Modifier</button>
        ${delBtn}
      </div>
    </div>
    <div class="doc-field">
      <span class="doc-field-label">Description</span>
      <span class="doc-field-value" id="grp-desc-${g.id}"></span>
    </div>

    <div style="margin-top:1rem;">
      <div style="font-family:var(--font-stamp);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--leather);margin-bottom:.5rem;">
        👥 Membres (${membres.length})
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;">${membresHtml}</div>
    </div>

    <div style="margin-top:1.1rem;padding-top:1rem;border-top:1px dashed var(--border);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem;">
        <div style="font-family:var(--font-stamp);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--leather);">
          📋 Rapports liés (${linkedReports.length})
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openLinkModal('${g.id}','report')">+ Lier un rapport</button>
      </div>
      ${reportsHtml}
    </div>

    <div style="margin-top:1rem;padding-top:1rem;border-top:1px dashed var(--border);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem;">
        <div style="font-family:var(--font-stamp);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--leather);">
          🔍 Enquêtes liées (${linkedEnquetes.length})
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openLinkModal('${g.id}','enquete')">+ Lier une enquête</button>
      </div>
      ${enquetesHtml}
    </div>

    <div style="margin-top:1rem;padding-top:1rem;border-top:1px dashed var(--border);">
      ${photoGalleryHtml(g.photos || [], 'groupes', g.id)}
    </div>`;

  el.appendChild(card);

  // Injection sécurisée de la description
  setTimeout(() => {
    const d = document.getElementById('grp-desc-' + g.id);
    if (d) d.textContent = g.description || '—';
  }, 30);
}

// ── Lier rapport ou enquête à un groupe ───────────────────────
window.openLinkModal = async function(groupeId, type) {
  const isReport = type === 'report';
  const g = await getOne('groupes', groupeId);
  // Bug fix : || [] sur les deux champs pour éviter .map() sur undefined
  const existingIds = new Set((isReport ? (g.reportRefs || []) : (g.enqueteRefs || [])).map(r => r.id));
  const all = isReport ? await getAll('reports') : await getAll('enquetes');
  const available = all.filter(x => !existingIds.has(x.id));

  openModal(isReport ? 'Lier un Rapport' : 'Lier une Enquête', `
    <div class="form-group">
      <label>${isReport ? 'Rapport' : 'Enquête'} à lier</label>
      <select id="link-select">
        <option value="">— Sélectionner —</option>
        ${available.map(x => `<option value="${x.id}||${esc(isReport ? x.title : x.name)}">${esc(isReport ? x.title : x.name)}</option>`).join('')}
      </select>
    </div>
    ${!available.length ? '<p class="text-muted" style="margin-top:.5rem;">Aucun élément disponible à lier.</p>' : ''}
  `, async () => {
    const val = document.getElementById('link-select').value;
    if (!val) return showToast('Sélectionnez un élément.', 'error');
    const [linkId, ...rest] = val.split('||');
    const linkTitle = rest.join('||');
    setModalLoading(true);
    try {
      // Relire le groupe au moment de la sauvegarde pour avoir les données fraîches
      const gFresh  = await getOne('groupes', groupeId);
      const field   = isReport ? 'reportRefs' : 'enqueteRefs';
      const current = gFresh[field] || [];
      await updateDoc('groupes', groupeId, { [field]: [...current, { id: linkId, title: linkTitle }] });
      await addLog('LIAISON', (isReport ? 'Rapport' : 'Enquête') + ' lié(e) au groupe — ' + linkTitle);
      closeModal();
      showToast('Lié avec succès.', 'success');
      refreshPage();
    } catch(e) { showToast('Erreur : ' + e.message, 'error'); }
    finally { setModalLoading(false); }
  }, 'Lier');
};

// ── Délier ────────────────────────────────────────────────────
window.unlinkFromGroupe = async function(groupeId, type, itemId) {
  if (!confirm('Retirer ce lien du groupe ?')) return;
  try {
    const g     = await getOne('groupes', groupeId);
    const field = type === 'report' ? 'reportRefs' : 'enqueteRefs';
    await updateDoc('groupes', groupeId, { [field]: (g[field] || []).filter(r => r.id !== itemId) });
    await addLog('DÉLIAISON', 'Lien retiré du groupe');
    showToast('Lien retiré.', 'success');
    refreshPage();
  } catch(e) { showToast('Erreur : ' + e.message, 'error'); }
};

// ── Formulaire groupe ─────────────────────────────────────────
window.openGroupeModal = async function(id) {
  const g = id ? await getOne('groupes', id) : null;
  const COUNTIES = ['West Elizabeth', 'Lemoyne', 'Ambarino', 'New Austin'];

  openModal(g ? 'Modifier le Groupe' : 'Nouveau Groupe Illégal', `
    <div class="form-grid">
      <div class="form-group full"><label>Nom du groupe *</label><input type="text" id="grp-nom"></div>
      <div class="form-group full"><label>Comté d'origine</label>
        <select id="grp-comte">
          <option value="">— Sélectionner —</option>
          ${COUNTIES.map(c => `<option ${g && g.comte === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group full"><label>Description</label>
        <textarea id="grp-desc-input" style="min-height:100px;"></textarea>
      </div>
    </div>
    <div class="notice notice-info" style="margin-top:.75rem;">
      👥 Les membres sont définis depuis les <strong>fiches citoyens</strong> via le champ "Affiliation".
    </div>
  `, async () => {
    const nom = document.getElementById('grp-nom').value.trim();
    if (!nom) return showToast('Nom obligatoire.', 'error');
    setModalLoading(true);
    try {
      const data = {
        nom,
        comte:       document.getElementById('grp-comte').value,
        description: document.getElementById('grp-desc-input').value,
      };
      if (g) {
        await updateDoc('groupes', g.id, data);
        await addLog('MODIFICATION', 'Groupe modifié — ' + nom);
      } else {
        await createDoc('groupes', Object.assign({}, data, { reportRefs: [], enqueteRefs: [], photos: [] }));
        await addLog('CRÉATION', 'Groupe créé — ' + nom);
      }
      closeModal();
      showToast('Groupe enregistré.', 'success');
      refreshPage();
    } catch(e) { showToast('Erreur : ' + e.message, 'error'); }
    finally { setModalLoading(false); }
  }, g ? 'Modifier' : 'Créer');

  setTimeout(() => {
    if (g) {
      document.getElementById('grp-nom').value        = g.nom || '';
      document.getElementById('grp-desc-input').value = g.description || '';
    }
  }, 50);
};

window.deleteGroupe = async function(id, nom) {
  if (!isCommander() || !confirm('Supprimer le groupe "' + nom + '" ?')) return;
  try {
    await deleteDoc('groupes', id);
    await addLog('SUPPRESSION', 'Groupe supprimé — ' + nom);
    showToast('Supprimé.', 'success');
    refreshPage();
  } catch(e) { showToast('Erreur : ' + e.message, 'error'); }
};

// ═══════════════════════════════════════════════════════════
// EXPORT RAPPORT → PNG
// ═══════════════════════════════════════════════════════════

// Similarité entre deux chaînes (0 à 1) — Dice coefficient sur bigrammes
function stringSimilarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const getBigrams = s => {
    const bigrams = new Set();
    for (let i = 0; i < s.length - 1; i++) bigrams.add(s[i] + s[i+1]);
    return bigrams;
  };
  const aB = getBigrams(a), bB = getBigrams(b);
  let intersection = 0;
  aB.forEach(bg => { if (bB.has(bg)) intersection++; });
  return (2 * intersection) / (aB.size + bB.size);
}

window.exportReportPNG = async function(id) {
  const r = await getOne('reports', id);
  if (!r) return;

  // Corrélation nom agent ↔ personnel FDO (seuil 90%)
  let agentTelegram = '';
  try {
    const allPersonnel = await getAll('personnel');
    // Cherche d'abord une correspondance exacte, puis fuzzy à 90%
    let match = allPersonnel.find(p => p.name === r.createdBy);
    if (!match) {
      match = allPersonnel
        .map(p => ({ p, score: stringSimilarity(p.name, r.createdBy) }))
        .filter(x => x.score >= 0.9)
        .sort((a, b) => b.score - a.score)[0]?.p;
    }
    if (match && match.telegram) agentTelegram = match.telegram;
  } catch(e) { /* pas bloquant */ }

  showToast('Génération du PNG en cours…', 'info');

  // Dimensions A4 à 150dpi pour un rendu net
  const W = 1414;
  const H = 2000;

  // Charger le template comme Image() pour résolution native
  const templateImg = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('Template introuvable (assets/template-rapport.png)'));
    img.src = 'assets/template-rapport.png?' + Date.now(); // cache-bust
  });

  // Conteneur de rendu hors-écran, aux dimensions réelles du template
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;' +
    'width:' + W + 'px;height:' + H + 'px;' +
    'overflow:hidden;background:transparent;';
  document.body.appendChild(container);

  // Fond = canvas avec le template dessiné nativement (pas de background-image CSS)
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width  = W;
  bgCanvas.height = H;
  const ctx = bgCanvas.getContext('2d');
  ctx.drawImage(templateImg, 0, 0, W, H);

  // Convertir le canvas en data URL et l'utiliser comme <img> dans le conteneur
  const bgDataUrl = bgCanvas.toDataURL('image/png');

  container.innerHTML =
    '<div style="position:relative;width:' + W + 'px;height:' + H + 'px;">' +

    // Template en fond via <img>
    '<img src="' + bgDataUrl + '" style="position:absolute;top:0;left:0;width:' + W + 'px;height:' + H + 'px;" />' +

    // ── ZONE TEXTE ──
    // Template 1414x2000 : zone blanche top~220px, bottom~1630px, left~85px, right~1329px
    '<div style="' +
      'position:absolute;' +
      'top:220px;left:90px;right:90px;' +
      'height:1400px;' +
      'overflow:hidden;display:flex;flex-direction:column;gap:16px;' +
    '">' +
      // Titre
      '<div id="exp-title" style="' +
        'font-family:Playfair Display,Georgia,serif;' +
        'font-size:26px;font-weight:700;color:#3D1F0D;' +
        'text-transform:uppercase;letter-spacing:.08em;' +
        'border-bottom:1px solid #A08040;padding-bottom:10px;' +
      '"></div>' +
      // Métadonnées
      '<div id="exp-meta" style="' +
        'font-family:Special Elite,Courier New,monospace;' +
        'font-size:16px;letter-spacing:.1em;color:#8B6914;' +
        'text-transform:uppercase;margin-bottom:8px;' +
      '"></div>' +
      // Récit
      '<div id="exp-narrative" style="' +
        'font-family:Lora,Times New Roman,serif;' +
        'font-size:18px;line-height:1.8;color:#1A1008;' +
        'flex:1;overflow:hidden;' +
      '"></div>' +
    '</div>' +

    // ── NOM / GRADE / TÉLÉGRAMME — bas gauche ──
    '<div id="exp-agent" style="' +
      'position:absolute;bottom:100px;left:95px;' +
      'font-family:Special Elite,Courier New,monospace;' +
      'font-size:24px;letter-spacing:.1em;text-transform:uppercase;' +
      'color:#3D1F0D;line-height:2.1;text-align:left;' +
    '"></div>' +

    // ── SIGNATURE cursive — bas, à gauche du sceau ──
    '<div id="exp-signature" style="' +
      'position:absolute;bottom:130px;right:130px;' +
      'font-family:Great Vibes,cursive;' +
      'font-size:72px;color:#3D1F0D;' +
      'transform:rotate(-5deg);transform-origin:right bottom;' +
      'white-space:nowrap;max-width:480px;' +
      'text-align:right;line-height:1;opacity:.90;' +
    '"></div>' +

    '</div>';

  // Injection sécurisée
  document.getElementById('exp-title').textContent = r.title || '';
  document.getElementById('exp-meta').textContent  =
    formatDate(r.date || r.createdAt) + '  ·  ' + (r.dept || '') +
    (r.approvedBy ? '  ·  Approuvé par ' + r.approvedBy : '');

  // Récit : injecter le HTML Quill directement pour conserver la mise en forme
  const narrativeEl = document.getElementById('exp-narrative');
  if (r.narrative && r.narrative.trim().startsWith('<')) {
    narrativeEl.innerHTML = r.narrative;
    // Forcer les styles de base pour html2canvas + restaurer les marges de paragraphes
    narrativeEl.querySelectorAll('p').forEach(p => {
      if (!p.style.marginBottom) p.style.marginBottom = '14px';
      if (!p.style.lineHeight)   p.style.lineHeight   = '1.8';
    });
    narrativeEl.querySelectorAll('*').forEach(el => {
      if (!el.style.fontFamily) el.style.fontFamily = 'Lora,Times New Roman,serif';
      if (!el.style.color && el.tagName !== 'SPAN') el.style.color = '#1A1008';
    });
  } else {
    // Texte brut — convertir les sauts de ligne en paragraphes
    const paras = (r.narrative || '').split(/\n\n+/);
    narrativeEl.innerHTML = paras
      .map(p => '<p style="margin-bottom:14px;line-height:1.8;">' + esc(p.replace(/\n/g, '<br>')) + '</p>')
      .join('');
  }

  // Bloc agent bas gauche
  const agentEl = document.getElementById('exp-agent');
  agentEl.innerHTML =
    '<div style="font-size:22px;font-weight:600;">' + esc(r.createdBy || '') + '</div>' +
    '<div style="font-size:18px;opacity:.82;">' + esc(r.createdByGrade || '') + '</div>' +
    (agentTelegram ? '<div style="font-size:17px;opacity:.72;">' + esc(agentTelegram) + '</div>' : '');

  document.getElementById('exp-signature').textContent = r.createdBy || '';

  // Attendre polices + petit délai de sécurité
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 400));

  try {
    const canvas = await html2canvas(container.firstElementChild, {
      width:           W,
      height:          H,
      scale:           1,        // déjà en haute résolution (1240×1754)
      useCORS:         true,
      allowTaint:      true,
      backgroundColor: null,
      logging:         false,
      imageTimeout:    10000,
    });

    const link = document.createElement('a');
    const filename = 'rapport-' + (r.title || id).replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.png';
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('PNG exporté : ' + filename, 'success');
    await addLog('EXPORT', 'Rapport exporté en PNG — ' + r.title);
  } catch(e) {
    showToast('Erreur export : ' + e.message, 'error');
  } finally {
    document.body.removeChild(container);
  }
};
