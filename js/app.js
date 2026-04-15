// js/app.js

// --- ESTADO GLOBAL ---
let globalBudgets = [];
let mockJACs = [];
let mockDirectoryJACs = [];
let mockProjects = [];
let mockPayments = [];
let mockUsers = [];
let currentYear = new Date().getFullYear();

const API_URL = 'backend/api.php?endpoint=';

const fetchData = async (endpoint, method="GET", body=null) => {
    const opts = { method, headers: {'Content-Type': 'application/json'} };
    if (body) opts.body = JSON.stringify(body);
    try {
        const res = await fetch(API_URL + endpoint, opts);
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch(e) {
            console.error("Invalid JSON from server:", text);
            alert("Error en Servidor: " + text.substring(0,100));
            return { status: "error" };
        }
    } catch(e) {
        alert("Error de Conexión: " + e.message);
        return { status: "error" };
    }
};

const loadDataFromAPI = async () => {
    try {
        globalBudgets = await fetchData('global_budgets');
        mockJACs = await fetchData('jacs');
        mockDirectoryJACs = await fetchData('directory_jacs');
        mockProjects = await fetchData('projects');
        mockPayments = await fetchData('payments');
        mockUsers = await fetchData('users');
    } catch(e) { console.error("Error cargando DB:", e); }
};

// -----------------------------------------
// LÓGICA DE AUTENTICACIÓN
// -----------------------------------------
const checkAuth = async () => {
  const isLogged = sessionStorage.getItem('pp_logged_in') === 'true';
  const loginView = document.getElementById('login-view');
  const appContainer = document.getElementById('app-container');
  
  if (isLogged) {
    loginView.classList.add('hidden');
    appContainer.style.display = 'flex';
    await initApp();
  } else {
    loginView.classList.remove('hidden');
    appContainer.style.display = 'none';
  }
};

const handleLogin = async (e) => {
  e.preventDefault();
  const user = document.getElementById('login-user').value;
  const pass = document.getElementById('login-pass').value;
  
  const res = await fetchData('login', 'POST', {username: user, password: pass});
  
  if (res.status === 'success' && res.user) {
    sessionStorage.setItem('pp_logged_in', 'true');
    sessionStorage.setItem('pp_role', res.user.role || 'gestor');
    sessionStorage.setItem('pp_user_name', res.user.name);
    
    const appContainer = document.getElementById('app-container');
    const loginView = document.getElementById('login-view');
    
    appContainer.style.opacity = '0';
    appContainer.style.display = 'flex';
    
    setTimeout(async () => {
      appContainer.style.transition = 'opacity 0.6s ease';
      appContainer.style.opacity = '1';
      loginView.classList.add('hidden');
      await initApp();
    }, 100);
    
  } else {
    alert('Credenciales incorrectas.');
  }
};

const handleLogout = () => {
  sessionStorage.removeItem('pp_logged_in');
  sessionStorage.removeItem('pp_role');
  sessionStorage.removeItem('pp_user_name');
  
  document.getElementById('form-login').reset();
  
  const appContainer = document.getElementById('app-container');
  const loginView = document.getElementById('login-view');
  
  appContainer.style.opacity = '0';
  setTimeout(() => {
    appContainer.style.display = 'none';
    loginView.classList.remove('hidden');
  }, 400);
};

// -----------------------------------------
// UI GLOBALES (Responsive Sidebar)
// -----------------------------------------
const toggleSidebar = () => {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('.main-content');
  const overlay = document.getElementById('sidebar-overlay');
  
  sidebar.classList.toggle('collapsed');
  mainContent.classList.toggle('expanded');
  
  if (window.innerWidth <= 768) {
    if (sidebar.classList.contains('collapsed')) {
      overlay.classList.remove('active');
    } else {
      overlay.classList.add('active');
    }
  }
};

// Utilidad Formatear Moneda (Pesos Colombianos)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    maximumFractionDigits: 0 
  }).format(amount);
};

// Utilidad Calcular Porcentaje
const getPercentage = (part, total) => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

// Formateador de inputs monetarios
const formatInputNumber = (input) => {
    let value = input.value.replace(/\D/g, "");
    if (value === "") { input.value = ""; return; }
    input.value = new Intl.NumberFormat('es-CO').format(value);
};

const parseNumber = (str) => {
    if (typeof str !== 'string') return str || 0;
    return parseInt(str.replace(/\D/g, ""), 10) || 0;
};

// Renderizar Selector de Años
const renderYearSelector = () => {
  const container = document.getElementById('year-selector-container');
  container.innerHTML = '';
  
  globalBudgets.forEach(y => {
    const btn = document.createElement('button');
    btn.className = `year-btn ${y.year === currentYear ? 'active' : ''}`;
    btn.textContent = y.year;
    // Al hacer clic, cambia el año, re-renderiza botones y re-calcula tarjetas
    btn.onclick = () => {
      currentYear = y.year;
      renderYearSelector();
      renderDashboard();
      if(typeof renderProjects === 'function') renderProjects();
    };
    container.appendChild(btn);
  });
};

// getSuperavitForYear deprecado ya que ahora el superávit se controla manualmente.

// Renderizar Tablero Global (Tarjetas visuales)
const renderDashboard = () => {
  const statsContainer = document.getElementById('stats-container');
  const jacsContainer = document.getElementById('jacs-container');
  
  const yearData = globalBudgets.find(y => y.year === currentYear);
  if (!yearData) return;
  
  const jacsOfYear = mockJACs.filter(j => j.year === currentYear);
  
  const superavit = parseInt(yearData.superavit, 10) || 0;
  const totalBudget = yearData.initialBudget + (yearData.addition || 0) + superavit;
  
  const projectsOfYear = mockProjects.filter(p => p.year === currentYear);
  const totalAssignedToProjects = projectsOfYear.reduce((sum, p) => sum + (p.budget + (p.hasAddition ? p.addition : 0)), 0);
  
  const totalAvailable = totalBudget - totalAssignedToProjects;
  const totalPaid = jacsOfYear.reduce((sum, jac) => sum + jac.paid, 0);
  
  // Limpiar contenedores
  statsContainer.innerHTML = '';
  jacsContainer.innerHTML = '';
  
  // --- DIBUJAR TARJETAS GLOBALES ---
  statsContainer.innerHTML = `
    <div class="stat-card glass-panel">
      <div class="stat-title">Presupuesto Inicial</div>
      <div class="stat-value">${formatCurrency(yearData.initialBudget)}</div>
    </div>
    <div class="stat-card glass-panel">
      <div class="stat-title">Adiciones + Superávit</div>
      <div class="stat-value">${formatCurrency((yearData.addition || 0) + superavit)}</div>
    </div>
    <div class="stat-card glass-panel stat-success">
      <div class="stat-title">Presupuesto Total Anual</div>
      <div class="stat-value">${formatCurrency(totalBudget)}</div>
    </div>
    <div class="stat-card glass-panel">
      <div class="stat-title">Asignado a Proyectos</div>
      <div class="stat-value">${formatCurrency(totalAssignedToProjects)}</div>
    </div>
    <div class="stat-card glass-panel stat-warning">
      <div class="stat-title">Disponible (Fondo Libre)</div>
      <div class="stat-value">${formatCurrency(totalAvailable)}</div>
    </div>
    <div class="stat-card glass-panel stat-success">
      <div class="stat-title">Total Desembolsado</div>
      <div class="stat-value">${formatCurrency(totalPaid)}</div>
    </div>
  `;
  
  // --- DIBUJAR TARJETAS POR JAC ---
  if (jacsOfYear.length === 0) {
    jacsContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 3rem;">No hay presupuestos de JAC en este año.</p>`;
    if(window.lucide) lucide.createIcons();
    return;
  }
  
  jacsOfYear.forEach(jac => {
    const totalJac = jac.assigned + (jac.addition || 0);
    const progress = totalJac > 0 ? (jac.paid / totalJac) * 100 : 0;
    
    const card = document.createElement('div');
    card.className = 'glass-panel jac-card';
    card.innerHTML = `
      <div class="jac-header">
        <div class="jac-name-status">
          <span class="jac-name">${jac.name}</span>
          <span class="jac-status">${jac.projects} Proyecto(s)</span>
        </div>
        <div class="jac-actions">
          <button class="btn-icon" onclick="editJac(${jac.id})" title="Editar Asignación"><i data-lucide="edit-2" style="width:16px; height:16px"></i></button>
          <button class="btn-icon btn-icon-danger" onclick="deleteJac(${jac.id})" title="Eliminar JAC"><i data-lucide="trash-2" style="width:16px; height:16px"></i></button>
        </div>
      </div>
      <div class="jac-budgets">
        <div class="budget-item">
          <span class="budget-label">Asignado (Inc. Adiciones)</span>
          <span class="budget-amount">${formatCurrency(totalJac)}</span>
        </div>
        <div class="budget-item">
          <span class="budget-label">Pagado</span>
          <span class="budget-amount">${formatCurrency(jac.paid)}</span>
        </div>
      </div>
      <div class="progress-container">
        <div class="progress-bar" style="width: ${progress}%"></div>
      </div>
    `;
    jacsContainer.appendChild(card);
  });
  
  if(window.lucide) lucide.createIcons();
};

// -----------------------------------------
// NAVEGACIÓN Y VISTAS (SPA)
// -----------------------------------------
const switchView = (event, viewId) => {
  if (event) event.preventDefault();
  
  document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
  document.getElementById(viewId).classList.remove('hidden');
  
  if (event && event.currentTarget) {
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
  }

  if (viewId === 'view-comites') renderDirectory();
  else if (viewId === 'view-proyectos') { if(typeof renderProjects === 'function') renderProjects(); }
  else if (viewId === 'view-pagos') { if(typeof renderPayments === 'function') renderPayments(); }
  else if (viewId === 'view-config') { if(typeof renderConfig === 'function') renderConfig(); }
};

// -----------------------------------------
// LÓGICA DE MODALES
// -----------------------------------------
const openModal = (modalId) => {
  document.getElementById(modalId).classList.add('active');
};

const closeModal = (modalId) => {
  document.getElementById(modalId).classList.remove('active');
  
  if (modalId === 'modal-jac') {
    document.getElementById('jac-id').value = '';
    document.getElementById('form-jac').reset();
  } else if (modalId === 'modal-directory-jac') {
    document.getElementById('dir-jac-id').value = '';
    document.getElementById('form-directory-jac').reset();
  } else if (modalId === 'modal-project') {
    document.getElementById('proj-id').value = '';
    document.getElementById('form-project').reset();
  } else if (modalId === 'modal-payment') {
    document.getElementById('form-payment').reset();
  } else if (modalId === 'modal-year') {
    document.getElementById('form-year').reset();
    document.getElementById('cfg-year').readOnly = false;
  } else if (modalId === 'modal-user') {
    document.getElementById('form-user').reset();
    document.getElementById('user-id').value = '';
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => modal.classList.remove('active'));
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
});

// -----------------------------------------
// LÓGICA DE FORMULARIOS Y DATOS
// -----------------------------------------

const editJac = (id) => {
  const jac = mockJACs.find(j => j.id === id);
  if (!jac) return;
  
  document.getElementById('jac-id').value = jac.id;
  document.getElementById('jac-name').value = jac.name;
  document.getElementById('jac-budget').value = new Intl.NumberFormat('es-CO').format(jac.assigned);
  document.getElementById('jac-addition').value = new Intl.NumberFormat('es-CO').format(jac.addition || 0);
  document.getElementById('jac-projects').value = jac.projects;
  
  openModal('modal-jac');
};

const deleteJac = async (jacId) => {
  const jacIndex = mockJACs.findIndex(j => j.id === jacId);
  if (jacIndex === -1) return;
  
  if (confirm(`¿Eliminar asignación de "${mockJACs[jacIndex].name}"?`)) {
    await fetchData('jacs', 'DELETE', {id: jacId});
    await loadDataFromAPI();
    renderDashboard();
  }
};

const handleJacSubmit = async (e) => {
  e.preventDefault();
  
  const idValue = document.getElementById('jac-id').value;
  const nameInput = document.getElementById('jac-name').value;
  const budgetInput = parseNumber(document.getElementById('jac-budget').value);
  const additionInput = parseNumber(document.getElementById('jac-addition').value);
  const projectsInput = parseInt(document.getElementById('jac-projects').value, 10);
  
  await fetchData('jacs', 'POST', {
      id: idValue ? parseInt(idValue, 10) : null,
      name: nameInput,
      year: currentYear,
      assigned: budgetInput,
      addition: additionInput,
      projects: projectsInput
  });
  
  await loadDataFromAPI();
  
  // Limpiar, resetear estados y cerrar
  document.getElementById('jac-id').value = '';
  document.getElementById('modal-jac-title').textContent = 'Asignar Presupuesto a Junta (JAC)';
  document.getElementById('form-jac').reset();
  
  closeModal('modal-jac');
  renderDashboard();
};

// -----------------------------------------
// LÓGICA DIRECTORIO DE JACs
// -----------------------------------------
const renderDirectory = () => {
  const container = document.getElementById('directory-container');
  container.innerHTML = '';
  
  if (mockDirectoryJACs.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 3rem;">No hay JACs registradas en el directorio.</p>`;
    return;
  }
  
  mockDirectoryJACs.forEach(jac => {
    const card = document.createElement('div');
    card.className = 'jac-card glass-panel';
    card.innerHTML = `
      <div class="jac-header">
        <div class="jac-name-status">
          <h3 class="jac-name">${jac.name}</h3>
          <span class="jac-status" style="background-color:rgba(18, 59, 46, 0.1); color:var(--primary)">Zona ${jac.zone}</span>
        </div>
        <div class="jac-actions">
          <button class="btn-icon" onclick="editDirectoryJac(${jac.id})" title="Editar Info">
            <i data-lucide="pencil" style="width:16px; height:16px;"></i>
          </button>
          <button class="btn-icon btn-icon-danger" onclick="deleteDirectoryJac(${jac.id})" title="Eliminar del Directorio">
            <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
          </button>
        </div>
      </div>
      
      <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
        <div class="jac-info-line">
          <i data-lucide="user" style="width:16px; height:16px;"></i>
          <span><strong>Presidente:</strong> ${jac.president}</span>
        </div>
        <div class="jac-info-line">
          <i data-lucide="phone" style="width:16px; height:16px;"></i>
          <span><strong>Contacto:</strong> ${jac.phone}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  
  if(window.lucide) lucide.createIcons();
};

const editDirectoryJac = (id) => {
  const jac = mockDirectoryJACs.find(j => j.id === id);
  if (!jac) return;
  
  document.getElementById('dir-jac-id').value = jac.id;
  document.getElementById('dir-jac-name').value = jac.name;
  document.getElementById('dir-jac-zone').value = jac.zone;
  document.getElementById('dir-jac-president').value = jac.president;
  document.getElementById('dir-jac-phone').value = jac.phone;
  
  document.getElementById('modal-directory-title').textContent = 'Editar Información de JAC';
  openModal('modal-directory-jac');
};

const deleteDirectoryJac = async (id) => {
  const index = mockDirectoryJACs.findIndex(j => j.id === id);
  if (index === -1) return;
  
  if (confirm(`¿Estás seguro de que deseas eliminar "${mockDirectoryJACs[index].name}" del directorio general?`)) {
    await fetchData('directory_jacs', 'DELETE', {id});
    await loadDataFromAPI();
    renderDirectory();
  }
};

const handleDirectorySubmit = async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('dir-jac-id').value;
  const name = document.getElementById('dir-jac-name').value;
  const zone = document.getElementById('dir-jac-zone').value;
  const president = document.getElementById('dir-jac-president').value;
  const phone = document.getElementById('dir-jac-phone').value;
  
  await fetchData('directory_jacs', 'POST', {
      id: id ? parseInt(id, 10) : null,
      name, zone, president, phone
  });
  
  await loadDataFromAPI();
  
  document.getElementById('dir-jac-id').value = '';
  document.getElementById('modal-directory-title').textContent = 'Registrar Información de JAC';
  document.getElementById('form-directory-jac').reset();
  
  closeModal('modal-directory-jac');
  renderDirectory();
};

// -----------------------------------------
// LÓGICA DE PROYECTOS (KANBAN)
// -----------------------------------------

const renderProjects = () => {
  // Limpiar columnas
  document.querySelectorAll('.kanban-cards').forEach(el => el.innerHTML = '');
  document.getElementById('count-Planificación').textContent = '0';
  document.getElementById('count-En Ejecución').textContent = '0';
  document.getElementById('count-Finalizado').textContent = '0';
  
  const projectsOfYear = mockProjects.filter(p => p.year === currentYear);
  
  const counts = { "Planificación": 0, "En Ejecución": 0, "Finalizado": 0 };
  
  projectsOfYear.forEach(proj => {
    // Buscar el nombre de la JAC
    const jac = mockJACs.find(j => j.id == proj.jacId);
    const jacName = jac ? jac.name : 'JAC Desconocida';
    
    // Preparar tarjeta
    const statusClass = proj.status.replace(' ', '-');
    const card = document.createElement('div');
    card.className = `kanban-card status-${statusClass}`;
    card.onclick = () => editProject(proj.id);
    
    const totalProjBudget = proj.budget + (proj.hasAddition ? (proj.addition || 0) : 0);
    const additionSpan = (proj.hasAddition && proj.addition > 0) ? `<small style="color:var(--text-muted); font-size:0.75rem; display:block; margin-top:2px;">+ ${formatCurrency(proj.addition)} (Adic.)</small>` : '';

    card.innerHTML = `
      <div class="kanban-card-title">${proj.title}</div>
      <div class="kanban-card-jac"><i data-lucide="users" style="width:12px; height:12px"></i> ${jacName}</div>
      <div class="kanban-card-desc">${proj.description || ''}</div>
      <div class="kanban-card-footer" style="align-items: flex-start;">
        <div style="display:flex; flex-direction:column;">
          <span style="font-weight:600; color:var(--text-main)">${formatCurrency(totalProjBudget)}</span>
          ${additionSpan}
        </div>
        <i data-lucide="edit-3" style="width:14px; height:14px; margin-top:2px; color:var(--text-muted)"></i>
      </div>
    `;
    
    // Insertar en la columna correcta
    const colId = `col-${proj.status}`;
    const columnInfo = document.getElementById(colId);
    if (columnInfo) {
      columnInfo.querySelector('.kanban-cards').appendChild(card);
      counts[proj.status]++;
    }
  });
  
  // Actualizar conteos
  document.getElementById('count-Planificación').textContent = counts["Planificación"];
  document.getElementById('count-En Ejecución').textContent = counts["En Ejecución"];
  document.getElementById('count-Finalizado').textContent = counts["Finalizado"];
  
  if(window.lucide) lucide.createIcons();
};

const populateProjectYears = () => {
  const select = document.getElementById('proj-year');
  select.innerHTML = '';
  globalBudgets.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.year;
    opt.textContent = b.year;
    select.appendChild(opt);
  });
  select.value = currentYear;
};

const populateJacSelect = () => {
  const select = document.getElementById('proj-jac');
  const selectedYear = parseInt(document.getElementById('proj-year').value, 10) || currentYear;
  select.innerHTML = '<option value="">-- Seleccionar JAC Ejecutora --</option>';
  
  // Filtrar JACS por el año seleccionado
  const jacsOfYear = mockJACs.filter(j => j.year === selectedYear);
  jacsOfYear.forEach(jac => {
    const opt = document.createElement('option');
    opt.value = jac.id;
    opt.textContent = jac.name;
    select.appendChild(opt);
  });
};

const openModalProject = () => {
  populateProjectYears();
  populateJacSelect();
  document.getElementById('proj-has-addition').value = 'no';
  document.getElementById('proj-addition-group').style.display = 'none';
  document.getElementById('proj-addition').value = '0';
  document.getElementById('modal-project-title').textContent = 'Registrar Nuevo Proyecto';
  document.getElementById('btn-delete-proj').style.display = 'none';
  openModal('modal-project');
};

const editProject = (id) => {
  const proj = mockProjects.find(p => p.id === id);
  if (!proj) return;
  
  populateProjectYears();
  document.getElementById('proj-year').value = proj.year;
  
  populateJacSelect();
  
  document.getElementById('proj-id').value = proj.id;
  document.getElementById('proj-jac').value = proj.jacId;
  document.getElementById('proj-title').value = proj.title;
  document.getElementById('proj-status').value = proj.status;
  document.getElementById('proj-budget').value = new Intl.NumberFormat('es-CO').format(proj.budget);
  document.getElementById('proj-has-addition').value = proj.hasAddition ? 'si' : 'no';
  document.getElementById('proj-addition-group').style.display = proj.hasAddition ? 'block' : 'none';
  document.getElementById('proj-addition').value = new Intl.NumberFormat('es-CO').format(proj.addition || 0);
  document.getElementById('proj-desc').value = proj.description;
  
  document.getElementById('tab-btn-docs').style.display = 'block';
  document.getElementById('tab-btn-photos').style.display = 'block';
  document.getElementById('tab-btn-notes').style.display = 'block';
  switchProjectTab('ptab-general');
  renderProjectAssets(proj);
  
  document.getElementById('modal-project-title').textContent = 'Editar Proyecto';
  document.getElementById('btn-delete-proj').style.display = 'inline-flex';
  
  openModal('modal-project');
};

const deleteProject = async () => {
  const idValue = document.getElementById('proj-id').value;
  if (!idValue) return;
  
  const id = parseInt(idValue, 10);
  const index = mockProjects.findIndex(p => p.id === id);
  if (index === -1) return;
  
  if (confirm(`¿Estás seguro de que deseas eliminar el proyecto "${mockProjects[index].title}"?`)) {
    await fetchData('projects', 'DELETE', {id});
    await loadDataFromAPI();
    closeModal('modal-project');
    renderProjects();
  }
};

const handleProjectSubmit = async (e) => {
  e.preventDefault();
  
  const idValue = document.getElementById('proj-id').value;
  const id = idValue ? parseInt(idValue, 10) : null;
  const year = parseInt(document.getElementById('proj-year').value, 10);
  const jacId = parseInt(document.getElementById('proj-jac').value, 10);
  const title = document.getElementById('proj-title').value;
  const status = document.getElementById('proj-status').value;
  const budget = parseNumber(document.getElementById('proj-budget').value);
  const hasAddition = document.getElementById('proj-has-addition').value === 'si';
  const addition = hasAddition ? parseNumber(document.getElementById('proj-addition').value) : 0;
  const description = document.getElementById('proj-desc').value;
  
  // Si estamos editando, mantenemos los assets, si no, arrays vacíos
  const existing = mockProjects.find(p => p.id === id);
  const docs = existing ? existing.documents : [];
  const photos = existing ? existing.photos : [];
  const notes = existing ? existing.notes : [];
  
  await fetchData('projects', 'POST', {
      id, year, jacId, title, status, budget, hasAddition, addition, description,
      documents: docs, photos: photos, notes: notes
  });
  
  await loadDataFromAPI();
  closeModal('modal-project');
  renderProjects();
};

// -----------------------------------------
// PESTAÑAS Y EVIDENCIAS DEL PROYECTO
// -----------------------------------------
window.switchProjectTab = (tabId) => {
  document.querySelectorAll('#modal-project .tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#modal-project .tab-btn').forEach(el => el.classList.remove('active'));
  
  document.getElementById(tabId).classList.add('active');
  const btnId = tabId.replace('ptab', 'tab-btn');
  const btn = document.getElementById(btnId);
  if(btn) btn.classList.add('active');
};

const handleMockDocUpload = async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const projId = parseInt(document.getElementById('proj-id').value, 10);
  const proj = mockProjects.find(p => p.id === projId);
  if(proj) {
    if(!proj.documents) proj.documents = [];
    proj.documents.push({
       name: file.name,
       date: new Date().toISOString().split('T')[0]
    });
    // Update API immediately for documents
    await fetchData('projects', 'POST', proj);
    await loadDataFromAPI(); 
    renderProjectAssets(mockProjects.find(p => p.id === projId));
  }
};

const handleMockPhotoUpload = async (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const projId = parseInt(document.getElementById('proj-id').value, 10);
  const proj = mockProjects.find(p => p.id === projId);
  if(proj) {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      if(!proj.photos) proj.photos = [];
      proj.photos.push(evt.target.result);
      await fetchData('projects', 'POST', proj);
      await loadDataFromAPI();
      renderProjectAssets(mockProjects.find(p => p.id === projId));
    };
    reader.readAsDataURL(file);
  }
};

const handleMockNoteAdd = async () => {
  const input = document.getElementById('proj-note-input');
  const txt = input.value.trim();
  if(!txt) return;
  
  const projId = parseInt(document.getElementById('proj-id').value, 10);
  const proj = mockProjects.find(p => p.id === projId);
  if(proj) {
    if(!proj.notes) proj.notes = [];
    const role = sessionStorage.getItem('pp_role') || 'Gestor';
    const author = sessionStorage.getItem('pp_user_name') || role;
    proj.notes.push({
       author,
       text: txt,
       date: new Date().toISOString().split('T')[0]
    });
    input.value = '';
    await fetchData('projects', 'POST', proj);
    await loadDataFromAPI();
    renderProjectAssets(mockProjects.find(p => p.id === projId));
  }
};

const renderProjectAssets = (proj) => {
  const listDocs = document.getElementById('proj-docs-list');
  listDocs.innerHTML = '';
  if(proj.documents && proj.documents.length) {
     proj.documents.forEach(d => {
       listDocs.innerHTML += `
         <div class="doc-item">
            <i data-lucide="file-text" style="color:var(--danger)"></i>
            <div style="flex:1">
               <strong style="display:block">${d.name}</strong>
               <small style="color:var(--text-muted)">Añadido: ${d.date}</small>
            </div>
         </div>
       `;
     });
  } else {
     listDocs.innerHTML = '<p style="color:var(--text-muted); text-align:center">No hay documentos anexos.</p>';
  }
  
  const listPhotos = document.getElementById('proj-photos-list');
  listPhotos.innerHTML = '';
  if(proj.photos && proj.photos.length) {
     proj.photos.forEach(b64 => {
       listPhotos.innerHTML += `<img src="${b64}" class="photo-img">`;
     });
  } else {
     listPhotos.innerHTML = '<p style="color:var(--text-muted); text-align:center; grid-column: 1/-1;">Sin registro fotográfico.</p>';
  }
  
  const listNotes = document.getElementById('proj-notes-list');
  listNotes.innerHTML = '';
  if(proj.notes && proj.notes.length) {
     proj.notes.forEach(n => {
       listNotes.innerHTML += `
         <div class="timeline-item">
            <div class="timeline-date">${n.date} - ${n.author}</div>
            <div style="font-size:0.9rem">${n.text}</div>
         </div>
       `;
     });
  } else {
     listNotes.innerHTML = '<p style="color:var(--text-muted); text-align:center">Auditoría y Bitácora vacía.</p>';
  }
  if(window.lucide) lucide.createIcons();
};


// -----------------------------------------
// LÓGICA FINANCIERA (Avances & Pagos)
// -----------------------------------------
const renderPayments = () => {
  const tableJacs = document.getElementById('table-pagos-jacs');
  const tableHistory = document.getElementById('table-pagos-history');
  
  if (!tableJacs || !tableHistory) return;
  tableJacs.innerHTML = '';
  tableHistory.innerHTML = '';
  
  const jacsOfYear = mockJACs.filter(j => j.year === currentYear);
  
  // Render JACs Table
  jacsOfYear.forEach(jac => {
    const totalAssigned = jac.assigned + (jac.addition || 0);
    const saldo = totalAssigned - jac.paid;
    const progress = totalAssigned > 0 ? Math.round((jac.paid / totalAssigned) * 100) : 0;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${jac.name}</strong></td>
      <td>${formatCurrency(totalAssigned)}</td>
      <td style="color:var(--secondary); font-weight:600;">${formatCurrency(jac.paid)}</td>
      <td style="color:var(--danger)">${formatCurrency(saldo)}</td>
      <td><span class="badge" style="background:var(--primary); color:white;">${progress}%</span></td>
    `;
    tableJacs.appendChild(tr);
  });
  
  // Render History Table
  const historyOfYear = mockPayments.filter(p => p.year === currentYear).sort((a,b) => new Date(b.date) - new Date(a.date));
  historyOfYear.forEach(pay => {
    const jac = mockJACs.find(j => j.id == pay.jacId);
    const jacName = jac ? jac.name : 'Desconocida';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${pay.date}</td>
      <td><i data-lucide="users" style="width:14px; height:14px; display:inline-block; vertical-align:middle;"></i> ${jacName}</td>
      <td>${pay.description}</td>
      <td style="color:var(--primary); font-weight:600;">${formatCurrency(pay.amount)}</td>
    `;
    tableHistory.appendChild(tr);
  });
  
  if(window.lucide) lucide.createIcons();
};

const openModalPayment = () => {
  const select = document.getElementById('pay-jac');
  select.innerHTML = '<option value="">-- Seleccione una Junta --</option>';
  
  const jacsOfYear = mockJACs.filter(j => j.year === currentYear);
  jacsOfYear.forEach(jac => {
    const opt = document.createElement('option');
    opt.value = jac.id;
    opt.textContent = jac.name;
    select.appendChild(opt);
  });
  
  openModal('modal-payment');
};

const handlePaymentSubmit = async (e) => {
  e.preventDefault();
  
  const jacId = parseInt(document.getElementById('pay-jac').value, 10);
  const amount = parseNumber(document.getElementById('pay-amount').value);
  const dateStr = document.getElementById('pay-date').value;
  const desc = document.getElementById('pay-desc').value;
  
  await fetchData('payments', 'POST', {
    jacId: jacId,
    amount: amount,
    date: dateStr,
    description: desc,
    year: currentYear
  });
  
  await loadDataFromAPI();
  
  closeModal('modal-payment');
  renderPayments();
  renderDashboard(); 
};

// -----------------------------------------
// LÓGICA DE CONFIGURACIÓN GLOBAL
// -----------------------------------------
const renderConfig = () => {
  const table = document.getElementById('table-config-years');
  if (!table) return;
  table.innerHTML = '';
  
  const sortedBudgets = [...globalBudgets].sort((a,b) => b.year - a.year);
  
  sortedBudgets.forEach(b => {
    const superavit = parseInt(b.superavit, 10) || 0;
    const total = b.initialBudget + (b.addition || 0) + superavit;
    
    // Calcular en uso real (Basado en proyectos)
    const projectsOfYear = mockProjects.filter(p => p.year === b.year);
    const assignedToProjects = projectsOfYear.reduce((sum, p) => sum + (p.budget + (p.hasAddition ? p.addition : 0)), 0);
    const remaining = total - assignedToProjects;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="font-size:1.1rem; color:var(--primary)">${b.year}</strong></td>
      <td>${formatCurrency(b.initialBudget)}</td>
      <td>${formatCurrency((b.addition || 0) + superavit)}</td>
      <td style="color:var(--secondary); font-weight:600;">${formatCurrency(total)}</td>
      <td style="color:var(--danger)">${formatCurrency(assignedToProjects)}</td>
      <td style="color:var(--success); font-weight:700;">${formatCurrency(remaining)}</td>
      <td>
        <button class="btn-icon" onclick="openModalYear(${b.year})" title="Ajustar Presupuesto Anual">
          <i data-lucide="settings-2" style="width:18px; height:18px"></i>
        </button>
      </td>
    `;
    table.appendChild(tr);
  });
  
  if(window.lucide) lucide.createIcons();
};

const openModalYear = (year) => {
  if (year) {
    const b = globalBudgets.find(y => y.year === year);
    if (!b) return;
    document.getElementById('modal-year-title').textContent = `Editar Presupuesto Base ${year}`;
    document.getElementById('cfg-year').value = b.year;
    document.getElementById('cfg-year').readOnly = true;
    document.getElementById('cfg-initial').value = new Intl.NumberFormat('es-CO').format(b.initialBudget);
    document.getElementById('cfg-addition').value = new Intl.NumberFormat('es-CO').format(b.addition || 0);
    document.getElementById('cfg-superavit').value = new Intl.NumberFormat('es-CO').format(b.superavit || 0);
  } else {
    document.getElementById('modal-year-title').textContent = 'Inaugurar Año Presupuestal';
    document.getElementById('cfg-year').readOnly = false;
    document.getElementById('cfg-superavit').value = 0;
  }
  openModal('modal-year');
};

const handleYearSubmit = async (e) => {
  e.preventDefault();
  const yearInput = parseInt(document.getElementById('cfg-year').value, 10);
  const initialInput = parseNumber(document.getElementById('cfg-initial').value);
  const additionInput = parseNumber(document.getElementById('cfg-addition').value);
  const superavitInput = parseNumber(document.getElementById('cfg-superavit').value);
  
  await fetchData('global_budgets', 'POST', {
      year: yearInput,
      initialBudget: initialInput,
      addition: additionInput,
      superavit: superavitInput
  });
  
  await loadDataFromAPI();
  closeModal('modal-year');
  
  // Reconstruir visuales clave
  renderYearSelector();
  renderConfig();
  renderDashboard();
};

// -----------------------------------------
// LÓGICA DE USUARIOS Y SEGURIDAD (CRUD)
// -----------------------------------------
const renderConfigUsers = () => {
  const table = document.getElementById('table-config-users');
  if (!table) return;
  table.innerHTML = '';
  
  mockUsers.forEach(u => {
    const roleBadge = u.role === 'admin' 
        ? `<span style="background:var(--primary); color:white; padding:4px 8px; border-radius:12px; font-size:0.75rem;"><i data-lucide="shield-check" style="width:12px; height:12px; display:inline; margin-bottom:-2px"></i> Admin</span>` 
        : `<span style="background:#475569; color:white; padding:4px 8px; border-radius:12px; font-size:0.75rem;"><i data-lucide="user" style="width:12px; height:12px; display:inline; margin-bottom:-2px"></i> Gestor</span>`;
        
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.name}</strong></td>
      <td><span style="font-family:monospace; color:var(--text-muted)">@${u.username}</span></td>
      <td>${roleBadge}</td>
      <td>
        <button class="btn-icon" onclick="openModalUser(${u.id})" title="Editar Perfil">
          <i data-lucide="edit-3" style="width:16px; height:16px;"></i>
        </button>
      </td>
    `;
    table.appendChild(tr);
  });
  if(window.lucide) lucide.createIcons();
};

const openModalUser = (id) => {
  if (id) {
    const u = mockUsers.find(k => k.id === id);
    if (!u) return;
    document.getElementById('modal-user-title').textContent = 'Editar Funcionario';
    document.getElementById('user-id').value = u.id;
    document.getElementById('user-name').value = u.name;
    document.getElementById('user-username').value = u.username;
    document.getElementById('user-pass').value = u.password;
    document.getElementById('user-role').value = u.role || 'gestor';
  } else {
    document.getElementById('modal-user-title').textContent = 'Registrar Funcionario';
    document.getElementById('user-id').value = '';
    document.getElementById('form-user').reset();
    document.getElementById('user-role').value = 'gestor';
  }
  openModal('modal-user');
};

const handleUserSubmit = async (e) => {
  e.preventDefault();
  const idStr = document.getElementById('user-id').value;
  const name = document.getElementById('user-name').value;
  const username = document.getElementById('user-username').value;
  const password = document.getElementById('user-pass').value;
  const role = document.getElementById('user-role').value;
  
  await fetchData('users', 'POST', {
      id: idStr ? parseInt(idStr, 10) : null,
      name, username, password, role
  });
  
  await loadDataFromAPI();
  
  closeModal('modal-user');
  renderConfigUsers();
};

const applyPermissions = () => {
    const activeRole = sessionStorage.getItem('pp_role');
    const menuConfig = document.getElementById('menu-config');
    const dividerConfig = document.getElementById('divider-config');
    
    // Si NO es admin, no puede entrar a la caja de seguridad.
    if (activeRole !== 'admin') {
        if(menuConfig) menuConfig.style.display = 'none';
        if(dividerConfig) dividerConfig.style.display = 'none';
        
        const currentViewId = document.querySelector('.view-section:not(.hidden)')?.id;
        if(currentViewId === 'view-config') {
             switchView({preventDefault:()=>null}, 'view-dashboard');
        }
    } else {
        if(menuConfig) menuConfig.style.display = 'block';
        if(dividerConfig) dividerConfig.style.display = 'block';
    }
};

// Inicialización
const initApp = async () => {
  applyPermissions();
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.add('collapsed');
    document.querySelector('.main-content').classList.add('expanded');
  }
  
  // Cargar datos reales
  await loadDataFromAPI();
  
  renderYearSelector();
  renderDashboard();
  renderConfigUsers();
};

document.addEventListener('DOMContentLoaded', async () => {
  // Verificamos auth sin cargar datos (o carga silenciosa) 
  await checkAuth();
});
