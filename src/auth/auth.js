const _0x5a2c = {
  "admin": "QEdyczIwMjVA", 
  "cliente": "Z3JzY2xpZW50ZQ=="
};

const _0x3b7f = (x) => {
  try {
    return atob(x);
  } catch(e) {
    return '';
  }
};
 
const _0x7d4e = (u, p) => {
  if (!u || !p) return false;
  if (!_0x5a2c[u]) return false;
  
  return _0x3b7f(_0x5a2c[u]) === p;
};

const generateSessionId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const login = (user, key) => {
  if (_0x7d4e(user, key)) {
    const sessionId = generateSessionId();
    
    const userData = {
      user,
      role: user === 'admin' ? 'administrador' : 'cliente',
      loginTime: new Date().toISOString(),
      sessionId
    };
    
    localStorage.setItem('auth', JSON.stringify(userData));
    
    return userData;
  }
  
  return null;
};

export const logout = () => {
  localStorage.removeItem('auth');
  return true;
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

export const isAdmin = () => {
  const auth = getAuth();
  return auth && auth.role === 'administrador';
};

export const canAccessLogs = () => {
  const auth = getAuth();
  return auth && auth.role === 'administrador';
};