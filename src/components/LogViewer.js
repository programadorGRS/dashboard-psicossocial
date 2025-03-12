import React, { useState, useEffect } from 'react';
import { isAdmin } from '../auth/auth';
import { getLogs, exportLogs, importLogs, addLog, LOG_TYPES } from '../utils/permanentLogger';

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: '',
    search: '',
    startDate: '',
    endDate: ''
  });
  
  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await getLogs();
      
      let filteredLogs = allLogs;
      
      if (filter.type) {
        filteredLogs = filteredLogs.filter(log => log.type === filter.type);
      }
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(searchLower) ||
          log.user.toLowerCase().includes(searchLower)
        );
      }
      
      if (filter.startDate) {
        const startDate = new Date(filter.startDate);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startDate);
      }
      
      if (filter.endDate) {
        const endDate = new Date(filter.endDate);
        endDate.setHours(23, 59, 59, 999);
        filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endDate);
      }
      
      setLogs(filteredLogs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 60000);
    return () => clearInterval(interval);
  }, [filter]);
  
  if (!isAdmin()) {
    return (
      <div className="bg-red-100 p-4 rounded text-red-800">
        Acesso negado. Apenas administradores podem visualizar logs.
      </div>
    );
  }
  
  const handleExport = async () => {
    try {
      await exportLogs();
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      alert('Erro ao exportar logs.');
    }
  };
  
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      await importLogs(file);
      await loadLogs();
      alert('Logs importados com sucesso!');
    } catch (error) {
      console.error('Erro ao importar logs:', error);
      alert('Erro ao importar logs.');
    }
    
    e.target.value = null;
  };
  
  const handleAddTestLog = async () => {
    await addLog(LOG_TYPES.INFO, 'Log de teste gerado manualmente');
    loadLogs();
  };
  
  if (loading && logs.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Carregando logs...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Logs do Sistema</h2>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleAddTestLog}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Gerar Log Teste
          </button>
          
          <button 
            onClick={handleExport}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Exportar
          </button>
          
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button 
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              Importar
            </button>
          </div>
        </div>
      </div>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Log</label>
          <select
            value={filter.type}
            onChange={(e) => setFilter({...filter, type: e.target.value})}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">Todos</option>
            <option value="info">Informação</option>
            <option value="warning">Aviso</option>
            <option value="error">Erro</option>
            <option value="update">Atualização</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <input 
            type="text" 
            value={filter.search}
            onChange={(e) => setFilter({...filter, search: e.target.value})}
            placeholder="Buscar mensagens..."
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
          <input 
            type="date" 
            value={filter.startDate}
            onChange={(e) => setFilter({...filter, startDate: e.target.value})}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
          <input 
            type="date" 
            value={filter.endDate}
            onChange={(e) => setFilter({...filter, endDate: e.target.value})}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>
      
      {logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhum log encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mensagem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log, index) => (
                <tr key={log.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${log.type === 'error' ? 'bg-red-100 text-red-800' : 
                        log.type === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                        log.type === 'login' || log.type === 'logout' ? 'bg-blue-100 text-blue-800' :
                        log.type === 'update' ? 'bg-green-100 text-green-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {log.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.user}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.message}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.details && (
                      <div className="max-w-xs truncate">
                        {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        Total de logs: {logs.length}
      </div>
    </div>
  );
};

export default LogViewer;