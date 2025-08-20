import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { setToken, dispatchAuthEvent } from '../auth';

const Login = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Falha no login');
      }

      const data = await response.json();
      if (!data || !data.access_token) {
        throw new Error('Resposta inválida do servidor');
      }

      setToken(data.access_token);
      dispatchAuthEvent('auth:login');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Entrar</h1>
        <label>
          Usuário
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="error" style={{ color: 'red' }}>{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? 'Autenticando...' : 'Entrar'}
        </button>
      </form>

      <style>{`
        .login-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f7fafc;
          padding: 16px;
        }
        .login-form {
          background: #ffffff;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .login-form h1 {
          margin: 0 0 8px 0;
          font-size: 20px;
        }
        .login-form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 14px;
        }
        .login-form input {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        .login-form button {
          margin-top: 8px;
          padding: 10px 12px;
          border: none;
          border-radius: 6px;
          background: #3182ce;
          color: #fff;
          cursor: pointer;
        }
        .login-form button[disabled] {
          opacity: 0.7;
          cursor: default;
        }
      `}</style>
    </div>
  );
};

export default Login;


