import { getAuth } from '../auth/auth';

export const LOG_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  UPDATE: 'update',
  LOGIN: 'login',
  LOGOUT: 'logout'
};

export const log = async (type, message, details = null) => {
  try {
    const auth = getAuth() || {};
    
    const logEntry = {
      type,
      message,
      details: details ? JSON.stringify(details) : null,
      user: auth.user || 'sistema',
      timestamp: new Date().toISOString()
    };
    
    await fetch('/api/updateLogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${type.toUpperCase()}] ${message}`, details || '');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao adicionar log:', error);
    return false;
  }
};

export const getLogs = async () => {
  try {
    const response = await fetch('/data/system-logs.json');
    if (!response.ok) throw new Error('Falha ao carregar logs');
    
    const logs = await response.json();
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    return [];
  }
};

export const exportLogs = async () => {
  try {
    // Carregar logs do servidor
    const response = await fetch('/api/logs');
    
    if (!response.ok) {
      throw new Error("Erro ao buscar logs para exportação");
    }
    
    const logs = await response.json();
    
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
    
    log(LOG_TYPES.INFO, `Logs exportados para ${filename}`);
    return true;
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    return false;
  }
};

export const importLogs = async (file) => {
  try {
    const text = await file.text();
    const logsFromFile = JSON.parse(text);
    
    // Enviar para o servidor
    const response = await fetch('/api/logs/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logsFromFile),
    });
    
    if (!response.ok) {
      throw new Error('Falha ao importar logs para o servidor');
    }
    
    const result = await response.json();
    
    log(LOG_TYPES.INFO, `${result.imported} logs importados de ${file.name}`);
    return true;
  } catch (error) {
    console.error('Erro ao importar logs:', error);
    return false;
  }
};

export const addLog = log;

const logger = {
  log,
  addLog,
  getLogs,
  exportLogs,
  importLogs,
  LOG_TYPES
};

export default logger;