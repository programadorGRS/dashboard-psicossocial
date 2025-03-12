// src/utils/permanentLogger.js
import { openDB } from 'idb';

export const LOG_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  UPDATE: 'update',
  LOGIN: 'login',
  LOGOUT: 'logout',
  SYSTEM: 'system',
  ACCESS: 'access',
  SECURITY: 'security'
};

// Função para determinar nível de risco com base na média
export const determinarNivel = (media) => {
  if (media <= 2) return "Baixo";
  if (media <= 2.5) return "Moderado Baixo";
  if (media <= 3.5) return "Moderado";
  if (media <= 4) return "Moderado Alto";
  return "Alto";
};

class PermanentLogger {
  constructor() {
    this.dbPromise = this.initDatabase();
  }

  async initDatabase() {
    return openDB('DashboardLogsDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('logs')) {
          const store = db.createObjectStore('logs', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // Criar índices para pesquisa eficiente
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('user', 'user', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      }
    });
  }

  async log(type, message, details = null) {
    try {
      // Obter informações do usuário autenticado
      const auth = JSON.parse(localStorage.getItem('auth') || '{}');
      
      const logEntry = {
        type,
        message,
        details: details ? JSON.stringify(details) : null,
        user: auth.user || 'sistema',
        timestamp: new Date().toISOString(),
        userRole: auth.role || 'não autenticado',
        clientInfo: {
          ip: auth.clientInfo?.ip || 'não identificado',
          navegador: navigator.userAgent
        }
      };

      const db = await this.dbPromise;
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      
      await store.add(logEntry);
      await tx.done;

      // Log no console em ambiente de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log(`[${type.toUpperCase()}] ${message}`, details || '');
      }

      return logEntry;
    } catch (error) {
      console.error('Erro ao registrar log permanente:', error);
      return null;
    }
  }

  async getLogs(filters = {}) {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction('logs', 'readonly');
      const store = tx.objectStore('logs');

      let logs = await store.getAll();

      // Aplicar filtros
      if (filters.type) {
        logs = logs.filter(log => log.type === filters.type);
      }

      if (filters.user) {
        logs = logs.filter(log => log.user === filters.user);
      }

      if (filters.startDate) {
        const start = new Date(filters.startDate).getTime();
        logs = logs.filter(log => new Date(log.timestamp).getTime() >= start);
      }

      if (filters.endDate) {
        const end = new Date(filters.endDate).getTime();
        logs = logs.filter(log => new Date(log.timestamp).getTime() <= end);
      }

      // Ordenar por timestamp decrescente
      return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Erro ao recuperar logs:', error);
      return [];
    }
  }

  async exportLogs() {
    try {
      const logs = await this.getLogs();
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs_dashboard_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);

      return true;
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      return false;
    }
  }

  async clearOldLogs(daysToKeep = 90) {
    try {
      const db = await this.dbPromise;
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoffDate.toISOString());

      let deletedCount = 0;
      const cursor = await index.openCursor(range);

      while (cursor) {
        store.delete(cursor.primaryKey);
        deletedCount++;
        await cursor.continue();
      }

      await tx.done;

      console.log(`Logs antigos removidos: ${deletedCount}`);
      return deletedCount;
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error);
      return 0;
    }
  }
}

const logger = new PermanentLogger();

// Exportações para permitir importações diferentes
export const addLog = (...args) => logger.log(...args);
export const getLogs = (...args) => logger.getLogs(...args);
export const exportLogs = (...args) => logger.exportLogs(...args);
export const clearOldLogs = (...args) => logger.clearOldLogs(...args);

export default logger;