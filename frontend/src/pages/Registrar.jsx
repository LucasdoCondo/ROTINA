import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Registrar.css';

export const Registrar = () => {
  const navigate = useNavigate();
  const { registrar } = useAuth();

  const [formData, setFormData] = useState({
    // Empresa
    nomeEmpresa: '',
    cnpj: '',
    emailEmpresa: '',
    telefone: '',
    endereco: '',
    plano: 'basic',
    // Usuário Master
    usuarioNome: '',
    usuarioEmail: '',
    usuarioSenha: '',
    confirmarSenha: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validações
    if (formData.usuarioSenha !== formData.confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.usuarioSenha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    const dadosParaRegistro = {
      nomeEmpresa: formData.nomeEmpresa,
      cnpj: formData.cnpj || undefined,
      emailEmpresa: formData.emailEmpresa,
      telefone: formData.telefone || undefined,
      endereco: formData.endereco || undefined,
      plano: formData.plano,
      usuarioNome: formData.usuarioNome,
      usuarioEmail: formData.usuarioEmail,
      usuarioSenha: formData.usuarioSenha,
    };

    const result = await registrar(dadosParaRegistro);

    if (result.success) {
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className="registro-page">
      <div className="registro-card">
        <div className="registro-header">
          <h1>Criar Conta</h1>
          <p>Cadastre sua empresa e comece a usar</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="registro-form">
          {/* Dados da Empresa */}
          <div className="form-section">
            <h3>Dados da Empresa</h3>
            <div className="form-group">
              <label htmlFor="nomeEmpresa">Nome da Empresa *</label>
              <input
                type="text"
                id="nomeEmpresa"
                name="nomeEmpresa"
                value={formData.nomeEmpresa}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cnpj">CNPJ</label>
                <input
                  type="text"
                  id="cnpj"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="plano">Plano</label>
                <select
                  id="plano"
                  name="plano"
                  value={formData.plano}
                  onChange={handleChange}
                >
                  <option value="basic">Básico</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="emailEmpresa">Email da Empresa *</label>
              <input
                type="email"
                id="emailEmpresa"
                name="emailEmpresa"
                value={formData.emailEmpresa}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefone">Telefone</label>
              <input
                type="text"
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="endereco">Endereço</label>
              <textarea
                id="endereco"
                name="endereco"
                value={formData.endereco}
                onChange={handleChange}
                rows="2"
              />
            </div>
          </div>

          {/* Dados do Usuário Master */}
          <div className="form-section">
            <h3>Usuário Administrador</h3>
            <div className="form-group">
              <label htmlFor="usuarioNome">Nome Completo *</label>
              <input
                type="text"
                id="usuarioNome"
                name="usuarioNome"
                value={formData.usuarioNome}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="usuarioEmail">Email *</label>
              <input
                type="email"
                id="usuarioEmail"
                name="usuarioEmail"
                value={formData.usuarioEmail}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="usuarioSenha">Senha *</label>
                <input
                  type="password"
                  id="usuarioSenha"
                  name="usuarioSenha"
                  value={formData.usuarioSenha}
                  onChange={handleChange}
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmarSenha">Confirmar Senha *</label>
                <input
                  type="password"
                  id="confirmarSenha"
                  name="confirmarSenha"
                  value={formData.confirmarSenha}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary registro-btn" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>

        <div className="registro-footer">
          <p>
            Já tem conta? <Link to="/login">Fazer login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};