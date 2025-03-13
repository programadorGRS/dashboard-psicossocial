const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Caminhos para os arquivos
const dataFilePath = path.join(__dirname, 'data', 'dashboard-data.json');
const logsFilePath = path.join(__dirname, 'logs', 'system-logs.json');
const logsTextPath = path.join(__dirname, 'logs', 'system-logs.txt');

// Garantir que os diretórios existem
const ensureDirectories = () => {
  if (!fs.existsSync(path.dirname(dataFilePath))) {
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
  }
  
  if (!fs.existsSync(path.dirname(logsFilePath))) {
    fs.mkdirSync(path.dirname(logsFilePath), { recursive: true });
  }
};

// Inicializar arquivos
const initializeFiles = () => {
  ensureDirectories();
  
  // Inicializar dashboard data
  if (!fs.existsSync(dataFilePath)) {
    const initialData = {
      totalRespondentes: 0,
      mediaGeral: 0,
      todasPerguntas: [],
      perguntasCriticas: [],
      dadosCategoria: [],
      dadosSetores: [],
      dadosFuncoes: [],
      dataAtualizacao: new Date().toISOString()
    };
    fs.writeFileSync(dataFilePath, JSON.stringify(initialData, null, 2));
  }
  
  // Inicializar logs
  if (!fs.existsSync(logsFilePath)) {
    fs.writeFileSync(logsFilePath, JSON.stringify([], null, 2));
  }
  
  if (!fs.existsSync(logsTextPath)) {
    fs.writeFileSync(logsTextPath, "");
  }
};

initializeFiles();

// API para dashboard data
app.get('/api/dashboard-data', (req, res) => {
  try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Erro ao ler dados:', error);
    res.status(500).json({ error: 'Erro ao carregar dados' });
  }
});

app.post('/api/dashboard-data', (req, res) => {
  try {
    const data = req.body;
    data.dataAtualizacao = new Date().toISOString();
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
    res.status(500).json({ error: 'Erro ao salvar dados' });
  }
});

// API para logs
app.get('/api/logs', (req, res) => {
  try {
    const logs = fs.readFileSync(logsFilePath, 'utf8');
    res.json(JSON.parse(logs));
  } catch (error) {
    console.error('Erro ao ler logs:', error);
    res.status(500).json({ error: 'Erro ao carregar logs' });
  }
});

app.post('/api/logs', (req, res) => {
  try {
    const logEntry = req.body;
    logEntry.id = Date.now() + Math.random().toString(36).substring(2, 9);
    
    // Ler logs existentes
    const logs = JSON.parse(fs.readFileSync(logsFilePath, 'utf8'));
    
    // Adicionar novo log
    logs.push(logEntry);
    
    // Limitar a 500 logs
    if (logs.length > 500) {
      logs.splice(0, logs.length - 500);
    }
    
    // Salvar no JSON
    fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2));
    
    // Salvar também como entrada de texto
    const logText = `[${new Date(logEntry.timestamp).toLocaleString()}] [${logEntry.type.toUpperCase()}] [${logEntry.user}] ${logEntry.message} ${logEntry.details ? '- Details: ' + logEntry.details : ''}\n`;
    fs.appendFileSync(logsTextPath, logText);
    
    res.json({ success: true, id: logEntry.id });
  } catch (error) {
    console.error('Erro ao salvar log:', error);
    res.status(500).json({ error: 'Erro ao salvar log' });
  }
});

app.post('/api/logs/import', (req, res) => {
  try {
    const newLogs = req.body;
    
    // Ler logs existentes
    const existingLogs = JSON.parse(fs.readFileSync(logsFilePath, 'utf8'));
    
    // Filtrar logs duplicados pelo ID
    const existingIds = new Set(existingLogs.map(log => log.id));
    const filteredNewLogs = newLogs.filter(log => !existingIds.has(log.id));
    
    // Adicionar IDs para logs sem ID
    filteredNewLogs.forEach(log => {
      if (!log.id) {
        log.id = Date.now() + Math.random().toString(36).substring(2, 9);
      }
    });
    
    // Combinar logs
    const combinedLogs = [...existingLogs, ...filteredNewLogs];
    
    // Limitar a 5000 logs
    if (combinedLogs.length > 5000) {
      combinedLogs.splice(0, combinedLogs.length - 5000);
    }
    
    // Salvar JSON
    fs.writeFileSync(logsFilePath, JSON.stringify(combinedLogs, null, 2));
    
    // Acrescentar ao arquivo de texto
    let logText = "";
    filteredNewLogs.forEach(log => {
      logText += `[${new Date(log.timestamp).toLocaleString()}] [${log.type.toUpperCase()}] [${log.user}] ${log.message} ${log.details ? '- Details: ' + log.details : ''}\n`;
    });
    fs.appendFileSync(logsTextPath, logText);
    
    res.json({ 
      success: true, 
      imported: filteredNewLogs.length,
      total: combinedLogs.length 
    });
  } catch (error) {
    console.error('Erro ao importar logs:', error);
    res.status(500).json({ error: 'Erro ao importar logs' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});