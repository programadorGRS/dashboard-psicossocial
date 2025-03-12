// src/auth/auth.js
import { encrypt, decrypt } from '../utils/crypto';

// Função para verificar uma chave
export const validateKey = (user, key) => {
  if (!user || !key) return false;
  
  const adminKey = process.env.REACT_APP_ADMIN_KEY;
  const clienteKey = process.env.REACT_APP_CLIENTE_KEY;
  
  // Verifica se as variáveis de ambiente estão definidas
  if (!adminKey || !clienteKey) {
    return false;
  }
  
  const validKey = user === 'admin' ? adminKey : clienteKey;
  return key === validKey;
};

// Função para obter informações do cliente
const getClientInfo = async () => {
  try {
    // Obter informações básicas do cliente
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    return {
      ip: data.ip || 'Não identificado',
      cidade: data.city || 'Não identificado',
      pais: data.country_name || 'Não identificado',
      navegador: navigator.userAgent
    };
  } catch (error) {
    return {
      ip: 'Não identificado',
      cidade: 'Não identificado',
      pais: 'Não identificado',
      navegador: navigator.userAgent
    };
  }
};

// Função para login
export const login = async (user, key) => {
  if (validateKey(user, key)) {
    // Obter informações do cliente
    const clientInfo = await getClientInfo();
    
    const userData = {
      user,
      role: user === 'admin' ? 'administrador' : 'cliente',
      loginTime: new Date().toISOString(),
      token: encrypt(key), // Criptografar a chave
      clientInfo // Adicionar informações do cliente
    };
    
    // Salvar dados de autenticação no localStorage
    localStorage.setItem('auth', JSON.stringify(userData));
    
    return userData;
  }
  
  return null;
};

// Função para logout
export const logout = async () => {
  localStorage.removeItem('auth');
  return true;
};

// Calcular duração do login
const calculateLoginDuration = (loginTime) => {
  const loginDate = new Date(loginTime);
  const logoutDate = new Date();
  const durationInMinutes = Math.round((logoutDate - loginDate) / (1000 * 60));
  return `${durationInMinutes} minutos`;
};

// Função para validar sessão
export const validateSession = () => {
  const auth = getAuth();
  if (!auth) return false;
  
  try {
    // Descriptografar token para validar
    const decryptedKey = decrypt(auth.token);
    
    // Verificar se a chave ainda é válida
    const isValid = validateKey(auth.user, decryptedKey);
    
    // Verificar tempo de sessão (por exemplo, máximo 8 horas)
    const loginTime = new Date(auth.loginTime);
    const currentTime = new Date();
    const sessionDuration = (currentTime - loginTime) / (1000 * 60 * 60); // em horas
    
    return isValid && sessionDuration < 8;
  } catch (error) {
    return false;
  }
};

// Verificar se o usuário está autenticado
export const getAuth = () => {
  try {
    const authData = localStorage.getItem('auth');
    return authData ? JSON.parse(authData) : null;
  } catch (error) {
    // Em caso de erro no parse, limpar o auth corrompido
    localStorage.removeItem('auth');
    return null;
  }
};

// Verificar se o usuário é administrador
export const isAdmin = () => {
  const auth = getAuth();
  return auth && auth.role === 'administrador';
};

// Verificar permissão de logs
export const canAccessLogs = () => {
  const auth = getAuth();
  return auth && auth.role === 'administrador';
};

// Renovar token de sessão
export const renewSession = async () => {
  const auth = getAuth();
  
  if (auth) {
    try {
      // Descriptografar token atual
      const decryptedKey = decrypt(auth.token);
      
      // Gerar novo token
      const newUserData = {
        ...auth,
        loginTime: new Date().toISOString(),
        token: encrypt(decryptedKey)
      };
      
      // Atualizar localStorage
      localStorage.setItem('auth', JSON.stringify(newUserData));
      
      return newUserData;
    } catch (error) {
      return null;
    }
  }
  
  return null;
};