// Sistema de logs para rastrear atividades no dashboard

// Tipos de logs
export const LOG_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  UPDATE: 'update',
  LOGIN: 'login',
  LOGOUT: 'logout'
};

// Função para adicionar um log
export const addLog = (type, message, details = null) => {
  try {
    // Obter a autenticação atual
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    
    // Criar entrada de log
    const logEntry = {
      type,
      message,
      details,
      user: auth.user || 'sistema',
      timestamp: new Date().toISOString()
    };
    
    // Carregar logs existentes
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    
    // Adicionar novo log
    logs.push(logEntry);
    
    // Limitar a quantidade de logs (mantém os 500 mais recentes)
    if (logs.length > 500) {
      logs.splice(0, logs.length - 500);
    }
    
    // Salvar logs atualizados
    localStorage.setItem('systemLogs', JSON.stringify(logs));
    
    // Também imprimir no console em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${type.toUpperCase()}] ${message}`, details || '');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao adicionar log:', error);
    return false;
  }
};

// Função para obter todos os logs
export const getLogs = () => {
  try {
    return JSON.parse(localStorage.getItem('systemLogs') || '[]');
  } catch (error) {
    console.error('Erro ao obter logs:', error);
    return [];
  }
};

// Função para obter logs filtrados
export const getFilteredLogs = (type = null, user = null, startDate = null, endDate = null) => {
  try {
    let logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    
    if (type) {
      logs = logs.filter(log => log.type === type);
    }
    
    if (user) {
      logs = logs.filter(log => log.user === user);
    }
    
    if (startDate) {
      const start = new Date(startDate).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() <= end);
    }
    
    return logs;
  } catch (error) {
    console.error('Erro ao filtrar logs:', error);
    return [];
  }
};

// Função para exportar logs
export const exportLogs = () => {
  try {
    const logs = JSON.parse(localStorage.getItem('systemLogs') || '[]');
    
    // Criar nome de arquivo com data atual
    const date = new Date().toISOString().split('T')[0];
    const filename = `logs_sistema_${date}.json`;
    
    // Criar blob com dados dos logs
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    
    // Criar URL para download
    const url = URL.createObjectURL(blob);
    
    // Criar link de download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Limpar
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
    return true;
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    return false;
  }
};
