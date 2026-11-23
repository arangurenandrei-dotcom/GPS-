import { initializeApp } from 'firebase/app';
import {
  browserSessionPersistence, connectAuthEmulator, createUserWithEmailAndPassword, getAuth, onAuthStateChanged,
  sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import { connectFirestoreEmulator, doc, initializeFirestore, memoryLocalCache, onSnapshot } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { montarOperaciones } from './app.js';

const login = document.getElementById('loginScreen');
const comercial = document.getElementById('appContainer');
let sesion;
let dejarSenal;

async function iniciar() {
  const { staging, preview, firebase } = __CONFIG_KONSOR__;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const hosting = [firebase.projectId + '.web.app', firebase.authDomain].includes(location.hostname);
  if ((staging && !hosting) || (!staging && !preview && !local) || (preview && !window.isSecureContext)) {
    throw Error('Esta compilación solo está habilitada en su entorno Firebase de pruebas.');
  }

  const app = initializeApp(firebase);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    ...(preview && { host: location.host, ssl: location.protocol === 'https:', experimentalForceLongPolling: true })
  });
  const functions = getFunctions(app, preview ? location.origin + '/__konsor/functions' : 'europe-west1');
  if (preview) {
    connectAuthEmulator(auth, location.origin, { disableWarnings: true });
  } else if (!staging) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9109', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8183);
    connectFunctionsEmulator(functions, '127.0.0.1', 5003);
  }
  await setPersistence(auth, browserSessionPersistence);
  const call = httpsCallable(functions, 'konsorEmpresarial');
  const llamar = async (metodo, data) => (await call({ metodo, ...data })).data;
  const noDisponible = servicio => async () => {
    throw Error(servicio + ' requiere una integración autorizada en Firebase de pruebas.');
  };
  const marca = document.createElement('p');
  marca.textContent = 'Usa una cuenta de este entorno Firebase de pruebas.';
  marca.className = 'login-subtitle';
  login.querySelector('.ios-login-heading').append(marca);

  function volver() {
    panel.cerrar();
    comercial.inert = false;
    const inicio = document.getElementById('cnvHome');
    if (inicio) inicio.inert = false;
    window.cnvShowHome();
  }

  function fichaOriginal(id) {
    const indice = savedZones.findIndex(zona => zona.clients?.some(c => c.clientUid === id));
    if (indice < 0) {
      window.alert('La ficha todavía no está en tu sesión comercial. Actualiza Comercial y vuelve a abrirla.');
      return;
    }
    const ficha = savedZones[indice].clients.findIndex(c => c.clientUid === id);
    volver();
    window.openKonsorClientDetail(indice, ficha);
  }

  async function salir() {
    if (window.KonsorBridge?.busy) throw Error('Hay cambios comerciales pendientes. Recarga la app para recuperarlos.');
    await signOut(auth);
    location.reload();
  }

  const panel = montarOperaciones({ llamar, salir, fichaOriginal });

  function abrir(vista, id) {
    if (!sesion || auth.currentUser?.uid !== sesion.persona.uid) return;
    const vuelve = sesion.persona.departamento === 'comercial' && sesion.persona.legacyKey ? volver : null;
    comercial.inert = true;
    const inicio = document.getElementById('cnvHome');
    if (inicio) inicio.inert = true;
    panel.abrir(sesion, vista, id, vuelve);
  }

  function observar(equipoId, alCambiar, alFallar) {
    if (!equipoId) return () => {};
    let version;
    return onSnapshot(doc(db, 'equipos', equipoId, 'senales', 'actividad'), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.fromCache) return;
      const tiempo = snapshot.data()?.actualizado;
      const nuevo = tiempo ? tiempo.seconds + ':' + tiempo.nanoseconds : '';
      if (nuevo !== version) {
        const inicial = version === undefined;
        version = nuevo;
        alCambiar(inicial);
      }
    }, alFallar);
  }

  window.auth = auth;
  window.authApi = {
    register: async (email, pass) => (await createUserWithEmailAndPassword(auth, email, pass)).user,
    login: async (email, pass) => (await signInWithEmailAndPassword(auth, email, pass)).user,
    logout: () => signOut(auth),
    reset: email => sendPasswordResetEmail(auth, email)
  };
  window.readWorkV2 = () => call({ metodo: 'leerTrabajo' });
  window.writeWorkV2 = data => call({ ...data, metodo: 'guardarTrabajo' });
  window.watchWorkV2 = (_equipoAnterior, changed, error) => observar(sesion?.persona.equipoId, changed, error);
  window.bossTasksApi = {
    watch: callback => window.KonsorBridge.watchTasks(callback),
    async save(cambio) {
      const tareas = bossPlanItems.slice();
      const indice = tareas.findIndex(tarea => tarea.id === cambio.id);
      const anterior = tareas[indice] ?? {};
      const fecha = Date.now();
      const tarea = { ...anterior, ...cambio, createdAt: anterior.createdAt || fecha, _updatedAt: fecha };
      if (!tarea.id || !String(tarea.title || '').trim() || !/^\d{4}-\d{2}-\d{2}$/.test(tarea.dueDate || '')) {
        throw Error('Completa el título y la fecha.');
      }
      if (indice < 0 && tarea.sourceId && tareas.some(item => item.sourceId === tarea.sourceId && item.status !== 'done')) {
        throw Error('Esta revisión ya figura en el plan.');
      }
      tareas.splice(indice < 0 ? tareas.length : indice, indice < 0 ? 0 : 1, tarea);
      await window.KonsorBridge.save('comercial_boss_tasks', tareas);
      return tareas;
    }
  };
  window.consultarDisponibilidadObras = noDisponible('La agenda de obras');
  window.verificarHistoricoKonsor = noDisponible('La validación con el calendario');
  window.consultarSectoresMikel = noDisponible('La supervisión de otro equipo');
  window.guardarPerimetroPueblo = noDisponible('La cartografía compartida');
  window.enablePushForUser = noDisponible('El envío de avisos al móvil');
  window.openNotificationsCenterV2 = tab => abrir(tab === 'tasks' ? 'tareas' : 'avisos');
  window.KonsorIntegracion = {
    operaciones: () => abrir(),
    equipo: () => abrir('equipo'),
    desdeFicha: id => abrir('expedientes', id),
    async abrirSesion(user) {
      try {
        const perfil = await llamar('sesion');
        if (auth.currentUser?.uid !== user.uid) return;
        sesion = perfil;
        dejarSenal?.();
        dejarSenal = observar(perfil.persona.equipoId, inicial => { if (!inicial) panel.cambio(); }, error => {
          if (error.code === 'permission-denied' && auth.currentUser?.uid === user.uid) {
            signOut(auth).finally(() => location.reload());
          }
        });
        if (perfil.persona.departamento === 'comercial' && perfil.persona.legacyKey) {
          await window.KonsorBridge.open(user.uid, perfil.persona.legacyKey);
          if (auth.currentUser?.uid !== user.uid) return;
          if (!currentUserName) startSessionForUserKey(perfil.persona.legacyKey);
        } else {
          login.style.display = 'none';
          abrir();
        }
      } catch (error) {
        if (auth.currentUser?.uid !== user.uid) return;
        if (error.code === 'functions/permission-denied') {
          authSetMsg('Tu cuenta necesita un alta activa. Facilita este UID a tu responsable: ' + user.uid, 'warn');
          await signOut(auth);
        } else {
          authSetMsg('No se pudo cargar el trabajo. ' + error.message, 'err');
        }
      }
    }
  };
  onAuthStateChanged(auth, user => {
    if (user) window.onAuthUserReady?.(user);
    else {
      dejarSenal?.();
      dejarSenal = null;
      sesion = undefined;
      panel.cerrar();
    }
  });
}

iniciar().catch(error => authSetMsg(error.message, 'err'));
