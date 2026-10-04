const BACKEND_URL = localStorage.getItem('bodaTestBackendUrl') || '';
const form = document.getElementById('testForm');
const stateBox = document.getElementById('backendState');
const submitBtn = document.getElementById('submitBtn');
const result = document.getElementById('result');
const frame = document.getElementById('backendFrame');

function setState(kind,text){
  stateBox.className='state '+kind;
  stateBox.querySelector('span:last-child').textContent=text;
}

function applyBackend(){
  if(!BACKEND_URL){
    setState('waiting','Falta vincular el Apps Script de prueba.');
    submitBtn.disabled=true;
    return;
  }
  form.action=BACKEND_URL;
  submitBtn.disabled=false;
  setState('ready','Backend de prueba vinculado. Ya puedes enviar una confirmación.');
}

frame.addEventListener('load',()=>{
  if(!form.dataset.sent)return;
  submitBtn.disabled=false;
  result.classList.remove('hidden');
  result.textContent='Solicitud enviada. Ahora revisa la pestaña Confirmaciones del Sheet de prueba.';
  form.dataset.sent='';
});

form.addEventListener('submit',()=>{
  submitBtn.disabled=true;
  result.classList.add('hidden');
  form.dataset.sent='1';
});

applyBackend();