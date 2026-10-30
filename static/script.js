const form = document.getElementById('sleep-form');
const ids = [
  'age', 'start', 'end', 'hours',
  'exercise', 'caffeine', 'screen', 'work',
  'productivity', 'mood', 'stress', 'quality'
];
const scores = ids.slice(8);
const button = document.getElementById('predict');

let hasResult = false;
let busy = false;

// Display a short explanation below each model's prediction.
function addSleepExplanation(resultId, label) {
  const descriptions = {
    rem:
      'REM means Rapid Eye Movement sleep. Brain activity increases, and vivid dreaming often occurs during this stage.',
    light:
      'Light sleep includes the early non-REM stages. Your body relaxes as you move from wakefulness into sleep.',
    deep:
      'Deep sleep is stage N3 of non-REM sleep. It features slow brain waves, and waking up is more difficult.',
    n1:
      'N1 is the first non-REM stage: a brief transition from being awake to being asleep.',
    n2:
      'N2 is a non-REM stage in which you are asleep. Heart rate and breathing slow, and body temperature drops.',
    n3:
      'N3 is deep non-REM sleep. It features slow brain waves, and waking up is more difficult.',
    nrem:
      'Non-REM sleep includes three stages, from the transition into sleep to deep sleep.',
    awake:
      'Awake means wakefulness rather than a sleep stage.'
  };

  const aliases = {
    remsleep: 'rem',
    rapideyemovement: 'rem',
    rapideyemovementsleep: 'rem',
    lightsleep: 'light',
    deepsleep: 'deep',
    nonrem: 'nrem',
    nonremsleep: 'nrem',
    nremsleep: 'nrem',
    stage1: 'n1',
    stage2: 'n2',
    stage3: 'n3',
    nrem1: 'n1',
    nrem2: 'n2',
    nrem3: 'n3',
    wake: 'awake',
    wakefulness: 'awake'
  };

  const key = String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const description =
    descriptions[aliases[key] || key] ||
    'This is the sleep-type label returned by the model.';

  const heading = document.getElementById(resultId);
  if (!heading) return;

  let explanation = document.getElementById(
    `${resultId}-explanation`
  );

  if (!explanation) {
    explanation = document.createElement('p');
    explanation.id = `${resultId}-explanation`;

    explanation.style.cssText = `
      margin-top: 8px;
      font-size: 12px;
      line-height: 1.7;
      color: #b7bfd5;
      font-weight: 400;
    `;

    heading.insertAdjacentElement('afterend', explanation);
  }

  explanation.textContent =
    description +
    ' This explains the predicted label; it does not confirm your actual sleep stage.';
}

function update() {
  let count = 0;

  ids.forEach(id => {
    const el = document.getElementById(id);

    if (el.value !== '' && el.validity.valid) {
      count++;
    }
  });

  scores.forEach(id => {
    const el = document.getElementById(id);
    document.getElementById(`${id}-value`).value = el.value;
  });

  document.getElementById('progress').value = count;
  document.getElementById('progress-text').textContent =
    `${count} of 12`;
}

function changed() {
  update();
  document.getElementById('error').hidden = true;
  document.getElementById('stale').hidden = !hasResult;
}

form.addEventListener('input', changed);

document.getElementById('sample').addEventListener('click', () => {
  const sample = [
    25, '23:30', '07:00', 7.5,
    30, 100, 60, 8,
    6, 7, 3, 8
  ];

  ids.forEach((id, i) => {
    document.getElementById(id).value = sample[i];
  });

  changed();
});

form.addEventListener('reset', () => {
  hasResult = false;

  document.getElementById('results').hidden = true;
  document.getElementById('empty').hidden = false;
  document.getElementById('error').hidden = true;
  document.getElementById('stale').hidden = true;

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

    if (!response.ok) {
      throw new Error();
    }

    const data = await response.json();

    el.textContent = data.ready
      ? 'Model files found · Ready to predict'
      : 'Setup needed · Add your 4 trained files to saved_models/';

    el.classList.toggle('unavailable', !data.ready);
  } catch {
    el.textContent =
      'Server unavailable · Please refresh or try again shortly.';
    el.classList.add('unavailable');
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  if (busy || !form.reportValidity()) {
    return;
  }

  const values = ids.map(id => {
    const value = document.getElementById(id).value;

    return id === 'start' || id === 'end'
      ? decimalTime(value)
      : Number(value);
  });

  busy = true;
  button.disabled = true;

  document.getElementById('sample').disabled = true;
  form.querySelector('button[type=reset]').disabled = true;

  form.querySelectorAll('input').forEach(el => {
    el.disabled = true;
  });

  button.textContent = 'Reading your routine…';
  document.getElementById('error').hidden = true;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values }),
      signal: controller.signal
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || 'Unable to predict. Try again.'
      );
    }

    const rfLabel = data.predictions.random_forest;
    const mlpLabel = data.predictions.mlp;

    document.getElementById('rf-result').textContent = rfLabel;
    document.getElementById('mlp-result').textContent = mlpLabel;

    // Add or update the explanation for each prediction.
    addSleepExplanation('rf-result', rfLabel);
    addSleepExplanation('mlp-result', mlpLabel);

    document.getElementById('agreement').textContent =
      rfLabel === mlpLabel
        ? 'Both models predict the same sleep type.'
        : 'The models predict different sleep types. Both outputs are shown above.';

    document.getElementById('empty').hidden = true;
    document.getElementById('results').hidden = false;
    document.getElementById('stale').hidden = true;

    hasResult = true;

    if (matchMedia('(max-width: 850px)').matches) {
      const reducedMotion = matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      document.querySelector('.result-panel').scrollIntoView({
        behavior: reducedMotion ? 'instant' : 'smooth',
        block: 'start'
      });
    }
  } catch (err) {
    const el = document.getElementById('error');

    if (err.name === 'AbortError') {
      el.textContent =
        'The request timed out. The server may be starting up. Please try again shortly.';
    } else if (err instanceof TypeError) {
      el.textContent =
        'Cannot reach the server. Check your connection and try again.';
    } else {
      el.textContent = err.message;
    }

    el.hidden = false;
  } finally {
    clearTimeout(timeout);

    busy = false;
    button.disabled = false;

    document.getElementById('sample').disabled = false;
    form.querySelector('button[type=reset]').disabled = false;

    form.querySelectorAll('input').forEach(el => {
      el.disabled = false;
    });

    button.innerHTML = 'Explore my sleep <span>→</span>';
  }
});

update();
checkStatus();
