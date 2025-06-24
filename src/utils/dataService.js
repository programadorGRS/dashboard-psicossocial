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

const extrairNumero = (valor) => {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string') {
    const match = valor.match(/\d+/);
    return match ? Number(match[0]) : null;
  }
  return null;
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

        const funcoes = _.countBy(jsonData, 'Qual sua função?');
        const setores = _.countBy(jsonData, 'Qual seu setor?');

        const perguntas = Object.keys(jsonData[0]).filter(key =>
          ![
            'ID', 'Hora de início', 'Hora de conclusão', 'Email', 'Nome',
            'Hora da última modificação', 'Qual sua função?', 'Qual seu setor?'
          ].includes(key)
        );

        const mediasPorPergunta = {};
        perguntas.forEach(pergunta => {
          const valores = jsonData
            .map(item => extrairNumero(item[pergunta]))
            .filter(val => val !== null);
          mediasPorPergunta[pergunta] = _.mean(valores);
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
              .filter(val => val !== null);
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

        const dadosFuncoes = Object.entries(funcoes).map(([funcao, quantidade]) => ({
          name: funcao,
          value: quantidade
        }));

        const dadosSetores = Object.entries(setores).map(([setor, quantidade]) => ({
          name: setor,
          value: quantidade
        }));

        const perguntasCriticas = dadosPerguntas.slice(0, 5);
        const mediaGeral = _.mean(Object.values(mediasPorPergunta));

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
