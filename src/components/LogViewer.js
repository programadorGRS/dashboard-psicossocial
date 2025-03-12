// src/components/LogViewer.js
import React, { useState, useEffect } from 'react';
import PermanentLogger from '../utils/permanentLogger';
import { LOG_TYPES } from '../utils/logTypes';
import { canAccessLogs } from '../auth/auth';

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({
    type: '',
    user: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  // Verificar permissão de acesso
  if (!canAccessLogs()) {
    return (
      <div className="bg-red-100 p-4 rounded text-red-800">
        Acesso negado. Apenas administradores podem visualizar logs.
      </div>
    );
  }

  // Carregar logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const fetchedLogs = await PermanentLogger.getLogs(filter);
        setLogs(fetchedLogs);
      } catch (error) {
        console.error('Erro ao buscar logs:', error);
      }
    };

    fetchLogs();
  }, [filter]);

  // Paginação
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);

  // Alterar página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Exportar logs
  const handleExport = async () => {
    try {
      await PermanentLogger.exportLogs();
      alert('Logs exportados com sucesso!');
    } catch (error) {
      console.error('Erro na exportação:', error);
      alert('Erro ao exportar logs.');
    }
  };

  // Limpar logs antigos
  const handleClearOldLogs = async () => {
    try {
      await PermanentLogger.clearOldLogs();
      alert('Logs antigos removidos com sucesso!');
      // Recarregar logs
      const fetchedLogs = await PermanentLogger.getLogs(filter);
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Erro ao limpar logs:', error);
      alert('Erro ao remover logs antigos.');
    }
  };

  // Renderização
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Logs do Sistema</h2>
        <div className="space-x-2">
          <button 
            onClick={handleExport}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Exportar Logs
          </button>
          <button 
            onClick={handleClearOldLogs}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Limpar Logs Antigos
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <select 
          value={filter.type}
          onChange={(e) => setFilter({...filter, type: e.target.value})}
          className="border rounded p-2"
        >
          <option value="">Todos os Tipos</option>
          {Object.values(LOG_TYPES).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <input 
          type="text"
          placeholder="Usuário"
          value={filter.user}
          onChange={(e) => setFilter({...filter, user: e.target.value})}
          className="border rounded p-2"
        />

        <input 
          type="date"
          value={filter.startDate}
          onChange={(e) => setFilter({...filter, startDate: e.target.value})}
          className="border rounded p-2"
        />

        <input 
          type="date"
          value={filter.endDate}
          onChange={(e) => setFilter({...filter, endDate: e.target.value})}
          className="border rounded p-2"
        />
      </div>

      {/* Tabela de Logs */}
      <div className="overflow-x-auto">
        <table className="w-full bg-white">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-3 text-left">Tipo</th>
              <th className="p-3 text-left">Usuário</th>
              <th className="p-3 text-left">Mensagem</th>
              <th className="p-3 text-left">Data/Hora</th>
            </tr>
          </thead>
          <tbody>
            {currentLogs.map((log, index) => (
              <tr key={index} className="border-b">
                <td className="p-3">{log.type}</td>
                <td className="p-3">{log.user}</td>
                <td className="p-3">{log.message}</td>
                <td className="p-3">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex justify-between items-center mt-4">
        <span>Total de logs: {logs.length}</span>
        <div className="space-x-2">
          {[...Array(Math.ceil(logs.length / logsPerPage)).keys()].map(number => (
            <button 
              key={number} 
              onClick={() => paginate(number + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === number + 1 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {number + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogViewer;