const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const data = JSON.parse(event.body);
    data.dataAtualizacao = new Date().toISOString();
    
    // Escrever arquivo em public/data/
    const filePath = path.join('public', 'data', 'dashboard-data.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};