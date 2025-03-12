import React, { useState } from 'react';
import { login } from '../auth/auth';

const Login = ({ onLoginSuccess }) => {
  const [user, setUser] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      // Validação básica
      if (!user || !key) {
        setError('Preencha todos os campos');
        setIsLoggingIn(false);
        return;
      }
      
      // Tenta realizar o login
      const userData = login(user, key);
      
      if (userData) {
        onLoginSuccess(userData);
      } else {
        setError('Usuário ou chave secreta inválidos');
      }
    } catch (error) {
      setError('Erro ao realizar login. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h2>
          <h3 className="text-xl text-gray-600">Mapeamento de Fatores Psicossociais</h3>
          <p className="mt-2 text-gray-500">GRS+Núcleo</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="user">
              Usuário
            </label>
            <select
              id="user"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              required
            >
              <option value="">Selecione o usuário</option>
              <option value="admin">Administrador</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="key">
              Chave Secreta
            </label>
            <input
              id="key"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Digite a chave secreta"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;