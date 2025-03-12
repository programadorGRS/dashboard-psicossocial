import React, { useState, useEffect, useCallback } from 'react';
import { getLogs, getFilteredLogs, exportLogs, LOG_TYPES } from '../utils/logger';

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ type: '', user: '', startDate: '', endDate: '' });
  
  const loadLogs = useCallback(() => {
    const { type, user, startDate, endDate } = filter;
    
    if (type || user || startDate || endDate) {
      const filteredLogs = getFilteredLogs(
        type || null,
        user || null,
        startDate || null,
        endDate || null
      );
      setLogs(filteredLogs);
    } else {
      setLogs(getLogs());
    }
  }, [filter]);
  
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };
  
  const applyFilter = (e) => {
    e.preventDefault();
    loadLogs();
  };
  
  const clearFilter = () => {
    setFilter({ type: '', user: '', startDate: '', endDate: '' });
    setLogs(getLogs());
  };
  
  const handleExport = () => {
    if (exportLogs()) {
      alert('Logs exportados com sucesso!');
    } else {
      alert('Erro ao exportar logs. Verifique o console para mais detalhes.');
    }
  };
  
  // Obter lista de usuários únicos
  const uniqueUsers = [...new Set(logs.map(log => log.user))];
  
  // Função para formatar data/hora
  const formatDateTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return timestamp;
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Logs do Sistema</h2>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Exportar Logs
        </button>
      </div>
      
      {/* Filtros */}
      <form onSubmit={applyFilter} className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              name="type"
              value={filter.type}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Todos</option>
              {Object.values(LOG_TYPES).map(type => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
            <select
              name="user"
              value={filter.user}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Todos</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              name="startDate"
              value={filter.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              name="endDate"
              value={filter.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="flex justify-end mt-4 space-x-2">
          <button
            type="button"
            onClick={clearFilter}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Limpar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Aplicar Filtros
          </button>
        </div>
      </form>
      
      {/* Tabela de Logs */}
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(log.timestamp)}
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
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhum log encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Total de logs: {logs.length}
      </div>
    </div>
  );
};

export default LogViewer;