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
  const btn = e.target.querySelector('button[type="submit"]');
  const orgText = btn.textContent;
  
  const user = document.getElementById('login-user').value;
  const pass = document.getElementById('login-pass').value;
  
  if (!user || !pass) return;

  btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Iniciando...';
  btn.disabled = true;
  if(window.lucide) lucide.createIcons();

  try {
      const res = await fetchData('login', 'POST', {username: user, password: pass});
      
      if (res.status === 'success' && res.user) {
        sessionStorage.setItem('pp_logged_in', 'true');
        sessionStorage.setItem('pp_role', res.user.role || 'gestor');
        sessionStorage.setItem('pp_user_name', res.user.name);
        
        const appContainer = document.getElementById('app-container');
        const loginView = document.getElementById('login-view');
        
        appContainer.style.opacity = '0';
        appContainer.style.display = 'flex';
        
        await initApp();
        
        appContainer.style.transition = 'opacity 0.6s ease';
        appContainer.style.opacity = '1';
        loginView.classList.add('hidden');
        
      } else {
        alert(res.message || 'Credenciales incorrectas o error de conexión.');
      }
  } catch (error) {
      alert("Error crítico durante el inicio de sesión: " + error.message);
  } finally {
      btn.innerHTML = orgText;
      btn.disabled = false;
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  }).format(amount);
};

// Utilidad Calcular Porcentaje
const getPercentage = (part, total) => {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
};

// Formateador de inputs monetarios
const formatInputNumber = (input) => {
    let val = input.value.replace(/[^\d,]/g, "");
    if (val === "") { input.value = ""; return; }
    let parts = val.split(",");
    if (parts.length > 2) {
        val = parts[0] + "," + parts.slice(1).join("");
        parts = val.split(",");
    }
    let intPart = parts[0];
    if (intPart !== "") {
        intPart = new Intl.NumberFormat('es-CO').format(parseInt(intPart, 10));
    }
    if (parts.length > 1) {
        let decPart = parts[1].substring(0, 2);
        input.value = intPart + "," + decPart;
    } else {
        input.value = intPart;
    }
};

const parseNumber = (str) => {
    if (typeof str !== 'string' && typeof str !== 'number') return 0;
    if (typeof str === 'number') return str;
    let clean = str.replace(/\./g, "").replace(",", ".");
    clean = clean.replace(/[^\d.-]/g, "");
    return parseFloat(clean) || 0;
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
  
  const superavit = parseFloat(yearData.superavit) || 0;
  const totalBudget = (parseFloat(yearData.initialBudget) || 0) + (parseFloat(yearData.addition) || 0) + superavit;
  
  const projectsOfYear = mockProjects.filter(p => p.year === currentYear);
  const totalAssignedToProjects = projectsOfYear.reduce((sum, p) => sum + ((parseFloat(p.budget) || 0) + (p.hasAddition ? (parseFloat(p.addition) || 0) : 0)), 0);
  
  const totalAvailable = totalBudget - totalAssignedToProjects;
  const totalPaid = jacsOfYear.reduce((sum, jac) => sum + (parseFloat(jac.paid) || 0), 0);
  
  // Limpiar contenedores
  statsContainer.innerHTML = '';
  jacsContainer.innerHTML = '';
  
  // --- DIBUJAR TARJETAS GLOBALES ---
  statsContainer.innerHTML = `
    <div class="stat-card glass-panel">
      <div class="stat-title">Presupuesto Inicial</div>
      <div class="stat-value">${formatCurrency(parseFloat(yearData.initialBudget) || 0)}</div>
    </div>
    <div class="stat-card glass-panel">
      <div class="stat-title">Adiciones + Superávit</div>
      <div class="stat-value">${formatCurrency((parseFloat(yearData.addition) || 0) + superavit)}</div>
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
    const totalJac = (parseFloat(jac.assigned) || 0) + (parseFloat(jac.addition) || 0);
    const progress = totalJac > 0 ? ((parseFloat(jac.paid) || 0) / totalJac) * 100 : 0;
    
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
          <span class="budget-amount">${formatCurrency(parseFloat(jac.paid) || 0)}</span>
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
  document.getElementById('jac-budget').value = new Intl.NumberFormat('es-CO').format(parseFloat(jac.assigned) || 0);
  document.getElementById('jac-addition').value = new Intl.NumberFormat('es-CO').format(parseFloat(jac.addition) || 0);
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
const handleExcelBulkUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const btn = document.querySelector('button[onclick*="excel-upload"]');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Cargando...';
      btn.disabled = true;
      if(window.lucide) lucide.createIcons();
      
      let imported = 0;
      const dataRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); 
      let headIndexes = { name: -1, president: -1, phone: -1 };

      for (const row of dataRows) {
          if (!row || row.length === 0) continue;
          
          let textJoined = row.join(" ").toLowerCase();
          
          // Detectar la fila de títulos/encabezados de columnas (debe tener más de 1 columna para saltarse títulos combinados)
          if (headIndexes.name === -1 && row.length >= 2 && (textJoined.includes("jac") || textJoined.includes("nombre") || textJoined.includes("presidente") || textJoined.includes("contacto"))) {
              for (let j = 0; j < row.length; j++) {
                  let cellStr = String(row[j] || "").toLowerCase();
                  if (cellStr.includes("jac") || cellStr.includes("junta") || cellStr.includes("nombre")) headIndexes.name = j;
                  else if (cellStr.includes("presidente") || cellStr.includes("lider")) headIndexes.president = j;
                  else if (cellStr.includes("contacto") || cellStr.includes("tel") || cellStr.includes("cel")) headIndexes.phone = j;
              }
              continue; // Saltamos la línea porque son los encabezados
          }
          
          // Fallback para tablas sin encabezado obvio
          if (headIndexes.name === -1) {
              if (String(row[0] || "").toLowerCase().includes("junta") && row.length > 1) {
                  headIndexes = { name: 0, president: 1, phone: 2 };
              } else {
                  continue; // Probablemente es un Título global, saltamos
              }
          }
          
          let name = headIndexes.name !== -1 && row[headIndexes.name] ? String(row[headIndexes.name]).trim() : "";
          let president = headIndexes.president !== -1 && row[headIndexes.president] ? String(row[headIndexes.president]).trim() : "No Especificado";
          let phone = headIndexes.phone !== -1 && row[headIndexes.phone] ? String(row[headIndexes.phone]).trim() : "No Especificado";
          
          if (!name || name.toLowerCase() === "jac") continue;
          
          let zone = name.toLowerCase().includes('vereda') ? 'Rural' : 'Urbana';
          
          await fetchData('directory_jacs', 'POST', {
              id: null,
              name: name,
              zone: zone, 
              president: president,
              phone: phone
          });
          imported++;
      }
      
      await loadDataFromAPI();
      renderDirectory();
      alert(`Carga masiva completada: ${imported} JACs importadas exitosamente.`);
      
    } catch(err) {
      console.error(err);
      alert("Error procesando el archivo Excel. Asegúrate de que no esté dañado.");
    } finally {
        e.target.value = ''; 
        const btn = document.querySelector('button[onclick*="excel-upload"]');
        if (btn) {
            btn.innerHTML = '<i data-lucide="file-spreadsheet"></i> Carga Masiva';
            btn.disabled = false;
        }
        if(window.lucide) lucide.createIcons();
    }
  };
  reader.readAsArrayBuffer(file);
};

const deleteAllDirectoryJACs = async () => {
  if (mockDirectoryJACs.length === 0) {
      alert("El directorio ya está vacío.");
      return;
  }
  const pass = prompt("Estás a punto de ELIMINAR TODO EL DIRECTORIO DE JACs.\n\nEscribe 'BORRAR' en mayúsculas para confirmar esta acción:");
  if (pass === 'BORRAR') {
      try {
          await fetchData('directory_jacs', 'DELETE', { deleteAll: true });
          await loadDataFromAPI();
          renderDirectory();
          alert("El directorio de JACs ha sido vaciado exitosamente.");
      } catch (err) {
          console.error(err);
          alert("Ocurrió un error al intentar vaciar el directorio.");
      }
  } else if(pass !== null) {
      alert("Operación cancelada. El texto no coincidía.");
  }
};

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
      <div style="display:flex; flex-direction:column; justify-content:space-between; height:100%;">
        <div style="margin-bottom:1rem;">
          <span class="jac-status" style="background-color: ${jac.zone === 'Rural' ? 'rgba(201, 218, 44, 0.2)' : 'rgba(22, 65, 51, 0.1)'}; color: ${jac.zone === 'Rural' ? 'var(--primary)' : 'var(--primary)'}; margin-bottom:0.75rem; display:inline-flex; align-items:center; gap:4px; font-size:0.75rem;">
            <i data-lucide="${jac.zone === 'Rural' ? 'tree-pine' : 'building-2'}" style="width:14px; height:14px;"></i>
            Zona ${jac.zone}
          </span>
          <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-main); line-height:1.3;">${jac.name}</h3>
        </div>
        
        <div style="background-color: #F9FAFB; padding: 1rem; border-radius: 8px; margin-bottom: 1.25rem; border: 1px solid #E5E7EB; flex-grow:1;">
          <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1rem;">
             <i data-lucide="user" style="width:20px; height:20px; color:var(--primary);"></i>
             <div>
               <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Presidente / Líder</div>
               <div style="font-size:0.95rem; font-weight:600; color:var(--text-main);">${jac.president}</div>
             </div>
          </div>
          
          <div style="display:flex; align-items:center; gap:0.75rem;">
             <i data-lucide="phone" style="width:20px; height:20px; color:var(--primary);"></i>
             <div>
               <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:600; letter-spacing:0.5px;">Teléfono de Contacto</div>
               <div style="font-size:0.95rem; font-weight:600; color:var(--text-main);">${jac.phone}</div>
             </div>
          </div>
        </div>
        
        <div style="display:flex; gap:0.5rem; margin-top:auto;">
          <button class="btn btn-secondary" onclick="editDirectoryJac(${jac.id})" style="flex:1; padding:0.5rem; font-size:0.85rem; justify-content:center;">
            <i data-lucide="edit" style="width:16px; height:16px;"></i> Editar
          </button>
          <button class="btn" onclick="deleteDirectoryJac(${jac.id})" style="flex:1; padding:0.5rem; font-size:0.85rem; color:var(--danger); border:1px solid #FECACA; background:#FEF2F2; justify-content:center;">
            <i data-lucide="trash-2" style="width:16px; height:16px;"></i> Borrar
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  
  if(window.lucide) lucide.createIcons();
};

const editDirectoryJac = (id) => {
  const jac = mockDirectoryJACs.find(j => String(j.id) === String(id));
  if (!jac) {
      alert("No se encontró la información de esta JAC para editar.");
      return;
  }
  
  document.getElementById('dir-jac-id').value = jac.id;
  document.getElementById('dir-jac-name').value = jac.name;
  document.getElementById('dir-jac-zone').value = jac.zone;
  document.getElementById('dir-jac-president').value = jac.president || '';
  document.getElementById('dir-jac-phone').value = jac.phone || '';
  
  document.getElementById('modal-directory-title').textContent = 'Editar Información de JAC';
  openModal('modal-directory-jac');
};

const deleteDirectoryJac = async (id) => {
  const index = mockDirectoryJACs.findIndex(j => String(j.id) === String(id));
  if (index === -1) {
      alert("No se encontró la JAC.");
      return;
  }
  
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
    
    const totalProjBudget = (parseFloat(proj.budget) || 0) + (proj.hasAddition ? (parseFloat(proj.addition) || 0) : 0);
    const additionSpan = (proj.hasAddition && parseFloat(proj.addition) > 0) ? `<small style="color:var(--text-muted); font-size:0.75rem; display:block; margin-top:2px;">+ ${formatCurrency(parseFloat(proj.addition))} (Adic.)</small>` : '';

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
  document.getElementById('proj-id').value = '';
  document.getElementById('form-project').reset();
  
  // Ocultar pestañas de evidencia al crear un proyecto nuevo para evitar uploads sin ID
  document.getElementById('tab-btn-docs').style.display = 'none';
  document.getElementById('tab-btn-photos').style.display = 'none';
  document.getElementById('tab-btn-notes').style.display = 'none';
  switchProjectTab('ptab-general');

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
  document.getElementById('proj-budget').value = new Intl.NumberFormat('es-CO').format(parseFloat(proj.budget) || 0);
  document.getElementById('proj-has-addition').value = proj.hasAddition ? 'si' : 'no';
  document.getElementById('proj-addition-group').style.display = proj.hasAddition ? 'block' : 'none';
  document.getElementById('proj-addition').value = new Intl.NumberFormat('es-CO').format(parseFloat(proj.addition) || 0);
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
  
  if (file.size > 2 * 1024 * 1024) {
      alert(`El archivo "${file.name}" supera el límite de 2MB permitidos. (Peso actual: ${(file.size / 1024 / 1024).toFixed(2)}MB). Por favor comprímelo de nuevo.`);
      e.target.value = '';
      return;
  }
  
  const projId = parseInt(document.getElementById('proj-id').value, 10);
  const proj = mockProjects.find(p => p.id === projId);
  if(proj) {
    if(!proj.documents) proj.documents = [];
    if(proj.documents.length >= 5) {
        alert("Límite máximo de 5 documentos alcanzado. Debes eliminar un documento existente antes de subir uno nuevo.");
        e.target.value = '';
        return;
    }
    
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
  
  if (file.size > 2 * 1024 * 1024) {
      alert(`La imagen supera los 2MB permitidos. (Peso actual: ${(file.size / 1024 / 1024).toFixed(2)}MB). Por favor usar un reductor de imágenes antes de subirla.`);
      e.target.value = '';
      return;
  }
  
  const stage = document.getElementById('proj-photo-stage').value; // antes, durante, despues
  const projId = parseInt(document.getElementById('proj-id').value, 10);
  const proj = mockProjects.find(p => p.id === projId);
  if(proj) {
    if(!proj.photos) proj.photos = { antes: [], durante: [], despues: [] };
    if(Array.isArray(proj.photos)) proj.photos = { antes: proj.photos, durante: [], despues: [] }; // Migración legado
    
    if(proj.photos[stage].length >= 5) {
        alert(`Límite máximo de 5 fotografías para la etapa "${stage.toUpperCase()}" alcanzado.`);
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      proj.photos[stage].push(evt.target.result);
      await fetchData('projects', 'POST', proj);
      await loadDataFromAPI();
      renderProjectAssets(mockProjects.find(p => p.id === projId));
      document.getElementById('proj-photo-upload').value = '';
    };
    reader.readAsDataURL(file);
  }
};

window.deleteMockDocument = async (projId, docIndex) => {
    const proj = mockProjects.find(p => p.id === projId);
    if (!proj || !proj.documents) return;
    
    if (confirm('¿Desea eliminar de forma permanente este documento?')) {
        proj.documents.splice(docIndex, 1);
        await fetchData('projects', 'POST', proj);
        await loadDataFromAPI();
        renderProjectAssets(mockProjects.find(p => p.id === projId));
    }
};

window.deleteMockPhoto = async (projId, category, photoIndex) => {
    const proj = mockProjects.find(p => p.id === projId);
    if (!proj || !proj.photos || !proj.photos[category]) return;
    
    if (confirm('¿Desea descartar esta fotografía del registro?')) {
        proj.photos[category].splice(photoIndex, 1);
        await fetchData('projects', 'POST', proj);
        await loadDataFromAPI();
        renderProjectAssets(mockProjects.find(p => p.id === projId));
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
     proj.documents.forEach((d, idx) => {
       listDocs.innerHTML += `
         <div class="doc-item" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
               <i data-lucide="file-text" style="color:var(--danger)"></i>
               <div>
                  <strong style="display:block; font-size:0.9rem;">${d.name}</strong>
                  <small style="color:var(--text-muted)">Subido: ${d.date}</small>
               </div>
            </div>
            <button type="button" class="btn-icon btn-icon-danger" onclick="deleteMockDocument(${proj.id}, ${idx})"><i data-lucide="trash-2" style="width:16px;"></i></button>
         </div>
       `;
     });
  } else {
     listDocs.innerHTML = '<p style="color:var(--text-muted); text-align:center; font-size:0.85rem; padding:1rem;">No hay documentos registrados actualmente.</p>';
  }
  
  // Soporte legado para migracion de arrays planos a objeto agrupado
  let pObj = proj.photos || { antes: [], durante: [], despues: [] };
  if(Array.isArray(pObj)) {
     pObj = { antes: pObj, durante: [], despues: [] };
  }
  
  const renderPhotoCategory = (categoryName, domId) => {
     const list = document.getElementById(domId);
     if(!list) return;
     list.innerHTML = '';
     if(pObj[categoryName] && pObj[categoryName].length > 0) {
        pObj[categoryName].forEach((b64, idx) => {
          list.innerHTML += `
            <div style="position:relative; width:100%; pt-1;">
              <img src="${b64}" style="width:100%; height:80px; object-fit:cover; border-radius:4px; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <button type="button" onclick="deleteMockPhoto(${proj.id}, '${categoryName}', ${idx})" style="position:absolute; top:-5px; right:-5px; background:white; border-radius:50%; border:1px solid #fee2e2; color:var(--danger); padding:2px; cursor:pointer;"><i data-lucide="x" style="width:14px; height:14px;"></i></button>
            </div>`;
        });
     } else {
        list.innerHTML = `<p style="grid-column:1/-1; font-size:0.8rem; color:#9CA3AF; text-align:center;">Sin evidencias de ${categoryName}</p>`;
     }
  };
  
  renderPhotoCategory('antes', 'proj-photos-antes');
  renderPhotoCategory('durante', 'proj-photos-durante');
  renderPhotoCategory('despues', 'proj-photos-despues');
  
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
    const superavit = parseFloat(b.superavit) || 0;
    const total = (parseFloat(b.initialBudget) || 0) + (parseFloat(b.addition) || 0) + superavit;
    
    // Calcular en uso real (Basado en proyectos)
    const projectsOfYear = mockProjects.filter(p => p.year === b.year);
    const assignedToProjects = projectsOfYear.reduce((sum, p) => sum + ((parseFloat(p.budget) || 0) + (p.hasAddition ? (parseFloat(p.addition) || 0) : 0)), 0);
    const remaining = total - assignedToProjects;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong style="font-size:1.1rem; color:var(--primary)">${b.year}</strong></td>
      <td>${formatCurrency(parseFloat(b.initialBudget) || 0)}</td>
      <td>${formatCurrency((parseFloat(b.addition) || 0) + superavit)}</td>
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
    document.getElementById('cfg-initial').value = new Intl.NumberFormat('es-CO').format(parseFloat(b.initialBudget) || 0);
    document.getElementById('cfg-addition').value = new Intl.NumberFormat('es-CO').format(parseFloat(b.addition) || 0);
    document.getElementById('cfg-superavit').value = new Intl.NumberFormat('es-CO').format(parseFloat(b.superavit) || 0);
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
