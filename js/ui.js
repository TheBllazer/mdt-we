/* ============================================================
   UI — MDT v5
   Session persistante · Photos · Navigation · Modal
   ============================================================ */

// ── Écrans ────────────────────────────────────────────────────
function hideLoader() {
  document.getElementById('app-loader').style.display = 'none';
}

function showLogin(errorMsg = '') {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  if (errorMsg) document.getElementById('login-error').textContent = errorMsg;
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const s = window.currentSession;
  document.getElementById('header-agent-name').textContent = s.name;
  document.getElementById('header-agent-rank').textContent =
    `${s.grade} · ${getDeptLabel(s.dept)}` + (s.role === 'commander' ? ' · ⭐' : '');
  document.querySelectorAll('.nav-commander').forEach(el =>
    el.style.display = isCommander() ? '' : 'none');
  navigateTo('dashboard');
}

// ── Formatage ─────────────────────────────────────────────────
function formatDate(val) {
  if (!val) return '—';
  if (val?.toDate) val = val.toDate();
  return new Date(val).toLocaleDateString('fr-FR', { year:'numeric', month:'long', day:'numeric' });
}
function formatDateTime(val) {
  if (!val) return '—';
  if (val?.toDate) val = val.toDate();
  return new Date(val).toLocaleString('fr-FR');
}
function nowDate() { return new Date().toISOString().split('T')[0]; }

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function statusBadge(s) {
  const map = {
    'Wanted':'badge-red','Actif':'badge-red','Fugitif':'badge-red','Mort ou Vif':'badge-red',
    'En attente':'badge-gold','Suspect':'badge-gold','Saisie':'badge-gold','Vivant':'badge-gold',
    'Clean':'badge-green','Purgée':'badge-green','Approuvé':'badge-green','En service':'badge-green',
    'Expiré':'badge-grey','Congé':'badge-grey','Suspendu':'badge-grey',
    'Confisqué':'badge-brown','Retraite':'badge-grey',
  };
  return `<span class="badge ${map[s]||'badge-grey'}">${esc(s)}</span>`;
}

// ── Navigation ────────────────────────────────────────────────
const PAGE_RENDERERS = {};
function registerPage(name, fn) { PAGE_RENDERERS[name] = fn; }

let _currentPage = 'dashboard';
function navigateTo(page) {
  _currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
  const main = document.getElementById('main-content');
  main.innerHTML = `<div class="page-loading">Chargement…</div>`;
  if (PAGE_RENDERERS[page]) PAGE_RENDERERS[page](main);
}

// Auto-refresh : recharge la page courante après une action
function refreshPage() { navigateTo(_currentPage); }

// ── Page header ───────────────────────────────────────────────
function pageHeader(eyebrow, title, actionHtml = '') {
  return `
    <div class="page-header">
      <div>
        <div class="page-eyebrow">${eyebrow}</div>
        <h1 class="page-title">${title}</h1>
      </div>
      <div class="btn-group">${actionHtml}</div>
    </div>`;
}

function emptyRow(cols, msg = 'Aucune entrée.') {
  return `<tr><td colspan="${cols}" class="empty-cell">${msg}</td></tr>`;
}

// ── Modal ─────────────────────────────────────────────────────
function openModal(title, body, onConfirm, confirmLabel = 'Confirmer') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  const footer = document.getElementById('modal-footer');
  footer.innerHTML = '';
  if (onConfirm) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.id = 'modal-confirm-btn';
    btn.textContent = confirmLabel;
    btn.dataset.label = confirmLabel;
    btn.onclick = onConfirm;
    footer.appendChild(btn);
  }
  const cancel = document.createElement('button');
  cancel.className = 'btn btn-secondary';
  cancel.textContent = 'Fermer';
  cancel.onclick = closeModal;
  footer.appendChild(cancel);
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function setModalLoading(on) {
  const btn = document.getElementById('modal-confirm-btn');
  if (!btn) return;
  btn.disabled = on;
  btn.textContent = on ? 'Traitement…' : btn.dataset.label;
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const colors = { info:'var(--sepia)', success:'#2d5a1b', error:'var(--bordeaux)' };
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.borderLeftColor = colors[type] || colors.info;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.style.opacity = '0', 3000);
  setTimeout(() => t.remove(), 3400);
}

// ── Photo Gallery (Postimage URL) ─────────────────────────────
function photoGalleryHtml(photos = [], collection, docId) {
  const canDel = isCommander();
  return `
    <div class="photo-section">
      <div class="photo-section-title">📷 Photos (${photos.length})</div>
      ${photos.length ? `
        <div class="photo-grid">
          ${photos.map((p,i) => `
            <div class="photo-thumb" onclick="openPhotoViewer('${esc(p.url)}','${esc(p.name)}')">
              <img src="${esc(p.url)}" alt="${esc(p.name)}" loading="lazy"
                onerror="this.parentElement.classList.add('photo-error');this.style.display='none'">
              <div class="photo-name">${esc(p.name||'Photo')}</div>
              ${canDel ? `<button class="photo-delete" onclick="event.stopPropagation();removePhoto('${collection}','${docId}',${i})">✕</button>` : ''}
            </div>`).join('')}
        </div>` : `<p class="text-muted" style="margin:.5rem 0;">Aucune photo.</p>`}
      ${can('upload_photo') ? `
        <button class="btn btn-secondary btn-sm mt-1" onclick="openAddPhotoModal('${collection}','${docId}')">
          + Ajouter une photo (Postimage)
        </button>
        <div class="notice notice-info" style="margin-top:.6rem;font-size:.72rem;">
          📌 Uploadez sur <strong>postimage.org</strong> → copiez le <strong>Direct link</strong> → collez ici.
        </div>` : ''}
    </div>`;
}

window.openAddPhotoModal = function(collection, docId) {
  openModal('Ajouter une Photo', `
    <div class="notice notice-info" style="margin-bottom:1rem;">
      1. Allez sur <strong>postimage.org</strong> dans un nouvel onglet<br>
      2. Uploadez votre image → copiez le <strong>"Direct link"</strong><br>
      3. Collez le lien ci-dessous
    </div>
    <div class="form-group" style="margin-bottom:1rem;">
      <label>Lien direct Postimage *</label>
      <input type="text" id="photo-url" placeholder="https://i.postimg.cc/xxx/image.jpg">
    </div>
    <div class="form-group">
      <label>Description (optionnel)</label>
      <input type="text" id="photo-name" placeholder="Ex: Scène de crime">
    </div>
    <div id="photo-preview" style="display:none;margin-top:.75rem;text-align:center;">
      <img id="photo-preview-img" style="max-width:100%;max-height:200px;object-fit:contain;border:1px solid var(--border);">
    </div>
  `, async () => {
    const url  = document.getElementById('photo-url').value.trim();
    const name = document.getElementById('photo-name').value.trim() || 'Photo';
    if (!url || !url.startsWith('http')) return showToast('Lien invalide.','error');
    setModalLoading(true);
    try {
      await addPhotoToDoc(collection, docId, url, name);
      await addLog('PHOTO', `Photo ajoutée — ${name}`);
      showToast('Photo ajoutée.','success');
      closeModal();
      // Rouvrir la vue selon la collection
      if (collection === 'reports')  { setTimeout(() => viewReport(docId), 200); }
      if (collection === 'warrants') { setTimeout(() => viewWarrant(docId), 200); }
      if (collection === 'citizens') { setTimeout(() => viewCitizen(docId), 200); }
    } catch(e) { showToast('Erreur : '+e.message,'error'); }
    finally { setModalLoading(false); }
  }, 'Ajouter');
  // Prévisualisation live
  setTimeout(() => {
    const inp = document.getElementById('photo-url');
    const prv = document.getElementById('photo-preview');
    const img = document.getElementById('photo-preview-img');
    inp?.addEventListener('input', () => {
      const v = inp.value.trim();
      if (v.startsWith('http')) {
        img.src = v;
        img.onload  = () => { prv.style.display = 'block'; };
        img.onerror = () => { prv.style.display = 'none'; };
      } else { prv.style.display = 'none'; }
    });
  }, 80);
};

window.removePhoto = async function(collection, docId, idx) {
  if (!isCommander() || !confirm('Supprimer cette photo ?')) return;
  try {
    const doc    = await getOne(collection, docId);
    const photos = (doc.photos||[]);
    await removePhotoFromDoc(collection, docId, photos[idx]);
    await addLog('PHOTO', `Photo supprimée — ${collection}`);
    showToast('Photo supprimée.','success');
    closeModal();
    if (collection === 'reports')  setTimeout(() => viewReport(docId), 200);
    if (collection === 'warrants') setTimeout(() => viewWarrant(docId), 200);
    if (collection === 'citizens') setTimeout(() => viewCitizen(docId), 200);
  } catch(e) { showToast('Erreur : '+e.message,'error'); }
};

window.openPhotoViewer = function(url, name) {
  openModal(name||'Photo', `
    <div style="text-align:center;">
      <img src="${esc(url)}" alt="${esc(name)}"
        style="max-width:100%;max-height:72vh;object-fit:contain;border:1px solid var(--border);"
        onerror="this.insertAdjacentHTML('afterend','<p class=text-muted style=margin-top:.75rem>Image introuvable — lien Postimage peut-être expiré.</p>');this.remove()">
    </div>
    <div style="text-align:center;margin-top:.75rem;">
      <a href="${esc(url)}" target="_blank" class="btn btn-secondary btn-sm">Ouvrir ↗</a>
    </div>`);
};

// ── Login init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Peupler le select de grades (login)
  buildGradeSelect('login-grade');

  // Afficher champs nom/grade dès qu'on tape le mot de passe
  document.getElementById('login-pwd')?.addEventListener('input', function() {
    const show = this.value.length > 0;
    document.getElementById('login-name-row').style.display  = show ? '' : 'none';
    document.getElementById('login-grade-row').style.display = show ? '' : 'none';
    if (show) buildGradeSelect('login-grade');
  });

  // Soumission du formulaire de login
  document.getElementById('login-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const pwd   = document.getElementById('login-pwd').value;
    const name  = document.getElementById('login-name').value.trim();
    const grade = document.getElementById('login-grade').value;
    const err   = document.getElementById('login-error');
    const btn   = document.getElementById('login-submit');
    err.textContent = '';
    btn.disabled = true; btn.textContent = 'Vérification…';
    try {
      await tryLogin(name, grade, pwd);
      await addLog('CONNEXION', `Connexion — ${window.currentSession.role}`);
      showApp();
    } catch(ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false; btn.textContent = 'Accéder au Terminal';
    }
  });

  // Navigation sidebar
  document.querySelectorAll('.nav-item').forEach(item =>
    item.addEventListener('click', () => navigateTo(item.dataset.page)));

  // Fermer modale en cliquant dehors
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Déconnexion
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (!confirm('Se déconnecter du MDT ?')) return;
    await logout();
  });

  // Init Firebase (restaure session si possible)
  initFirebase();
});
