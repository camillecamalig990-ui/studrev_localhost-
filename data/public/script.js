let currentUser = null;
let currentSession = 0;
let sessionItems = [];
let currentIndex = 0;
let correctCount = 0;

async function register() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email,password})
  });
  const data = await res.json();
  if(data.ok){ loginSuccess(data.user); }
  else { document.getElementById('loginMsg').innerText = data.msg; }
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email,password})
  });
  const data = await res.json();
  if(data.ok){ loginSuccess(data.user); }
  else { document.getElementById('loginMsg').innerText = data.msg; }
}

function loginSuccess(user) {
  currentUser = user;
  document.getElementById('loginDiv').classList.add('hidden');
  document.getElementById('sessionsDiv').classList.remove('hidden');
}

function logout() {
  currentUser = null;
  currentSession = 0;
  sessionItems = [];
  currentIndex = 0;
  correctCount = 0;
  document.getElementById('sessionsDiv').classList.add('hidden');
  document.getElementById('sessionDiv').classList.add('hidden');
  document.getElementById('loginDiv').classList.remove('hidden');
}

async function startSession(n) {
  currentSession = n;
  const res = await fetch(`/api/session/${n}`);
  const data = await res.json();
  if(data.ok) {
    sessionItems = data.items;
    currentIndex = 0;
    correctCount = 0;
    showEntry();
    document.getElementById('sessionsDiv').classList.add('hidden');
    document.getElementById('sessionDiv').classList.remove('hidden');
    document.getElementById('sessionNumber').innerText = currentSession;
  } else {
    alert('Error loading session');
  }
}

function showEntry() {
  if(currentIndex >= sessionItems.length){
    finishSession();
    return;
  }
  const item = sessionItems[currentIndex];
  document.getElementById('entryContainer').innerHTML = `
    <div class="entry">
      <strong>${item.desc}</strong><br>
      Account: ${item.account}<br>
      Type: ${item.type}<br>
      Statement: ${item.statement}
    </div>
    <p>Question ${currentIndex+1} of ${sessionItems.length}</p>
  `;
}

function markCorrect() {
  correctCount++;
  currentIndex++;
  showEntry();
}

function markIncorrect() {
  currentIndex++;
  showEntry();
}

async function finishSession() {
  await fetch(`/api/session/${currentSession}/complete`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email: currentUser.email, correct: correctCount, max: sessionItems.length})
  });
  alert(`Session ${currentSession} complete! Score: ${correctCount} / ${sessionItems.length}`);
  document.getElementById('sessionDiv').classList.add('hidden');
  document.getElementById('sessionsDiv').classList.remove('hidden');
}
