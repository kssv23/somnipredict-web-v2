const form = document.getElementById('sleep-form');
const ids = ['age','start','end','hours','exercise','caffeine','screen','work','productivity','mood','stress','quality'];
const scores = ids.slice(8);
const button = document.getElementById('predict');
let hasResult = false;
let busy = false;
function update() {
  let count = 0;
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el.value !== '' && el.validity.valid) count++;
  });
  scores.forEach(id => {
    const el = document.getElementById(id);
    document.getElementById(`${id}-value`).value = el.value;
  });
  document.getElementById('progress').value = count;
  document.getElementById('progress-text').textContent = `${count} of 12`;
}
function changed() {
  update();
  document.getElementById('error').hidden = true;
  document.getElementById('stale').hidden = !hasResult;
}
form.addEventListener('input', changed);
document.getElementById('sample').addEventListener('click', () => {
  const sample = [25,'23:30','07:00',7.5,30,100,60,8,6,7,3,8];
  ids.forEach((id, i) => document.getElementById(id).value = sample[i]);
  changed();
});
form.addEventListener('reset', () => {
  hasResult = false;
  document.getElementById('results').hidden = true;
  document.getElementById('empty').hidden = false;
  document.getElementById('error').hidden = true;
  setTimeout(update, 0);
});
function decimalTime(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours + minutes / 60;
}
async function checkStatus() {
  const el = document.getElementById('status');
  try {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error();
    const data = await response.json();
    el.textContent = data.ready ? 'Model files found · Ready to predict' : 'Setup needed · Add your 4 trained files to saved_models/';
    el.classList.toggle('unavailable', !data.ready);
  } catch {
    el.textContent = 'Server unavailable · Start with python app.py';
    el.classList.add('unavailable');
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;
  const values = ids.map(id => {
    const value = document.getElementById(id).value;
    return id === 'start' || id === 'end' ? decimalTime(value) : Number(value);
  });
  busy = true;
  button.disabled = true;
  document.getElementById('sample').disabled = true;
  form.querySelector('button[type=reset]').disabled = true;
  form.querySelectorAll('input').forEach(el => el.disabled = true);
  button.textContent = 'Reading your routine…';
  document.getElementById('error').hidden = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch('/api/predict', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({values}), signal:controller.signal
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to predict. Try again.');
    document.getElementById('rf-result').textContent = data.predictions.random_forest;
    document.getElementById('mlp-result').textContent = data.predictions.mlp;
    document.getElementById('agreement').textContent = data.predictions.random_forest === data.predictions.mlp
      ? 'Both models predict the same sleep type.' : 'The models predict different sleep types. Both outputs are shown above.';
    document.getElementById('empty').hidden = true;
    document.getElementById('results').hidden = false;
    document.getElementById('stale').hidden = true;
    hasResult = true;
    if (matchMedia('(max-width: 850px)').matches) {
      document.querySelector('.result-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth', block:'start'});
    }
  } catch (err) {
    const el = document.getElementById('error');
    el.textContent = err.name === 'AbortError' ? 'The request timed out. Please try again.' : err instanceof TypeError ? 'Cannot reach the server. Run python app.py and open http://127.0.0.1:5000.' : err.message;
    el.hidden = false;
  } finally {
    clearTimeout(timeout);
    busy = false;
    button.disabled = false;
    document.getElementById('sample').disabled = false;
    form.querySelector('button[type=reset]').disabled = false;
    form.querySelectorAll('input').forEach(el => el.disabled = false);
    button.innerHTML = 'Explore my sleep <span>→</span>';
  }
});
update();
checkStatus();
