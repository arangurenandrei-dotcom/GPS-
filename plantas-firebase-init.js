/* KONSOR · Callables independientes de plantas.
 * El inicializador histórico de Firebase permanece byte a byte intacto.
 */
import {getApps} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js';
import {getFunctions,httpsCallable} from 'https://www.gstatic.com/firebasejs/13.3.0/firebase-functions.js';
const names=['crearMensajePlantaKonsor','listarMensajesPlantaKonsor','actualizarMensajePlantaKonsor','configurarMargenesPlantaKonsor'];
for(const name of names){
 window[name]=async args=>{
  const app=getApps()[0];
  if(!app)throw Error('Firebase todavía no está inicializado.');
  const fn=getFunctions(app,'europe-west1');
  return httpsCallable(fn,name)(args||{});
 };
}
