export const LOG_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  UPDATE: 'update',
  LOGIN: 'login',
  LOGOUT: 'logout'
};

// Inicializa o banco de dados IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DashboardLogsDB', 1);
    
    request.onerror = (event) => {
      console.error('Erro ao abrir banco de dados:', event);
      reject(event);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('logs')) {
        const store = db.createObjectStore('logs', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('user', 'user', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
  });
};

// Adiciona um log no IndexedDB
export const addLog = async (type, message, details = null) => {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    
    const logEntry = {
      type,
      message,
      details: details ? JSON.stringify(details) : null,
      user: auth.user || 'sistema',
      timestamp: new Date().toISOString()
    };
    
    const db = await initDB();
    const tx = db.transaction('logs', 'readwrite');
    const store = tx.objectStore('logs');
    
    await store.add(logEntry);
    
    // Salva também no localStorage como backup
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    logs.push(logEntry);
    localStorage.setItem('systemLogs', JSON.stringify(logs));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${type.toUpperCase()}] ${message}`, details || '');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao adicionar log:', error);
    return false;
  }
};

// Obtém todos os logs
export const getLogs = async () => {
  try {
    const db = await initDB();
    const tx = db.transaction('logs', 'readonly');
    const store = tx.objectStore('logs');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const logs = request.result;
        resolve(logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      };
      
      request.onerror = (event) => {
        console.error('Erro ao obter logs:', event);
        
        // Fallback para localStorage
        const localLogs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
        resolve(localLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      };
    });
  } catch (error) {
    console.error('Erro ao obter logs do IndexedDB:', error);
    
    // Fallback para localStorage - CORRIGIDO: Removido parêntese extra
    const localLogs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    return localLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
};

// Exporta logs para um arquivo
export const exportLogs = async () => {
  try {
    const logs = await getLogs();
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `logs_sistema_${date}.json`;
    
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
    await addLog(LOG_TYPES.INFO, `Logs exportados para ${filename}`);
    return true;
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    return false;
  }
};

// Importa logs de um arquivo
export const importLogs = async (file) => {
  try {
    const text = await file.text();
    const logs = JSON.parse(text);
    
    const db = await initDB();
    const tx = db.transaction('logs', 'readwrite');
    const store = tx.objectStore('logs');
    
    // Adiciona logs um por um
    for (const log of logs) {
      // Remove ID para evitar conflitos
      const { id, ...logData } = log;
      await store.add(logData);
    }
    
    await addLog(LOG_TYPES.INFO, `${logs.length} logs importados de ${file.name}`);
    return true;
  } catch (error) {
    console.error('Erro ao importar logs:', error);
    return false;
  }
};