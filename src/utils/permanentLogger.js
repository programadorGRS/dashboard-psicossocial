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
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    
    const logEntry = {
      type,
      message,
      details: details ? JSON.stringify(details) : null,
      user: auth.user || 'sistema',
      timestamp: new Date().toISOString()
    };
    
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    logs.push(logEntry);
    
    if (logs.length > 500) {
      logs.splice(0, logs.length - 500);
    }
    
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

export const getLogs = () => {
  try {
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    return [];
  }
};

export const exportLogs = () => {
  try {
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    
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
    
    const currentLogs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    
    const existingIds = new Set(currentLogs.map(log => log.id));
    const newLogs = logsFromFile.filter(log => !existingIds.has(log.id));
    
    const mergedLogs = [...currentLogs, ...newLogs];
    
    if (mergedLogs.length > 5000) {
      mergedLogs.splice(0, mergedLogs.length - 5000);
    }
    
    localStorage.setItem('systemLogs', JSON.stringify(mergedLogs));
    
    log(LOG_TYPES.INFO, `${newLogs.length} logs importados de ${file.name}`);
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