/**
 * app.js
 * Lógica principal del Sistema Contable Saint.
 * Maneja ruteo, renderizado dinámico de vistas, eventos del DOM, gráficos y exportaciones.
 */

// Instancia de base de datos global (del script database.js)
const db = window.SaintDB;

// Estado global de la aplicación
const AppState = {
  currentView: 'dashboard',
  user: null,
  charts: {},
  settings: null,
  activeEntryLines: []
};

// Inicialización de la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  db.init();
  AppState.settings = db.getSettings();
  
  // Registrar eventos globales
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-button').addEventListener('click', handleLogout);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // Configurar envío del formulario de cuentas y asientos
  document.getElementById('account-form').addEventListener('submit', handleSaveAccount);
  document.getElementById('entry-form').addEventListener('submit', handleSaveEntry);

  // Inicializar menú lateral
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      navigateTo(view);
    });
  });

  // Verificar sesión existente
  const savedSession = db.getCurrentUser();
  if (savedSession) {
    loginSuccess(savedSession);
  } else {
    showLoginScreen();
  }

  // Cargar tema inicial
  const savedTheme = localStorage.getItem('saint_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);
});

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'danger') icon = 'x-circle';
  if (type === 'warning') icon = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Control de Sesión
function handleLogin(e) {
  e.preventDefault();
  const userIn = document.getElementById('username').value.trim();
  const passIn = document.getElementById('password').value.trim();

  const res = db.login(userIn, passIn);
  if (res.success) {
    loginSuccess(res.user);
    showToast('Bienvenido al Sistema Contable Saint', 'success');
  } else {
    showToast(res.message, 'danger');
  }
}

function loginSuccess(user) {
  AppState.user = user;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-layout').style.display = 'flex';
  
  // Actualizar metadatos de usuario en sidebar
  document.getElementById('user-display-name').innerText = user.name;
  document.getElementById('user-display-role').innerText = user.role;
  document.getElementById('avatar-initials').innerText = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  // Actualizar información corporativa
  updateCompanyHeader();
  
  // Ir a dashboard
  navigateTo('dashboard');
}

function handleLogout() {
  db.logout();
  AppState.user = null;
  showLoginScreen();
  showToast('Sesión cerrada correctamente', 'info');
}

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('main-layout').style.display = 'none';
}

function updateCompanyHeader() {
  AppState.settings = db.getSettings();
  document.getElementById('top-company-name').innerText = AppState.settings.companyName;
  document.getElementById('top-company-rif').innerText = `RIF: ${AppState.settings.fiscalRif}`;
  document.getElementById('top-fiscal-year').innerText = AppState.settings.fiscalYear;
}

// Tema Claro/Oscuro
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('saint_theme', next);
  updateThemeUI(next);
  
  // Re-dibujar gráficos si es necesario adaptarlos a colores del tema
  if (AppState.currentView === 'dashboard') {
    renderDashboardCharts();
  }
}

function updateThemeUI(theme) {
  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  if (theme === 'dark') {
    icon.setAttribute('data-lucide', 'sun');
    text.innerText = 'Modo Claro';
  } else {
    icon.setAttribute('data-lucide', 'moon');
    text.innerText = 'Modo Oscuro';
  }
  lucide.createIcons();
}

// Enrutamiento / Navegación
function navigateTo(view) {
  AppState.currentView = view;
  
  // Actualizar menú activo
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    if (item.getAttribute('data-view') === view) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Renderizar la vista correspondiente
  renderView(view);
}

function renderView(view) {
  const container = document.getElementById('views-content');
  
  // Limpiar gráficos anteriores
  Object.values(AppState.charts).forEach(chart => {
    if (chart && typeof chart.destroy === 'function') chart.destroy();
  });
  AppState.charts = {};

  switch (view) {
    case 'dashboard':
      renderDashboardView(container);
      break;
    case 'plan-cuentas':
      renderPlanCuentasView(container);
      break;
    case 'asientos':
      renderAsientosView(container);
      break;
    case 'libro-diario':
      renderLibroDiarioView(container);
      break;
    case 'mayor-analitico':
      renderMayorAnaliticoView(container);
      break;
    case 'balance-general':
      renderBalanceGeneralView(container);
      break;
    case 'estado-resultados':
      renderEstadoResultadosView(container);
      break;
    case 'auditoria':
      renderAuditoriaView(container);
      break;
    case 'configuracion':
      renderConfiguracionView(container);
      break;
    default:
      container.innerHTML = `<h2>Vista no encontrada</h2>`;
  }
  
  // Re-procesar iconos
  lucide.createIcons();
}

// --- VISTAS ESPECÍFICAS ---

// 1. DASHBOARD
function renderDashboardView(container) {
  // Calcular indicadores financieros básicos
  const indicators = calculateDashboardMetrics();

  container.innerHTML = `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Resumen Financiero</h1>
          <p>Visión general de las cuentas e indicadores clave del ejercicio fiscal.</p>
        </div>
      </div>

      <!-- Grid de Indicadores -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card-header">
            <span>Activos</span>
            <div class="kpi-icon primary"><i data-lucide="wallet"></i></div>
          </div>
          <div class="kpi-value">${formatCurrency(indicators.assets)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-header">
            <span>Pasivos</span>
            <div class="kpi-icon danger"><i data-lucide="credit-card"></i></div>
          </div>
          <div class="kpi-value">${formatCurrency(indicators.liabilities)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-header">
            <span>Patrimonio</span>
            <div class="kpi-icon warning"><i data-lucide="award"></i></div>
          </div>
          <div class="kpi-value">${formatCurrency(indicators.equity)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card-header">
            <span>Utilidad del Ejercicio</span>
            <div class="kpi-icon success"><i data-lucide="trending-up"></i></div>
          </div>
          <div class="kpi-value">${formatCurrency(indicators.profit)}</div>
        </div>
      </div>

      <!-- Gráficos -->
      <div class="charts-container">
        <div class="card">
          <div class="card-title">Estructura Financiera (Activo vs Pasivo + Patrimonio)</div>
          <div style="position: relative; height: 260px; display: flex; justify-content: center;">
            <canvas id="chart-structure"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Ingresos vs Gastos</div>
          <div style="position: relative; height: 260px; display: flex; justify-content: center;">
            <canvas id="chart-income-expenses"></canvas>
          </div>
        </div>
      </div>

      <!-- Recientes del Libro Diario & Auditoría -->
      <div class="content-grid-2x1">
        <div class="card">
          <div class="card-title">
            <span>Últimos Asientos Confirmados</span>
            <button class="btn btn-sec" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="navigateTo('asientos')">Ver todos</button>
          </div>
          <div class="table-responsive">
            <table class="table-data">
              <thead>
                <tr>
                  <th>N° Asiento</th>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th style="text-align: right;">Total Asiento</th>
                </tr>
              </thead>
              <tbody id="dashboard-recent-entries">
                <!-- Se llena con JS -->
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Últimas Acciones en Bitácora</div>
          <div class="table-responsive">
            <table class="table-data" style="font-size: 0.8rem;">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody id="dashboard-recent-audit">
                <!-- Se llena con JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Renderizar tablas del Dashboard
  const recentEntries = db.getEntries().filter(e => e.state !== 'Anulado').slice(-5).reverse();
  const recentTbody = document.getElementById('dashboard-recent-entries');
  if (recentEntries.length === 0) {
    recentTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No hay asientos registrados</td></tr>`;
  } else {
    recentEntries.forEach(entry => {
      // Sumar debe de las líneas
      const total = entry.lines.reduce((acc, l) => acc + parseFloat(l.debit || 0), 0);
      recentTbody.innerHTML += `
        <tr>
          <td><b>#${entry.number}</b></td>
          <td>${entry.date}</td>
          <td>${entry.description.substring(0, 50)}${entry.description.length > 50 ? '...' : ''}</td>
          <td style="text-align: right; font-weight:600;">${formatCurrency(total)}</td>
        </tr>
      `;
    });
  }

  const logs = db.getAuditLogs().slice(0, 5);
  const auditTbody = document.getElementById('dashboard-recent-audit');
  logs.forEach(l => {
    const d = new Date(l.timestamp);
    auditTbody.innerHTML += `
      <tr>
        <td><b>${l.username}</b></td>
        <td>${l.action}</td>
        <td>${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
      </tr>
    `;
  });

  renderDashboardCharts(indicators);
}

function calculateDashboardMetrics() {
  const balances = calculateAccountBalances();
  
  // Sumarizados por tipo
  let assets = 0;
  let liabilities = 0;
  let equity = 0;
  let revenue = 0;
  let expenses = 0;

  Object.entries(balances).forEach(([code, balance]) => {
    // Solo sumar cuentas de detalle de nivel superior en la jerarquía (raíces: 1, 2, 3, 4, 5)
    if (code.startsWith('1.')) assets += balance;
    else if (code.startsWith('2.')) liabilities += balance;
    else if (code.startsWith('3.')) equity += balance;
    else if (code.startsWith('4.')) revenue += balance;
    else if (code.startsWith('5.')) expenses += balance;
  });

  // Ajustar patrimonio con resultado del ejercicio
  const profit = revenue - expenses;

  return {
    assets,
    liabilities,
    equity,
    profit,
    revenue,
    expenses
  };
}

function renderDashboardCharts(indicators) {
  if (!indicators) indicators = calculateDashboardMetrics();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  // 1. Chart Estructura (Doughnut)
  const ctxStructure = document.getElementById('chart-structure').getContext('2d');
  AppState.charts.structure = new Chart(ctxStructure, {
    type: 'doughnut',
    data: {
      labels: ['Activos', 'Pasivos', 'Patrimonio'],
      datasets: [{
        data: [indicators.assets, indicators.liabilities, indicators.equity + indicators.profit],
        backgroundColor: [
          '#2563eb', // primary blue
          '#dc2626', // danger red
          '#ca8a04'  // warning yellow
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textColor, font: { family: 'Outfit', size: 12 } }
        }
      }
    }
  });

  // 2. Chart Ingresos vs Gastos (Bar)
  const ctxIncExp = document.getElementById('chart-income-expenses').getContext('2d');
  AppState.charts.incomeExpenses = new Chart(ctxIncExp, {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Gastos'],
      datasets: [{
        label: 'Monto ($)',
        data: [indicators.revenue, indicators.expenses],
        backgroundColor: ['#16a34a', '#ef4444'],
        borderRadius: 6,
        barThickness: 45
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: textColor, font: { family: 'Outfit' } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Outfit' } }
        }
      }
    }
  });
}

// 2. PLAN DE CUENTAS
function renderPlanCuentasView(container) {
  container.innerHTML = `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Catálogo de Cuentas Contables</h1>
          <p>Define la estructura contable de la empresa para registrar transacciones.</p>
        </div>
        <button class="btn btn-primary-action" onclick="openAccountModal(false)">
          <i data-lucide="plus"></i> Nueva Cuenta
        </button>
      </div>

      <div class="filters-bar">
        <div class="form-group" style="margin-bottom:0; flex-grow: 1;">
          <label for="acc-search">Buscar cuenta contable</label>
          <input type="text" id="acc-search" class="filter-input" placeholder="Buscar por código o nombre..." style="width: 100%;">
        </div>
        <button class="btn btn-sec" onclick="exportAccountsExcel()"><i data-lucide="file-spreadsheet"></i> Exportar</button>
      </div>

      <div class="card" style="padding:0;">
        <div class="table-responsive">
          <table class="table-data" id="table-accounts">
            <thead>
              <tr>
                <th style="width: 20%;">Código</th>
                <th style="width: 45%;">Nombre de Cuenta</th>
                <th style="width: 12%;">Tipo</th>
                <th style="width: 10%;">Naturaleza</th>
                <th style="width: 5%;">Estado</th>
                <th style="width: 8%; text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody id="accounts-tbody">
              <!-- Cargado con JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Listener para buscar
  document.getElementById('acc-search').addEventListener('input', (e) => {
    loadAccountsTable(e.target.value);
  });

  loadAccountsTable();
}

function loadAccountsTable(filterVal = '') {
  const accounts = db.getAccounts();
  const tbody = document.getElementById('accounts-tbody');
  tbody.innerHTML = '';

  const filter = filterVal.toLowerCase();
  
  accounts.forEach(acc => {
    if (filter && !acc.code.includes(filter) && !acc.name.toLowerCase().includes(filter)) {
      return;
    }

    // Calcular sangría por profundidad
    const depth = acc.code.split('.').length;
    let rowClass = 'acc-row-summary';
    if (!acc.summary) {
      rowClass = `acc-row-detail acc-row-l${Math.min(depth, 4)}`;
    } else {
      rowClass = `acc-row-summary acc-row-l${Math.min(depth, 4)}`;
    }

    const stateBadge = acc.active 
      ? `<span class="badge badge-success">Activa</span>` 
      : `<span class="badge badge-danger">Inactiva</span>`;

    const styleName = acc.summary ? 'font-weight: 700;' : '';

    tbody.innerHTML += `
      <tr class="${rowClass}">
        <td><code>${acc.code}</code></td>
        <td style="${styleName} padding-left: ${depth * 10}px;">
          ${acc.summary ? '<i data-lucide="folder" style="width:14px; height:14px; display:inline; vertical-align:middle; margin-right:4px; color:var(--primary-color);"></i>' : '<i data-lucide="file-text" style="width:14px; height:14px; display:inline; vertical-align:middle; margin-right:4px; color:var(--text-muted);"></i>'}
          ${acc.name}
        </td>
        <td>${acc.type}</td>
        <td><small>${acc.nature}</small></td>
        <td>${stateBadge}</td>
        <td style="text-align: center;">
          <div style="display:flex; justify-content:center; gap: 0.35rem;">
            <button class="btn btn-sec" style="padding: 0.25rem 0.4rem;" onclick="openAccountModal(true, '${acc.code}')" title="Editar"><i data-lucide="edit-3" style="width:12px; height:12px;"></i></button>
            <button class="btn btn-danger" style="padding: 0.25rem 0.4rem;" onclick="handleDeleteAccount('${acc.code}')" title="Eliminar"><i data-lucide="trash-2" style="width:12px; height:12px;"></i></button>
          </div>
        </td>
      </tr>
    `;
  });

  lucide.createIcons();
}

function openAccountModal(editMode = false, code = '') {
  const modal = document.getElementById('account-modal');
  const title = document.getElementById('account-modal-title');
  const form = document.getElementById('account-form');
  
  form.reset();
  document.getElementById('acc-code').disabled = false;

  if (editMode) {
    title.innerText = 'Editar Cuenta Contable';
    document.getElementById('acc-edit-mode').value = '1';
    
    // Rellenar valores
    const accounts = db.getAccounts();
    const acc = accounts.find(a => a.code === code);
    if (acc) {
      document.getElementById('acc-code').value = acc.code;
      document.getElementById('acc-code').disabled = true; // No permitir cambiar código primario
      document.getElementById('acc-name').value = acc.name;
      document.getElementById('acc-type').value = acc.type;
      document.getElementById('acc-nature').value = acc.nature;
      document.getElementById('acc-summary').checked = acc.summary;
      document.getElementById('acc-active').checked = acc.active;
    }
  } else {
    title.innerText = 'Nueva Cuenta Contable';
    document.getElementById('acc-edit-mode').value = '0';
    document.getElementById('acc-active').checked = true;
  }

  modal.classList.add('open');
  lucide.createIcons();
}

function closeAccountModal() {
  document.getElementById('account-modal').classList.remove('open');
}

function handleSaveAccount(e) {
  e.preventDefault();
  const editMode = document.getElementById('acc-edit-mode').value === '1';
  
  const code = document.getElementById('acc-code').value.trim();
  const name = document.getElementById('acc-name').value.trim();
  const type = document.getElementById('acc-type').value;
  const nature = document.getElementById('acc-nature').value;
  const summary = document.getElementById('acc-summary').checked;
  const active = document.getElementById('acc-active').checked;

  // Calcular padre a partir del código contable (ej: 1.1.01 -> padre es 1.1)
  const segments = code.split('.');
  let parent = null;
  if (segments.length > 1) {
    parent = segments.slice(0, -1).join('.');
  }

  const account = { code, name, type, nature, parent, active, summary };

  try {
    db.saveAccount(account);
    showToast(editMode ? 'Cuenta modificada con éxito' : 'Cuenta registrada con éxito', 'success');
    closeAccountModal();
    loadAccountsTable();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function handleDeleteAccount(code) {
  if (confirm(`¿Está seguro de que desea eliminar la cuenta contable ${code}?`)) {
    try {
      db.deleteAccount(code);
      showToast('Cuenta eliminada con éxito', 'success');
      loadAccountsTable();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }
}

function exportAccountsExcel() {
  const accounts = db.getAccounts();
  const formatted = accounts.map(a => ({
    'Código': a.code,
    'Nombre Cuenta': a.name,
    'Clasificación': a.type,
    'Naturaleza': a.nature,
    'Tipo': a.summary ? 'Acumuladora' : 'Detalle',
    'Estado': a.active ? 'Activo' : 'Inactivo'
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(formatted);
  XLSX.utils.book_append_sheet(wb, ws, 'Plan de Cuentas');
  XLSX.writeFile(wb, `Plan_Cuentas_${AppState.settings.companyName.replace(/ /g, '_')}.xlsx`);
  showToast('Excel del Plan de Cuentas descargado', 'success');
}

// 3. ASIENTOS CONTABLES
function renderAsientosView(container) {
  container.innerHTML = `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Asientos Contables</h1>
          <p>Registros diarios de partida doble del período contable actual.</p>
        </div>
        <button class="btn btn-primary-action" onclick="openEntryModal(false)">
          <i data-lucide="plus"></i> Nuevo Asiento
        </button>
      </div>

      <div class="filters-bar">
        <div class="form-group" style="margin-bottom:0; width: 150px;">
          <label for="entry-filter-start">Fecha Inicio</label>
          <input type="date" id="entry-filter-start" class="filter-input" style="width:100%;">
        </div>
        <div class="form-group" style="margin-bottom:0; width: 150px;">
          <label for="entry-filter-end">Fecha Fin</label>
          <input type="date" id="entry-filter-end" class="filter-input" style="width:100%;">
        </div>
        <div class="form-group" style="margin-bottom:0; flex-grow: 1;">
          <label for="entry-filter-search">Concepto / Referencia</label>
          <input type="text" id="entry-filter-search" class="filter-input" placeholder="Buscar en la descripción del asiento..." style="width:100%;">
        </div>
        <button class="btn btn-sec" onclick="loadEntriesTable()"><i data-lucide="search"></i> Filtrar</button>
      </div>

      <div class="card" style="padding:0;">
        <div class="table-responsive">
          <table class="table-data">
            <thead>
              <tr>
                <th style="width: 10%;">Número</th>
                <th style="width: 12%;">Fecha</th>
                <th style="width: 43%;">Concepto</th>
                <th style="width: 12%; text-align: right;">Total Débitos</th>
                <th style="width: 10%;">Estado</th>
                <th style="width: 13%; text-align: center;">Acciones</th>
              </tr>
            </thead>
            <tbody id="entries-tbody">
              <!-- Cargado con JS -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Inicializar filtros de fecha con el mes actual
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  document.getElementById('entry-filter-start').value = new Date(y, m, 1).toISOString().substring(0, 10);
  document.getElementById('entry-filter-end').value = new Date(y, m + 1, 0).toISOString().substring(0, 10);

  loadEntriesTable();
}

function loadEntriesTable() {
  const entries = db.getEntries();
  const start = document.getElementById('entry-filter-start').value;
  const end = document.getElementById('entry-filter-end').value;
  const search = document.getElementById('entry-filter-search').value.toLowerCase();
  
  const tbody = document.getElementById('entries-tbody');
  tbody.innerHTML = '';

  // Filtrar
  const filtered = entries.filter(e => {
    if (start && e.date < start) return false;
    if (end && e.date > end) return false;
    if (search && !e.description.toLowerCase().includes(search) && !e.number.includes(search)) return false;
    return true;
  }).reverse(); // Ordenar del más nuevo al más viejo para visualización

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No se encontraron asientos contables en este rango.</td></tr>`;
    return;
  }

  filtered.forEach(e => {
    const total = e.lines.reduce((acc, l) => acc + parseFloat(l.debit || 0), 0);
    
    let stateBadge = '';
    if (e.state === 'Confirmado') stateBadge = `<span class="badge badge-success">Confirmado</span>`;
    else if (e.state === 'Borrador') stateBadge = `<span class="badge badge-warning">Borrador</span>`;
    else stateBadge = `<span class="badge badge-danger">Anulado</span>`;

    const canAnular = e.state !== 'Anulado';

    tbody.innerHTML += `
      <tr>
        <td><b>#${e.number}</b></td>
        <td>${e.date}</td>
        <td>${e.description}</td>
        <td style="text-align: right; font-weight:600;">${formatCurrency(total)}</td>
        <td>${stateBadge}</td>
        <td style="text-align: center;">
          <div style="display:flex; justify-content:center; gap: 0.35rem;">
            <button class="btn btn-sec" style="padding: 0.25rem 0.4rem;" onclick="openEntryModal(true, ${e.id})" title="Editar"><i data-lucide="edit-3" style="width:12px; height:12px;"></i></button>
            ${canAnular ? `<button class="btn btn-danger" style="padding: 0.25rem 0.4rem;" onclick="handleAnularEntry(${e.id})" title="Anular"><i data-lucide="slash" style="width:12px; height:12px;"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `;
  });

  lucide.createIcons();
}

function openEntryModal(editMode = false, id = null) {
  const modal = document.getElementById('entry-modal');
  const title = document.getElementById('entry-modal-title');
  const form = document.getElementById('entry-form');
  
  form.reset();
  document.getElementById('entry-id').value = '';
  document.getElementById('entry-lines-tbody').innerHTML = '';
  AppState.activeEntryLines = [];

  const today = new Date().toISOString().substring(0, 10);
  document.getElementById('entry-date').value = today;

  if (editMode && id) {
    title.innerText = 'Editar Asiento de Diario';
    const entries = db.getEntries();
    const entry = entries.find(e => e.id === id);
    if (entry) {
      document.getElementById('entry-id').value = entry.id;
      document.getElementById('entry-date').value = entry.date;
      document.getElementById('entry-description').value = entry.description;
      
      entry.lines.forEach(line => {
        addEntryLineRow(line.accountCode, line.debit, line.credit);
      });
    }
  } else {
    title.innerText = 'Nuevo Asiento de Diario';
    // Inicializar con dos filas en blanco para partida doble
    addEntryLineRow();
    addEntryLineRow();
  }

  calculateEntryBalances();
  modal.classList.add('open');
  lucide.createIcons();
}

function closeEntryModal() {
  document.getElementById('entry-modal').classList.remove('open');
}

function addEntryLineRow(accountCode = '', debit = 0, credit = 0) {
  const tbody = document.getElementById('entry-lines-tbody');
  const accounts = db.getAccounts().filter(a => !a.summary && a.active); // Solo cuentas detalle y activas

  const rowId = Date.now() + Math.random().toString(36).substr(2, 9);
  
  // Construir opciones
  let options = `<option value="">-- Seleccione una cuenta --</option>`;
  accounts.forEach(a => {
    options += `<option value="${a.code}" ${a.code === accountCode ? 'selected' : ''}>${a.code} - ${a.name}</option>`;
  });

  const tr = document.createElement('tr');
  tr.id = `row-${rowId}`;
  tr.innerHTML = `
    <td>
      <select class="entry-line-account" required onchange="calculateEntryBalances()">
        ${options}
      </select>
    </td>
    <td>
      <input type="number" step="0.01" min="0" class="entry-line-debit" value="${debit || ''}" placeholder="0.00" style="text-align: right;" oninput="handleDebitInput('${rowId}')">
    </td>
    <td>
      <input type="number" step="0.01" min="0" class="entry-line-credit" value="${credit || ''}" placeholder="0.00" style="text-align: right;" oninput="handleCreditInput('${rowId}')">
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn btn-danger" style="padding: 0.25rem 0.4rem;" onclick="removeEntryLineRow('${rowId}')">
        <i data-lucide="trash-2" style="width:12px; height:12px;"></i>
      </button>
    </td>
  `;
  
  tbody.appendChild(tr);
  lucide.createIcons();
  calculateEntryBalances();
}

// Limpiar el otro campo al ingresar valor (partida contable estándar en la misma línea)
function handleDebitInput(rowId) {
  const row = document.getElementById(`row-${rowId}`);
  const debitInput = row.querySelector('.entry-line-debit');
  const creditInput = row.querySelector('.entry-line-credit');
  if (parseFloat(debitInput.value) > 0) {
    creditInput.value = '';
  }
  calculateEntryBalances();
}

function handleCreditInput(rowId) {
  const row = document.getElementById(`row-${rowId}`);
  const debitInput = row.querySelector('.entry-line-debit');
  const creditInput = row.querySelector('.entry-line-credit');
  if (parseFloat(creditInput.value) > 0) {
    debitInput.value = '';
  }
  calculateEntryBalances();
}

function removeEntryLineRow(rowId) {
  const row = document.getElementById(`row-${rowId}`);
  if (row) {
    row.remove();
    calculateEntryBalances();
  }
}

function calculateEntryBalances() {
  const debits = document.querySelectorAll('.entry-line-debit');
  const credits = document.querySelectorAll('.entry-line-credit');

  let totalDebit = 0;
  let totalCredit = 0;

  debits.forEach(el => totalDebit += parseFloat(el.value || 0));
  credits.forEach(el => totalCredit += parseFloat(el.value || 0));

  document.getElementById('entry-total-debit').innerText = totalDebit.toFixed(2);
  document.getElementById('entry-total-credit').innerText = totalCredit.toFixed(2);

  const diff = Math.abs(totalDebit - totalCredit);
  const warning = document.getElementById('entry-balance-warning');

  if (diff > 0.01) {
    warning.style.display = 'block';
    document.getElementById('entry-balance-diff').innerText = diff.toFixed(2);
    document.getElementById('btn-save-entry-submit').disabled = true;
    document.getElementById('btn-save-entry-submit').style.opacity = '0.5';
  } else {
    warning.style.display = 'none';
    document.getElementById('btn-save-entry-submit').disabled = false;
    document.getElementById('btn-save-entry-submit').style.opacity = '1';
  }
}

function handleSaveEntry(e) {
  e.preventDefault();
  
  const idVal = document.getElementById('entry-id').value;
  const date = document.getElementById('entry-date').value;
  const description = document.getElementById('entry-description').value.trim();

  // Construir las líneas
  const rows = document.querySelectorAll('#entry-lines-tbody tr');
  const lines = [];

  let invalid = false;
  rows.forEach(row => {
    const accountCode = row.querySelector('.entry-line-account').value;
    const debit = parseFloat(row.querySelector('.entry-line-debit').value || 0);
    const credit = parseFloat(row.querySelector('.entry-line-credit').value || 0);

    if (!accountCode) {
      invalid = true;
      return;
    }

    if (debit > 0 || credit > 0) {
      lines.push({ accountCode, debit, credit });
    }
  });

  if (invalid) {
    showToast('Debe seleccionar una cuenta contable para todas las líneas.', 'warning');
    return;
  }

  const entry = {
    date,
    description,
    lines
  };

  if (idVal) {
    entry.id = parseInt(idVal);
  }

  try {
    db.saveEntry(entry);
    showToast('Asiento contable registrado con éxito', 'success');
    closeEntryModal();
    loadEntriesTable();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function handleAnularEntry(id) {
  if (confirm('¿Está seguro de que desea ANULAR este asiento contable? Se mantendrá el registro pero sus saldos no afectarán al libro mayor.')) {
    db.anularEntry(id);
    showToast('Asiento anulado con éxito', 'success');
    loadEntriesTable();
  }
}

// 4. LIBRO DIARIO
function renderLibroDiarioView(container) {
  container.innerHTML = `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Libro Diario General</h1>
          <p>Consulte todos los registros contables cronológicamente detallados por cuenta.</p>
        </div>
      </div>

      <div class="filters-bar">
        <div class="form-group" style="margin-bottom:0; width: 180px;">
          <label for="diario-filter-start">Fecha Desde</label>
          <input type="date" id="diario-filter-start" class="filter-input" style="width:100%;">
        </div>
        <div class="form-group" style="margin-bottom:0; width: 180px;">
          <label for="diario-filter-end">Fecha Hasta</label>
          <input type="date" id="diario-filter-end" class="filter-input" style="width:100%;">
        </div>
        <button class="btn btn-primary-action" onclick="loadLibroDiario()"><i data-lucide="refresh-cw"></i> Cargar Reporte</button>
        <button class="btn btn-sec" onclick="exportLibroDiarioExcel()"><i data-lucide="file-spreadsheet"></i> Excel</button>
        <button class="btn btn-sec" onclick="exportLibroDiarioPDF()"><i data-lucide="file-text"></i> PDF</button>
      </div>

      <div class="card" style="padding:0;">
        <div class="table-responsive">
          <table class="table-data" id="table-libro-diario">
            <thead>
              <tr>
                <th style="width: 15%;">Código / Fecha</th>
                <th style="width: 55%;">Descripción / Cuenta Contable</th>
                <th style="width: 15%; text-align: right;">Debe</th>
                <th style="width: 15%; text-align: right;">Haber</th>
              </tr>
            </thead>
            <tbody id="libro-diario-tbody">
              <!-- Cargado dinámicamente -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Fechas iniciales
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  document.getElementById('diario-filter-start').value = new Date(y, m, 1).toISOString().substring(0, 10);
  document.getElementById('diario-filter-end').value = new Date(y, m + 1, 0).toISOString().substring(0, 10);

  loadLibroDiario();
}

function loadLibroDiario() {
  const start = document.getElementById('diario-filter-start').value;
  const end = document.getElementById('diario-filter-end').value;
  const tbody = document.getElementById('libro-diario-tbody');
  
  tbody.innerHTML = '';

  const entries = db.getEntries().filter(e => {
    if (e.state === 'Anulado') return false;
    if (start && e.date < start) return false;
    if (end && e.date > end) return false;
    return true;
  }).sort((a,b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:2rem;">No hay registros en el rango seleccionado.</td></tr>`;
    return;
  }

  const accounts = db.getAccounts();
  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  entries.forEach(entry => {
    // Encabezado del asiento
    tbody.innerHTML += `
      <tr style="background: var(--bg-gradient-end); font-weight:700;">
        <td><b>Asiento #${entry.number}</b></td>
        <td>Fecha: ${entry.date} - ${entry.description}</td>
        <td></td>
        <td></td>
      </tr>
    `;

    // Líneas del asiento
    entry.lines.forEach(l => {
      const acc = accounts.find(a => a.code === l.accountCode);
      const isDebit = parseFloat(l.debit) > 0;
      const alignClass = isDebit ? '' : 'padding-left: 2rem;';
      const debitText = isDebit ? formatCurrency(l.debit) : '';
      const creditText = !isDebit ? formatCurrency(l.credit) : '';

      grandTotalDebit += parseFloat(l.debit || 0);
      grandTotalCredit += parseFloat(l.credit || 0);

      tbody.innerHTML += `
        <tr>
          <td><code>${l.accountCode}</code></td>
          <td style="${alignClass}">${acc ? acc.name : 'Cuenta Desconocida'}</td>
          <td style="text-align: right;">${debitText}</td>
          <td style="text-align: right;">${creditText}</td>
        </tr>
      `;
    });
  });

  // Fila de totales generales
  tbody.innerHTML += `
    <tr style="font-weight: 800; border-top: 2px solid var(--text-main); background: var(--bg-gradient-start);">
      <td></td>
      <td style="text-align: right;">TOTAL GENERAL LIBRO DIARIO:</td>
      <td style="text-align: right; color: var(--primary-color);">${formatCurrency(grandTotalDebit)}</td>
      <td style="text-align: right; color: var(--primary-color);">${formatCurrency(grandTotalCredit)}</td>
    </tr>
  `;

  lucide.createIcons();
}

function exportLibroDiarioExcel() {
  const table = document.getElementById('table-libro-diario');
  const wb = XLSX.utils.table_to_book(table);
  XLSX.writeFile(wb, `Libro_Diario_${AppState.settings.companyName.replace(/ /g, '_')}.xlsx`);
  showToast('Excel del Libro Diario exportado con éxito', 'success');
}

function exportLibroDiarioPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(AppState.settings.companyName, 14, 15);
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'normal');
  doc.text(`RIF: ${AppState.settings.fiscalRif}`, 14, 20);
  doc.setFont('Helvetica', 'bold');
  doc.text(`REPORTE: LIBRO DIARIO GENERAL`, 14, 28);
  doc.setFont('Helvetica', 'normal');
  doc.text(`Período: ${document.getElementById('diario-filter-start').value} al ${document.getElementById('diario-filter-end').value}`, 14, 33);

  let y = 42;
  doc.setFont('Helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y - 5, 182, 7, 'F');
  doc.text('Cód. / Fecha', 15, y);
  doc.text('Descripción / Cuenta', 55, y);
  doc.text('Debe', 150, y, { align: 'right' });
  doc.text('Haber', 185, y, { align: 'right' });
  y += 6;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  const start = document.getElementById('diario-filter-start').value;
  const end = document.getElementById('diario-filter-end').value;
  const entries = db.getEntries().filter(e => {
    if (e.state === 'Anulado') return false;
    if (start && e.date < start) return false;
    if (end && e.date > end) return false;
    return true;
  }).sort((a,b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));

  let totalD = 0;
  let totalH = 0;

  entries.forEach(e => {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.setFont('Helvetica', 'bold');
    doc.text(`#${e.number}`, 15, y);
    doc.text(`Fecha: ${e.date} - ${e.description.substring(0, 70)}`, 45, y);
    y += 5;
    
    doc.setFont('Helvetica', 'normal');
    e.lines.forEach(l => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(l.accountCode, 15, y);
      const acc = db.getAccounts().find(a => a.code === l.accountCode);
      const accName = acc ? acc.name : 'Cuenta';
      doc.text(parseFloat(l.debit) > 0 ? accName : `  ${accName}`, 45, y);
      if (parseFloat(l.debit) > 0) doc.text(l.debit.toFixed(2), 150, y, { align: 'right' });
      if (parseFloat(l.credit) > 0) doc.text(l.credit.toFixed(2), 185, y, { align: 'right' });
      
      totalD += parseFloat(l.debit || 0);
      totalH += parseFloat(l.credit || 0);
      y += 5;
    });
    y += 2;
  });

  if (y > 270) { doc.addPage(); y = 20; }
  doc.setFont('Helvetica', 'bold');
  doc.line(14, y, 196, y);
  y += 5;
  doc.text('TOTAL GENERAL:', 45, y);
  doc.text(totalD.toFixed(2), 150, y, { align: 'right' });
  doc.text(totalH.toFixed(2), 185, y, { align: 'right' });

  doc.save(`Libro_Diario_${AppState.settings.companyName.replace(/ /g, '_')}.pdf`);
  showToast('PDF del Libro Diario descargado', 'success');
}

// 5. MAYOR ANALÍTICO
function renderMayorAnaliticoView(container) {
  // Cargar lista de cuentas de detalle
  const accounts = db.getAccounts().filter(a => !a.summary);
  let options = '';
  accounts.forEach(a => {
    options += `<option value="${a.code}">${a.code} - ${a.name}</option>`;
  });

  container.innerHTML = `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Mayor Analítico</h1>
          <p>Consulte el historial detallado de movimientos y el saldo acumulado por cuenta.</p>
        </div>
      </div>

      <div class="filters-bar">
        <div class="form-group" style="margin-bottom:0; flex-grow: 1;">
          <label for="mayor-filter-account">Seleccionar Cuenta Contable</label>
          <select id="mayor-filter-account" class="filter-input" style="width:100%;">
            ${options}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0; width: 140px;">
          <label for="mayor-filter-start">Desde</label>
          <input type="date" id="mayor-filter-start" class="filter-input" style="width:100%;">
        </div>
        <div class="form-group" style="margin-bottom:0; width: 140px;">
          <label for="mayor-filter-end">Hasta</label>
          <input type="date" id="mayor-filter-end" class="filter-input" style="width:100%;">
        </div>
        <button class="btn btn-primary-action" onclick="loadMayorAnalitico()"><i data-lucide="refresh-cw"></i> Consultar</button>
        <button class="btn btn-sec" onclick="exportMayorExcel()"><i data-lucide="file-spreadsheet"></i> Excel</button>
      </div>

      <!-- Tarjeta con Resumen y Detalle -->
      <div class="card" style="padding:0;">
        <div style="padding:1.5rem; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--surface-border);">
          <div>
            <h3 id="mayor-title-name" style="font-size:1.15rem; font-weight:700;">Seleccione cuenta</h3>
            <p id="mayor-title-nature" style="font-size:0.8rem; color:var(--text-muted);">Naturaleza: -</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size:0.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Saldo Acumulado al Período</p>
            <h2 id="mayor-title-balance" style="font-weight:800; color:var(--primary-color);">-</h2>
          </div>
        </div>
        
        <div class="table-responsive">
          <table class="table-data" id="table-mayor">
            <thead>
              <tr>
                <th style="width: 12%;">Fecha</th>
                <th style="width: 12%;">Asiento N°</th>
                <th style="width: 46%;">Concepto o Referencia</th>
                <th style="width: 10%; text-align: right;">Débito (+)</th>
                <th style="width: 10%; text-align: right;">Crédito (-)</th>
                <th style="width: 10%; text-align: right;">Saldo</th>
              </tr>
            </thead>
            <tbody id="mayor-tbody">
              <!-- Cargado dinámicamente -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Fechas iniciales
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  document.getElementById('mayor-filter-start').value = new Date(y, m, 1).toISOString().substring(0, 10);
  document.getElementById('mayor-filter-end').value = new Date(y, m + 1, 0).toISOString().substring(0, 10);

  if (accounts.length > 0) {
    loadMayorAnalitico();
  }
}

function loadMayorAnalitico() {
  const accountCode = document.getElementById('mayor-filter-account').value;
  const start = document.getElementById('mayor-filter-start').value;
  const end = document.getElementById('mayor-filter-end').value;

  const accounts = db.getAccounts();
  const acc = accounts.find(a => a.code === accountCode);
  if (!acc) return;

  document.getElementById('mayor-title-name').innerText = `${acc.code} - ${acc.name}`;
  document.getElementById('mayor-title-nature').innerText = `Clasificación: ${acc.type} | Naturaleza: ${acc.nature}`;

  const tbody = document.getElementById('mayor-tbody');
  tbody.innerHTML = '';

  const entries = db.getEntries().filter(e => e.state !== 'Anulado').sort((a,b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));

  let runningBalance = 0;
  let hasPrevious = false;
  let prevDebit = 0;
  let prevCredit = 0;

  const lines = [];

  // Calcular saldo inicial previo al rango
  entries.forEach(e => {
    e.lines.forEach(l => {
      if (l.accountCode === accountCode) {
        if (start && e.date < start) {
          prevDebit += parseFloat(l.debit || 0);
          prevCredit += parseFloat(l.credit || 0);
          hasPrevious = true;
        } else if (!start || (start && e.date >= start && (!end || e.date <= end))) {
          lines.push({
            date: e.date,
            number: e.number,
            description: e.description,
            debit: parseFloat(l.debit || 0),
            credit: parseFloat(l.credit || 0)
          });
        }
      }
    });
  });

  // Calcular saldo inicial acumulado según naturaleza
  if (acc.nature === 'Deudora') {
    runningBalance = prevDebit - prevCredit;
  } else {
    runningBalance = prevCredit - prevDebit;
  }

  // Fila de saldo inicial
  if (hasPrevious) {
    tbody.innerHTML += `
      <tr style="font-weight: 600; font-style: italic; background: var(--bg-gradient-start);">
        <td>${start}</td>
        <td>-</td>
        <td>[SALDO ANTERIOR ACUMULADO]</td>
        <td style="text-align: right;">${formatCurrency(prevDebit)}</td>
        <td style="text-align: right;">${formatCurrency(prevCredit)}</td>
        <td style="text-align: right;">${formatCurrency(runningBalance)}</td>
      </tr>
    `;
  }

  let totalDebit = prevDebit;
  let totalCredit = prevCredit;

  lines.forEach(l => {
    if (acc.nature === 'Deudora') {
      runningBalance += (l.debit - l.credit);
    } else {
      runningBalance += (l.credit - l.debit);
    }

    totalDebit += l.debit;
    totalCredit += l.credit;

    tbody.innerHTML += `
      <tr>
        <td>${l.date}</td>
        <td><b>#${l.number}</b></td>
        <td>${l.description}</td>
        <td style="text-align: right; color: var(--success-color);">${l.debit > 0 ? formatCurrency(l.debit) : ''}</td>
        <td style="text-align: right; color: var(--danger-color);">${l.credit > 0 ? formatCurrency(l.credit) : ''}</td>
        <td style="text-align: right; font-weight:600;">${formatCurrency(runningBalance)}</td>
      </tr>
    `;
  });

  document.getElementById('mayor-title-balance').innerText = formatCurrency(runningBalance);

  // Totales
  tbody.innerHTML += `
    <tr style="font-weight: 800; background: var(--bg-gradient-end); border-top: 2px solid var(--text-main);">
      <td></td>
      <td></td>
      <td style="text-align: right;">SALDO TOTAL ACUMULADO:</td>
      <td style="text-align: right;">${formatCurrency(totalDebit)}</td>
      <td style="text-align: right;">${formatCurrency(totalCredit)}</td>
      <td style="text-align: right; color: var(--primary-color);">${formatCurrency(runningBalance)}</td>
    </tr>
  `;

  lucide.createIcons();
}

function exportMayorExcel() {
  const table = document.getElementById('table-mayor');
  const wb = XLSX.utils.table_to_book(table);
  XLSX.writeFile(wb, `Mayor_${document.getElementById('mayor-filter-account').value}.xlsx`);
  showToast('Excel del Mayor Analítico descargado', 'success');
}

// 6. BALANCE GENERAL
function renderBalanceGeneralView(container) {
  container.innerHTML = `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Balance General</h1>
          <p>Estado de situación financiera de la empresa (Activo = Pasivo + Patrimonio).</p>
        </div>
      </div>

      <div class="filters-bar">
        <div class="form-group" style="margin-bottom:0; width: 200px;">
          <label for="bg-filter-date">Fecha de Corte</label>
          <input type="date" id="bg-filter-date" class="filter-input" style="width:100%;">
        </div>
        <button class="btn btn-primary-action" onclick="loadBalanceGeneral()"><i data-lucide="refresh-cw"></i> Generar Balance</button>
        <button class="btn btn-sec" onclick="exportBalanceExcel()"><i data-lucide="file-spreadsheet"></i> Excel</button>
      </div>

      <div class="card" style="padding: 2rem;">
        <div style="text-align:center; margin-bottom: 2rem; border-bottom: 1px solid var(--surface-border); padding-bottom: 1rem;">
          <h2 style="font-weight:800; font-size:1.5rem;">${AppState.settings.companyName}</h2>
          <p style="color:var(--text-muted); font-size:0.9rem;">RIF: ${AppState.settings.fiscalRif}</p>
          <h3 style="font-weight: 700; margin-top: 0.5rem; text-transform:uppercase;">Balance General</h3>
          <p style="font-size:0.85rem; font-style:italic;">Al <span id="bg-header-date">-</span></p>
        </div>

        <div class="table-responsive" style="border:none;">
          <table class="table-data" style="font-size:0.95rem;">
            <thead>
              <tr style="background:transparent;">
                <th style="color:var(--text-main); border-bottom:2px solid var(--text-main);">Código / Cuenta</th>
                <th style="color:var(--text-main); text-align:right; border-bottom:2px solid var(--text-main);">Parcial ($)</th>
                <th style="color:var(--text-main); text-align:right; border-bottom:2px solid var(--text-main);">Total ($)</th>
              </tr>
            </thead>
            <tbody id="bg-tbody">
              <!-- Cargado dinámicamente -->
            </tbody>
          </table>
        </div>

        <div id="bg-equation-check" style="margin-top: 2rem; padding: 1rem; border-radius: var(--radius-md); text-align: center; font-weight: 700;">
          <!-- Verificación de fórmula -->
        </div>
      </div>
    </div>
  `;

  document.getElementById('bg-filter-date').value = new Date().toISOString().substring(0, 10);
  loadBalanceGeneral();
}

function loadBalanceGeneral() {
  const cutDate = document.getElementById('bg-filter-date').value;
  document.getElementById('bg-header-date').innerText = cutDate;

  const tbody = document.getElementById('bg-tbody');
  tbody.innerHTML = '';

  const accounts = db.getAccounts();
  // Calcular los balances acumulados a la fecha de corte
  const balances = calculateAccountBalances(cutDate);

  // Agrupar cuentas en Activo (1), Pasivo (2), Patrimonio (3)
  const activeStructure = buildHierarchicalBalances(accounts, balances);

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  let netIncome = 0; // Utilidad del ejercicio (de Ingresos 4 - Gastos 5)

  // Calcular utilidad del ejercicio
  let revenues = 0;
  let expenses = 0;
  Object.entries(balances).forEach(([code, bal]) => {
    if (code.startsWith('4.')) revenues += bal;
    else if (code.startsWith('5.')) expenses += bal;
  });
  netIncome = revenues - expenses;

  // Renderizar Activos (1)
  tbody.innerHTML += `<tr class="fin-row-l1"><td>1. ACTIVOS</td><td></td><td></td></tr>`;
  renderHierarchicalRow(activeStructure['1'], 1, tbody);
  totalAssets = activeStructure['1'] ? activeStructure['1'].value : 0;
  tbody.innerHTML += `<tr class="fin-row-total"><td>TOTAL ACTIVOS</td><td></td><td style="text-align:right;">${formatCurrency(totalAssets)}</td></tr>`;

  // Renderizar Pasivos (2)
  tbody.innerHTML += `<tr class="fin-row-l1" style="height:2rem;"><td>2. PASIVOS</td><td></td><td></td></tr>`;
  renderHierarchicalRow(activeStructure['2'], 1, tbody);
  totalLiabilities = activeStructure['2'] ? activeStructure['2'].value : 0;
  tbody.innerHTML += `<tr class="fin-row-total"><td>TOTAL PASIVOS</td><td></td><td style="text-align:right;">${formatCurrency(totalLiabilities)}</td></tr>`;

  // Renderizar Patrimonio (3)
  tbody.innerHTML += `<tr class="fin-row-l1" style="height:2rem;"><td>3. PATRIMONIO</td><td></td><td></td></tr>`;
  renderHierarchicalRow(activeStructure['3'], 1, tbody);
  
  // Agregar utilidad del ejercicio
  const equityNode = activeStructure['3'] || { value: 0 };
  tbody.innerHTML += `
    <tr class="fin-row-l3">
      <td style="padding-left: 20px;">3.2.01.002 - Utilidad / Pérdida del Ejercicio</td>
      <td style="text-align:right;">${formatCurrency(netIncome)}</td>
      <td></td>
    </tr>
  `;
  totalEquity = equityNode.value + netIncome;
  tbody.innerHTML += `<tr class="fin-row-total"><td>TOTAL PATRIMONIO</td><td></td><td style="text-align:right;">${formatCurrency(totalEquity)}</td></tr>`;

  // Total Pasivo + Patrimonio
  const totalLiabEquity = totalLiabilities + totalEquity;
  tbody.innerHTML += `
    <tr class="fin-row-total" style="background:var(--primary-soft); border-top:2px solid var(--primary-color);">
      <td>TOTAL PASIVO Y PATRIMONIO</td>
      <td></td>
      <td style="text-align:right; color:var(--primary-color);">${formatCurrency(totalLiabEquity)}</td>
    </tr>
  `;

  // Ecuación Patrimonial Check
  const checkDiv = document.getElementById('bg-equation-check');
  const diff = Math.abs(totalAssets - totalLiabEquity);
  if (diff < 0.05) {
    checkDiv.style.background = 'var(--success-soft)';
    checkDiv.style.color = 'var(--success-color)';
    checkDiv.innerHTML = `<i data-lucide="check-circle" style="display:inline; vertical-align:middle; margin-right:4px;"></i> Balance Cuadrado: Activo (${totalAssets.toFixed(2)}) = Pasivo + Patrimonio (${totalLiabEquity.toFixed(2)})`;
  } else {
    checkDiv.style.background = 'var(--danger-soft)';
    checkDiv.style.color = 'var(--danger-color)';
    checkDiv.innerHTML = `<i data-lucide="alert-triangle" style="display:inline; vertical-align:middle; margin-right:4px;"></i> Balance Descuadrado. Diferencia de: ${formatCurrency(diff)}`;
  }

  lucide.createIcons();
}

function exportBalanceExcel() {
  const wb = XLSX.utils.book_new();
  const table = document.getElementById('bg-tbody');
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, 'Balance General');
  XLSX.writeFile(wb, `Balance_General_${document.getElementById('bg-filter-date').value}.xlsx`);
  showToast('Excel de Balance General descargado', 'success');
}

// 7. ESTADO DE RESULTADOS
function renderEstadoResultadosView(container) {
  container.innerHTML = `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Estado de Resultados</h1>
          <p>Estado de Pérdidas y Ganancias del período contable (Utilidad = Ingresos - Gastos - Costos).</p>
        </div>
      </div>

      <div class="filters-bar">
        <div class="form-group" style="margin-bottom:0; width: 160px;">
          <label for="er-filter-start">Fecha Desde</label>
          <input type="date" id="er-filter-start" class="filter-input" style="width:100%;">
        </div>
        <div class="form-group" style="margin-bottom:0; width: 160px;">
          <label for="er-filter-end">Fecha Hasta</label>
          <input type="date" id="er-filter-end" class="filter-input" style="width:100%;">
        </div>
        <button class="btn btn-primary-action" onclick="loadEstadoResultados()"><i data-lucide="refresh-cw"></i> Generar Reporte</button>
        <button class="btn btn-sec" onclick="exportERExcel()"><i data-lucide="file-spreadsheet"></i> Excel</button>
      </div>

      <div class="card" style="padding: 2rem;">
        <div style="text-align:center; margin-bottom: 2rem; border-bottom: 1px solid var(--surface-border); padding-bottom: 1rem;">
          <h2 style="font-weight:800; font-size:1.5rem;">${AppState.settings.companyName}</h2>
          <p style="color:var(--text-muted); font-size:0.9rem;">RIF: ${AppState.settings.fiscalRif}</p>
          <h3 style="font-weight: 700; margin-top: 0.5rem; text-transform:uppercase;">Estado de Resultados</h3>
          <p style="font-size:0.85rem; font-style:italic;">Período del <span id="er-header-start">-</span> al <span id="er-header-end">-</span></p>
        </div>

        <div class="table-responsive" style="border:none;">
          <table class="table-data" style="font-size:0.95rem;">
            <thead>
              <tr style="background:transparent;">
                <th style="color:var(--text-main); border-bottom:2px solid var(--text-main);">Cuenta Contable</th>
                <th style="color:var(--text-main); text-align:right; border-bottom:2px solid var(--text-main);">Parcial ($)</th>
                <th style="color:var(--text-main); text-align:right; border-bottom:2px solid var(--text-main);">Total ($)</th>
              </tr>
            </thead>
            <tbody id="er-tbody">
              <!-- Cargado dinámicamente -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Rango de fechas por defecto del mes actual
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  document.getElementById('er-filter-start').value = new Date(y, m, 1).toISOString().substring(0, 10);
  document.getElementById('er-filter-end').value = new Date(y, m + 1, 0).toISOString().substring(0, 10);

  loadEstadoResultados();
}

function loadEstadoResultados() {
  const start = document.getElementById('er-filter-start').value;
  const end = document.getElementById('er-filter-end').value;

  document.getElementById('er-header-start').innerText = start;
  document.getElementById('er-header-end').innerText = end;

  const tbody = document.getElementById('er-tbody');
  tbody.innerHTML = '';

  const accounts = db.getAccounts();
  const balances = calculateAccountBalancesPeriod(start, end);
  const activeStructure = buildHierarchicalBalances(accounts, balances);

  let totalRevenues = 0;
  let totalExpenses = 0;
  let totalCosts = 0;

  // Renderizar Ingresos (4)
  tbody.innerHTML += `<tr class="fin-row-l1"><td>4. INGRESOS</td><td></td><td></td></tr>`;
  renderHierarchicalRow(activeStructure['4'], 1, tbody);
  totalRevenues = activeStructure['4'] ? activeStructure['4'].value : 0;
  tbody.innerHTML += `<tr class="fin-row-total"><td>TOTAL INGRESOS</td><td></td><td style="text-align:right; color:var(--success-color);">${formatCurrency(totalRevenues)}</td></tr>`;

  // Renderizar Gastos (5)
  tbody.innerHTML += `<tr class="fin-row-l1" style="height:2rem;"><td>5. GASTOS</td><td></td><td></td></tr>`;
  renderHierarchicalRow(activeStructure['5'], 1, tbody);
  totalExpenses = activeStructure['5'] ? activeStructure['5'].value : 0;
  tbody.innerHTML += `<tr class="fin-row-total"><td>TOTAL GASTOS</td><td></td><td style="text-align:right; color:var(--danger-color);">${formatCurrency(totalExpenses)}</td></tr>`;

  // Costos si existen (6)
  let totalERCosts = 0;
  if (activeStructure['6']) {
    tbody.innerHTML += `<tr class="fin-row-l1" style="height:2rem;"><td>6. COSTOS</td><td></td><td></td></tr>`;
    renderHierarchicalRow(activeStructure['6'], 1, tbody);
    totalERCosts = activeStructure['6'].value;
    tbody.innerHTML += `<tr class="fin-row-total"><td>TOTAL COSTOS</td><td></td><td style="text-align:right; color:var(--danger-color);">${formatCurrency(totalERCosts)}</td></tr>`;
  }

  // Utilidad o Pérdida Neta
  const utility = totalRevenues - totalExpenses - totalERCosts;
  const utilityText = utility >= 0 ? 'UTILIDAD NETA DEL EJERCICIO' : 'PÉRDIDA NETA DEL EJERCICIO';
  const utilityColorClass = utility >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

  tbody.innerHTML += `
    <tr class="fin-row-total" style="background:var(--success-soft); border-top:2px solid ${utilityColorClass};">
      <td style="font-size:1.05rem;">${utilityText}</td>
      <td></td>
      <td style="text-align:right; font-size:1.1rem; color:${utilityColorClass};">${formatCurrency(utility)}</td>
    </tr>
  `;

  lucide.createIcons();
}

function exportERExcel() {
  const wb = XLSX.utils.book_new();
  const table = document.getElementById('er-tbody');
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, 'Estado de Resultados');
  XLSX.writeFile(wb, `Estado_Resultados_${document.getElementById('er-filter-start').value}_${document.getElementById('er-filter-end').value}.xlsx`);
  showToast('Excel del Estado de Resultados descargado', 'success');
}

// 8. AUDITORÍA
function renderAuditoriaView(container) {
  const logs = db.getAuditLogs();
  
  let rows = '';
  logs.forEach(l => {
    const d = new Date(l.timestamp);
    rows += `
      <tr>
        <td>${d.toLocaleDateString()} ${d.toLocaleTimeString()}</td>
        <td><b>${l.username}</b></td>
        <td>${l.action}</td>
        <td style="color:var(--text-muted);"><small>${l.details}</small></td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Bitácora de Auditoría</h1>
          <p>Registro histórico de cambios y operaciones realizadas en el sistema contable.</p>
        </div>
      </div>

      <div class="card" style="padding:0;">
        <div class="table-responsive">
          <table class="table-data">
            <thead>
              <tr>
                <th style="width: 20%;">Fecha / Hora</th>
                <th style="width: 15%;">Usuario</th>
                <th style="width: 20%;">Acción</th>
                <th style="width: 45%;">Detalles</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="4" style="text-align:center;">No hay registros de auditoría</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// 9. CONFIGURACIÓN
function renderConfiguracionView(container) {
  const settings = db.getSettings();

  container.innerHTML = `
    <div class="view-container">
      <div class="view-header">
        <div>
          <h1>Configuración de la Empresa</h1>
          <p>Ajuste los parámetros fiscales y de presentación comercial del sistema.</p>
        </div>
      </div>

      <div class="card" style="max-width: 600px;">
        <form id="config-form">
          <div class="form-group">
            <label for="conf-company">Nombre Legal o Razón Social</label>
            <input type="text" id="conf-company" class="form-input" style="padding-left:0.75rem;" value="${settings.companyName}" required>
          </div>
          
          <div class="form-group">
            <label for="conf-rif">Identificación Fiscal (RIF)</label>
            <input type="text" id="conf-rif" class="form-input" style="padding-left:0.75rem;" value="${settings.fiscalRif}" required>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
            <div class="form-group">
              <label for="conf-year">Año Fiscal Activo</label>
              <input type="number" id="conf-year" class="form-input" style="padding-left:0.75rem;" value="${settings.fiscalYear}" required>
            </div>
            <div class="form-group">
              <label for="conf-status">Período Contable</label>
              <select id="conf-status" class="form-input" style="padding-left:0.75rem;">
                <option value="1" ${settings.periodOpen ? 'selected' : ''}>Abierto</option>
                <option value="0" ${!settings.periodOpen ? 'selected' : ''}>Cerrado (Solo Lectura)</option>
              </select>
            </div>
          </div>

          <button type="submit" class="btn btn-primary-action" style="margin-top:1rem; width:100%;">Guardar Parámetros</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('config-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = {
      companyName: document.getElementById('conf-company').value.trim(),
      fiscalRif: document.getElementById('conf-rif').value.trim(),
      fiscalYear: parseInt(document.getElementById('conf-year').value),
      periodOpen: document.getElementById('conf-status').value === '1'
    };
    db.saveSettings(updated);
    updateCompanyHeader();
    showToast('Configuración del sistema guardada con éxito', 'success');
  });
}

// --- UTILIDADES DE CÁLCULO CONTABLE ---

// Calcula saldos acumulados de cuentas hasta una fecha de corte
function calculateAccountBalances(cutDate = null) {
  const accounts = db.getAccounts();
  const entries = db.getEntries().filter(e => e.state !== 'Anulado');
  
  const balances = {};
  
  // Inicializar saldo en cero para todas las cuentas de detalle
  accounts.forEach(a => {
    if (!a.summary) {
      balances[a.code] = 0;
    }
  });

  // Procesar movimientos
  entries.forEach(e => {
    if (cutDate && e.date > cutDate) return;
    
    e.lines.forEach(l => {
      if (balances[l.accountCode] !== undefined) {
        const acc = accounts.find(a => a.code === l.accountCode);
        const debit = parseFloat(l.debit || 0);
        const credit = parseFloat(l.credit || 0);

        if (acc.nature === 'Deudora') {
          balances[l.accountCode] += (debit - credit);
        } else {
          balances[l.accountCode] += (credit - debit);
        }
      }
    });
  });

  return balances;
}

// Calcula saldos acumulados en un rango de fechas (para Estado de Resultados)
function calculateAccountBalancesPeriod(start, end) {
  const accounts = db.getAccounts();
  const entries = db.getEntries().filter(e => e.state !== 'Anulado');
  const balances = {};

  accounts.forEach(a => {
    if (!a.summary) {
      balances[a.code] = 0;
    }
  });

  entries.forEach(e => {
    if (start && e.date < start) return;
    if (end && e.date > end) return;

    e.lines.forEach(l => {
      if (balances[l.accountCode] !== undefined) {
        const acc = accounts.find(a => a.code === l.accountCode);
        const debit = parseFloat(l.debit || 0);
        const credit = parseFloat(l.credit || 0);

        if (acc.nature === 'Deudora') {
          balances[l.accountCode] += (debit - credit);
        } else {
          balances[l.accountCode] += (credit - debit);
        }
      }
    });
  });

  return balances;
}

// Estructura los saldos detallados en un árbol jerárquico acumulador
function buildHierarchicalBalances(accounts, detailBalances) {
  const tree = {};

  // Crear nodos para todas las cuentas
  accounts.forEach(acc => {
    tree[acc.code] = {
      code: acc.code,
      name: acc.name,
      summary: acc.summary,
      value: !acc.summary ? (detailBalances[acc.code] || 0) : 0,
      children: []
    };
  });

  // Enlazar hijos con padres
  accounts.forEach(acc => {
    if (acc.parent && tree[acc.parent]) {
      tree[acc.parent].children.push(tree[acc.code]);
    }
  });

  // Función recursiva para calcular acumulaciones
  function computeSum(node) {
    if (!node.summary) return node.value;
    
    let sum = 0;
    node.children.forEach(child => {
      sum += computeSum(child);
    });
    node.value = sum;
    return sum;
  }

  // Calcular la suma desde las raíces
  Object.values(tree).forEach(node => {
    const isRoot = !accounts.find(a => a.code === node.code).parent;
    if (isRoot) {
      computeSum(node);
    }
  });

  return tree;
}

// Renderiza recursivamente una fila del árbol jerárquico contable
function renderHierarchicalRow(node, level, tbody) {
  if (!node || node.value === 0) return;

  const depthClass = `fin-row-l${Math.min(level, 4)}`;
  const padding = level * 15;
  const codeStyle = `padding-left: ${padding}px;`;

  // Si tiene hijos y no tiene valor directo, es acumuladora
  if (node.summary) {
    tbody.innerHTML += `
      <tr class="${depthClass}" style="font-weight: 600;">
        <td style="${codeStyle}">${node.code} - ${node.name}</td>
        <td></td>
        <td style="text-align:right;">${formatCurrency(node.value)}</td>
      </tr>
    `;
    // Ordenar hijos por código
    node.children.sort((a,b) => a.code.localeCompare(b.code, undefined, {numeric: true})).forEach(child => {
      renderHierarchicalRow(child, level + 1, tbody);
    });
  } else {
    tbody.innerHTML += `
      <tr class="${depthClass}">
        <td style="${codeStyle}">${node.code} - ${node.name}</td>
        <td style="text-align:right;">${formatCurrency(node.value)}</td>
        <td></td>
      </tr>
    `;
  }
}

// Formateadores
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);
}
