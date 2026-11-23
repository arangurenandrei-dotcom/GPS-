
    import { initializeApp } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js";
    import { getAnalytics } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-analytics.js";
    import { arrayUnion, getDoc, collection } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";
    import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
    import {
   initializeFirestore, memoryLocalCache,
   doc, setDoc, onSnapshot
 } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js";
 import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-functions.js";

    const firebaseConfig = {
      apiKey: "AIzaSyD4QzFsYJ8GF2Xgo3GX7LVuhPhTK-Z-kkw",
      authDomain: "gestion-comercial-navarr-3b028.firebaseapp.com",
      projectId: "gestion-comercial-navarr-3b028",
      storageBucket: "gestion-comercial-navarr-3b028.firebasestorage.app",
      messagingSenderId: "335117082096",
      appId: "1:335117082096:web:ae8e51ae26457bf29a5135",
      measurementId: "G-3QSK7S47KD"
    };

    const app = initializeApp(firebaseConfig);
    try { getAnalytics(app); } catch (e) { console.info('Analítica no disponible.'); }
    const db = initializeFirestore(app, {
      localCache: memoryLocalCache()
    });

    const auth = getAuth(app);
 const functionsEu = getFunctions(app, 'europe-west1');
 window.watchWorkV2 = (team, changed, error) => onSnapshot(doc(db,'estado_trabajo',team), snap => {if (!snap.metadata.fromCache) changed();}, error);
 window.readWorkV2 = httpsCallable(functionsEu, 'leerTrabajoV2');
 window.leerPerimetrosPueblo = httpsCallable(functionsEu, 'leerPerimetrosPueblo');
 window.guardarPerimetroPueblo = httpsCallable(functionsEu, 'guardarPerimetroPueblo');
 window.consultarSectoresMikel =
   httpsCallable(functionsEu, 'consultarSectoresMikel');

 window.teamSummaryV2 = httpsCallable(functionsEu, 'resumenTrabajoV2');
 window.writeWorkV2 = httpsCallable(functionsEu, 'guardarTrabajoV2');
 window.verificarHistoricoKonsor = httpsCallable(functionsEu, 'verificarHistoricoKonsor');
  window.consultarDisponibilidadObras =
    httpsCallable(functionsEu, 'consultarDisponibilidadObras');
 window.db = db;
 window.auth = auth;
 window.doc = doc;
 window.getDoc = getDoc;
 window.setDoc = setDoc;
 window.callGuardarFichaTransaccional = httpsCallable(functionsEu, 'guardarFichaTransaccional');
 window.callSincronizarFichaV2 = httpsCallable(functionsEu, 'sincronizarFichaV2');
 window.callAgendarObraEquipo = httpsCallable(functionsEu, 'agendarObraEquipo');
 window.vincularObraExistenteKonsor = httpsCallable(functionsEu, 'vincularObraExistenteKonsor');

    window.authApi = {
      async register(email, pass, name) {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await setDoc(doc(db, 'usuarios', cred.user.uid), {
          email: email,
          nombre: name,
          estado: 'pendiente',
          userKey: '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        return cred.user;
      },
      async login(email, pass) {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        return cred.user;
      },
      async logout() { await signOut(auth); },
      async reset(email) { await sendPasswordResetEmail(auth, email); },
      async getProfile(uid) {
        const s = await getDoc(doc(db, 'usuarios', uid));
        return s.exists() ? s.data() : null;
      },
      watchProfiles(cb) {
        return onSnapshot(collection(db, 'usuarios'), (snap) => {
          cb(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
        });
      },
      async setProfile(uid, data) {
        await setDoc(doc(db, 'usuarios', uid), { ...data, updatedAt: Date.now() }, { merge: true });
      }
    };

    onAuthStateChanged(auth, (user) => {
      if (user && typeof window.onAuthUserReady === 'function') window.onAuthUserReady(user);
    });

    window.enablePushForUser = async function(userKey, userName) {
      if (userKey === 'jefe_mikel' || String(userKey).startsWith('mikel_') || String(userName).startsWith('Mikel')) return {ok:false,reason:'restricted'};
      try {
        const mod = await import("https://www.gstatic.com/firebasejs/13.3.0/firebase-messaging.js");
        if (!(await mod.isSupported())) return { ok: false, reason: 'unsupported' };
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return { ok: false, reason: 'denied' };
        const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
        const messaging = mod.getMessaging(app);
        const token = await mod.getToken(messaging, {
          vapidKey: 'BD9zHo9RfzN7owAnKElcGFcLah-lLGzLcxPOVNmIgS8zZTbnXU4QzhxdsMATS43q2RaQGnYw8uuuPcdt25MS1fw',
          serviceWorkerRegistration: reg
        });
        if (!token) return { ok: false, reason: 'notoken' };
        await setDoc(doc(db, 'push_tokens', userKey), {
          name: userName,
          tokens: arrayUnion(token),
          updatedAt: Date.now()
        }, { merge: true });
        return { ok: true };
      } catch (e) {
        console.error('Push error:', e);
        return { ok: false, reason: 'error', msg: String((e && e.message) || e) };
      }
    };

    window.bossTasksApi = {
      watch(cb) { return window.KonsorBridge.watchTasks(cb); },
      async save(patch) {
        const rows = bossPlanItems.slice();
        const index = rows.findIndex(t => t.id === patch.id);
        const previous = rows[index] || {};
        const task = {...previous,...patch,createdAt:previous.createdAt || Date.now(),_updatedAt:Date.now()};
        if (!task.id || !String(task.title || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || ''))
          throw Error('Completa el título y la fecha.');
        if (index < 0 && task.sourceId && rows.some(t => t.sourceId === task.sourceId && t.status !== 'done'))
          throw Error('Esta revisión ya figura en el plan.');
        if (index < 0) rows.push(task); else rows[index] = task;
        await window.KonsorBridge.save('comercial_boss_tasks', rows);
        return rows;
      }
    };
  