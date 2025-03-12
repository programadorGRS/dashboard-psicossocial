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
