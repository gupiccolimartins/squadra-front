import React, { useEffect, useState } from 'react';
import { FiTrash, FiCheckCircle } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { authFetch } from '../auth';

/**
 * Componente para listar obras.
 * - Exibe uma tabela com nome, status, link para listar produtos e botões para finalizar ou remover.
 * - Os dados são carregados do backend (endpoint GET /obras).
 * - Ao clicar em "Listar produtos", um modal é aberto e lista os produtos da obra.
 * - Ao clicar no ícone de check, a obra é finalizada via PATCH /obras/:id/status?status_update=finished.
 * - Ao clicar no ícone de lixeira, a obra é removida via DELETE /obras/:id.
 */
const ListarObras = () => {
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedObra, setSelectedObra] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [errorProducts, setErrorProducts] = useState(null);

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

      const response = await authFetch(`${API_BASE_URL}/obras/all`);
      
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
   * Abre o modal de produtos, carregando-os do backend.
   * A API esperada é GET /obras/:id/produtos (ajuste se necessário).
   */
  const openProductsModal = async (obra) => {
    setSelectedObra(obra);
    setProducts([]);
    setErrorProducts(null);
    setLoadingProducts(true);

    try {
      const response = await authFetch(`${API_BASE_URL}/obras/${obra._id}/produtos`);
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }
      const data = await response.json();
      setProducts(data.items ?? data);
    } catch (err) {
      console.error('Erro ao carregar produtos da obra:', err);
      setErrorProducts(err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  const closeModal = () => {
    setSelectedObra(null);
    setProducts([]);
  };

  /**
   * Remove a obra do banco de dados e atualiza a lista local.
   * A API esperada é DELETE /obras/:id (ajuste se necessário).
   */
  const handleDelete = async (obraId) => {
    const confirm = window.confirm('Tem certeza que deseja remover esta obra?');
    if (!confirm) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/obras/${obraId}`, {
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
                {hasId && <th>Produtos</th>}
                {hasId && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {obras.map((obra, index) => (
                <tr key={hasId ? obra._id : index}>
                  <td>{obra.description ?? obra.nome ?? obra.descricao}</td>
                  <td>{renderStatusBadge(obra.status, obra.is_obra_futura)}</td>
                  {hasId && (
                    <>
                      <td>
                        <button className="link-button" onClick={() => openProductsModal(obra)}>
                          Listar produtos
                        </button>
                      </td>
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
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de produtos */}
      {selectedObra && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              Produtos da obra: <strong>{selectedObra.nome ?? selectedObra.descricao}</strong>
            </h3>

            {loadingProducts && <p>Carregando produtos...</p>}
            {errorProducts && <p className="error">Erro: {errorProducts}</p>}

            {!loadingProducts && !errorProducts && (
              <ul className="products-list">
                {products.length === 0 ? (
                  <li>Nenhum produto relacionado.</li>
                ) : (
                  products.map((prod) => (
                    <li key={prod._id}>
                      {prod.codigo} - {prod.descricao}{' '}
                      {prod.quantidade !== undefined && `(${prod.quantidade})`}
                    </li>
                  ))
                )}
              </ul>
            )}

            <button className="modal-close" onClick={closeModal}>
              Fechar
            </button>
          </div>
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

        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: #ffffff;
          padding: 24px;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        .modal h3 {
          margin-top: 0;
        }
        .modal-close {
          margin-top: 16px;
          background: #3182ce;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        .modal-close:hover {
          background: #2b6cb0;
        }
        .products-list {
          margin: 12px 0;
          padding-left: 20px;
        }
        .error {
          color: #e53e3e;
        }
      `}</style>
    </div>
  );
};

export default ListarObras;
