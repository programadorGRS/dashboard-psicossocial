import * as XLSX from 'xlsx';
import _ from 'lodash';

export const determinarNivel = (media) => {
  if (media <= 2) return "Baixo";
  if (media <= 2.5) return "Moderado Baixo";
  if (media <= 3.5) return "Moderado";
  if (media <= 4) return "Moderado Alto";
  return "Alto";
};

export const salvarDados = (dados) => {
  try {
    localStorage.setItem('dashboardData', JSON.stringify(dados));
    return true;
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    return false;
  }
};

// Função melhorada para extrair números dos valores das respostas
export const extrairNumero = (valor) => {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') {
    // Primeiro tenta extrair o número no início da string (formato "1 - Nunca", "2 - Raramente", etc.)
    const match = valor.match(/^(\d+)/);
    if (match) {
      return Number(match[1]);
    }
    // Se não encontrar, tenta qualquer número na string
    const anyNumber = valor.match(/\d+/);
    return anyNumber ? Number(anyNumber[0]) : null;
  }
  return null;
};

// Função para processar dados e limitar aos top 5 com "Outros"
export const processarDadosParaGrafico = (dados, limite = 5) => {
  if (!dados || dados.length === 0) return [];
  
  // Ordenar por valor (quantidade) decrescente
  const dadosOrdenados = [...dados].sort((a, b) => b.value - a.value);
  
  if (dadosOrdenados.length <= limite) {
    return dadosOrdenados;
  }
  
  // Pegar os top 5 e somar o resto em "Outros"
  const top5 = dadosOrdenados.slice(0, limite);
  const outros = dadosOrdenados.slice(limite);
  const somaOutros = outros.reduce((sum, item) => sum + item.value, 0);
  
  if (somaOutros > 0) {
    top5.push({
      name: "Outros",
      value: somaOutros
    });
  }
  
  return top5;
};

export const processarArquivoXLSX = (arquivo) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          cellStyles: true,
          cellFormulas: true,
          cellDates: true,
          cellNF: true,
          sheetStubs: true
        });

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          throw new Error("Nenhum dado encontrado na planilha.");
        }

        console.log("Dados processados:", jsonData.length, "linhas");

        const funcoes = _.countBy(jsonData, 'Qual sua função?');
        const setores = _.countBy(jsonData, 'Qual seu setor?');

        const perguntas = Object.keys(jsonData[0]).filter(key =>
          ![
            'ID', 'Hora de início', 'Hora de conclusão', 'Email', 'Nome',
            'Hora da última modificação', 'Qual sua função?', 'Qual seu setor?'
          ].includes(key)
        );

        console.log("Perguntas encontradas:", perguntas.length);

        const mediasPorPergunta = {};
        perguntas.forEach(pergunta => {
          const valores = jsonData
            .map(item => extrairNumero(item[pergunta]))
            .filter(val => val !== null && !isNaN(val));
          
          if (valores.length > 0) {
            mediasPorPergunta[pergunta] = _.mean(valores);
            console.log(`Pergunta: ${pergunta.substring(0, 50)}... - Média: ${mediasPorPergunta[pergunta].toFixed(2)}`);
          } else {
            console.warn(`Pergunta sem valores válidos: ${pergunta}`);
            mediasPorPergunta[pergunta] = 0;
          }
        });

        const categoriasConfig = {
          'Demandas': {
            descricao: 'Abrange aspectos como carga de trabalho, intensidade, velocidade, pausas e prazos.',
            keywords: ['prazos', 'intensamente', 'muita coisa', 'rapidez', 'muita rapidez', 'pausas', 'pressão']
          },
          'Relacionamentos': {
            descricao: 'Compreende a qualidade das interações interpessoais no ambiente de trabalho.',
            keywords: ['conflitos', 'perseguido', 'tensas', 'dura', 'respeito', 'comportam']
          },
          'Controle': {
            descricao: 'Refere-se ao nível de autonomia e participação nas decisões.',
            keywords: ['decidir', 'escolha', 'pausa', 'liberdade', 'sugestões', 'opinião', 'flexível']
          },
          'Apoio': {
            descricao: 'Relaciona-se ao suporte de colegas e gestores.',
            keywords: ['suporte', 'confiar', 'apoio', 'ajuda', 'escutar', 'informações', 'incentivo']
          },
          'Clareza': {
            descricao: 'Avalia se responsabilidades e metas estão claras.',
            keywords: ['clareza', 'direcionamento', 'objetivos', 'explicações', 'metas', 'espera', 'encaixa', 'tarefas', 'responsabilidades']
          },
          'Mudanças': {
            descricao: 'Avalia comunicação e envolvimento em mudanças organizacionais.',
            keywords: ['mudanças', 'consultadas']
          }
        };

        const categorias = {};
        Object.entries(categoriasConfig).forEach(([categoria, config]) => {
          categorias[categoria] = {
            descricao: config.descricao,
            perguntas: perguntas.filter(p =>
              config.keywords.some(keyword => p.toLowerCase().includes(keyword.toLowerCase()))
            )
          };
        });

        const mediasPorCategoria = {};
        const dadosCategoria = [];

        for (const [categoria, dadosCateg] of Object.entries(categorias)) {
          const perguntasCategoria = dadosCateg.perguntas;
          const todasRespostas = [];

          perguntasCategoria.forEach(pergunta => {
            const valores = jsonData
              .map(item => extrairNumero(item[pergunta]))
              .filter(val => val !== null && !isNaN(val));
            todasRespostas.push(...valores);
          });

          const media = todasRespostas.length > 0 ? _.mean(todasRespostas) : 0;
          mediasPorCategoria[categoria] = media;

          dadosCategoria.push({
            categoria,
            descricao: dadosCateg.descricao,
            media,
            nivel: determinarNivel(media),
            qtdPerguntas: perguntasCategoria.length,
            perguntas: perguntasCategoria
          });
        }

        const dadosPerguntas = Object.entries(mediasPorPergunta)
          .map(([pergunta, media]) => ({
            pergunta,
            perguntaResumida: pergunta.substring(0, 50) + (pergunta.length > 50 ? '...' : ''),
            media,
            nivel: determinarNivel(media)
          }))
          .sort((a, b) => b.media - a.media);

        // Processar dados de funções e setores com limite top 5
        const dadosFuncoesCompletos = Object.entries(funcoes).map(([funcao, quantidade]) => ({
          name: funcao,
          value: quantidade
        }));

        const dadosSetoresCompletos = Object.entries(setores).map(([setor, quantidade]) => ({
          name: setor,
          value: quantidade
        }));

        // Aplicar limite top 5 para os gráficos
        const dadosFuncoes = processarDadosParaGrafico(dadosFuncoesCompletos, 5);
        const dadosSetores = processarDadosParaGrafico(dadosSetoresCompletos, 5);

        const perguntasCriticas = dadosPerguntas.slice(0, 5);
        const mediaGeral = _.mean(Object.values(mediasPorPergunta).filter(val => !isNaN(val)));

        const dadosProcessados = {
          totalRespondentes: jsonData.length,
          dadosFuncoes,
          dadosSetores,
          dadosFuncoesCompletos, // Manter dados completos para análises detalhadas
          dadosSetoresCompletos, // Manter dados completos para análises detalhadas
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

        console.log("Processamento concluído. Média geral:", mediaGeral);
        salvarDados(dadosProcessados);
        resolve(dadosProcessados);
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("Erro ao ler arquivo:", error);
      reject(new Error("Erro ao ler o arquivo."));
    };

    reader.readAsArrayBuffer(arquivo);
  });
};

export const carregarDados = () => {
  try {
    const dados = localStorage.getItem('dashboardData');
    return dados ? JSON.parse(dados) : null;
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    return null;
  }
};

export const exportarDados = () => {
  try {
    const dados = localStorage.getItem('dashboardData');
    if (!dados) throw new Error("Nenhum dado disponível para exportação.");

    const date = new Date().toISOString().split('T')[0];
    const filename = `dashboard_dados_${date}.json`;
    const blob = new Blob([dados], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);

    return true;
  } catch (error) {
    console.error("Erro ao exportar dados:", error);
    return false;
  }
};
