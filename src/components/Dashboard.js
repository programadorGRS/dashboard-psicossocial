import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie, Cell } from 'recharts';
import _ from 'lodash';
import { getAuth, logout } from '../auth/auth';
import PermanentLogger from '../utils/permanentLogger';
import { LOG_TYPES } from '../utils/logTypes';
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
  const [carregando, setCarregando] = useState(true); // Alterado para true inicialmente
  const [erro, setErro] = useState(null);
  const [dataAtualizacao, setDataAtualizacao] = useState(new Date());
  const [exibirModalUpload, setExibirModalUpload] = useState(false);
  const [exibirLogs, setExibirLogs] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [activeTab, setActiveTab] = useState('setor');
  
  // Efeito para carregar informações do usuário
  useEffect(() => {
    const auth = getAuth();
    if (auth) {
      setUsuario(auth);
    }
  }, []);
  
  useEffect(() => {
    const carregarDadosIniciais = async () => {
      setCarregando(true);
      
      try {
        // Carregar dados do servidor (agora assíncrono)
        const dadosSalvos = await carregarDados();
        
        if (dadosSalvos) {
          setDadosJSON(dadosSalvos);
          setDataAtualizacao(new Date(dadosSalvos.dataAtualizacao || new Date()));
        } else {
          setErro("Não foi possível carregar os dados iniciais.");
        }
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        setErro("Não foi possível carregar os dados iniciais.");
      } finally {
        setCarregando(false);
      }
    };
    
    carregarDadosIniciais();
  }, []);


  const handleUploadArquivo = async (evento) => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    
    setCarregando(true);
    setErro(null);
    
    try {
      // ...processamento do arquivo
      const dadosProcessados = await processarArquivoXLSX(arquivo);
      
      // Atualizar o estado
      setDadosJSON(dadosProcessados);
      setDataAtualizacao(new Date());
      
      // Salvar dados (agora assíncrono)
      await salvarDados(dadosProcessados);
      
      // Fechar o modal
      setExibirModalUpload(false);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      setErro(`Erro ao processar o arquivo: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };
  
  const handleImportarDados = async (evento) => {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;
    
    setCarregando(true);
    setErro(null);
    
    try {
      PermanentLogger.log(LOG_TYPES.INFO, `Iniciando importação de dados: ${arquivo.name}`);
      
      // Importar dados do arquivo JSON
      const dadosImportados = await importarDados(arquivo);
      
      // Atualizar o estado
      setDadosJSON(dadosImportados);
      setDataAtualizacao(new Date());
      
      // Fechar o modal de upload
      setExibirModalUpload(false);
      
      PermanentLogger.log(LOG_TYPES.UPDATE, `Dados importados com sucesso: ${arquivo.name}`);
    } catch (error) {
      console.error("Erro ao importar dados:", error);
      setErro(`Erro ao importar dados: ${error.message}`);
      PermanentLogger.log(LOG_TYPES.ERROR, `Erro ao importar dados: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };
  
  // Handler para exportar dados
  const handleExportarDados = () => {
    if (!dadosJSON) {
      setErro("Não há dados para exportar");
      return;
    }
    
    if (exportarDados()) {
      PermanentLogger.log(LOG_TYPES.INFO, "Dados exportados com sucesso");
    } else {
      setErro("Erro ao exportar dados");
      PermanentLogger.log(LOG_TYPES.ERROR, "Erro ao exportar dados");
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
  
  // Garantir que as propriedades existam antes de acessá-las
  const todasPerguntas = dadosJSON.todasPerguntas || [];
  const dadosCategoria = dadosJSON.dadosCategoria || [];
  
  // Filtrar perguntas por categoria, se uma estiver selecionada
  const perguntasFiltradas = categoriaAtiva 
    ? todasPerguntas.filter(p => {
        const categoria = dadosCategoria.find(c => c.categoria === categoriaAtiva);
        return categoria && categoria.perguntas && categoria.perguntas.includes(p.pergunta);
      })
    : todasPerguntas;
  
  const perguntasExibidas = perguntasFiltradas.slice(0, perguntasVisiveis);
  
  // Dados para o gráfico de distribuição de níveis
  const dadosNiveis = (() => {
    if (!todasPerguntas.length) return [];
    const contagem = _.countBy(todasPerguntas, 'nivel');
    return Object.entries(contagem).map(([nivel, quantidade]) => ({
      name: nivel,
      value: quantidade,
      color: corDoNivel(nivel)
    }));
  })();
  
  // Encontrar categoria com menor média (ponto forte)
  const categoriaMenorMedia = dadosCategoria.length ? _.minBy(dadosCategoria, 'media') : null;
  
  // Identificar os 3 itens com menor média (pontos positivos)
  const perguntasMenorMedia = todasPerguntas.length ? _.sortBy(todasPerguntas, 'media').slice(0, 3) : [];
  
  // Processar dados por setor e cargo
  const processarDadosPorSegmento = () => {
    if (!dadosJSON.dadosOriginais || !Array.isArray(dadosJSON.dadosOriginais)) {
      return { dadosPorSetor: {}, dadosPorCargo: {} };
    }
    
    // Análise por setor
    const dadosPorSetor = {};
    const setores = [...new Set(dadosJSON.dadosOriginais.map(item => item['Qual seu setor?']).filter(Boolean))];
    
    setores.forEach(setor => {
      if (!setor) return;
      
      // Filtrar respondentes deste setor
      const respostasDoSetor = dadosJSON.dadosOriginais.filter(item => item['Qual seu setor?'] === setor);
      
      // Calcular médias para este setor
      const mediasPorPergunta = {};
      
      // Iterar sobre todas as perguntas
      todasPerguntas.forEach(perguntaObj => {
        if (!perguntaObj || !perguntaObj.pergunta) return;
        
        const pergunta = perguntaObj.pergunta;
        const valores = respostasDoSetor
          .map(item => item[pergunta])
          .filter(val => val !== undefined && val !== null);
        
        if (valores.length > 0) {
          mediasPorPergunta[pergunta] = _.mean(valores);
        }
      });
      
      // Ordenar por média (do maior para o menor) e pegar as 5 piores
      const perguntasOrdenadas = Object.entries(mediasPorPergunta)
        .map(([pergunta, media]) => ({
          pergunta,
          perguntaResumida: pergunta.length > 60 ? pergunta.substring(0, 57) + '...' : pergunta,
          media,
          nivel: determinarNivel(media)
        }))
        .sort((a, b) => b.media - a.media)
        .slice(0, 5);
      
      dadosPorSetor[setor] = {
        totalRespondentes: respostasDoSetor.length,
        pioresPerguntas: perguntasOrdenadas
      };
    });
    
    // Análise por cargo/função
    const dadosPorCargo = {};
    const cargos = [...new Set(dadosJSON.dadosOriginais.map(item => item['Qual sua função?']).filter(Boolean))];
    
    cargos.forEach(cargo => {
      if (!cargo) return;
      
      // Filtrar respondentes deste cargo
      const respostasDoCargo = dadosJSON.dadosOriginais.filter(item => item['Qual sua função?'] === cargo);
      
      // Calcular médias para este cargo
      const mediasPorPergunta = {};
      
      // Iterar sobre todas as perguntas
      todasPerguntas.forEach(perguntaObj => {
        if (!perguntaObj || !perguntaObj.pergunta) return;
        
        const pergunta = perguntaObj.pergunta;
        const valores = respostasDoCargo
          .map(item => item[pergunta])
          .filter(val => val !== undefined && val !== null);
        
        if (valores.length > 0) {
          mediasPorPergunta[pergunta] = _.mean(valores);
        }
      });
      
      // Ordenar por média (do maior para o menor) e pegar as 5 piores
      const perguntasOrdenadas = Object.entries(mediasPorPergunta)
        .map(([pergunta, media]) => ({
          pergunta,
          perguntaResumida: pergunta.length > 60 ? pergunta.substring(0, 57) + '...' : pergunta,
          media,
          nivel: determinarNivel(media)
        }))
        .sort((a, b) => b.media - a.media)
        .slice(0, 5);
      
      dadosPorCargo[cargo] = {
        totalRespondentes: respostasDoCargo.length,
        pioresPerguntas: perguntasOrdenadas
      };
    });
    
    return { dadosPorSetor, dadosPorCargo };
  };
  
  // Processar os dados por segmento com tratamento de erros
  let dadosPorSetor = {}, dadosPorCargo = {};
  try {
    const resultado = processarDadosPorSegmento();
    dadosPorSetor = resultado.dadosPorSetor;
    dadosPorCargo = resultado.dadosPorCargo;
  } catch (error) {
    console.error("Erro ao processar dados por segmento:", error);
    // Não propagamos o erro para não quebrar a renderização
  }
  
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
            Login em: {usuario?.loginTime ? new Date(usuario.loginTime).toLocaleString() : 'N/A'}
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
          <p className="text-gray-600">Análise baseada em {dadosJSON.totalRespondentes || 0} respondentes e {todasPerguntas.length} questões avaliadas</p>
        </header>
        
        {/* Indicador Geral */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Indicador Geral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-blue-600">{dadosJSON.mediaGeral?.toFixed(2) || "N/A"}</div>
                    <div className="text-xl mt-2">Média Geral</div>
                    <div className="mt-2 inline-block px-3 py-1 rounded-full text-sm font-semibold" style={{ 
                      backgroundColor: (dadosJSON.mediaGeral ? corDoNivel(determinarNivel(dadosJSON.mediaGeral)) : "#888") + '30', 
                      color: dadosJSON.mediaGeral ? corDoNivel(determinarNivel(dadosJSON.mediaGeral)) : "#888" 
                    }}>
                      {dadosJSON.mediaGeral ? determinarNivel(dadosJSON.mediaGeral) : "N/A"}
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
                    stroke={dadosJSON.mediaGeral ? corDoNivel(determinarNivel(dadosJSON.mediaGeral)) : "#888"}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 45 * ((dadosJSON.mediaGeral || 0) / 5)} ${2 * Math.PI * 45 * (1 - (dadosJSON.mediaGeral || 0) / 5)}`}
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
                {dadosNiveis.length > 0 ? (
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
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500">
                    Não há dados suficientes para exibir este gráfico
                  </div>
                )}
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
                {dadosCategoria.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={80} data={dadosCategoria}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="categoria" />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} />
                      <Radar name="Média" dataKey="media" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      <Tooltip formatter={formatarMedia} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500">
                    Não há categorias para exibir neste gráfico
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <div className="overflow-x-auto">
                {dadosCategoria.length > 0 ? (
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
                      {dadosCategoria
                        .sort((a, b) => b.media - a.media)
                        .map((categoria, index) => (
                        <tr 
                          key={index} 
                          className={`${index % 2 === 0 ? 'bg-gray-50' : ''} ${categoriaAtiva === categoria.categoria ? 'bg-blue-50' : ''} hover:bg-gray-100 cursor-pointer`}
                          onClick={() => setCategoriaAtiva(categoriaAtiva === categoria.categoria ? null : categoria.categoria)}
                        >
                          <td className="py-2 px-4 border-b">
                            <div className="font-semibold">{categoria.categoria}</div>
                            <div className="text-xs text-gray-500 mt-1">{categoria.qtdPerguntas || 0} perguntas</div>
                          </td>
                          <td className="py-2 px-4 border-b text-center font-semibold">{categoria.media?.toFixed(2) || "N/A"}</td>
                          <td className="py-2 px-4 border-b text-center">
                            <span 
                              className="inline-block rounded px-2 py-1 text-xs font-semibold text-white"
                              style={{ backgroundColor: corDoNivel(categoria.nivel) }}
                            >
                              {categoria.nivel || "N/A"}
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
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Não há categorias para exibir
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Explicação das Categorias */}
          <div className="mt-8">
            <h3 className="font-bold text-lg mb-3">O que significa cada categoria?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dadosCategoria.length > 0 ? (
                dadosCategoria.map((categoria, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-lg shadow-sm border-l-4"
                    style={{ borderLeftColor: corDoNivel(categoria.nivel) }}
                  >
                    <h4 className="font-semibold text-lg">{categoria.categoria}</h4>
                    <p className="text-sm text-gray-600 mt-1">{categoria.descricao || "Sem descrição disponível"}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-4 text-gray-500">
                  Não há categorias para exibir
                </div>
              )}
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
              const categoria = dadosCategoria.find(c => c.categoria === categoriaAtiva);
              if (!categoria) return (
                <div className="text-center py-4 text-gray-500">
                  Categoria não encontrada ou sem dados
                </div>
              );
              
              const perguntasCategoria = todasPerguntas
                .filter(p => categoria.perguntas && categoria.perguntas.includes(p.pergunta))
                .sort((a, b) => b.media - a.media);
              
              if (!perguntasCategoria.length) return (
                <div className="text-center py-4 text-gray-500">
                  Não há perguntas associadas a esta categoria
                </div>
              );
              
              return (
                <div>
                  <div className="mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="mb-2"><span className="font-semibold">Descrição:</span> {categoria.descricao || "Sem descrição disponível"}</p>
                      <div className="flex items-center mt-2">
                        <span className="font-semibold mr-2">Nível geral da categoria:</span>
                        <span 
                          className="inline-block rounded px-2 py-1 text-sm font-semibold text-white"
                          style={{ backgroundColor: corDoNivel(categoria.nivel) }}
                        >
                          {categoria.nivel} ({categoria.media?.toFixed(2) || "N/A"})
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
        
        {/* Top 5 Áreas Críticas */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Top 5 Áreas Mais Críticas</h2>
          <div className="h-80">
            {dadosJSON.perguntasCriticas && dadosJSON.perguntasCriticas.length > 0 ? (
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
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                Não há dados suficientes para identificar áreas críticas
              </div>
            )}
          </div>
        </div>
        
        {/* Análise por Setor e Cargo - NOVA SEÇÃO */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Análise por Setor e Cargo</h2>
          
          {/* Tabs para alternar entre Setor e Cargo */}
          <div className="border-b mb-6">
            <nav className="-mb-px flex space-x-6">
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'setor'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('setor')}
              >
                Por Setor
              </button>
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cargo'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('cargo')}
              >
                Por Cargo/Função
              </button>
            </nav>
          </div>
          
          {/* Conteúdo baseado na tab ativa */}
          <div>
            {activeTab === 'setor' ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Top 5 Piores Avaliações por Setor</h3>
                
                {Object.keys(dadosPorSetor).length > 0 ? (
                  <div className="space-y-8">
                    {Object.entries(dadosPorSetor).map(([setor, dados]) => (
                      <div key={setor} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-bold text-gray-800">{setor}</h4>
                          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                            {dados.totalRespondentes} respondente{dados.totalRespondentes !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {dados.pioresPerguntas && dados.pioresPerguntas.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pergunta</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Média</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Nível</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {dados.pioresPerguntas.map((item, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-3 py-2 text-sm text-gray-900" title={item.pergunta}>{item.perguntaResumida}</td>
                                    <td className="px-3 py-2 text-sm text-center font-medium">{item.media.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-sm text-center">
                                      <span 
                                        className="inline-block rounded px-2 py-1 text-xs font-semibold text-white"
                                        style={{ backgroundColor: corDoNivel(item.nivel) }}
                                      >
                                        {item.nivel}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-gray-500">
                            Não há dados suficientes para análise deste setor
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Não há dados de setores para analisar
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-4">Top 5 Piores Avaliações por Cargo/Função</h3>
                
                {Object.keys(dadosPorCargo).length > 0 ? (
                  <div className="space-y-8">
                    {Object.entries(dadosPorCargo).map(([cargo, dados]) => (
                      <div key={cargo} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-lg font-bold text-gray-800">{cargo}</h4>
                          <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                            {dados.totalRespondentes} respondente{dados.totalRespondentes !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {dados.pioresPerguntas && dados.pioresPerguntas.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pergunta</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Média</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Nível</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {dados.pioresPerguntas.map((item, idx) => (
                                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-3 py-2 text-sm text-gray-900" title={item.pergunta}>{item.perguntaResumida}</td>
                                    <td className="px-3 py-2 text-sm text-center font-medium">{item.media.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-sm text-center">
                                      <span 
                                        className="inline-block rounded px-2 py-1 text-xs font-semibold text-white"
                                        style={{ backgroundColor: corDoNivel(item.nivel) }}
                                      >
                                        {item.nivel}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-2 text-gray-500">
                            Não há dados suficientes para análise deste cargo
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Não há dados de cargos para analisar
                  </div>
                )}
              </div>
            )}
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
            {perguntasExibidas.length > 0 ? (
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
            ) : (
              <div className="text-center py-4 text-gray-500">
                Não há perguntas para exibir
              </div>
            )}
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
              {dadosJSON.dadosFuncoes && dadosJSON.dadosFuncoes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosJSON.dadosFuncoes}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name && name.length > 15 ? name.substring(0, 15) + '...' : name}: ${(percent * 100).toFixed(0)}%`}
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
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Não há dados sobre funções para exibir
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Distribuição por Setor</h2>
            <div className="h-64">
              {dadosJSON.dadosSetores && dadosJSON.dadosSetores.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosJSON.dadosSetores}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name && name.length > 15 ? name.substring(0, 15) + '...' : name}: ${(percent * 100).toFixed(0)}%`}
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
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Não há dados sobre setores para exibir
                </div>
              )}
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
                A avaliação psicossocial apresenta um resultado geral de <span className="font-bold">{dadosJSON.mediaGeral?.toFixed(2) || "N/A"}</span>, o que indica um nível 
                <span className="font-bold text-orange-600"> {dadosJSON.mediaGeral ? determinarNivel(dadosJSON.mediaGeral) : "N/A"} </span> 
                de fatores psicossociais que podem impactar a saúde e bem-estar dos colaboradores. 
                Este resultado sugere que, embora existam pontos de atenção, a organização mantém um ambiente razoavelmente equilibrado.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg text-red-700 mb-2">Pontos de Atenção Prioritária</h3>
              {dadosJSON.perguntasCriticas && dadosJSON.perguntasCriticas.length > 0 ? (
                <>
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
                </>
              ) : (
                <p>Não foram identificados pontos críticos específicos com os dados atuais.</p>
              )}
            </div>
            
            <div>
              <h3 className="font-bold text-lg text-green-700 mb-2">Pontos Fortes</h3>
              {categoriaMenorMedia ? (
                <p>
                  A dimensão <span className="font-bold">{categoriaMenorMedia.categoria}</span> apresenta a menor pontuação média ({categoriaMenorMedia.media.toFixed(2)}), 
                  indicando uma área onde a organização apresenta melhores práticas.
                </p>
              ) : (
                <p>Não foi possível identificar pontos fortes específicos com os dados atuais.</p>
              )}
              
              {perguntasMenorMedia.length > 0 ? (
                <>
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
                </>
              ) : null}
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
          <p>Total de respondentes: {dadosJSON.totalRespondentes || 0} | Total de perguntas analisadas: {todasPerguntas.length}</p>
          <p className="mt-2">Desenvolvido por <a href="https://www.grsnucleo.com.br/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">GRS+Núcleo</a></p>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;