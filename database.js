/**
 * database.js
 * Capa de datos con persistencia en localStorage para el Sistema Contable Saint.
 * Simula una base de datos relacional y aplica reglas de negocio contables.
 */

const DB_KEYS = {
  ACCOUNTS: 'saint_accounts',
  ENTRIES: 'saint_entries',
  USERS: 'saint_users',
  AUDIT_LOGS: 'saint_audit_logs',
  SESSION: 'saint_session',
  SETTINGS: 'saint_settings'
};

// Datos por defecto para inicialización
const DEFAULT_ACCOUNTS = [
  // 1. ACTIVO
  { code: '1', name: 'Activos', type: 'Activo', nature: 'Deudora', parent: null, active: true, summary: true },
  { code: '1.1', name: 'Activos Corrientes', type: 'Activo', nature: 'Deudora', parent: '1', active: true, summary: true },
  { code: '1.1.01', name: 'Efectivo y Equivalentes de Efectivo', type: 'Activo', nature: 'Deudora', parent: '1.1', active: true, summary: true },
  { code: '1.1.01.001', name: 'Caja General', type: 'Activo', nature: 'Deudora', parent: '1.1.01', active: true, summary: false },
  { code: '1.1.01.002', name: 'Caja Chica', type: 'Activo', nature: 'Deudora', parent: '1.1.01', active: true, summary: false },
  { code: '1.1.01.003', name: 'Banco Mercantil', type: 'Activo', nature: 'Deudora', parent: '1.1.01', active: true, summary: false },
  { code: '1.1.01.004', name: 'Banco Banesco', type: 'Activo', nature: 'Deudora', parent: '1.1.01', active: true, summary: false },
  { code: '1.1.02', name: 'Cuentas por Cobrar', type: 'Activo', nature: 'Deudora', parent: '1.1', active: true, summary: true },
  { code: '1.1.02.001', name: 'Cuentas por Cobrar Comerciales', type: 'Activo', nature: 'Deudora', parent: '1.1.02', active: true, summary: false },
  { code: '1.2', name: 'Activos No Corrientes', type: 'Activo', nature: 'Deudora', parent: '1', active: true, summary: true },
  { code: '1.2.01', name: 'Propiedad, Planta y Equipo', type: 'Activo', nature: 'Deudora', parent: '1.2', active: true, summary: true },
  { code: '1.2.01.001', name: 'Mobiliario y Equipos', type: 'Activo', nature: 'Deudora', parent: '1.2.01', active: true, summary: false },
  { code: '1.2.01.002', name: 'Equipos de Computación', type: 'Activo', nature: 'Deudora', parent: '1.2.01', active: true, summary: false },
  { code: '1.2.01.003', name: 'Vehículos', type: 'Activo', nature: 'Deudora', parent: '1.2.01', active: true, summary: false },

  // 2. PASIVO
  { code: '2', name: 'Pasivos', type: 'Pasivo', nature: 'Acreedora', parent: null, active: true, summary: true },
  { code: '2.1', name: 'Pasivos Corrientes', type: 'Pasivo', nature: 'Acreedora', parent: '2', active: true, summary: true },
  { code: '2.1.01', name: 'Cuentas por Pagar', type: 'Pasivo', nature: 'Acreedora', parent: '2.1', active: true, summary: true },
  { code: '2.1.01.001', name: 'Proveedores Nacionales', type: 'Pasivo', nature: 'Acreedora', parent: '2.1.01', active: true, summary: false },
  { code: '2.1.02', name: 'Obligaciones Tributarias', type: 'Pasivo', nature: 'Acreedora', parent: '2.1', active: true, summary: true },
  { code: '2.1.02.001', name: 'IVA por Pagar', type: 'Pasivo', nature: 'Acreedora', parent: '2.1.02', active: true, summary: false },

  // 3. PATRIMONIO
  { code: '3', name: 'Patrimonio', type: 'Patrimonio', nature: 'Acreedora', parent: null, active: true, summary: true },
  { code: '3.1', name: 'Capital Social', type: 'Patrimonio', nature: 'Acreedora', parent: '3', active: true, summary: true },
  { code: '3.1.01.001', name: 'Capital Suscrito y Pagado', type: 'Patrimonio', nature: 'Acreedora', parent: '3.1', active: true, summary: false },
  { code: '3.2', name: 'Resultados', type: 'Patrimonio', nature: 'Acreedora', parent: '3', active: true, summary: true },
  { code: '3.2.01.001', name: 'Utilidades Acumuladas', type: 'Patrimonio', nature: 'Acreedora', parent: '3.2', active: true, summary: false },
  { code: '3.2.01.002', name: 'Utilidad del Ejercicio', type: 'Patrimonio', nature: 'Acreedora', parent: '3.2', active: true, summary: false },

  // 4. INGRESOS
  { code: '4', name: 'Ingresos', type: 'Ingresos', nature: 'Acreedora', parent: null, active: true, summary: true },
  { code: '4.1', name: 'Ingresos Operacionales', type: 'Ingresos', nature: 'Acreedora', parent: '4', active: true, summary: true },
  { code: '4.1.01', name: 'Ventas de Bienes y Servicios', type: 'Ingresos', nature: 'Acreedora', parent: '4.1', active: true, summary: true },
  { code: '4.1.01.001', name: 'Ventas de Mercancías', type: 'Ingresos', nature: 'Acreedora', parent: '4.1.01', active: true, summary: false },

  // 5. GASTOS
  { code: '5', name: 'Gastos', type: 'Gastos', nature: 'Deudora', parent: null, active: true, summary: true },
  { code: '5.1', name: 'Gastos Operacionales', type: 'Gastos', nature: 'Deudora', parent: '5', active: true, summary: true },
  { code: '5.1.01', name: 'Gastos de Personal', type: 'Gastos', nature: 'Deudora', parent: '5.1', active: true, summary: true },
  { code: '5.1.01.001', name: 'Sueldos y Salarios', type: 'Gastos', nature: 'Deudora', parent: '5.1.01', active: true, summary: false },
  { code: '5.1.02', name: 'Gastos de Operación y Administración', type: 'Gastos', nature: 'Deudora', parent: '5.1', active: true, summary: true },
  { code: '5.1.02.001', name: 'Gasto de Alquiler', type: 'Gastos', nature: 'Deudora', parent: '5.1.02', active: true, summary: false },
  { code: '5.1.02.002', name: 'Gasto de Servicios Públicos', type: 'Gastos', nature: 'Deudora', parent: '5.1.02', active: true, summary: false }
];

const DEFAULT_USERS = [
  { username: 'admin', password: '123', name: 'Administrador Saint', role: 'Administrador' },
  { username: 'contador', password: '123', name: 'Contador de Guardia', role: 'Contador' }
];

const DEFAULT_ENTRIES = [
  {
    id: 1,
    number: '000001',
    date: '2026-05-01',
    description: 'Apertura de la empresa - Aporte social de socios en cuenta bancaria',
    state: 'Confirmado',
    lines: [
      { accountCode: '1.1.01.003', debit: 50000.00, credit: 0 },
      { accountCode: '3.1.01.001', debit: 0, credit: 50000.00 }
    ]
  },
  {
    id: 2,
    number: '000002',
    date: '2026-05-05',
    description: 'Pago de alquiler comercial del local del mes',
    state: 'Confirmado',
    lines: [
      { accountCode: '5.1.02.001', debit: 1200.00, credit: 0 },
      { accountCode: '1.1.01.003', debit: 0, credit: 1200.00 }
    ]
  },
  {
    id: 3,
    number: '000003',
    date: '2026-05-10',
    description: 'Venta de mercancías al contado cobrada en Caja General',
    state: 'Confirmado',
    lines: [
      { accountCode: '1.1.01.001', debit: 4500.00, credit: 0 },
      { accountCode: '4.1.01.001', debit: 0, credit: 4500.00 }
    ]
  }
];

const DEFAULT_SETTINGS = {
  companyName: 'Saint Contable Demo S.A.',
  fiscalRif: 'J-12345678-9',
  fiscalYear: 2026,
  periodOpen: true
};

const DEFAULT_AUDIT_LOGS = [
  { timestamp: new Date('2026-05-01T08:00:00Z').toISOString(), username: 'admin', action: 'Inicialización de Sistema', details: 'Configuración inicial y catálogo cargado' }
];

// Helper base de datos
const DB = {
  init() {
    if (!localStorage.getItem(DB_KEYS.ACCOUNTS)) {
      localStorage.setItem(DB_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
    }
    if (!localStorage.getItem(DB_KEYS.USERS)) {
      localStorage.setItem(DB_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
    if (!localStorage.getItem(DB_KEYS.ENTRIES)) {
      localStorage.setItem(DB_KEYS.ENTRIES, JSON.stringify(DEFAULT_ENTRIES));
    }
    if (!localStorage.getItem(DB_KEYS.SETTINGS)) {
      localStorage.setItem(DB_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(DB_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(DB_KEYS.AUDIT_LOGS, JSON.stringify(DEFAULT_AUDIT_LOGS));
    }
  },

  getData(key) {
    this.init();
    return JSON.parse(localStorage.getItem(key));
  },

  setData(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // Auditoría
  log(action, details) {
    const user = this.getCurrentUser();
    const username = user ? user.username : 'sistema';
    const logs = this.getData(DB_KEYS.AUDIT_LOGS) || [];
    logs.unshift({
      timestamp: new Date().toISOString(),
      username,
      action,
      details
    });
    this.setData(DB_KEYS.AUDIT_LOGS, logs.slice(0, 500)); // Limitar a 500 logs
  },

  getAuditLogs() {
    return this.getData(DB_KEYS.AUDIT_LOGS);
  },

  // Configuración
  getSettings() {
    return this.getData(DB_KEYS.SETTINGS);
  },

  saveSettings(settings) {
    this.setData(DB_KEYS.SETTINGS, settings);
    this.log('Configuración de Sistema', `Actualizado datos de la empresa: ${settings.companyName}`);
  },

  // Autenticación
  login(username, password) {
    const users = this.getData(DB_KEYS.USERS);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      const session = { username: user.username, name: user.name, role: user.role, loginTime: new Date().toISOString() };
      this.setData(DB_KEYS.SESSION, session);
      this.log('Inicio de Sesión', `Usuario ${username} inició sesión exitosamente`);
      return { success: true, user: session };
    }
    return { success: false, message: 'Usuario o contraseña incorrectos' };
  },

  logout() {
    const session = this.getCurrentUser();
    if (session) {
      this.log('Cierre de Sesión', `Usuario ${session.username} cerró sesión`);
    }
    localStorage.removeItem(DB_KEYS.SESSION);
  },

  getCurrentUser() {
    return JSON.parse(localStorage.getItem(DB_KEYS.SESSION));
  },

  // CRUD Plan de Cuentas
  getAccounts() {
    return this.getData(DB_KEYS.ACCOUNTS);
  },

  saveAccount(account) {
    const accounts = this.getAccounts();
    // Validar duplicado si es nueva
    const existingIndex = accounts.findIndex(a => a.code === account.code);
    
    if (existingIndex > -1) {
      // Editar
      accounts[existingIndex] = { ...accounts[existingIndex], ...account };
      this.log('Edición de Cuenta', `Cuenta modificada: ${account.code} - ${account.name}`);
    } else {
      // Crear
      // Validar código duplicado
      if (accounts.some(a => a.code === account.code)) {
        throw new Error(`El código contable ${account.code} ya existe.`);
      }
      accounts.push(account);
      // Ordenar por código
      accounts.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
      this.log('Creación de Cuenta', `Nueva cuenta creada: ${account.code} - ${account.name}`);
    }
    this.setData(DB_KEYS.ACCOUNTS, accounts);
  },

  canDeleteAccount(code) {
    // Regla: No eliminar cuentas con movimientos
    const entries = this.getEntries();
    const hasMovements = entries.some(entry => 
      entry.state !== 'Anulado' && entry.lines.some(l => l.accountCode === code)
    );
    if (hasMovements) return { allowed: false, reason: 'La cuenta posee registros asociados en el libro diario.' };

    // Regla: No eliminar si tiene cuentas hijas
    const accounts = this.getAccounts();
    const hasChildren = accounts.some(a => a.parent === code);
    if (hasChildren) return { allowed: false, reason: 'La cuenta tiene subcuentas asociadas en el árbol contable.' };

    return { allowed: true };
  },

  deleteAccount(code) {
    const check = this.canDeleteAccount(code);
    if (!check.allowed) {
      throw new Error(check.reason);
    }
    let accounts = this.getAccounts();
    const acc = accounts.find(a => a.code === code);
    accounts = accounts.filter(a => a.code !== code);
    this.setData(DB_KEYS.ACCOUNTS, accounts);
    this.log('Eliminación de Cuenta', `Cuenta eliminada: ${code} - ${acc ? acc.name : ''}`);
  },

  // CRUD Asientos Contables
  getEntries() {
    return this.getData(DB_KEYS.ENTRIES);
  },

  saveEntry(entry) {
    // Validar partida doble
    let totalDebit = 0;
    let totalCredit = 0;
    for (let l of entry.lines) {
      totalDebit += parseFloat(l.debit || 0);
      totalCredit += parseFloat(l.credit || 0);
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Asiento descuadrado. Total Debe (${totalDebit.toFixed(2)}) debe ser igual a Total Haber (${totalCredit.toFixed(2)}).`);
    }

    if (entry.lines.length < 2) {
      throw new Error('Un asiento contable debe tener al menos dos registros (partida doble).');
    }

    // Validar cuentas activas y no acumuladoras (detalle)
    const accounts = this.getAccounts();
    for (let l of entry.lines) {
      const acc = accounts.find(a => a.code === l.accountCode);
      if (!acc) {
        throw new Error(`La cuenta con código ${l.accountCode} no existe.`);
      }
      if (!acc.active) {
        throw new Error(`La cuenta ${acc.code} - ${acc.name} está inactiva.`);
      }
      if (acc.summary) {
        throw new Error(`La cuenta ${acc.code} - ${acc.name} es de tipo acumuladora (resumen). Solo se permite registrar movimientos en cuentas de detalle.`);
      }
    }

    const entries = this.getEntries();
    if (entry.id) {
      // Editar
      const idx = entries.findIndex(e => e.id === entry.id);
      if (idx > -1) {
        // Si está confirmado o anulado, validar que no se pueda modificar salvo que sea administrador
        const oldEntry = entries[idx];
        const user = this.getCurrentUser();
        if (oldEntry.state === 'Confirmado' && user.role !== 'Administrador') {
          throw new Error('Solo los usuarios con rol de Administrador pueden editar asientos Confirmados.');
        }

        entries[idx] = { ...oldEntry, ...entry };
        this.log('Edición de Asiento', `Asiento N° ${entry.number} modificado`);
      }
    } else {
      // Nuevo
      // Auto-generar correlativo secuencial
      const lastNum = entries.reduce((max, e) => {
        const num = parseInt(e.number);
        return num > max ? num : max;
      }, 0);
      const nextNumStr = String(lastNum + 1).padStart(6, '0');
      
      entry.id = Date.now();
      entry.number = nextNumStr;
      entry.state = entry.state || 'Confirmado';
      
      entries.push(entry);
      this.log('Registro de Asiento', `Nuevo asiento registrado N° ${entry.number}`);
    }

    this.setData(DB_KEYS.ENTRIES, entries);
    return entry;
  },

  anularEntry(id) {
    const entries = this.getEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx > -1) {
      const entry = entries[idx];
      entry.state = 'Anulado';
      this.setData(DB_KEYS.ENTRIES, entries);
      this.log('Anulación de Asiento', `Asiento N° ${entry.number} anulado`);
      return true;
    }
    return false;
  }
};

window.SaintDB = DB;
DB.init();
