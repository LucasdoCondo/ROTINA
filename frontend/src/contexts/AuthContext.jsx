import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Verificar se há usuário logado ao carregar
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  // Login
  const login = async (email, senha) => {
    try {
      const response = await authService.login(email, senha);
      const { token, usuario } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(usuario));
      setUser(usuario);

      // Verificar se é primeiro login
      const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }

      toast.success('Login realizado com sucesso!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao fazer login';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Registro de novo tenant
  const registrar = async (dados) => {
    try {
      const response = await authService.registrar(dados);
      const { token, usuario } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(usuario));
      setUser(usuario);

      // Marcar que o usuário já viu o onboarding
      localStorage.setItem('hasSeenOnboarding', 'true');
      setShowOnboarding(true);

      toast.success('Cadastro realizado com sucesso!');
      return { success: true };
    } catch (error) {
      const errorData = error.response?.data || {};
      const message = errorData.message || 'Erro ao registrar';
      // Retornar dados completos do erro para validação de campos
      return { success: false, error: { message, ...errorData } };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Ignorar erros no logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('hasSeenOnboarding');
      setUser(null);
      setShowOnboarding(false);
      toast.success('Logout realizado com sucesso!');
    }
  };

  // Função para marcar onboarding como concluído
  const completeOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  // Atualizar perfil
  const atualizarPerfil = async (dados) => {
    try {
      const response = await authService.atualizarPerfil(dados);
      const usuarioAtualizado = response.data.usuario;

      localStorage.setItem('user', JSON.stringify(usuarioAtualizado));
      setUser(usuarioAtualizado);

      toast.success('Perfil atualizado com sucesso!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao atualizar perfil';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    registrar,
    logout,
    atualizarPerfil,
    isAuthenticated: !!user,
    showOnboarding,
    completeOnboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};