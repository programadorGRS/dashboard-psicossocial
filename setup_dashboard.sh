#!/bin/bash

# Script para criar o Dashboard de Mapeamento de Fatores Psicossociais
# Desenvolvido para Linux

echo "======================================================"
echo "  Configuração do Dashboard de Fatores Psicossociais  "
echo "======================================================"

# Criando diretório para logs
mkdir -p ./logs
LOG_FILE="./logs/instalacao_$(date +%Y%m%d_%H%M%S).log"
echo "Iniciando instalação: $(date)" > $LOG_FILE

# Função para registrar logs
log() {
  echo "$1"
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" >> $LOG_FILE
}

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
  log "Node.js não encontrado. Instalando..."
  
  # Instalar o NVM (Node Version Manager)
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
  
  # Carregar o NVM
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  
  # Instalar a versão LTS do Node.js
  nvm install --lts
  
  log "Node.js instalado: $(node -v)"
else
  log "Node.js já instalado: $(node -v)"
fi

# Definir o nome do projeto
PROJECT_NAME="dashboard-psicossocial"
PROJECT_DIR="$(pwd)/$PROJECT_NAME"

# Criar o projeto React
if [ -d "$PROJECT_DIR" ]; then
  log "Diretório do projeto já existe. Removendo..."
  rm -rf "$PROJECT_DIR"
fi

log "Criando novo projeto React: $PROJECT_NAME"
npx create-react-app "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Instalar dependências
log "Instalando dependências..."
npm install recharts lodash xlsx tailwindcss@3.3.3 postcss autoprefixer

# Configurar Tailwind CSS
log "Configurando Tailwind CSS..."
npx tailwindcss init -p

# Criar estrutura de diretórios
mkdir -p src/components
mkdir -p src/utils
mkdir -p src/data
mkdir -p src/logs
mkdir -p src/auth
mkdir -p public/uploads

# Configurar o arquivo tailwind.config.js
cat > tailwind.config.js << 'EOL'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOL

# Atualizar o arquivo index.css com as diretivas do Tailwind
cat > src/index.css << 'EOL'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
EOL

# Criar o arquivo de autenticação
cat > src/auth/auth.js << 'EOL'
// Sistema de autenticação simples baseado em chaves secretas

// Chaves secretas predefinidas
const VALID_KEYS = {
  "admin": "@Grs2025@",
  "cliente": "grscliente"
};

// Função para verificar uma chave
export const validateKey = (user, key) => {
  if (!user || !key) return false;
  
  const validKey = VALID_KEYS[user];
  return validKey === key;
};

// Função para login
export const login = (user, key) => {
  if (validateKey(user, key)) {
    const userData = {
      user,
      role: user === 'admin' ? 'administrador' : 'cliente',
      loginTime: new Date().toISOString()
    };
    
    // Salvar dados de autenticação no localStorage
    localStorage.setItem('auth', JSON.stringify(userData));
    
    // Registrar login nos logs
    addLog('login', `Usuário ${user} realizou login com sucesso`);
    
    return userData;
  }
  
  // Registrar tentativa de login falha
  addLog('error', `Tentativa de login falha para usuário: ${user}`);
  return null;
};

// Função para logout
export const logout = () => {
  const auth = getAuth();
  if (auth) {
    addLog('logout', `Usuário ${auth.user} realizou logout`);
  }
  
  localStorage.removeItem('auth');
  return true;
};

// Verificar se o usuário está autenticado
export const getAuth = () => {
  const authData = localStorage.getItem('auth');
  return authData ? JSON.parse(authData) : null;
};

// Verificar se o usuário é administrador
export const isAdmin = () => {
  const auth = getAuth();
  return auth && auth.role === 'administrador';
};

// Adicionar log de autenticação
const addLog = (type, message) => {
  try {
    const logEntry = {
      type,
      message,
      timestamp: new Date().toISOString()
    };
    
    // Carregar logs existentes
    const logs = JSON.parse(localStorage.getItem('authLogs') || '[]');
    
    // Adicionar novo log
    logs.push(logEntry);
    
    // Limitar a quantidade de logs (mantém os 100 mais recentes)
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    // Salvar logs atualizados
    localStorage.setItem('authLogs', JSON.stringify(logs));
  } catch (error) {
    console.error('Erro ao adicionar log de autenticação:', error);
  }
};
EOL

# Criar o componente de login
cat > src/components/Login.js << 'EOL'
import React, { useState } from 'react';
import { login } from '../auth/auth';

const Login = ({ onLoginSuccess }) => {
  const [user, setUser] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const userData = login(user, key);
    if (userData) {
      onLoginSuccess(userData);
    } else {
      setError('Usuário ou chave secreta inválidos');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h2>
          <h3 className="text-xl text-gray-600">Mapeamento de Fatores Psicossociais</h3>
          <p className="mt-2 text-gray-500">GRS+Núcleo</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="user">
              Usuário
            </label>
            <select
              id="user"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              required
            >
              <option value="">Selecione o usuário</option>
              <option value="admin">Administrador</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="key">
              Chave Secreta
            </label>
            <input
              id="key"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Digite a chave secreta"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
EOL

# Criar o sistema de logs
cat > src/utils/logger.js << 'EOL'
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
EOL

# Criar o componente de visualização de logs
cat > src/components/LogViewer.js << 'EOL'
import React, { useState, useEffect } from 'react';
import { getLogs, getFilteredLogs, exportLogs, LOG_TYPES } from '../utils/logger';

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState({ type: '', user: '', startDate: '', endDate: '' });
  
  useEffect(() => {
    loadLogs();
  }, []);
  
  const loadLogs = () => {
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
  };
  
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
EOL

# Criar o serviço de dados
cat > src/utils/dataService.js << 'EOL'
import * as XLSX from 'xlsx';
import _ from 'lodash';
import { addLog, LOG_TYPES } from './logger';

// Diretório onde os dados serão salvos
const DATA_KEY = 'dashboardData';

// Função para determinar nível de risco com base na média
export const determinarNivel = (media) => {
  if (media <= 2) return "Baixo";
  if (media <= 2.5) return "Moderado Baixo";
  if (media <= 3.5) return "Moderado";
  if (media <= 4) return "Moderado Alto";
  return "Alto";
};

// Função para processar o arquivo XLSX e gerar o JSON
export const processarArquivoXLSX = async (arquivo) => {
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {
            cellStyles: true,
            cellFormulas: true,
            cellDates: true,
            cellNF: true,
            sheetStubs: true
          });
          
          // Usar a primeira planilha
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Verificar se temos dados
          if (!jsonData || jsonData.length === 0) {
            throw new Error("Nenhum dado encontrado na planilha.");
          }
          
          // Extrair funções e setores
          const funcoes = _.countBy(jsonData, 'Qual sua função?');
          const setores = _.countBy(jsonData, 'Qual seu setor?');
          
          // Identificar perguntas de avaliação
          const perguntas = Object.keys(jsonData[0]).filter(key => 
            key !== 'ID' && 
            key !== 'Hora de início' && 
            key !== 'Hora de conclusão' && 
            key !== 'Email' && 
            key !== 'Nome' &&
            key !== 'Hora da última modificação' &&
            key !== 'Qual sua função?' && 
            key !== 'Qual seu setor?'
          );
          
          // Calcular médias por pergunta
          const mediasPorPergunta = {};
          perguntas.forEach(pergunta => {
            const valores = jsonData.map(item => item[pergunta]).filter(val => val !== undefined && val !== null);
            mediasPorPergunta[pergunta] = _.mean(valores);
          });
          
          // Definir categorias e suas descrições
          const categoriasConfig = {
            'Demandas': {
              descricao: 'Abrange aspectos como carga de trabalho, intensidade, velocidade, pausas e prazos. Reflete o quanto as exigências de trabalho podem estar impactando o colaborador.',
              keywords: ['prazos', 'intensamente', 'muita coisa', 'rapidez', 'muita rapidez', 'pausas', 'pressão']
            },
            'Relacionamentos': {
              descricao: 'Compreende a qualidade das interações interpessoais no ambiente de trabalho, incluindo conflitos, respeito e comunicação entre colegas.',
              keywords: ['conflitos', 'perseguido', 'tensas', 'dura', 'respeito', 'comportam']
            },
            'Controle': {
              descricao: 'Refere-se ao nível de autonomia, participação nas decisões e flexibilidade que o colaborador possui sobre seu próprio trabalho.',
              keywords: ['decidir', 'escolha', 'pausa', 'liberdade', 'sugestões', 'opinião', 'flexível']
            },
            'Apoio': {
              descricao: 'Relaciona-se ao suporte oferecido por colegas e gestores, incluindo confiança, incentivo e disponibilidade para ajuda.',
              keywords: ['suporte', 'confiar', 'apoio', 'ajuda', 'escutar', 'informações', 'incentivo']
            },
            'Clareza': {
              descricao: 'Avalia o quanto as expectativas, responsabilidades e objetivos estão bem definidos e compreendidos pelo colaborador.',
              keywords: ['clareza', 'direcionamento', 'objetivos', 'explicações', 'metas', 'espera', 'encaixa', 'tarefas', 'responsabilidades']
            },
            'Mudanças': {
              descricao: 'Avalia como as mudanças organizacionais são comunicadas e implementadas, e como os colaboradores são envolvidos nesse processo.',
              keywords: ['mudanças', 'consultadas']
            }
          };
          
          // Criar categorias com suas perguntas associadas
          const categorias = {};
          Object.entries(categoriasConfig).forEach(([categoria, config]) => {
            categorias[categoria] = {
              descricao: config.descricao,
              perguntas: perguntas.filter(p => 
                config.keywords.some(keyword => p.toLowerCase().includes(keyword.toLowerCase()))
              )
            };
          });
          
          // Calcular médias por categoria
          const mediasPorCategoria = {};
          const dadosCategoria = [];
          
          for (const [categoria, dadosCateg] of Object.entries(categorias)) {
            const perguntasCategoria = dadosCateg.perguntas;
            const todasRespostas = [];
            
            perguntasCategoria.forEach(pergunta => {
              const valores = jsonData.map(item => item[pergunta]).filter(val => val !== undefined && val !== null);
              todasRespostas.push(...valores);
            });
            
            const media = todasRespostas.length > 0 ? _.mean(todasRespostas) : 0;
            mediasPorCategoria[categoria] = media;
            
            dadosCategoria.push({
              categoria: categoria,
              descricao: dadosCateg.descricao,
              media: media,
              nivel: determinarNivel(media),
              qtdPerguntas: perguntasCategoria.length,
              perguntas: perguntasCategoria
            });
          }
          
          // Formatar dados para gráficos
          const dadosPerguntas = Object.entries(mediasPorPergunta)
            .map(([pergunta, media]) => ({
              pergunta: pergunta,
              perguntaResumida: pergunta.substring(0, 50) + (pergunta.length > 50 ? '...' : ''),
              media: media,
              nivel: determinarNivel(media)
            }))
            .sort((a, b) => b.media - a.media);
          
          const dadosFuncoes = Object.entries(funcoes).map(([funcao, quantidade]) => ({
            name: funcao,
            value: quantidade
          }));

          const dadosSetores = Object.entries(setores).map(([setor, quantidade]) => ({
            name: setor,
            value: quantidade
          }));
          
          // Top 5 perguntas mais críticas
          const perguntasCriticas = dadosPerguntas.slice(0, 5);
          
          // Calcular média geral de todas as perguntas
          const mediaGeral = _.mean(Object.values(mediasPorPergunta));
          
          // Criar o objeto JSON final
          const dadosProcessados = {
            totalRespondentes: jsonData.length,
            dadosFuncoes,
            dadosSetores,
            todasPerguntas: dadosPerguntas,
            perguntasCriticas,
            dadosCategoria,
            categoriasDescricao: Object.fromEntries(
              Object.entries(categorias).map(([key, value]) => [key, value.descricao])
            ),
            mediasPorCategoria,
            mediasPorPergunta,
            mediaGeral,
            dataAtualizacao: new Date().toISOString(),
            nomeArquivo: arquivo.name
          };
          
          // Registrar log de processamento bem-sucedido
          addLog(
            LOG_TYPES.UPDATE, 
            `Arquivo processado com sucesso: ${arquivo.name}`, 
            {
              totalRespondentes: jsonData.length,
              totalPerguntas: perguntas.length,
              mediaGeral
            }
          );
          
          resolve(dadosProcessados);
        } catch (error) {
          addLog(LOG_TYPES.ERROR, `Erro ao processar arquivo: ${error.message}`);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        addLog(LOG_TYPES.ERROR, `Erro ao ler arquivo: ${error}`);
        reject(new Error("Erro ao ler o arquivo."));
      };
      
      reader.readAsArrayBuffer(arquivo);
    });
  } catch (error) {
    addLog(LOG_TYPES.ERROR, `Erro no processamento: ${error.message}`);
    throw error;
  }
};

// Função para salvar dados
export const salvarDados = (dados) => {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(dados));
    
    // Criar uma cópia também em um arquivo JSON para persistência adicional
    const dadosJSON = JSON.stringify(dados);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(dadosJSON);
    
    // Criar link para download automático
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "dashboard_dados.json");
    document.body.appendChild(downloadAnchorNode); // necessário para Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    addLog(LOG_TYPES.INFO, "Dados salvos com sucesso");
    return true;
  } catch (error) {
    addLog(LOG_TYPES.ERROR, `Erro ao salvar dados: ${error.message}`);
    return false;
  }
};

// Função para carregar dados
export const carregarDados = () => {
  try {
    const dados = localStorage.getItem(DATA_KEY);
    return dados ? JSON.parse(dados) : null;
  } catch (error) {
    addLog(LOG_TYPES.ERROR, `Erro ao carregar dados: ${error.message}`);
    return null;
  }
};

// Função para importar dados de um arquivo
export const importarDados = (arquivo) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const conteudo = e.target.result;
        const dados = JSON.parse(conteudo);
        
        // Validar estrutura básica dos dados
        if (!dados.totalRespondentes || !dados.mediaGeral || !dados.todasPerguntas) {
          throw new Error("Arquivo JSON inválido ou incompatível.");
        }
        
        // Atualizar a data de importação
        dados.dataAtualizacao = new Date().toISOString();
        
        // Salvar os dados
        localStorage.setItem(DATA_KEY, JSON.stringify(dados));
        
        addLog(
          LOG_TYPES.UPDATE, 
          `Dados importados com sucesso de: ${arquivo.name}`, 
          {
            totalRespondentes: dados.totalRespondentes,
            dataOriginal: dados.dataAtualizacao
          }
        );
        
        resolve(dados);
      } catch (error) {
        addLog(LOG_TYPES.ERROR, `Erro ao importar dados: ${error.message}`);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Erro ao ler o arquivo."));
    };
    
    reader.readAsText(arquivo);
  });
};

// Função para exportar dados atuais
export const exportarDados = () => {
  try {
    const dados = localStorage.getItem(DATA_KEY);
    
    if (!dados) {
      throw new Error("Nenhum dado disponível para exportação.");
    }
    
    // Criar nome de arquivo com data atual
    const date = new Date().toISOString().split('T')[0];
    const filename = `dashboard_dados_${date}.json`;
    
    // Criar blob com dados
    const blob = new Blob([dados], { type: 'application/json' });
    
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
    
    addLog(LOG_TYPES.INFO, `Dados exportados com sucesso: ${filename}`);
    return true;
  } catch (error) {
    addLog(LOG_TYPES.ERROR, `Erro ao exportar dados: ${error.message}`);
    return false;
  }
};
EOL

# Criar o componente principal do Dashboard
cat > src/components/Dashboard.js << 'EOL'
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import _ from 'lodash';
import { getAuth, logout } from '../auth/auth';
import { addLog, LOG_TYPES } from '../utils/logger';
import { processarArquivoXLSX, salvarDados, carregarDados, exportarDados, importarDados, determinarNivel } from '../utils/dataService';
import LogViewer from './LogViewer';

// Cores para o dashboard
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const NIVEL_CORES = ['#00C49F', '#82ca9d', '#FFBB28', '#FF8042', '#FF0000'];

// Componente principal do Dashboard
const Dashboard = ({ onLogout }) => {
  const [dadosJSON, setDadosJSON] = useState(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const [perguntasVisiveis, setPerguntasVisiveis] = useState(10);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const [dataAtualizacao, setDataAtualizacao] = useState(new Date());
  const [exibirModalUpload, setExibirModalUpload] = useState(false);
  const [exibirLogs, setExibirLogs] = useState(false);
  const [usuario, setUsuario] = useState(null);
  
  // Efeito para carregar informações do usuário
  useEffect(() => {
    const auth = getAuth();
    if (auth) {
      setUsuario(auth);
    }
  }, []);
  
  // Efeito para carregar dados iniciais
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      setCarregando(true);
      
      try {
        // Tentar carregar dados salvos
        const dadosSalvos = carregarDados();
        
        if (dadosSalvos) {
          setDadosJSON(dadosSalvos);
          setDataAtualizacao(new Date(dadosSalvos.dataAtualizacao || new Date()));
          addLog(LOG_TYPES.INFO, "Dados carregados do armazenamento local");
        } else {
          // Se não houver dados salvos, usar dados de demonstração
          const dadosDemo = {
            totalRespondentes: 3,
            dadosFuncoes: [
              { name: "ENGENHEIRO DE SEGURANÇA DO TRABALHO", value: 1 },
              { name: "AUXILIAR ADMINISTRATIVO", value: 1 },
              { name: "GERENTE DE CONTRATOS", value: 1 }
            ],
            dadosSetores: [
              { name: "ENGENHARIA DE SEGURANÇA DO TRABALHO", value: 1 },
              { name: "RH", value: 1 },
              { name: "CONTRATOS", value: 1 }
            ],
            todasPerguntas: [
              {
                pergunta: "Falam ou se comportam comigo de forma dura.",
                perguntaResumida: "Falam ou se comportam comigo de forma dura.",
                media: 3.6666666666666665,
                nivel: "Moderado Alto"
              },
              // Truncado para economizar espaço - em uma implementação real, dados completos
            ],
            perguntasCriticas: [
              {
                pergunta: "Falam ou se comportam comigo de forma dura.",
                perguntaResumida: "Falam ou se comportam comigo de forma dura.",
                media: 3.6666666666666665,
                nivel: "Moderado Alto"
              },
              // Truncado para economizar espaço
            ],
            dadosCategoria: [
              {
                categoria: "Demandas",
                descricao: "Abrange aspectos como carga de trabalho, intensidade, velocidade, pausas e prazos. Reflete o quanto as exigências de trabalho podem estar impactando o colaborador.",
                media: 2.7142857142857144,
                nivel: "Moderado",
                qtdPerguntas: 7,
                perguntas: [
                  "Tenho prazos impossíveis de cumprir.",
                  // Outros itens truncados
                ]
              },
              // Outras categorias truncadas
            ],
            categoriasDescricao: {
              "Demandas": "Abrange aspectos como carga de trabalho, intensidade, velocidade, pausas e prazos. Reflete o quanto as exigências de trabalho podem estar impactando o colaborador.",
              "Relacionamentos": "Compreende a qualidade das interações interpessoais no ambiente de trabalho, incluindo conflitos, respeito e comunicação entre colegas.",
              "Controle": "Refere-se ao nível de autonomia, participação nas decisões e flexibilidade que o colaborador possui sobre seu próprio trabalho.",
              "Apoio": "Relaciona-se ao suporte oferecido por colegas e gestores, incluindo confiança, incentivo e disponibilidade para ajuda.",
              "Clareza": "Avalia o quanto as expectativas, responsabilidades e objetivos estão bem definidos e compreendidos pelo colaborador.",
              "Mudanças": "Avalia como as mudanças organizacionais são comunicadas e implementadas, e como os colaboradores são envolvidos nesse processo."
            },
            mediasPorCategoria: {
              "Demandas": 2.7142857142857144,
              "Relacionamentos": 3.066666666666667,
              "Controle": 2.9166666666666665,
              "Apoio": 2.611111111111111,
              "Clareza": 2.7142857142857144,
              "Mudanças": 2.888888888888889
            },
            mediaGeral: 2.866666666666667,
            dataAtualizacao: new Date().toISOString()
          };
          
          setDadosJSON(dadosDemo);
          addLog(LOG_TYPES.INFO, "Dados de demonstração carregados");
        }
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        setErro("Não foi possível carregar os dados iniciais.");
        addLog(LOG_TYPES.ERROR, `Erro ao carregar dados iniciais: ${error.message}`);
      } finally {
        setCarregando(false);
      }
    };
    
    carregarDadosIniciais();
  }, []);
  
  // Handler para upload de arquivo
  const handleUploadArquivo = async (evento) => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    
    setCarregando(true);
    setErro(null);
    
    try {
      addLog(LOG_TYPES.INFO, `Iniciando processamento do arquivo: ${arquivo.name}`);
      
      // Processar o arquivo XLSX
      const dadosProcessados = await processarArquivoXLSX(arquivo);
      
      // Atualizar o estado
      setDadosJSON(dadosProcessados);
      setDataAtualizacao(new Date());
      
      // Salvar dados para persistência
      salvarDados(dadosProcessados);
      
      // Fechar o modal de upload
      setExibirModalUpload(false);
      
      addLog(LOG_TYPES.UPDATE, `Arquivo processado e dados atualizados: ${arquivo.name}`);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      setErro(`Erro ao processar o arquivo: ${error.message}`);
      addLog(LOG_TYPES.ERROR, `Erro ao processar arquivo: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };
  
  // Handler para importar dados JSON
  const handleImportarDados = async (evento) => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    
    setCarregando(true);
    setErro(null);
    
    try {
      addLog(LOG_TYPES.INFO, `Iniciando importação de dados: ${arquivo.name}`);
      
      // Importar dados do arquivo JSON
      const dadosImportados = await importarDados(arquivo);
      
      // Atualizar o estado
      setDadosJSON(dadosImportados);
      setDataAtualizacao(new Date());
      
      // Fechar o modal de upload
      setExibirModalUpload(false);
      
      addLog(LOG_TYPES.UPDATE, `Dados importados com sucesso: ${arquivo.name}`);
    } catch (error) {
      console.error("Erro ao importar dados:", error);
      setErro(`Erro ao importar dados: ${error.message}`);
      addLog(LOG_TYPES.ERROR, `Erro ao importar dados: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };
  
  // Handler para exportar dados
  const handleExportarDados = () => {
    if (exportarDados()) {
      addLog(LOG_TYPES.INFO, "Dados exportados com sucesso");
    } else {
      setErro("Erro ao exportar dados");
      addLog(LOG_TYPES.ERROR, "Erro ao exportar dados");
    }
  };
  
  // Handler para logout
  const handleLogout = () => {
    logout();
    onLogout();
  };
  
  // Função para determinar cor do nível
  const corDoNivel = (nivel) => {
    switch(nivel) {
      case "Baixo": return NIVEL_CORES[0];
      case "Moderado Baixo": return NIVEL_CORES[1];
      case "Moderado": return NIVEL_CORES[2];
      case "Moderado Alto": return NIVEL_CORES[3];
      case "Alto": return NIVEL_CORES[4];
      default: return "#888";
    }
  };
  
  // Formatador para tooltips
  const formatarMedia = (value) => [value.toFixed(2), 'Média'];
  
  // Componente de Modal para Upload
  const ModalUpload = () => {
    if (!exibirModalUpload) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-xl font-bold mb-4">Atualizar Dados</h3>
          
          <div className="mb-6">
            <h4 className="font-semibold mb-2">Carregar Planilha XLSX</h4>
            <p className="text-sm text-gray-600 mb-2">Selecione um arquivo XLSX com os dados do mapeamento psicossocial.</p>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleUploadArquivo}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="mb-6 border-t pt-4">
            <h4 className="font-semibold mb-2">Importar Dados JSON</h4>
            <p className="text-sm text-gray-600 mb-2">Alternativamente, você pode importar dados de um arquivo JSON exportado anteriormente.</p>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportarDados}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <button 
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              onClick={() => setExibirModalUpload(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Renderização condicional - Carregando
  if (carregando) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Carregando Dados...</h2>
          <p>Processando informações do mapeamento psicossocial</p>
        </div>
      </div>
    );
  }
  
  // Renderização condicional - Erro
  if (erro) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4 text-red-600">Erro!</h2>
          <p>{erro}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => window.location.reload()}
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }
  
  // Renderização condicional - Sem Dados
  if (!dadosJSON) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Sem dados disponíveis</h2>
          <p>Carregue um arquivo XLSX com os dados do mapeamento psicossocial</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setExibirModalUpload(true)}
          >
            Carregar Arquivo
          </button>
        </div>
      </div>
    );
  }
  
  // Filtrar perguntas por categoria, se uma estiver selecionada
  const perguntasFiltradas = categoriaAtiva 
    ? dadosJSON.todasPerguntas.filter(p => {
        const categoria = dadosJSON.dadosCategoria.find(c => c.categoria === categoriaAtiva);
        return categoria && categoria.perguntas.includes(p.pergunta);
      })
    : dadosJSON.todasPerguntas;
  
  const perguntasExibidas = perguntasFiltradas.slice(0, perguntasVisiveis);
  
  // Dados para o gráfico de distribuição de níveis
  const dadosNiveis = (() => {
    const contagem = _.countBy(dadosJSON.todasPerguntas, 'nivel');
    return Object.entries(contagem).map(([nivel, quantidade]) => ({
      name: nivel,
      value: quantidade,
      color: corDoNivel(nivel)
    }));
  })();
  
  // Encontrar categoria com menor média (ponto forte)
  const categoriaMenorMedia = _.minBy(dadosJSON.dadosCategoria, 'media');
  
  // Identificar os 3 itens com menor média (pontos positivos)
  const perguntasMenorMedia = _.sortBy(dadosJSON.todasPerguntas, 'media').slice(0, 3);
  
  return (
    <div className="bg-gray-50 p-4 min-h-screen">
      <ModalUpload />
      
      <div className="container mx-auto">
        {/* Header com Logo e Botão de Atualização */}
        <div className="flex justify-between items-center mb-4">
          <a 
            href="https://www.grsnucleo.com.br/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-bold text-xl text-blue-800 flex items-center"
          >
            GRS+Núcleo
          </a>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Última atualização: {dataAtualizacao.toLocaleDateString()} às {dataAtualizacao.toLocaleTimeString()}
            </div>
            
            <div className="flex space-x-2">
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => setExibirModalUpload(true)}
              >
                Atualizar
              </button>
              
              <button 
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={handleExportarDados}
              >
                Exportar
              </button>
              
              <button 
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                onClick={() => setExibirLogs(!exibirLogs)}
              >
                {exibirLogs ? 'Ocultar Logs' : 'Ver Logs'}
              </button>
              
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={handleLogout}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
        
        {/* Informações do Usuário */}
        <div className="bg-blue-50 p-3 rounded-lg mb-4 flex justify-between items-center">
          <div>
            <span className="font-semibold">Usuário:</span> {usuario?.user} ({usuario?.role})
          </div>
          <div className="text-sm text-gray-600">
            Login em: {new Date(usuario?.loginTime).toLocaleString()}
          </div>
        </div>
        
        {/* Logs do Sistema (condicional) */}
        {exibirLogs && (
          <div className="mb-6">
            <LogViewer />
          </div>
        )}
        
        {/* Cabeçalho Principal */}
        <header className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard - Mapeamento de Fatores Psicossociais</h1>
          <p className="text-gray-600">Análise baseada em {dadosJSON.totalRespondentes} respondentes e {dadosJSON.todasPerguntas.length} questões avaliadas</p>
        </header>
        
        {/* Indicador Geral */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Indicador Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-blue-600">{dadosJSON.mediaGeral.toFixed(2)}</div>
                    <div className="text-xl mt-2">Média Geral</div>
                    <div className="mt-2 inline-block px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: corDoNivel(determinarNivel(dadosJSON.mediaGeral)) + '30', color: corDoNivel(determinarNivel(dadosJSON.mediaGeral)) }}>
                      {determinarNivel(dadosJSON.mediaGeral)}
                    </div>
                  </div>
                </div>
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke="#eee" 
                    strokeWidth="8"
                  />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke={corDoNivel(determinarNivel(dadosJSON.mediaGeral))}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 45 * (dadosJSON.mediaGeral / 5)} ${2 * Math.PI * 45 * (1 - dadosJSON.mediaGeral / 5)}`}
                    strokeDashoffset={2 * Math.PI * 45 * 0.25}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
              <div className="text-center mt-4">
                <p className="text-gray-600">Este índice representa a média geral de todos os fatores psicossociais avaliados.</p>
                <p className="text-gray-600 mt-2">Escala: 1 (Baixo) a 5 (Alto)</p>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-3">Distribuição por Níveis de Risco</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosNiveis}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {dadosNiveis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} pergunta(s)`, 'Quantidade']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
        
        {/* Categorias */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Categorias de Fatores Psicossociais</h2>
            {categoriaAtiva && (
              <button 
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                onClick={() => setCategoriaAtiva(null)}
              >
                Limpar Filtro
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={80} data={dadosJSON.dadosCategoria}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="categoria" />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} />
                    <Radar name="Média" dataKey="media" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Tooltip formatter={formatarMedia} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="py-2 px-4 border-b text-left">Categoria</th>
                      <th className="py-2 px-4 border-b text-center">Média</th>
                      <th className="py-2 px-4 border-b text-center">Nível</th>
                      <th className="py-2 px-4 border-b text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosJSON.dadosCategoria
                      .sort((a, b) => b.media - a.media)
                      .map((categoria, index) => (
                      <tr 
                        key={index} 
                        className={`${index % 2 === 0 ? 'bg-gray-50' : ''} ${categoriaAtiva === categoria.categoria ? 'bg-blue-50' : ''} hover:bg-gray-100 cursor-pointer`}
                        onClick={() => setCategoriaAtiva(categoriaAtiva === categoria.categoria ? null : categoria.categoria)}
                      >
                        <td className="py-2 px-4 border-b">
                          <div className="font-semibold">{categoria.categoria}</div>
                          <div className="text-xs text-gray-500 mt-1">{categoria.qtdPerguntas} perguntas</div>
                        </td>
                        <td className="py-2 px-4 border-b text-center font-semibold">{categoria.media.toFixed(2)}</td>
                        <td className="py-2 px-4 border-b text-center">
                          <span 
                            className="inline-block rounded px-2 py-1 text-xs font-semibold text-white"
                            style={{ backgroundColor: corDoNivel(categoria.nivel) }}
                          >
                            {categoria.nivel}
                          </span>
                        </td>
                        <td className="py-2 px-4 border-b text-center">
                          <button 
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCategoriaAtiva(categoriaAtiva === categoria.categoria ? null : categoria.categoria);
                            }}
                          >
                            {categoriaAtiva === categoria.categoria ? 'Ocultar' : 'Ver Detalhes'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          {/* Explicação das Categorias */}
          <div className="mt-8">
            <h3 className="font-bold text-lg mb-3">O que significa cada categoria?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dadosJSON.dadosCategoria.map((categoria, index) => (
                <div 
                  key={index} 
                  className="p-4 rounded-lg shadow-sm border-l-4"
                  style={{ borderLeftColor: corDoNivel(categoria.nivel) }}
                >
                  <h4 className="font-semibold text-lg">{categoria.categoria}</h4>
                  <p className="text-sm text-gray-600 mt-1">{categoria.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Categoria Detalhada */}
        {categoriaAtiva && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              Detalhamento da Categoria: {categoriaAtiva}
            </h2>
            
            {(() => {
              const categoria = dadosJSON.dadosCategoria.find(c => c.categoria === categoriaAtiva);
              if (!categoria) return null;
              
              const perguntasCategoria = dadosJSON.todasPerguntas
                .filter(p => categoria.perguntas.includes(p.pergunta))
                .sort((a, b) => b.media - a.media);
              
              return (
                <div>
                  <div className="mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="mb-2"><span className="font-semibold">Descrição:</span> {categoria.descricao}</p>
                      <div className="flex items-center mt-2">
                        <span className="font-semibold mr-2">Nível geral da categoria:</span>
                        <span 
                          className="inline-block rounded px-2 py-1 text-sm font-semibold text-white"
                          style={{ backgroundColor: corDoNivel(categoria.nivel) }}
                        >
                          {categoria.nivel} ({categoria.media.toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-96 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={perguntasCategoria}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 5]} />
                        <YAxis dataKey="perguntaResumida" type="category" width={350} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value) => [value.toFixed(2), 'Média']}
                          labelFormatter={(label) => {
                            const pergunta = perguntasCategoria.find(p => p.perguntaResumida === label);
                            return pergunta ? pergunta.pergunta : label;
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="media" 
                          name="Média" 
                          barSize={20}
                        >
                          {perguntasCategoria.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={corDoNivel(entry.nivel)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* Top Áreas Críticas */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Top 5 Áreas Mais Críticas</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dadosJSON.perguntasCriticas}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 5]} />
                <YAxis dataKey="perguntaResumida" type="category" width={350} tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [value.toFixed(2), 'Média']}
                  labelFormatter={(label) => {
                    const pergunta = dadosJSON.perguntasCriticas.find(p => p.perguntaResumida === label);
                    return pergunta ? pergunta.pergunta : label;
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="media" 
                  fill="#FF8042" 
                  name="Média" 
                  barSize={30}
                  label={{ position: 'right', formatter: (val) => val.toFixed(2) }}
                >
                  {dadosJSON.perguntasCriticas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={corDoNivel(entry.nivel)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Todas as Perguntas */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              Média de Todas as Perguntas
              {categoriaAtiva && ` (Filtrado por: ${categoriaAtiva})`}
            </h2>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="perguntas-visiveis" className="text-sm text-gray-600">Mostrar:</label>
              <select 
                id="perguntas-visiveis" 
                className="border rounded px-2 py-1 text-sm"
                value={perguntasVisiveis}
                onChange={(e) => setPerguntasVisiveis(Number(e.target.value))}
              >
                <option value={10}>10 Perguntas</option>
                <option value={20}>20 Perguntas</option>
                <option value={35}>Todas as Perguntas</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 border-b text-left">Pergunta</th>
                  <th className="py-2 px-4 border-b text-center">Média</th>
                  <th className="py-2 px-4 border-b text-center">Nível</th>
                </tr>
              </thead>
              <tbody>
                {perguntasExibidas.map((pergunta, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-2 px-4 border-b">
                      {pergunta.pergunta}
                    </td>
                    <td className="py-2 px-4 border-b text-center font-bold">{pergunta.media.toFixed(2)}</td>
                    <td className="py-2 px-4 border-b text-center">
                      <span 
                        className="inline-block rounded px-2 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: corDoNivel(pergunta.nivel) }}
                      >
                        {pergunta.nivel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {perguntasFiltradas.length > perguntasVisiveis && (
            <div className="text-center">
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => setPerguntasVisiveis(perguntasVisiveis === perguntasFiltradas.length ? 10 : perguntasFiltradas.length)}
              >
                {perguntasVisiveis === perguntasFiltradas.length 
                  ? "Mostrar Menos" 
                  : `Ver Todas as ${perguntasFiltradas.length} Perguntas`}
              </button>
            </div>
          )}
        </div>
        
        {/* Distribuição por Função e Setor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Distribuição por Função</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosJSON.dadosFuncoes}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name.length > 15 ? name.substring(0, 15) + '...' : name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dadosJSON.dadosFuncoes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [value, props.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Distribuição por Setor</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosJSON.dadosSetores}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name.length > 15 ? name.substring(0, 15) + '...' : name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dadosJSON.dadosSetores.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [value, props.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Análise de Conclusão */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Conclusões e Recomendações</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-lg text-blue-700 mb-2">Visão Geral</h3>
              <p>
                A avaliação psicossocial apresenta um resultado geral de <span className="font-bold">{dadosJSON.mediaGeral.toFixed(2)}</span>, o que indica um nível 
                <span className="font-bold text-orange-600"> {determinarNivel(dadosJSON.mediaGeral)} </span> 
                de fatores psicossociais que podem impactar a saúde e bem-estar dos colaboradores. 
                Este resultado sugere que, embora existam pontos de atenção, a organização mantém um ambiente razoavelmente equilibrado.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg text-red-700 mb-2">Pontos de Atenção Prioritária</h3>
              <ul className="list-disc pl-5">
                {dadosJSON.perguntasCriticas.slice(0, 3).map((item, index) => (
                  <li key={index} className="mb-1">
                    <span className="font-semibold">{item.pergunta}</span>
                    <span className="ml-2 text-red-600 font-bold">({item.media.toFixed(2)})</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                Estes itens apresentam médias elevadas e requerem atenção prioritária para melhorar o ambiente psicossocial.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg text-green-700 mb-2">Pontos Fortes</h3>
              <p>
                A dimensão <span className="font-bold">{categoriaMenorMedia.categoria}</span> apresenta a menor pontuação média ({categoriaMenorMedia.media.toFixed(2)}), 
                indicando uma área onde a organização apresenta melhores práticas.
              </p>
              <p className="mt-2">
                Os seguintes itens apresentaram as menores médias, representando pontos positivos:
              </p>
              <ul className="list-disc pl-5 mt-1">
                {perguntasMenorMedia.map((item, index) => (
                  <li key={index} className="mb-1">
                    <span className="font-semibold">{item.pergunta}</span>
                    <span className="ml-2 text-green-600 font-bold">({item.media.toFixed(2)})</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-lg text-orange-700 mb-2">Recomendações</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-bold text-blue-800 mb-1">Relacionamentos</h4>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Implementar treinamentos em comunicação assertiva e resolução de conflitos</li>
                    <li>Estabelecer política de tolerância zero para comportamentos desrespeitosos</li>
                    <li>Promover atividades de integração entre equipes</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h4 className="font-bold text-purple-800 mb-1">Apoio e Gestão</h4>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Capacitar líderes em gestão de pessoas e suporte emocional</li>
                    <li>Criar canais seguros para feedback e reportes de problemas</li>
                    <li>Implementar programas de reconhecimento e incentivo</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-bold text-green-800 mb-1">Demandas e Controle</h4>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Revisar processos de trabalho para equilibrar demandas</li>
                    <li>Estabelecer políticas claras sobre pausas e descansos</li>
                    <li>Promover maior autonomia sobre ritmo e método de trabalho</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-orange-50 rounded-lg">
                  <h4 className="font-bold text-orange-800 mb-1">Clareza e Mudanças</h4>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Melhorar a comunicação sobre expectativas e objetivos</li>
                    <li>Envolver colaboradores nos processos de mudança</li>
                    <li>Oferecer treinamentos contínuos para desenvolvimento profissional</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <footer className="text-center text-gray-500 text-sm mt-10 mb-6">
          <p>Dashboard de Mapeamento de Fatores Psicossociais - {new Date().toLocaleDateString()}</p>
          <p>Total de respondentes: {dadosJSON.totalRespondentes} | Total de perguntas analisadas: {dadosJSON.todasPerguntas.length}</p>
          <p className="mt-2">Desenvolvido por <a href="https://www.grsnucleo.com.br/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GRS+Núcleo</a></p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
EOL

# Criar o App.js principal
cat > src/App.js << 'EOL'
import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import { getAuth } from './auth/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Verificar se o usuário já está autenticado
    const auth = getAuth();
    if (auth) {
      setIsAuthenticated(true);
      setUser(auth);
    }
  }, []);
  
  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };
  
  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };
  
  return (
    <div className="App">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
EOL

# Configurar o arquivo de índice
cat > src/index.js << 'EOL'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOL

# Iniciar o servidor de desenvolvimento
log "Instalação concluída com sucesso!"
log "Iniciando o servidor de desenvolvimento..."

# Adicionar informações no README
cat > README.md << 'EOL'
# Dashboard de Mapeamento de Fatores Psicossociais

Este projeto foi desenvolvido pela GRS+Núcleo para visualização e análise de dados de mapeamento de fatores psicossociais.

## Funcionalidades

- Visualização interativa de dados psicossociais
- Análise por categorias (Demandas, Relacionamentos, Controle, Apoio, Clareza, Mudanças)
- Upload de planilhas XLSX para atualização
- Exportação e importação de dados
- Histórico de logs de sistema
- Autenticação básica

## Credenciais de Acesso

- Administrador: 
  - Usuário: admin
  - Chave: @Grs2025@

- Cliente: 
  - Usuário: cliente
  - Chave: grscliente

## Tecnologias Utilizadas

- React.js
- Tailwind CSS
- Recharts (para gráficos)
- XLSX (para processamento de planilhas)
- LocalStorage (para persistência de dados)

## Como Usar

1. Faça login com as credenciais fornecidas
2. Carregue uma planilha XLSX através do botão "Atualizar"
3. Navegue pelos diferentes gráficos e visualizações
4. Filtre os dados por categoria se necessário
5. Exporte os dados processados para backup

## Desenvolvido por

GRS+Núcleo - [https://www.grsnucleo.com.br/](https://www.grsnucleo.com.br/)
EOL

echo ""
echo "===================== INSTALAÇÃO CONCLUÍDA ====================="
echo ""
echo "O projeto foi configurado com sucesso em: $PROJECT_DIR"
echo ""
echo "Para iniciar o servidor de desenvolvimento:"
echo "  cd $PROJECT_NAME"
echo "  npm start"
echo ""
echo "Credenciais para acesso:"
echo "  Administrador:"
echo "    Usuário: admin"
echo "    Chave: @Grs2025@"
echo ""
echo "  Cliente:"
echo "    Usuário: cliente"
echo "    Chave: grscliente"
echo ""
echo "Logs de instalação salvos em: $LOG_FILE"
echo ""
echo "================================================================"