const VALID_HASHES = {
  "admin": "e14135620705279bad1fb4d1d1759258d8a8150b04ea22e5f69ba934ab1b1f2c",
  "cliente": "f27566cc46fbedf5228eff30250b0c7fdf5e91fcdb627eeb9a5aa1c97bc99036"
};

const hashString = async (str) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export const validateKey = async (user, key) => {
  if (!user || !key || !VALID_HASHES[user]) {
    return false;
  }
  
  const keyHash = await hashString(key);
  return keyHash === VALID_HASHES[user];
};

export const login = async (user, key) => {
  if (await validateKey(user, key)) {
    const userData = {
      user,
      role: user === 'admin' ? 'administrador' : 'cliente',
      loginTime: new Date().toISOString()
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