const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const logEntry = JSON.parse(event.body);
    logEntry.id = Date.now() + Math.random().toString(36).substring(2, 9);
    
    // Caminhos para arquivos
    const jsonPath = path.join('public', 'data', 'system-logs.json');
    const txtPath = path.join('public', 'logs', 'system-logs.txt');
    
    // Ler logs existentes
    let logs = [];
    if (fs.existsSync(jsonPath)) {
      logs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
    
    // Adicionar novo log
    logs.push(logEntry);
    
    // Manter apenas 500 logs
    if (logs.length > 500) {
      logs = logs.slice(-500);
    }
    
    // Salvar em JSON
    fs.writeFileSync(jsonPath, JSON.stringify(logs, null, 2));
    
    // Adicionar ao TXT
    const logText = `[${new Date(logEntry.timestamp).toLocaleString()}] [${logEntry.type.toUpperCase()}] [${logEntry.user}] ${logEntry.message}\n`;
    fs.appendFileSync(txtPath, logText);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: logEntry.id })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};