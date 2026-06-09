/* ============================================================
   FIREBASE — MDT v5
   Session persistante 1h · Photos Postimage · Firestore
   ============================================================ */

let db;
window.currentSession = null;

const SESSION_KEY = 'mdt_session_v5';
const SESSION_TTL  = 60 * 60 * 1000; // 1 heure en ms

function initFirebase() {
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
  // Tenter de restaurer la session
  const restored = restoreSession();
  hideLoader();
  if (restored) {
    showApp();
  } else {
    showLogin();
  }
}

// ── Session persistante ───────────────────────────────────────
function saveSession(session) {
  const payload = { session, expiresAt: Date.now() + SESSION_TTL };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(payload)); } catch(e) {}
}

function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { session, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) { localStorage.removeItem(SESSION_KEY); return false; }
    window.currentSession = session;
    return true;
  } catch(e) { return false; }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch(e) {}
  window.currentSession = null;
}

// ── Hash SHA-256 ─────────────────────────────────────────────
async function sha256(message) {
  const buf  = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── Authentification ─────────────────────────────────────────
async function tryLogin(name, grade, password) {
  const hash = await sha256(password);
  const doc  = await db.collection('config').doc('auth').get();
  if (!doc.exists) throw new Error('Configuration introuvable. Voir README.');
  const data = doc.data();

  let session;
  if (hash === data.commanderPasswordHash) {
    if (!name.trim()) throw new Error('Veuillez indiquer votre nom.');
    if (!grade)       throw new Error('Veuillez sélectionner votre grade.');
    session = { role: 'commander', name: name.trim(), grade, dept: getGradeDept(grade) };
  } else if (hash === data.agentPasswordHash) {
    if (!name.trim()) throw new Error('Veuillez indiquer votre nom.');
    if (!grade)       throw new Error('Veuillez sélectionner votre grade.');
    // Bloquer les grades commanderOnly pour les agents
    if (isCommanderOnlyGrade(grade)) throw new Error('Ce grade requiert le mot de passe Commander.');
    session = { role: 'agent', name: name.trim(), grade, dept: getGradeDept(grade) };
  } else {
    throw new Error('Mot de passe incorrect.');
  }

  window.currentSession = session;
  saveSession(session);
  return session;
}

async function logout() {
  if (window.currentSession) await addLog('DÉCONNEXION', 'Déconnexion du MDT');
  clearSession();
  showLogin();
}

// ── Changer les mots de passe ─────────────────────────────────
async function changePassword(type, newPassword) {
  const hash  = await sha256(newPassword);
  const field = type === 'commander' ? 'commanderPasswordHash' : 'agentPasswordHash';
  await db.collection('config').doc('auth').update({ [field]: hash });
  await addLog('SÉCURITÉ', `Mot de passe "${type}" modifié`);
}

// ── CRUD Générique ────────────────────────────────────────────
function col(name) { return db.collection(name); }

async function getAll(collection) {
  const snap = await col(collection).orderBy('createdAt','desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getOne(collection, id) {
  const doc = await col(collection).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function createDoc(collection, data) {
  const s = window.currentSession;
  const ref = await col(collection).add({
    ...data,
    createdAt:      firebase.firestore.FieldValue.serverTimestamp(),
    createdBy:      s?.name    ?? '—',
    createdByGrade: s?.grade   ?? '—',
    createdByRole:  s?.role    ?? '—',
  });
  return ref.id;
}

async function updateDoc(collection, id, data) {
  const s = window.currentSession;
  await col(collection).doc(id).update({
    ...data,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: s?.name ?? '—',
  });
}

async function deleteDoc(collection, id) {
  await col(collection).doc(id).delete();
}

// ── Photos (URL Postimage stockée dans Firestore) ─────────────
async function addPhotoToDoc(collection, docId, photoUrl, photoName) {
  const photo = {
    url:     photoUrl,
    name:    photoName || 'Photo',
    addedBy: window.currentSession?.name ?? '—',
    addedAt: new Date().toISOString(),
  };
  await col(collection).doc(docId).update({
    photos:    firebase.firestore.FieldValue.arrayUnion(photo),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: window.currentSession?.name ?? '—',
  });
  return photo;
}

async function removePhotoFromDoc(collection, docId, photo) {
  await col(collection).doc(docId).update({
    photos:    firebase.firestore.FieldValue.arrayRemove(photo),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

// ── Logs ──────────────────────────────────────────────────────
async function addLog(action, detail) {
  const s = window.currentSession;
  if (!s) return;
  try {
    await col('logs').add({
      action, detail,
      agentName:  s.name,
      agentGrade: s.grade,
      agentRole:  s.role,
      timestamp:  firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch(e) { console.warn('Log error:', e); }
}

async function getLogs(limit = 150) {
  const snap = await col('logs').orderBy('timestamp','desc').limit(limit).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
