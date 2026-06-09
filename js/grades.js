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

function buildGradeSelect(selectId, selected = '', forceCommander = false) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const showAll = forceCommander || isCommander();
  let html = '<option value="">— Sélectionner un grade —</option>';
  for (const [deptKey, dept] of Object.entries(DEPARTMENTS)) {
    const gradeList = Object.entries(GRADES).filter(([, g]) => {
      if (g.dept !== deptKey) return false;
      if (g.commanderOnly && !showAll) return false;
      return true;
    });
    if (!gradeList.length) continue;
    html += `<optgroup label="${dept.icon} ${dept.label}">`;
    for (const [g] of gradeList) {
      html += `<option value="${g}" ${selected === g ? 'selected' : ''}>${g}${GRADES[g].commanderOnly ? ' ⭐' : ''}</option>`;
    }
    html += '</optgroup>';
  }
  sel.innerHTML = html;
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
  let searchQuery = '';

  function render() {
    const sel = new Set(selectedFacts);
    let html = `
      <div style="margin-bottom:.75rem;">
        <input type="search" id="penal-search" placeholder="Rechercher un article…"
          style="width:100%;padding:.5rem .75rem;background:var(--cream);border:1px solid var(--border);border-bottom:2px solid var(--leather);font-family:var(--font-body);font-size:.85rem;outline:none;"
          value="${searchQuery}">
      </div>
    `;
    for (const [category, titles] of Object.entries(PENAL_CODE)) {
      const col = CATEGORY_COLORS[category] || {};
      let catHtml = '';
      for (const [titleLabel, arts] of Object.entries(titles)) {
        const filteredArts = arts.filter(a =>
          !searchQuery || a.toLowerCase().includes(searchQuery.toLowerCase()) ||
          titleLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
          category.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (!filteredArts.length) continue;
        catHtml += `<div style="margin-bottom:.5rem;">
          <div style="font-family:var(--font-stamp);font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:${col.text};opacity:.8;padding:.2rem 0;">${titleLabel}</div>`;
        for (const art of filteredArts) {
          const key = `${category} — ${titleLabel} — ${art}`;
          const checked = sel.has(key);
          catHtml += `
            <label style="display:flex;align-items:flex-start;gap:.5rem;padding:.3rem .5rem;cursor:pointer;border-radius:2px;transition:background .1s;"
              onmouseover="this.style.background='rgba(0,0,0,.04)'" onmouseout="this.style.background=''">
              <input type="checkbox" data-fact="${key.replace(/"/g,'&quot;')}"
                ${checked ? 'checked' : ''}
                style="margin-top:.2rem;flex-shrink:0;accent-color:var(--leather);">
              <span style="font-size:.85rem;line-height:1.4;">${art}</span>
            </label>`;
        }
        catHtml += '</div>';
      }
      if (!catHtml) continue;
      html += `
        <div style="background:${col.bg};border:1px solid ${col.border};border-left:4px solid ${col.border};padding:.75rem 1rem;margin-bottom:.75rem;">
          <div style="font-family:var(--font-display);font-size:.9rem;font-weight:700;color:${col.text};margin-bottom:.5rem;">${category}</div>
          ${catHtml}
        </div>`;
    }
    container.innerHTML = html;
    document.getElementById('penal-search')?.addEventListener('input', e => {
      searchQuery = e.target.value;
      render();
    });
  }
  render();
}

function getSelectedFacts(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type=checkbox]:checked'))
    .map(cb => cb.dataset.fact);
}
