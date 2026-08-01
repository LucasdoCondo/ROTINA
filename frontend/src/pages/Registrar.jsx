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
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Validações básicas no frontend
    const erros = {};

    if (!formData.nomeEmpresa || formData.nomeEmpresa.trim().length < 2) {
      erros.nomeEmpresa = 'Nome da empresa deve ter pelo menos 2 caracteres';
    }

    if (!formData.emailEmpresa) {
      erros.emailEmpresa = 'Email da empresa é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailEmpresa)) {
      erros.emailEmpresa = 'Email da empresa inválido';
    }

    if (!formData.usuarioNome || formData.usuarioNome.trim().length < 2) {
      erros.usuarioNome = 'Nome do usuário deve ter pelo menos 2 caracteres';
    }

    if (!formData.usuarioEmail) {
      erros.usuarioEmail = 'Email do usuário é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.usuarioEmail)) {
      erros.usuarioEmail = 'Email do usuário inválido';
    }

    if (!formData.usuarioSenha) {
      erros.usuarioSenha = 'Senha é obrigatória';
    } else if (formData.usuarioSenha.length < 6) {
      erros.usuarioSenha = 'Senha deve ter no mínimo 6 caracteres';
    }

    if (formData.usuarioSenha !== formData.confirmarSenha) {
      erros.confirmarSenha = 'As senhas não coincidem';
    }

    if (Object.keys(erros).length > 0) {
      setFieldErrors(erros);
      setError('Por favor, corrija os campos destacados');
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
    } else if (result.error) {
      // Tratar erros do backend
      if (result.error.errors && Array.isArray(result.error.errors)) {
        // Erros de validação do backend
        const backendErrors = {};
        result.error.errors.forEach((err) => {
          backendErrors[err.campo] = err.mensagem;
        });
        setFieldErrors(backendErrors);
        setError('Por favor, corrija os campos destacados');
      } else if (result.error.field) {
        // Erro específico de campo (email duplicado, etc)
        setFieldErrors({ [result.error.field]: result.error.message });
        setError(result.error.message);
      } else {
        // Erro genérico
        setError(result.error.message || 'Erro ao criar conta');
      }
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
                className={fieldErrors.nomeEmpresa ? 'input-error' : ''}
              />
              {fieldErrors.nomeEmpresa && <span className="field-error">{fieldErrors.nomeEmpresa}</span>}
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
                  className={fieldErrors.cnpj ? 'input-error' : ''}
                />
                {fieldErrors.cnpj && <span className="field-error">{fieldErrors.cnpj}</span>}
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
                className={fieldErrors.emailEmpresa ? 'input-error' : ''}
              />
              {fieldErrors.emailEmpresa && <span className="field-error">{fieldErrors.emailEmpresa}</span>}
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
                className={fieldErrors.telefone ? 'input-error' : ''}
              />
              {fieldErrors.telefone && <span className="field-error">{fieldErrors.telefone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endereco">Endereço</label>
              <textarea
                id="endereco"
                name="endereco"
                value={formData.endereco}
                onChange={handleChange}
                rows="2"
                className={fieldErrors.endereco ? 'input-error' : ''}
              />
              {fieldErrors.endereco && <span className="field-error">{fieldErrors.endereco}</span>}
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
                className={fieldErrors.usuarioNome ? 'input-error' : ''}
              />
              {fieldErrors.usuarioNome && <span className="field-error">{fieldErrors.usuarioNome}</span>}
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
                className={fieldErrors.usuarioEmail ? 'input-error' : ''}
              />
              {fieldErrors.usuarioEmail && <span className="field-error">{fieldErrors.usuarioEmail}</span>}
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
                  className={fieldErrors.usuarioSenha ? 'input-error' : ''}
                />
                {fieldErrors.usuarioSenha && <span className="field-error">{fieldErrors.usuarioSenha}</span>}
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
                  className={fieldErrors.confirmarSenha ? 'input-error' : ''}
                />
                {fieldErrors.confirmarSenha && <span className="field-error">{fieldErrors.confirmarSenha}</span>}
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