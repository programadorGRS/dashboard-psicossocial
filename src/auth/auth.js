const _0x5a2c = "QEdyczIwMjVA";

const _0x3b7f = (x) => {
  try {
    return atob(x);
  } catch(e) {
    return '';
  }
};
 
const _0x7d4e = (p) => {
  if (!p) return false;
  return _0x3b7f(_0x5a2c) === p;
};

const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const login = (key) => {
  if (_0x7d4e(key)) {
    const sessionId = generateSessionId();
    
    const userData = {
      role: 'usuario',
      loginTime: new Date().toISOString(),
      sessionId
    };
    
    localStorage.setItem('auth', JSON.stringify(userData));
    return userData;
  }
  
  return null;
};

export const logout = () => {
  try {
    localStorage.removeItem('auth');
    return true;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return false;
  }
};

export const getAuth = () => {
  try {
    const authData = localStorage.getItem('auth');
    return authData ? JSON.parse(authData) : null;
  } catch (error) {
    console.error('Erro ao obter autenticação:', error);
    localStorage.removeItem('auth');
    return null;
  }
};