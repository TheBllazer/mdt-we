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
      <p id="view-narrative" style="line-height:1.75;font-size:.92rem;"></p>
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
    if (el) el.textContent = r.narrative||'';
    const footer = document.getElementById('modal-footer');
    if (footer) {
      const btns = [];
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
      <div class="form-group full"><label>Récit des faits *</label><textarea id="re-narrative" style="min-height:160px;"></textarea></div>
    </div>
    <div class="notice notice-info mt-1">✒ Rédigé par : <strong>${esc(r.createdBy)}</strong> — ${esc(r.createdByGrade)}</div>
  `, async () => {
    const title     = document.getElementById('re-title').value.trim();
    const narrative = document.getElementById('re-narrative').value.trim();
    if (!title||!narrative) return showToast('Titre et récit obligatoires.','error');
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
    const n = document.getElementById('re-narrative');
    if (t) t.value = r.title||'';
    if (n) n.value = r.narrative||'';
  }, 50);
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
      <div class="form-group full"><label>Récit des faits *</label><textarea id="rp-narrative" style="min-height:150px;"></textarea></div>
    </div>
    <div class="notice notice-info mt-1">✒ Signature : <strong>${esc(s.name)}</strong> — ${esc(s.grade)}</div>
    <div class="notice notice-warn">⏳ En attente d'approbation par le Commander.</div>
  `, async () => {
    const title = document.getElementById('rp-title').value.trim();
    const narrative = document.getElementById('rp-narrative').value.trim();
    if (!title||!narrative) return showToast('Titre et récit obligatoires.','error');
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

window.openWeaponModal = function() {
  openModal('Enregistrer une Arme',`
    <div class="form-grid">
      <div class="form-group"><label>N° de série *</label><input type="text" id="wp-serial"></div>
      <div class="form-group"><label>Type</label>
        <select id="wp-type">${['Révolver','Pistolet','Fusil','Fusil à pompe','Carabine','Couteau','Autre'].map(t=>`<option>${t}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Modèle</label><input type="text" id="wp-model"></div>
      <div class="form-group"><label>Propriétaire</label><input type="text" id="wp-owner"></div>
      <div class="form-group"><label>Date</label><input type="date" id="wp-date" value="${nowDate()}"></div>
      <div class="form-group"><label>Statut</label>
        <select id="wp-status">${['En service','Confisqué','Perdu','Détruit'].map(s=>`<option>${s}</option>`).join('')}</select>
      </div>
    </div>`,async()=>{
    const serial=document.getElementById('wp-serial').value.trim();
    if(!serial) return showToast('N° de série obligatoire.','error');
    setModalLoading(true);
    try {
      await createDoc('weapons',{serial,type:document.getElementById('wp-type').value,model:document.getElementById('wp-model').value,owner:document.getElementById('wp-owner').value,date:document.getElementById('wp-date').value,status:document.getElementById('wp-status').value});
      await addLog('CRÉATION',`Arme enregistrée — ${serial}`);
      closeModal();showToast('Enregistrée.','success');refreshPage();
    }catch(e){showToast('Erreur : '+e.message,'error');}
    finally{setModalLoading(false);}
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

window.openPropertyModal=function(){
  openModal('Nouvelle Propriété',`
    <div class="form-grid">
      <div class="form-group full"><label>Nom *</label><input type="text" id="pr-name"></div>
      <div class="form-group full"><label>Adresse</label><input type="text" id="pr-addr"></div>
      <div class="form-group"><label>Propriétaire</label><input type="text" id="pr-owner"></div>
      <div class="form-group"><label>Type</label><select id="pr-type">${['Ranch','Résidence','Commerce','Terrain','Autre'].map(t=>`<option>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label>Statut</label><select id="pr-status">${['Actif','Saisie','Abandonné','Sous surveillance'].map(s=>`<option>${s}</option>`).join('')}</select></div>
      <div class="form-group full"><label>Notes</label><textarea id="pr-notes"></textarea></div>
    </div>`,async()=>{
    const name=document.getElementById('pr-name').value.trim();
    if(!name) return showToast('Nom obligatoire.','error');
    setModalLoading(true);
    try{await createDoc('properties',{name,address:document.getElementById('pr-addr').value,owner:document.getElementById('pr-owner').value,type:document.getElementById('pr-type').value,status:document.getElementById('pr-status').value,notes:document.getElementById('pr-notes').value});
      await addLog('CRÉATION',`Propriété — ${name}`);closeModal();showToast('Enregistrée.','success');refreshPage();}
    catch(e){showToast('Erreur : '+e.message,'error');}finally{setModalLoading(false);}
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
    const logs = await getLogs(150);
    el.innerHTML += `
      <div class="card" style="padding:0;">
        <div style="padding:.75rem 1.5rem;background:var(--leather);color:var(--gold);font-family:var(--font-stamp);font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;">
          ${logs.length} entrée(s) — 150 dernières actions
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
