// ═══════════════════════════════════════════════════════════════
//  R.S. GLOBAL ACADEMY — ERP v4.0  |  app.js
//  Firebase: Auth + Firestore
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Firebase Config ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyD_i6cdAREp8sHoWvVcM_0anX8vVV36uco",
  authDomain: "rsga-fa89f.firebaseapp.com",
  projectId: "rsga-fa89f",
  storageBucket: "rsga-fa89f.firebasestorage.app",
  messagingSenderId: "552424921107",
  appId: "1:552424921107:web:5bdb99629f5917236207e6",
  measurementId: "G-SM0N7YT5CY"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db   = getFirestore(firebaseApp);

// ── Staff Master Data ────────────────────────────────────────
const STAFF_MASTER = [
  { username:'md',        password:'md@123',     email:'md@rsga.school',        name:'MD Sir',          role:'MD',           class:null },
  { username:'principal', password:'prin123',    email:'principal@rsga.school', name:'Principal Sir',   role:'Principal',    class:null },
  { username:'anjani',    password:'anjani123',  email:'anjani@rsga.school',    name:'Anjani Ma\'am',   role:'Incharge',     class:'6' },
  { username:'arti',      password:'arti123',    email:'arti@rsga.school',      name:'Arti Ma\'am',     role:'Incharge',     class:'7' },
  { username:'ranjeet',   password:'raj123',     email:'ranjeet@rsga.school',   name:'Ranjeet Sir',     role:'Class Teacher',class:'8' },
  { username:'rana',      password:'rana123',    email:'rana@rsga.school',      name:'Rana Sir',        role:'Class Teacher',class:'9' },
];

const NAV_ITEMS = [
  { id:'dashboard',  icon:'fa-gauge',       label:'Dashboard'   },
  { id:'students',   icon:'fa-users',       label:'Students'    },
  { id:'attendance', icon:'fa-calendar-check', label:'Attendance' },
  { id:'homework',   icon:'fa-book-open',   label:'Homework'    },
  { id:'tests',      icon:'fa-pen-to-square',label:'Tests'      },
];

// ── Global State ─────────────────────────────────────────────
let currentUser   = null;  // { uid, name, role, class, username }
let currentPage   = 'dashboard';
let allStudents   = [];

// ── Helpers ──────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const show = id => $(id).style.display = '';
const hide = id => $(id).style.display = 'none';

function toast(msg, type='') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast' + (type ? ' toast-'+type : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function fmtDate(d) {
  if (!d) return '';
  const dt = d.toDate ? d.toDate() : new Date(d);
  return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ── SCREEN ROUTER ─────────────────────────────────────────────
function showScreen(name) {
  ['login-screen','setup-screen','app-screen'].forEach(id => hide(id));
  show(name);
}

// ═══════════════════════════════════════════════════════════════
//  FIRST TIME SETUP — create all staff accounts in Firebase Auth
// ═══════════════════════════════════════════════════════════════
async function runFirstTimeSetup() {
  showScreen('setup-screen');
  const log = $('setup-log');

  function addLog(msg, ok=true) {
    const d = document.createElement('div');
    d.style.cssText = 'padding:4px 0; font-size:13px; color:' + (ok ? '#86efac' : '#fca5a5');
    d.textContent = (ok ? '✅ ' : '❌ ') + msg;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  for (const s of STAFF_MASTER) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, s.email, s.password);
      await setDoc(doc(db, 'staff', cred.user.uid), {
        username: s.username, name: s.name, role: s.role,
        class: s.class, email: s.email, createdAt: serverTimestamp()
      });
      addLog(s.name + ' (' + s.username + ') — account created');
    } catch(e) {
      if (e.code === 'auth/email-already-in-use') {
        addLog(s.name + ' — already exists (OK)', true);
      } else {
        addLog(s.name + ' — ' + e.message, false);
      }
    }
  }

  await signOut(auth);
  setTimeout(() => {
    showScreen('login-screen');
    toast('Setup complete! Ab login karein 🎉', 'success');
  }, 1500);
}

// ═══════════════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════════════
function initLogin() {
  // Quick login buttons
  const grid = $('quick-btns');
  if (grid) {
    grid.innerHTML = '';
    STAFF_MASTER.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'ql-btn';
      btn.textContent = s.name.split(' ')[0];
      btn.onclick = () => { $('un').value = s.username; $('pw').value = s.password; };
      grid.appendChild(btn);
    });
  }

  // Login button
  $('login-btn').onclick = doLogin;
  $('pw').onkeydown = e => { if(e.key==='Enter') doLogin(); };

  // Toggle password
  const toggleBtn = $('toggle-pw-btn');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const pw = $('pw');
      const eye = $('pw-eye');
      if (pw.type==='password') { pw.type='text'; eye.className='fas fa-eye-slash'; }
      else { pw.type='password'; eye.className='fas fa-eye'; }
    };
  }

  // First time setup link
  const setupLink = document.getElementById('setup-link');
  if (setupLink) setupLink.onclick = runFirstTimeSetup;
}

async function doLogin() {
  const un = $('un').value.trim().toLowerCase();
  const pw = $('pw').value.trim();
  const errDiv = $('login-error');
  errDiv.style.display='none';

  if (!un || !pw) { errDiv.textContent='Username aur password dono bharo'; errDiv.style.display='block'; return; }

  const staff = STAFF_MASTER.find(s => s.username === un && s.password === pw);
  if (!staff) { errDiv.textContent='Galat username ya password'; errDiv.style.display='block'; return; }

  $('login-btn').disabled = true;
  $('login-btn').textContent = 'Logging in...';

  try {
    await signInWithEmailAndPassword(auth, staff.email, staff.password);
    // onAuthStateChanged will handle the rest
  } catch(e) {
    if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
      errDiv.textContent = 'Pehle "First Time Setup" karo!';
      errDiv.style.display='block';
    } else {
      errDiv.textContent = e.message;
      errDiv.style.display='block';
    }
    $('login-btn').disabled=false;
    $('login-btn').innerHTML='<i class="fas fa-sign-in-alt"></i> Login';
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN APP SHELL
// ═══════════════════════════════════════════════════════════════
function buildShell() {
  // Sidebar nav
  const nav = document.getElementById('sb-nav') || document.getElementById('sidebar')?.querySelector('nav');
  if (nav) {
    const items = currentUser.role === 'Class Teacher' || currentUser.role === 'Incharge'
      ? NAV_ITEMS
      : NAV_ITEMS;
    nav.innerHTML = items.map(item => `
      <div class="nav-item ${item.id===currentPage?'active':''}" onclick="navTo('${item.id}')">
        <i class="fas ${item.icon} nav-icon"></i> ${item.label}
      </div>`).join('');
  }

  // Sidebar user card
  const uc = $('sb-user-card');
  if (uc) uc.innerHTML = `
    <div class="sidebar-user-name">${currentUser.name}</div>
    <div class="sidebar-user-role">${currentUser.role}</div>
    ${currentUser.class ? `<div class="sidebar-user-class">Class ${currentUser.class}</div>` : ''}`;

  // Topbar date
  const dateEl = $('tb-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short'});

  // Topbar pill
  const pill = $('tb-pill');
  if (pill) pill.textContent = currentUser.name;

  // Hamburger
  const ham = $('hamburger-btn');
  if (ham) ham.onclick = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sb-overlay')?.classList.toggle('show');
  };

  // Close sidebar on overlay click
  const ov = $('sb-overlay');
  if (ov) ov.onclick = closeSidebar;

  // Logout
  $('logout-btn').onclick = async () => {
    await signOut(auth);
  };

  // Mobile nav
  buildMobileNav();
}

window.closeSidebar = function() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sb-overlay')?.classList.remove('show');
};

function buildMobileNav() {
  const mn = $('mobile-nav');
  if (!mn) return;
  mn.innerHTML = NAV_ITEMS.slice(0,5).map(item => `
    <div class="mob-nav-item ${item.id===currentPage?'active':''}" onclick="navTo('${item.id}')">
      <i class="fas ${item.icon}"></i>
      <span>${item.label}</span>
    </div>`).join('');
}

window.navTo = function(page) {
  currentPage = page;
  closeSidebar();
  // Update active states
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick')===`navTo('${page}')`);
  });
  document.querySelectorAll('.mob-nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick')===`navTo('${page}')`);
  });
  // Update topbar title
  const item = NAV_ITEMS.find(n => n.id===page);
  if (item) {
    const t = $('tb-title'); if (t) t.textContent = item.label;
    const ic = $('tb-icon'); if (ic) ic.className = 'fas ' + item.icon;
  }
  renderPage(page);
};

async function renderPage(page) {
  const main = $('main-content');
  main.innerHTML = `<div class="loader-inline"><div class="spinner"></div></div>`;
  switch(page) {
    case 'dashboard':  await renderDashboard(); break;
    case 'students':   await renderStudents();  break;
    case 'attendance': await renderAttendance(); break;
    case 'homework':   await renderHomework();  break;
    case 'tests':      await renderTests();     break;
    default: main.innerHTML = '<div class="empty-state">Coming soon...</div>';
  }
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function renderDashboard() {
  const main = $('main-content');

  // Load students count
  const snap = await getDocs(collection(db, 'students'));
  const total = snap.size;
  allStudents = snap.docs.map(d => ({id:d.id,...d.data()}));

  // Today attendance
  const today = todayStr();
  const attSnap = await getDocs(query(collection(db,'attendance'), where('date','==',today)));
  const attToday = attSnap.size;

  const hour = new Date().getHours();
  const greeting = hour<12 ? 'Subah ki Shubhkamnaen 🌅' : hour<17 ? 'Namaskar 🙏' : 'Shubh Sandhya 🌇';

  main.innerHTML = `
  <div class="greeting-banner fade-in">
    <div>
      <div class="greeting-text">${greeting}, ${currentUser.name}!</div>
      <div class="greeting-sub">R.S. Global Academy • Jirauli, Mainpuri</div>
    </div>
    <div class="session-badge">Session 2025-26</div>
  </div>

  <div class="stats-grid fade-in">
    <div class="stat-card">
      <div class="stat-icon" style="background:#dbeafe">👨‍🎓</div>
      <div><div class="stat-num">${total}</div><div class="stat-label">Total Students</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#dcfce7">✅</div>
      <div><div class="stat-num">${attToday}</div><div class="stat-label">Aaj Attendance</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#fef3c7">📚</div>
      <div><div class="stat-num">—</div><div class="stat-label">Homework</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon" style="background:#f3e8ff">📝</div>
      <div><div class="stat-num">—</div><div class="stat-label">Tests This Month</div></div>
    </div>
  </div>

  <div class="card fade-in">
    <div class="section-title">Quick Actions</div>
    <div class="quick-actions">
      <button class="quick-btn" onclick="navTo('attendance')">📋 Aaj ki Attendance</button>
      <button class="quick-btn" onclick="navTo('students')">👤 Student Add Karo</button>
      <button class="quick-btn" onclick="navTo('homework')">📚 Homework Dalo</button>
      <button class="quick-btn" onclick="navTo('tests')">📝 Test Marks</button>
    </div>
  </div>

  <div class="card fade-in">
    <div class="section-title">Staff Info</div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">Name</div><div class="info-val">${currentUser.name}</div></div>
      <div class="info-item"><div class="info-label">Role</div><div class="info-val">${currentUser.role}</div></div>
      ${currentUser.class ? `<div class="info-item"><div class="info-label">Class</div><div class="info-val">Class ${currentUser.class}</div></div>` : ''}
      <div class="info-item"><div class="info-label">Date</div><div class="info-val">${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}</div></div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  STUDENTS
// ═══════════════════════════════════════════════════════════════
async function renderStudents() {
  const main = $('main-content');
  const snap = await getDocs(query(collection(db,'students'), orderBy('name')));
  allStudents = snap.docs.map(d => ({id:d.id,...d.data()}));

  // Filter options
  const classes = [...new Set(allStudents.map(s=>s.class))].sort((a,b)=>+a-+b);

  main.innerHTML = `
  <div class="card fade-in">
    <div class="filter-bar" style="padding:0;margin-bottom:14px">
      <div class="filter-row">
        <select class="form-select" id="filter-class" onchange="filterStudents()">
          <option value="">All Classes</option>
          ${classes.map(c=>`<option value="${c}">Class ${c}</option>`).join('')}
        </select>
        <input class="form-input" style="max-width:200px" placeholder="🔍 Name search..." id="filter-name" oninput="filterStudents()"/>
        <button class="btn btn-primary" onclick="openAddStudent()"><i class="fas fa-plus"></i> Add Student</button>
      </div>
    </div>
    <div id="students-table-wrap"></div>
  </div>`;

  renderStudentTable(allStudents);
}

window.filterStudents = function() {
  const cls  = $('filter-class')?.value || '';
  const name = ($('filter-name')?.value || '').toLowerCase();
  let filtered = allStudents;
  if (cls)  filtered = filtered.filter(s => s.class === cls);
  if (name) filtered = filtered.filter(s => s.name.toLowerCase().includes(name));
  renderStudentTable(filtered);
};

function renderStudentTable(students) {
  const wrap = $('students-table-wrap');
  if (!wrap) return;
  if (!students.length) { wrap.innerHTML='<div class="empty-state">Koi student nahi mila</div>'; return; }

  wrap.innerHTML = `
  <div class="table-info">${students.length} students</div>
  <div class="table-wrap">
  <table>
    <thead><tr>
      <th>#</th><th>Name</th><th>Class</th><th>Father</th><th>Phone</th><th>Category</th><th>Actions</th>
    </tr></thead>
    <tbody>
    ${students.map((s,i) => `
      <tr>
        <td>${i+1}</td>
        <td><b>${s.name}</b></td>
        <td>Class ${s.class}</td>
        <td>${s.fatherName||'—'}</td>
        <td>${s.phone||'—'}</td>
        <td><span class="badge badge-${(s.category||'general').toLowerCase()}">${s.category||'General'}</span></td>
        <td>
          <button class="icon-btn" onclick="editStudent('${s.id}')" title="Edit">✏️</button>
          <button class="icon-btn icon-btn-danger" onclick="deleteStudent('${s.id}','${s.name}')" title="Delete">🗑️</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
  </div>`;
}

window.openAddStudent = function(prefill={}) {
  openModal('Student Add Karo', `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Naam *</label>
        <input class="form-input" id="s-name" value="${prefill.name||''}" placeholder="Student ka naam"/>
      </div>
      <div class="form-group">
        <label class="form-label">Class *</label>
        <select class="form-input" id="s-class">
          ${['1','2','3','4','5','6','7','8','9','10'].map(c=>`<option value="${c}" ${prefill.class===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Father ka Naam</label>
        <input class="form-input" id="s-father" value="${prefill.fatherName||''}" placeholder="Father's name"/>
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-input" id="s-phone" value="${prefill.phone||''}" placeholder="Mobile number"/>
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-input" id="s-category">
          ${['General','OBC','SC','ST','Minority'].map(c=>`<option value="${c}" ${prefill.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Roll No.</label>
        <input class="form-input" id="s-roll" value="${prefill.roll||''}" placeholder="Roll number"/>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="saveStudent('${prefill.id||''}')"><i class="fas fa-save"></i> Save</button>
    </div>`);
};

window.saveStudent = async function(id='') {
  const data = {
    name:       $('s-name').value.trim(),
    class:      $('s-class').value,
    fatherName: $('s-father').value.trim(),
    phone:      $('s-phone').value.trim(),
    category:   $('s-category').value,
    roll:       $('s-roll').value.trim(),
    updatedAt:  serverTimestamp()
  };
  if (!data.name) { toast('Naam bharo!','error'); return; }
  try {
    if (id) {
      await updateDoc(doc(db,'students',id), data);
      toast('Student update ho gaya! ✅','success');
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db,'students'), data);
      toast('Student add ho gaya! ✅','success');
    }
    closeModal();
    await renderStudents();
  } catch(e) { toast('Error: '+e.message,'error'); }
};

window.editStudent = function(id) {
  const s = allStudents.find(x=>x.id===id);
  if (!s) return;
  openModal('Student Edit Karo', `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Naam *</label>
        <input class="form-input" id="s-name" value="${s.name}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Class *</label>
        <select class="form-input" id="s-class">
          ${['1','2','3','4','5','6','7','8','9','10'].map(c=>`<option value="${c}" ${s.class===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Father ka Naam</label>
        <input class="form-input" id="s-father" value="${s.fatherName||''}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Phone</label>
        <input class="form-input" id="s-phone" value="${s.phone||''}"/>
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-input" id="s-category">
          ${['General','OBC','SC','ST','Minority'].map(c=>`<option value="${c}" ${s.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Roll No.</label>
        <input class="form-input" id="s-roll" value="${s.roll||''}"/>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="saveStudent('${id}')"><i class="fas fa-save"></i> Update</button>
    </div>`);
};

window.deleteStudent = async function(id, name) {
  if (!confirm(`"${name}" ko delete karna chahte ho?`)) return;
  try {
    await deleteDoc(doc(db,'students',id));
    toast('Student delete ho gaya','success');
    await renderStudents();
  } catch(e) { toast('Error: '+e.message,'error'); }
};

// ═══════════════════════════════════════════════════════════════
//  ATTENDANCE
// ═══════════════════════════════════════════════════════════════
let attData = {};   // { studentId: 'P'|'A'|'L' }
let attClass = '';
let attDate  = '';

async function renderAttendance() {
  const main = $('main-content');

  // Default: current user's class or first class
  attClass = currentUser.class || '6';
  attDate  = todayStr();

  const snap = await getDocs(query(collection(db,'students'), orderBy('name')));
  allStudents = snap.docs.map(d=>({id:d.id,...d.data()}));

  const classes = [...new Set(allStudents.map(s=>s.class))].sort((a,b)=>+a-+b);

  main.innerHTML = `
  <div class="card fade-in">
    <div class="filter-row" style="margin-bottom:14px">
      <select class="form-select" id="att-class" onchange="loadAttendance()">
        ${classes.map(c=>`<option value="${c}" ${c===attClass?'selected':''}>${c}</option>`).join('')}
      </select>
      <input type="date" class="form-input" id="att-date" value="${attDate}" style="max-width:160px" onchange="loadAttendance()"/>
      <button class="btn btn-success" onclick="saveAttendance()"><i class="fas fa-save"></i> Save</button>
    </div>
    <div id="att-summary" class="att-summary-bar"></div>
    <div id="att-list" class="att-grid"></div>
  </div>`;

  await loadAttendance();
}

window.loadAttendance = async function() {
  attClass = $('att-class')?.value || attClass;
  attDate  = $('att-date')?.value  || attDate;

  const classStudents = allStudents.filter(s => s.class === attClass)
    .sort((a,b) => (a.roll||a.name).localeCompare(b.roll||b.name, undefined, {numeric:true}));

  // Load existing attendance
  attData = {};
  const attSnap = await getDocs(query(collection(db,'attendance'),
    where('date','==',attDate), where('class','==',attClass)));
  attSnap.forEach(d => { attData[d.data().studentId] = d.data().status; });

  renderAttList(classStudents);
};

function renderAttList(students) {
  const list = $('att-list');
  if (!students.length) { list.innerHTML='<div class="empty-state">Is class mein koi student nahi</div>'; return; }

  // Mark all P by default if no data
  students.forEach(s => { if (!attData[s.id]) attData[s.id] = 'P'; });

  list.innerHTML = students.map((s,i) => `
    <div class="att-row" id="att-row-${s.id}">
      <div class="att-num">${i+1}</div>
      <div class="att-name">${s.name}</div>
      <div class="att-btns">
        ${['P','A','L'].map(status=>`
          <button class="att-btn att-${attData[s.id]===status?status:''}"
            onclick="markAtt('${s.id}','${status}')">${status}</button>`).join('')}
      </div>
    </div>`).join('');

  updateAttSummary(students);
}

window.markAtt = function(sid, status) {
  attData[sid] = status;
  const row = document.getElementById('att-row-'+sid);
  if (!row) return;
  row.querySelectorAll('.att-btn').forEach((btn,i) => {
    const s = ['P','A','L'][i];
    btn.className = 'att-btn' + (status===s ? ' att-'+s : '');
  });
  const classStudents = allStudents.filter(s=>s.class===attClass);
  updateAttSummary(classStudents);
};

function updateAttSummary(students) {
  const sum = $('att-summary');
  if (!sum) return;
  const P = students.filter(s=>attData[s.id]==='P').length;
  const A = students.filter(s=>attData[s.id]==='A').length;
  const L = students.filter(s=>attData[s.id]==='L').length;
  sum.innerHTML = `<div class="summary-chips">
    <span class="chip chip-blue">Total: ${students.length}</span>
    <span class="chip chip-green">Present: ${P}</span>
    <span class="chip chip-red">Absent: ${A}</span>
    <span class="chip chip-orange">Leave: ${L}</span>
  </div>`;
}

window.saveAttendance = async function() {
  const classStudents = allStudents.filter(s=>s.class===attClass);
  if (!classStudents.length) { toast('Koi student nahi','error'); return; }

  try {
    // Delete old records for this date+class
    const old = await getDocs(query(collection(db,'attendance'),
      where('date','==',attDate), where('class','==',attClass)));
    for (const d of old.docs) await deleteDoc(d.ref);

    // Write new
    for (const s of classStudents) {
      await addDoc(collection(db,'attendance'), {
        studentId: s.id, studentName: s.name,
        class: attClass, date: attDate,
        status: attData[s.id]||'P',
        markedBy: currentUser.name,
        markedAt: serverTimestamp()
      });
    }
    toast('Attendance save ho gayi! ✅','success');
  } catch(e) { toast('Error: '+e.message,'error'); }
};

// ═══════════════════════════════════════════════════════════════
//  HOMEWORK
// ═══════════════════════════════════════════════════════════════
async function renderHomework() {
  const main = $('main-content');
  const snap = await getDocs(query(collection(db,'homework'), orderBy('createdAt','desc')));
  const hws = snap.docs.map(d=>({id:d.id,...d.data()}));

  main.innerHTML = `
  <div class="card fade-in">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="section-title" style="margin:0">Homework</div>
      <button class="btn btn-primary" onclick="openAddHomework()"><i class="fas fa-plus"></i> Add</button>
    </div>
    ${!hws.length ? '<div class="empty-state">Koi homework nahi</div>' :
      hws.map(h=>`
        <div class="card" style="margin-bottom:10px;border-left:4px solid var(--blue)">
          <div style="display:flex;justify-content:space-between;align-items:start">
            <div>
              <b>Class ${h.class} — ${h.subject}</b>
              <div style="font-size:13px;color:#475569;margin-top:4px">${h.task}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:6px">
                Due: ${h.dueDate||'—'} • By: ${h.givenBy||'—'}
              </div>
            </div>
            <button class="icon-btn icon-btn-danger" onclick="deleteHw('${h.id}')">🗑️</button>
          </div>
        </div>`).join('')}
  </div>`;
}

window.openAddHomework = function() {
  openModal('Homework Add Karo', `
    <div class="form-group">
      <label class="form-label">Class *</label>
      <select class="form-input" id="hw-class">
        ${['1','2','3','4','5','6','7','8','9','10'].map(c=>`<option value="${c}" ${currentUser.class===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Subject *</label>
      <input class="form-input" id="hw-subject" placeholder="e.g. English, Maths..."/>
    </div>
    <div class="form-group">
      <label class="form-label">Homework *</label>
      <textarea class="form-input" id="hw-task" rows="3" placeholder="Homework ka description..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Due Date</label>
      <input type="date" class="form-input" id="hw-due" value="${todayStr()}"/>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="saveHomework()"><i class="fas fa-save"></i> Save</button>
    </div>`);
};

window.saveHomework = async function() {
  const data = {
    class:    $('hw-class').value,
    subject:  $('hw-subject').value.trim(),
    task:     $('hw-task').value.trim(),
    dueDate:  $('hw-due').value,
    givenBy:  currentUser.name,
    createdAt: serverTimestamp()
  };
  if (!data.subject || !data.task) { toast('Subject aur homework bharo!','error'); return; }
  await addDoc(collection(db,'homework'), data);
  toast('Homework save ho gaya! ✅','success');
  closeModal();
  await renderHomework();
};

window.deleteHw = async function(id) {
  if (!confirm('Delete karna chahte ho?')) return;
  await deleteDoc(doc(db,'homework',id));
  toast('Deleted','success');
  await renderHomework();
};

// ═══════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════
async function renderTests() {
  const main = $('main-content');
  const snap = await getDocs(query(collection(db,'tests'), orderBy('createdAt','desc')));
  const tests = snap.docs.map(d=>({id:d.id,...d.data()}));

  main.innerHTML = `
  <div class="card fade-in">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div class="section-title" style="margin:0">Tests & Marks</div>
      <button class="btn btn-primary" onclick="openAddTest()"><i class="fas fa-plus"></i> New Test</button>
    </div>
    ${!tests.length ? '<div class="empty-state">Koi test nahi</div>' :
      tests.map(t=>`
        <div class="card" style="margin-bottom:10px;border-left:4px solid var(--gold)">
          <div style="display:flex;justify-content:space-between;align-items:start">
            <div>
              <b>Class ${t.class} — ${t.subject}</b>
              <div style="font-size:13px;color:#475569;margin-top:2px">${t.name} | Max: ${t.maxMarks}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:4px">${t.date||'—'}</div>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn-outline" onclick="viewTestMarks('${t.id}')">📊 Marks</button>
              <button class="icon-btn icon-btn-danger" onclick="deleteTest('${t.id}')">🗑️</button>
            </div>
          </div>
        </div>`).join('')}
  </div>`;
}

window.openAddTest = function() {
  openModal('New Test', `
    <div class="form-group">
      <label class="form-label">Class *</label>
      <select class="form-input" id="t-class">
        ${['1','2','3','4','5','6','7','8','9','10'].map(c=>`<option value="${c}" ${currentUser.class===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Subject *</label>
      <input class="form-input" id="t-subject" placeholder="e.g. English"/>
    </div>
    <div class="form-group">
      <label class="form-label">Test Name *</label>
      <input class="form-input" id="t-name" placeholder="e.g. Unit Test 1"/>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Max Marks</label>
        <input type="number" class="form-input" id="t-max" value="100"/>
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="date" class="form-input" id="t-date" value="${todayStr()}"/>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="saveTest()"><i class="fas fa-save"></i> Create</button>
    </div>`);
};

window.saveTest = async function() {
  const data = {
    class:    $('t-class').value,
    subject:  $('t-subject').value.trim(),
    name:     $('t-name').value.trim(),
    maxMarks: $('t-max').value,
    date:     $('t-date').value,
    createdBy: currentUser.name,
    createdAt: serverTimestamp()
  };
  if (!data.subject||!data.name) { toast('Subject aur test naam bharo!','error'); return; }
  const ref = await addDoc(collection(db,'tests'), data);
  toast('Test create ho gaya! ✅','success');
  closeModal();
  await renderTests();
};

window.viewTestMarks = async function(testId) {
  const testDoc = await getDoc(doc(db,'tests',testId));
  const test = {id:testId,...testDoc.data()};
  const students = allStudents.filter(s=>s.class===test.class)
    .sort((a,b)=>(+a.roll||0)-(+b.roll||0)||a.name.localeCompare(b.name));

  // Load existing marks
  const marksSnap = await getDocs(query(collection(db,'testMarks'),where('testId','==',testId)));
  const existingMarks = {};
  marksSnap.forEach(d=>{ existingMarks[d.data().studentId]=d.data().marks; });

  openModal(`${test.name} — Class ${test.class} ${test.subject} (/${test.maxMarks})`,`
    <div style="max-height:50vh;overflow-y:auto">
    ${students.map(s=>`
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9">
        <div style="flex:1;font-size:13px;font-weight:600">${s.name}</div>
        <input type="number" class="form-input" style="width:80px" id="mk-${s.id}"
          value="${existingMarks[s.id]??''}" min="0" max="${test.maxMarks}" placeholder="—"/>
      </div>`).join('')}
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="saveTestMarks('${testId}')"><i class="fas fa-save"></i> Save Marks</button>
    </div>`);
};

window.saveTestMarks = async function(testId) {
  const testDoc = await getDoc(doc(db,'tests',testId));
  const test = testDoc.data();
  const students = allStudents.filter(s=>s.class===test.class);

  // Delete old marks
  const old = await getDocs(query(collection(db,'testMarks'),where('testId','==',testId)));
  for (const d of old.docs) await deleteDoc(d.ref);

  for (const s of students) {
    const val = document.getElementById('mk-'+s.id)?.value;
    if (val !== '' && val !== undefined) {
      await addDoc(collection(db,'testMarks'),{
        testId, studentId:s.id, studentName:s.name,
        class:test.class, subject:test.subject, marks:+val,
        savedAt: serverTimestamp()
      });
    }
  }
  toast('Marks save ho gaye! ✅','success');
  closeModal();
};

window.deleteTest = async function(id) {
  if (!confirm('Delete karna chahte ho?')) return;
  await deleteDoc(doc(db,'tests',id));
  toast('Deleted','success');
  await renderTests();
};

// ═══════════════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════════════
function openModal(title, bodyHtml) {
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = bodyHtml;
  $('modal-overlay').style.display='flex';
}

window.closeModal = function() {
  $('modal-overlay').style.display='none';
};

$('modal-close-btn')?.addEventListener('click', closeModal);
$('modal-overlay')?.addEventListener('click', e => { if(e.target===$('modal-overlay')) closeModal(); });

// ═══════════════════════════════════════════════════════════════
//  AUTH STATE — Main Entry Point
// ═══════════════════════════════════════════════════════════════
onAuthStateChanged(auth, async user => {
  if (user) {
    // Get staff profile from Firestore
    try {
      const staffDoc = await getDoc(doc(db,'staff',user.uid));
      if (staffDoc.exists()) {
        const d = staffDoc.data();
        currentUser = { uid:user.uid, name:d.name, role:d.role, class:d.class, username:d.username };
      } else {
        // Fallback: match by email
        const match = STAFF_MASTER.find(s => s.email===user.email);
        currentUser = match
          ? { uid:user.uid, name:match.name, role:match.role, class:match.class, username:match.username }
          : { uid:user.uid, name:'Staff', role:'Staff', class:null };
      }
    } catch(e) {
      const match = STAFF_MASTER.find(s=>s.email===user.email);
      currentUser = match
        ? { uid:user.uid, name:match.name, role:match.role, class:match.class, username:match.username }
        : { uid:user.uid, name:'Staff', role:'Staff', class:null };
    }

    showScreen('app-screen');
    buildShell();
    await renderPage(currentPage);

  } else {
    currentUser = null;
    showScreen('login-screen');
    initLogin();
  }
});
