import React, { useEffect, useState } from 'react';
import { FiTrash, FiCheckCircle } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { authFetch } from '../auth';
import { useMaterial } from '../MaterialContext';

/**
 * Componente para listar obras.
 * - Exibe uma tabela com nome, status, link para listar produtos e botões para finalizar ou remover.
 * - Os dados são carregados do backend (endpoint GET /obras).
 * - Ao clicar em "Listar produtos", um modal é aberto e lista os produtos da obra.
 * - Ao clicar no ícone de check, a obra é finalizada via PATCH /obras/:id/status?status_update=finished.
 * - Ao clicar no ícone de lixeira, a obra é removida via DELETE /obras/:id.
 */
const ListarObras = () => {
  const { materialType } = useMaterial();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verifica se as obras retornam um _id (detalhado) ou não (lista resumida)
  const hasId = obras.length > 0 && obras[0]._id !== undefined;

  // Função auxiliar para renderizar badge de status
  const renderStatusBadge = (status, isObraFutura) => {
    if (isObraFutura) {
      return <span className="status-badge badge-purple">Obra Futura</span>;
    }
    if (status === 'active') {
      return <span className="status-badge badge-yellow">Em andamento</span>;
    }
    if (status === 'finished') {
      return <span className="status-badge badge-green">Finalizada</span>;
    }
    return status ?? '—';
  };

  // Carrega a lista de obras ao montar
  useEffect(() => {
    fetchObras();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Busca todas as obras no backend.
   * Se o backend retornar um objeto { items: [...] } utiliza items, senão utiliza a resposta direta.
   */
  const fetchObras = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authFetch(`${API_BASE_URL}/obras/all?material_type=${materialType}`);
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();
      
      setObras(data);
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove a obra do banco de dados e atualiza a lista local.
   * A API esperada é DELETE /obras/:id (ajuste se necessário).
   */
  const handleDelete = async (obraId) => {
    const confirm = window.confirm('Tem certeza que deseja remover esta obra?');
    if (!confirm) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/obras/${obraId}?material_type=${materialType}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }
      // Atualiza a lista local
      setObras((prev) => prev.filter((obra) => obra._id !== obraId));
    } catch (err) {
      console.error('Erro ao remover obra:', err);
      alert('Erro ao remover obra. Tente novamente.');
    }
  };

  /**
   * Finaliza a obra definindo seu status como 'finished'.
   * A API esperada é PATCH /obras/:id/status?status_update=finished
   */
  const handleFinalize = async (obraId) => {
    const confirm = window.confirm('Tem certeza que deseja finalizar esta obra?');
    if (!confirm) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/obras/${obraId}/status?status_update=finished`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }
      // Atualiza localmente o status da obra
      setObras((prev) =>
        prev.map((obra) =>
          obra._id === obraId ? { ...obra, status: 'finished' } : obra
        )
      );
    } catch (err) {
      console.error('Erro ao finalizar obra:', err);
      alert('Erro ao finalizar obra. Tente novamente.');
    }
  };

  if (loading) {
    return <div className="page-placeholder">Carregando obras...</div>;
  }

  if (error) {
    return <div className="page-placeholder error">Erro: {error}</div>;
  }

  return (
    <div className="listar-obras">
      <h1 className="page-title">Obras</h1>

      {obras.length === 0 ? (
        <p>Nenhuma obra encontrada.</p>
      ) : (
        <div className="table-container">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                {hasId && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {obras.map((obra, index) => (
                <tr key={hasId ? obra._id : index}>
                  <td>{obra.description ?? obra.nome ?? obra.descricao}</td>
                  <td>{renderStatusBadge(obra.status, obra.is_obra_futura)}</td>
                  {hasId && (
                    <td>
                      {obra.status !== 'finished' && (
                        <FiCheckCircle
                          size={18}
                          className="finalize-icon"
                          title="Finalizar obra"
                          onClick={() => handleFinalize(obra._id)}
                        />
                      )}
                      <FiTrash
                        size={18}
                        className="delete-icon"
                        title="Remover obra"
                        onClick={() => handleDelete(obra._id)}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Estilos inline para simplicidade */}
      <style>{`
        .listar-obras {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }
        .table-wrapper {
          overflow-x: auto;
        }
        .link-button {
          background: none;
          border: none;
          color: #3182ce;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
          font: inherit;
        }
        .link-button:hover {
          color: #2b6cb0;
        }
        .finalize-icon {
          cursor: pointer;
          color: #38A169;
          margin-right: 8px;
        }
        .finalize-icon:hover {
          color: #2F855A;
        }
        .delete-icon {
          cursor: pointer;
          color: #e53e3e;
        }
        .delete-icon:hover {
          color: #c53030;
        }
        .error {
          color: #e53e3e;
        }
      `}</style>
    </div>
  );
};

export default ListarObras;
