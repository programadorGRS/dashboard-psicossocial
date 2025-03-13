// src/utils/dataService.js
import * as XLSX from 'xlsx';
import _ from 'lodash';
import { addLog, LOG_TYPES } from './permanentLogger';

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

// Função para salvar dados
export const salvarDados = async (dados) => {
  try {
    // Salvar no servidor
    const response = await fetch('/api/dashboard-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dados),
    });
    
    if (!response.ok) {
      throw new Error('Falha ao salvar dados no servidor');
    }
    
    await addLog(LOG_TYPES.INFO, "Dados salvos com sucesso no servidor");
    return true;
  } catch (error) {
    await addLog(LOG_TYPES.ERROR, `Erro ao salvar dados: ${error.message}`);
    
    // Fallback para localStorage em caso de falha do servidor
    try {
      localStorage.setItem('dashboardData', JSON.stringify(dados));
      await addLog(LOG_TYPES.WARNING, "Dados salvos no localStorage como fallback");
      return true;
    } catch (localError) {
      await addLog(LOG_TYPES.ERROR, `Erro ao salvar dados localmente: ${localError.message}`);
      return false;
    }
  }
};

// Função para carregar dados
export const carregarDados = async () => {
  try {
    // Tentar carregar do servidor
    const response = await fetch('/api/dashboard-data');
    
    if (response.ok) {
      const dados = await response.json();
      await addLog(LOG_TYPES.INFO, "Dados carregados do servidor");
      return dados;
    } else {
      throw new Error('Falha ao carregar dados do servidor');
    }
  } catch (error) {
    await addLog(LOG_TYPES.ERROR, `Erro ao carregar dados do servidor: ${error.message}`);
    
    // Fallback para localStorage
    try {
      const dados = localStorage.getItem('dashboardData');
      if (dados) {
        await addLog(LOG_TYPES.WARNING, "Dados carregados do localStorage como fallback");
        return JSON.parse(dados);
      }
    } catch (localError) {
      await addLog(LOG_TYPES.ERROR, `Erro ao carregar dados locais: ${localError.message}`);
    }
    
    return null;
  }
};

// Função para importar dados de um arquivo
export const importarDados = async (arquivo) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const conteudo = e.target.result;
        const dados = JSON.parse(conteudo);
        
        // Validar estrutura básica dos dados
        if (!dados.totalRespondentes || !dados.mediaGeral || !dados.todasPerguntas) {
          throw new Error("Arquivo JSON inválido ou incompatível.");
        }
        
        // Atualizar a data de importação
        dados.dataAtualizacao = new Date().toISOString();
        
        // Salvar no servidor
        await salvarDados(dados);
        
        await addLog(
          LOG_TYPES.UPDATE, 
          `Dados importados com sucesso de: ${arquivo.name}`, 
          {
            totalRespondentes: dados.totalRespondentes,
            dataOriginal: dados.dataAtualizacao
          }
        );
        
        resolve(dados);
      } catch (error) {
        await addLog(LOG_TYPES.ERROR, `Erro ao importar dados: ${error.message}`);
        reject(error);
      }
    };
    
    reader.onerror = async () => {
      await addLog(LOG_TYPES.ERROR, "Erro ao ler o arquivo.");
      reject(new Error("Erro ao ler o arquivo."));
    };
    
    reader.readAsText(arquivo);
  });
};

// Função para exportar dados atuais
export const exportarDados = async () => {
  try {
    // Carregar dados atuais do servidor
    const response = await fetch('/api/dashboard-data');
    
    if (!response.ok) {
      throw new Error("Erro ao buscar dados para exportação");
    }
    
    const dados = await response.json();
    
    // Criar nome de arquivo com data atual
    const date = new Date().toISOString().split('T')[0];
    const filename = `dashboard_dados_${date}.json`;
    
    // Criar blob com dados
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    
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
    
    await addLog(LOG_TYPES.INFO, `Dados exportados com sucesso: ${filename}`);
    return true;
  } catch (error) {
    await addLog(LOG_TYPES.ERROR, `Erro ao exportar dados: ${error.message}`);
    return false;
  }
};