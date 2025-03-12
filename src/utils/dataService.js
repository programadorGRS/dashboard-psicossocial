// src/utils/permanentLogger.js
import { openDB } from 'idb';
import * as XLSX from 'xlsx';
import _ from 'lodash';

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

export const addLog = async (type, message, details = null) => {
  try {
    // Obter informações do usuário autenticado
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    
    // Abrir banco de dados
    const db = await openDB('DashboardLogsDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('logs')) {
          const store = db.createObjectStore('logs', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          
          // Criar índices para facilitar busca
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('user', 'user', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      }
    });

    // Preparar entrada de log
    const logEntry = {
      type,
      message,
      details: details ? JSON.stringify(details) : null,
      user: auth.user || 'sistema',
      role: auth.role || 'não autenticado',
      timestamp: new Date().toISOString(),
      clientInfo: {
        ip: auth.clientInfo?.ip || 'não identificado',
        navegador: navigator.userAgent
      }
    };

    // Iniciar transação de escrita
    const tx = db.transaction('logs', 'readwrite');
    await tx.objectStore('logs').add(logEntry);
    await tx.done;

    // Log no console em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${type.toUpperCase()}] ${message}`, details || '');
    }

    return logEntry;
  } catch (error) {
    console.error('Erro ao adicionar log:', error);
    return null;
  }
};

// Função para recuperar logs
export const getLogs = async (filters = {}) => {
  try {
    const db = await openDB('DashboardLogsDB', 1);
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
};

// Função para exportar logs
export const exportLogs = async () => {
  try {
    const logs = await getLogs();
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

    await addLog(LOG_TYPES.SYSTEM, 'Logs exportados com sucesso');

    return true;
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    await addLog(LOG_TYPES.ERROR, `Erro ao exportar logs: ${error.message}`);
    return false;
  }
};

// Função para limpar logs antigos
export const clearOldLogs = async (daysToKeep = 90) => {
  try {
    const db = await openDB('DashboardLogsDB', 1);
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

    await addLog(LOG_TYPES.SYSTEM, `Logs antigos removidos`, {
      diasMantidos: daysToKeep,
      logsExcluidos: deletedCount
    });

    return deletedCount;
  } catch (error) {
    console.error('Erro ao limpar logs antigos:', error);
    await addLog(LOG_TYPES.ERROR, `Erro ao limpar logs antigos: ${error.message}`);
    return 0;
  }
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
            nomeArquivo: arquivo.name,
            dadosOriginais: jsonData
          };
          
          // Registrar log de processamento bem-sucedido
          await addLog(
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
          await addLog(LOG_TYPES.ERROR, `Erro ao processar arquivo: ${error.message}`);
          reject(error);
        }
      };
      
      reader.onerror = async (error) => {
        await addLog(LOG_TYPES.ERROR, `Erro ao ler arquivo: ${error}`);
        reject(new Error("Erro ao ler o arquivo."));
      };
      
      reader.readAsArrayBuffer(arquivo);
    });
  } catch (error) {
    await addLog(LOG_TYPES.ERROR, `Erro no processamento: ${error.message}`);
    throw error;
  }
};