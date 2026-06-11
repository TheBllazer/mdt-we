/* ============================================================
   GRADES, PERMISSIONS & CODE PÉNAL — MDT v5
   West Elizabeth Law Enforcement · 1905
   ============================================================ */

const DEPARTMENTS = {
  command:    { label: "Command's Office",      icon: '⭐' },
  valentine:  { label: 'Sheriff de Valentine',  icon: '🟤' },
  strawberry: { label: 'Sheriff de Strawberry', icon: '🟠' },
  blackwater: { label: 'Police de Blackwater',  icon: '🔵' },
};

// Grades — commander:true = accès compte commander requis pour sélectionner
const GRADES = {
  'Commander':                          { dept: 'command',    icon: '⭐', commanderOnly: true },
  'Sheriff (Valentine)':                { dept: 'valentine',  icon: '🟤', commanderOnly: true },
  'Undersheriff (Valentine)':           { dept: 'valentine',  icon: '🟤' },
  'Chief Deputy Sheriff (Valentine)':   { dept: 'valentine',  icon: '🟤' },
  'Deputy Sheriff (Valentine)':         { dept: 'valentine',  icon: '🟤' },
  'Deputy Trainee Sheriff (Valentine)': { dept: 'valentine',  icon: '🟤' },
  'Sheriff (Strawberry)':               { dept: 'strawberry', icon: '🟠', commanderOnly: true },
  'Undersheriff (Strawberry)':          { dept: 'strawberry', icon: '🟠' },
  'Chief Deputy Sheriff (Strawberry)':  { dept: 'strawberry', icon: '🟠' },
  'Deputy Sheriff (Strawberry)':        { dept: 'strawberry', icon: '🟠' },
  'Deputy Trainee Sheriff (Strawberry)':{ dept: 'strawberry', icon: '🟠' },
  'Captain':                            { dept: 'blackwater', icon: '🔵', commanderOnly: true },
  'Lieutenant':                         { dept: 'blackwater', icon: '🔵' },
  'Sergeant':                           { dept: 'blackwater', icon: '🔵' },
  'Police Officer':                     { dept: 'blackwater', icon: '🔵' },
  'Recruit Police Officer':             { dept: 'blackwater', icon: '🔵' },
};

const PERMISSIONS = {
  view_all:         true,
  create_citizen:   true,
  edit_citizen:     true,
  create_record:    true,
  edit_record:      true,
  create_report:    true,
  create_warrant:   true,
  edit_weapons:     true,
  edit_property:    true,
  upload_photo:     true,
  create_enquete:   true,
  edit_enquete:     true,
  delete_citizen:   'commander',
  delete_record:    'commander',
  delete_report:    'commander',
  delete_warrant:   'commander',
  delete_weapon:    'commander',
  delete_property:  'commander',
  delete_enquete:   'commander',
  manage_passwords: 'commander',
  manage_personnel: 'commander',
  edit_personnel:   'commander',
  view_logs:        'commander',
};

function can(perm) {
  if (!window.currentSession) return false;
  const required = PERMISSIONS[perm];
  if (required === true) return true;
  if (required === 'commander') return window.currentSession.role === 'commander';
  return false;
}

function isCommander() { return window.currentSession?.role === 'commander'; }
function getDeptLabel(k) { return DEPARTMENTS[k]?.label ?? k; }
function getGradeIcon(g) { return GRADES[g]?.icon ?? '?'; }
function getGradeDept(g) { return GRADES[g]?.dept ?? 'command'; }
function isCommanderOnlyGrade(g) { return GRADES[g]?.commanderOnly === true; }

function buildGradeSelect(selectId, selected = '') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  // Tous les grades sont toujours affichés.
  // Les grades ⭐ sont accessibles uniquement avec le mot de passe Commander —
  // la validation dans firebase.js bloque si le grade ne correspond pas au rôle.
  let html = '<option value="">— Sélectionner un grade —</option>';
  for (const [deptKey, dept] of Object.entries(DEPARTMENTS)) {
    const gradeList = Object.entries(GRADES).filter(([, g]) => g.dept === deptKey);
    if (!gradeList.length) continue;
    html += `<optgroup label="${dept.icon} ${dept.label}">`;
    for (const [g] of gradeList) {
      const locked = GRADES[g].commanderOnly;
      html += `<option value="${g}" ${selected === g ? 'selected' : ''}>${g}${locked ? ' ⭐' : ''}</option>`;
    }
    html += '</optgroup>';
  }
  sel.innerHTML = html;
}

// ── Code Pénal structuré avec barème ────────────────────────
// Chaque article : [label, amende_$, prison_minutes, pdm]
// pdm = true → "Peine du Magistrat" (appel juge obligatoire)
// prison en minutes (ex: 15*60 = 15h)

const PENAL_ARTICLES = {
  [`Contraventions — Titre 1 — Atteinte aux biens — Art. 1 — Dégradation`]: { fine: 10,   prison: 0,    pdm: false },
  [`Contraventions — Titre 1 — Atteinte aux biens — Art. 2 — Vol`]: { fine: 20,   prison: 15,   pdm: false },
  [`Contraventions — Titre 1 — Atteinte aux biens — Art. 3 — Pillage de tombe`]: { fine: 20,   prison: 15,   pdm: false },
  [`Contraventions — Titre 1 — Atteinte aux biens — Art. 4 — Propriété`]: { fine: 20,   prison: 15,   pdm: false },
  [`Contraventions — Titre 2 — Atteinte à l'ordre public — Art. 1 — Dissimulation de visage`]: { fine: 10,   prison: 0,    pdm: false },
  [`Contraventions — Titre 2 — Atteinte à l'ordre public — Art. 2 — Trouble à l'ordre public`]: { fine: 20,   prison: 15,   pdm: false },
  [`Contraventions — Titre 2 — Atteinte à l'ordre public — Art. 3 — Atteinte à la pudeur`]: { fine: 10,   prison: 10,   pdm: false },
  [`Contraventions — Titre 3 — Stupéfiants & marchandises illégales — Art. 1 — Possession de stupéfiants`]: { fine: 10,   prison: 10,   pdm: false },
  [`Contraventions — Titre 3 — Stupéfiants & marchandises illégales — Art. 3 — Possession de marchandises illégales`]: { fine: 10,   prison: 10,   pdm: false },
  [`Délits mineurs — Titre 1 — Stupéfiants & marchandises illégales — Art. 1 — Vente de stupéfiants`]: { fine: 0,    prison: 30,   pdm: false, note: 'Voir Art.' },
  [`Délits mineurs — Titre 1 — Stupéfiants & marchandises illégales — Art. 2 — Vente de marchandises illégales`]: { fine: 0,    prison: 30,   pdm: false, note: 'Voir Art.' },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 1 — Diffamation`]: { fine: 40,   prison: 15,   pdm: false },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 2 — Enlèvement`]: { fine: 60,   prison: 60,   pdm: false },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 3 — Agression`]: { fine: 40,   prison: 120,  pdm: false },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 4 — Faux et usage de faux`]: { fine: 25,   prison: 20,   pdm: false },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 5 — Altération de preuve`]: { fine: 0,    prison: 0,    pdm: false },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 6 — Usurpation de fonction`]: { fine: 0,    prison: 0,    pdm: false },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 7 — Refus d'obtempérer avec un homme de loi`]: { fine: 50, prison: 20, pdm: false },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 8 — Délit de fuite`]: { fine: 60,   prison: 60,   pdm: false },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 9 — Non-paiement d'amende`]: { fine: 70,   prison: 180,  pdm: false },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 10 — Braquage de commerce`]: { fine: 0,    prison: 0,    pdm: false },
  [`Délits mineurs — Titre 2 — Atteinte à la personne et à l'autorité — Art. 11 — Braquage de diligence`]: { fine: 30,   prison: 20,   pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 1 — Mise en danger de la vie d'autrui`]: { fine: 70,  prison: 180,  pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 2 — Agression sur homme de loi`]: { fine: 150, prison: 360,  pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 3 — Prise d'otage`]: { fine: 100, prison: 720,  pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 4 — Séquestration`]: { fine: 80,  prison: 600,  pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 5 — Braquage de train`]: { fine: 400, prison: 1440, pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 6 — Braquage de banque`]: { fine: 400, prison: 1440, pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 7 — Complicité dans des faits criminels`]: { fine: 300, prison: 360,  pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 8 — Harcèlement`]: { fine: 0,   prison: 0,    pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 9 — Recel`]: { fine: 95,  prison: 120,  pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 10 — Tentative d'homicide`]: { fine: 500, prison: 720,  pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 11 — Homicide involontaire`]: { fine: 800, prison: 1440, pdm: false },
  [`Délits majeurs — Titre 1 — Atteinte à la personne et aux biens — Art. 12 — Braconnage`]: { fine: 500, prison: 360,  pdm: false },
  [`Délits majeurs — Titre 2 — Armes illégales — Art. 1 — Possession d'armes illégales`]: { fine: 300, prison: 360,  pdm: false },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 1 — Enlèvement sur homme de loi`]: { fine: 250,  prison: 480,   pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 2 — Esclavage`]: { fine: 1500, prison: 2880,  pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 3 — Trafic d'êtres humains`]: { fine: 2000, prison: 5760,  pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 4 — Homicide volontaire`]: { fine: 2000, prison: 7200,  pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 5 — Extorsion`]: { fine: 900,  prison: 1440,  pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 6 — Escroquerie`]: { fine: 800,  prison: 720,   pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 7 — Association de malfaiteurs`]: { fine: 600,  prison: 2880,  pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 8 — Torture`]: { fine: 1500, prison: 4320,  pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 9 — Mutilation`]: { fine: 1500, prison: 4320,  pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 10 — Agression sexuelle`]: { fine: 0,    prison: 0,     pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 11 — Pédophilie`]: { fine: 0,    prison: 0,     pdm: true },
  [`Crimes — Titre 1 — Atteinte à la personne et aux biens — Art. 12 — Cannibalisme`]: { fine: 0,    prison: 0,     pdm: true },
  [`Crimes — Titre 2 — Atteinte à la justice — Art. 1 — Entrave à la justice`]: { fine: 500,  prison: 720,   pdm: true },
  [`Crimes — Titre 2 — Atteinte à la justice — Art. 2 — Parjure`]: { fine: 300,  prison: 360,   pdm: true },
  [`Crimes — Titre 2 — Atteinte à la justice — Art. 3 — Atteinte aux documents des forces de l'ordre`]: { fine: 500, prison: 2880, pdm: true },
  [`Crimes — Titre 2 — Atteinte à la justice — Art. 4 — Évasion`]: { fine: 700,  prison: 3000,  pdm: true },
  [`Crimes — Titre 3 — Trafics — Art. 1 — Trafic de stupéfiants`]: { fine: 1200, prison: 4320,  pdm: true },
  [`Crimes — Titre 3 — Trafics — Art. 2 — Trafic de marchandises illégales`]: { fine: 1000, prison: 4320,  pdm: true },
  [`Crimes — Titre 3 — Trafics — Art. 3 — Trafic d'armes`]: { fine: 1300, prison: 4320,  pdm: true },
  [`Crimes — Titre 4 — Corruption — Art. 1 — Corruption d'un agent public`]: { fine: 0,    prison: 0,     pdm: true },
  [`Crimes — Titre 5 — Fraude & détournement de fond — Art. 1 — Fraude fiscale`]: { fine: 400,  prison: 1440,  pdm: true },
  [`Crimes — Titre 5 — Fraude & détournement de fond — Art. 2 — Détournement de fond public`]: { fine: 600,  prison: 1440,  pdm: true },
  [`Crimes — Titre 6 — Atteinte à la sûreté du comté — Art. 1 — Trahison`]: { fine: 2000, prison: 7200,  pdm: true },
  [`Crimes — Titre 6 — Atteinte à la sûreté du comté — Art. 2 — Haute Trahison`]: { fine: 2500, prison: 12000, pdm: true },
};


// Récupérer le barème d'un article à partir de sa clé complète
function getPenalData(factKey) {
  // Cherche la correspondance exacte ou partielle
  if (PENAL_ARTICLES[factKey]) return PENAL_ARTICLES[factKey];
  // Cherche par correspondance partielle sur le nom de l'article
  for (const [k, v] of Object.entries(PENAL_ARTICLES)) {
    if (factKey.includes(k.split(' — ').pop())) return v;
  }
  return null;
}

// Formater la durée de prison en texte lisible
function formatPrison(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return minutes + ' min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h + 'h' + (m ? m + 'min' : '');
}

// Calculer le total amende + prison pour une liste de faits sélectionnés
function calculateSentence(facts) {
  let totalFine   = 0;
  let totalPrison = 0;
  let hasPDM      = false;
  let hasNote     = false;

  for (const fact of facts) {
    const data = PENAL_ARTICLES[fact];
    if (!data) continue;
    totalFine   += data.fine   || 0;
    totalPrison += data.prison || 0;
    if (data.pdm)  hasPDM  = true;
    if (data.note) hasNote = true;
  }

  return { totalFine, totalPrison, hasPDM, hasNote };
}

// ── Code Pénal structuré ──────────────────────────────────────
const PENAL_CODE = {
  'Contraventions': {
    'Titre 1 — Atteinte aux biens': [
      'Art. 1 — Dégradation',
      'Art. 2 — Vol',
      'Art. 3 — Pillage de tombe',
      'Art. 4 — Propriété',
    ],
    'Titre 2 — Atteinte à l\'ordre public': [
      'Art. 1 — Dissimulation de visage',
      'Art. 2 — Trouble à l\'ordre public',
      'Art. 3 — Atteinte à la pudeur',
    ],
    'Titre 3 — Stupéfiants & marchandises illégales': [
      'Art. 1 — Possession de stupéfiants',
      'Art. 3 — Possession de marchandises illégales',
    ],
  },
  'Délits mineurs': {
    'Titre 1 — Stupéfiants & marchandises illégales': [
      'Art. 1 — Vente de stupéfiants',
      'Art. 2 — Vente de marchandises illégales',
    ],
    'Titre 2 — Atteinte à la personne et à l\'autorité': [
      'Art. 1 — Diffamation',
      'Art. 2 — Enlèvement',
      'Art. 3 — Agression',
      'Art. 4 — Faux et usage de faux',
      'Art. 5 — Altération de preuve',
      'Art. 6 — Usurpation de fonction',
      'Art. 7 — Refus d\'obtempérer avec un homme de loi',
      'Art. 8 — Délit de fuite',
      'Art. 9 — Non-paiement d\'amende',
      'Art. 10 — Braquage de commerce',
      'Art. 11 — Braquage de diligence',
    ],
  },
  'Délits majeurs': {
    'Titre 1 — Atteinte à la personne et aux biens': [
      'Art. 1 — Mise en danger de la vie d\'autrui',
      'Art. 2 — Agression sur homme de loi',
      'Art. 3 — Prise d\'otage',
      'Art. 4 — Séquestration',
      'Art. 5 — Braquage de train',
      'Art. 6 — Braquage de banque',
      'Art. 7 — Complicité dans des faits criminels',
      'Art. 8 — Harcèlement',
      'Art. 9 — Recel',
      'Art. 10 — Tentative d\'homicide',
      'Art. 11 — Homicide involontaire',
      'Art. 12 — Braconnage',
    ],
    'Titre 2 — Armes illégales': [
      'Art. 1 — Possession d\'armes illégales',
    ],
  },
  'Crimes': {
    'Titre 1 — Atteinte à la personne et aux biens': [
      'Art. 1 — Enlèvement sur homme de loi',
      'Art. 2 — Esclavage',
      'Art. 3 — Trafic d\'êtres humains',
      'Art. 4 — Homicide volontaire',
      'Art. 5 — Extorsion',
      'Art. 6 — Escroquerie',
      'Art. 7 — Association de malfaiteurs',
      'Art. 8 — Torture',
      'Art. 9 — Mutilation',
      'Art. 10 — Agression sexuelle',
      'Art. 11 — Pédophilie',
      'Art. 12 — Cannibalisme',
    ],
    'Titre 2 — Atteinte à la justice': [
      'Art. 1 — Entrave à la justice',
      'Art. 2 — Parjure',
      'Art. 3 — Atteinte aux documents des forces de l\'ordre',
      'Art. 4 — Évasion',
    ],
    'Titre 3 — Trafics': [
      'Art. 1 — Trafic de stupéfiants',
      'Art. 2 — Trafic de marchandises illégales',
      'Art. 3 — Trafic d\'armes',
    ],
    'Titre 4 — Corruption': [
      'Art. 1 — Corruption d\'un agent public',
    ],
    'Titre 5 — Fraude & détournement de fond': [
      'Art. 1 — Fraude fiscale',
      'Art. 2 — Détournement de fond public',
    ],
    'Titre 6 — Atteinte à la sûreté du comté': [
      'Art. 1 — Trahison',
      'Art. 2 — Haute Trahison',
    ],
  },
};

const CATEGORY_COLORS = {
  'Contraventions': { bg: '#f7f0d5', border: '#C9A227', text: '#6b5800' },
  'Délits mineurs': { bg: '#f0e8d5', border: '#8B6914', text: '#4a3200' },
  'Délits majeurs': { bg: '#f5e5d5', border: '#8B3A1A', text: '#4a1a00' },
  'Crimes':         { bg: '#f9e5e5', border: '#6B1A1A', text: '#4a0000' },
};

function buildPenalCodePicker(containerId, selectedFacts = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const sel = new Set(selectedFacts);

  // Construire le HTML UNE SEULE FOIS avec tous les articles
  // La recherche filtre via display:none sans détruire le DOM (conserve le focus)
  let html = `
    <div style="margin-bottom:.75rem;">
      <input type="search" id="penal-search" placeholder="Rechercher un article…"
        style="width:100%;padding:.5rem .75rem;background:var(--cream);border:1px solid var(--border);border-bottom:2px solid var(--leather);font-family:var(--font-body);font-size:.85rem;outline:none;">
    </div>
  `;

  for (const [category, titles] of Object.entries(PENAL_CODE)) {
    const col = CATEGORY_COLORS[category] || {};
    let catHtml = '';
    for (const [titleLabel, arts] of Object.entries(titles)) {
      catHtml += `<div class="penal-title-group" data-title="${titleLabel.toLowerCase()}" data-cat="${category.toLowerCase()}" style="margin-bottom:.5rem;">
        <div style="font-family:var(--font-stamp);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:${col.text};opacity:.8;padding:.2rem 0;">${titleLabel}</div>`;
      for (const art of arts) {
        const key = `${category} — ${titleLabel} — ${art}`;
        const checked = sel.has(key);
        catHtml += `
          <label class="penal-art-label" data-art="${art.toLowerCase()}" data-title="${titleLabel.toLowerCase()}" data-cat="${category.toLowerCase()}"
            style="display:flex;align-items:flex-start;gap:.5rem;padding:.3rem .5rem;cursor:pointer;border-radius:2px;"
            onmouseover="this.style.background='rgba(0,0,0,.04)'" onmouseout="this.style.background=''">
            <input type="checkbox" data-fact="${key.replace(/"/g,'&quot;')}"
              ${checked ? 'checked' : ''}
              style="margin-top:.2rem;flex-shrink:0;accent-color:var(--leather);">
            <span style="font-size:.85rem;line-height:1.4;">${art}</span>
          </label>`;
      }
      catHtml += '</div>';
    }
    html += `
      <div class="penal-cat-block" style="background:${col.bg};border:1px solid ${col.border};border-left:4px solid ${col.border};padding:.75rem 1rem;margin-bottom:.75rem;">
        <div style="font-family:var(--font-display);font-size:.9rem;font-weight:700;color:${col.text};margin-bottom:.5rem;">${category}</div>
        ${catHtml}
      </div>`;
  }

  container.innerHTML = html;

  // Recherche : filtre par display sans toucher au DOM des checkboxes
  document.getElementById('penal-search')?.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    container.querySelectorAll('.penal-art-label').forEach(label => {
      const match = !q
        || label.dataset.art.includes(q)
        || label.dataset.title.includes(q)
        || label.dataset.cat.includes(q);
      label.style.display = match ? 'flex' : 'none';
    });
    // Masquer les blocs de titres entièrement vides
    container.querySelectorAll('.penal-title-group').forEach(group => {
      const anyVisible = Array.from(group.querySelectorAll('.penal-art-label'))
        .some(l => l.style.display !== 'none');
      group.style.display = anyVisible ? '' : 'none';
    });
    // Masquer les catégories entièrement vides
    container.querySelectorAll('.penal-cat-block').forEach(block => {
      const anyVisible = Array.from(block.querySelectorAll('.penal-art-label'))
        .some(l => l.style.display !== 'none');
      block.style.display = anyVisible ? '' : 'none';
    });
  });
}

function getSelectedFacts(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type=checkbox]:checked'))
    .map(cb => cb.dataset.fact);
}
