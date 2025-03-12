import React, { useState, useEffect, useCallback } from 'react';
import { getLogs, exportLogs, LOG_TYPES } from '../utils/permanentLogger';
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

  // Move the access check before hooks
  if (!canAccessLogs()) {
    return (
      <div className="bg-red-100 p-4 rounded text-red-800">
        Acesso negado. Apenas administradores podem visualizar logs.
      </div>
    );
  }

  // Use useCallback to memoize the load function
  const loadLogs = useCallback(async () => {
    try {
      const fetchedLogs = await getLogs(filter);
      setLogs(fetchedLogs);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    }
  }, [filter]);

  // Use useEffect to load logs when filter changes
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Paginação
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);

  // Alterar página
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Exportar logs
  const handleExport = async () => {
    try {
      await exportLogs();
      alert('Logs exportados com sucesso!');
    } catch (error) {
      console.error('Erro na exportação:', error);
      alert('Erro ao exportar logs.');
    }
  };

  // Resto do componente permanece igual
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      {/* Conteúdo do componente */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Logs do Sistema</h2>
        <button 
          onClick={handleExport}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Exportar Logs
        </button>
      </div>

      {/* Filtros e tabela de logs (código anterior) */}
      
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
            {currentLogs.map((log, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogViewer;