// src/utils/permanentLogger.js
import { openDB } from 'idb';

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
        clientInfo: auth.clientInfo || {}
      };

      const db = await this.dbPromise;
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      
      await store.add(logEntry);
      await tx.done;

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

      const oldLogsCursor = await index.openCursor(range);

      while (oldLogsCursor) {
        store.delete(oldLogsCursor.primaryKey);
        await oldLogsCursor.continue();
      }

      await tx.done;
    } catch (error) {
      console.error('Erro ao limpar logs antigos:', error);
    }
  }
}

export default new PermanentLogger();