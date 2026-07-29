import React, { useEffect, useState } from 'react';
import { FiTrash, FiCheckCircle, FiEdit2, FiX } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { authFetch } from '../auth';
import { useMaterial } from '../MaterialContext';

/**
 * Componente para listar obras.
 * - Exibe uma tabela com nome, status e botões para editar nome, finalizar ou remover.
 * - Os dados são carregados do backend (endpoint GET /obras/all).
 * - Ao clicar no ícone de lápis, abre modal para alterar o nome da obra via PATCH /obras/:id.
 * - Ao clicar no ícone de check, a obra é finalizada via PATCH /obras/:id/status?status_update=finished.
 * - Ao clicar no ícone de lixeira, a obra é removida via DELETE /obras/:id.
 */
const ListarObras = () => {
  const { materialType } = useMaterial();
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingObra, setEditingObra] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // Verifica se as obras retornam um _id (detalhado) ou não (lista resumida)
  const hasId = obras.length > 0 && obras[0]._id !== undefined;

  const getObraName = (obra) => obra?.description ?? obra?.nome ?? obra?.descricao ?? '';

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

  const openEditModal = (obra) => {
    setEditingObra(obra);
    setEditName(getObraName(obra));
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (saving) return;
    setShowEditModal(false);
    setEditingObra(null);
    setEditName('');
  };

  /**
   * Atualiza o nome (descricao) da obra no banco e na lista local.
   * A API esperada é PATCH /obras/:id com body { descricao }.
   */
  const handleSaveName = async () => {
    const trimmedName = editName.trim();
    if (!editingObra || !trimmedName) {
      alert('O nome da obra não pode ser vazio.');
      return;
    }

    if (trimmedName === getObraName(editingObra)) {
      closeEditModal();
      return;
    }

    try {
      setSaving(true);
      const response = await authFetch(
        `${API_BASE_URL}/obras/${editingObra._id}?material_type=${materialType}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descricao: trimmedName }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Erro na requisição: ${response.status}`);
      }

      setObras((prev) =>
        prev.map((obra) =>
          obra._id === editingObra._id
            ? { ...obra, description: trimmedName, descricao: trimmedName }
            : obra
        )
      );
      setShowEditModal(false);
      setEditingObra(null);
      setEditName('');
    } catch (err) {
      console.error('Erro ao renomear obra:', err);
      alert(err.message || 'Erro ao renomear obra. Tente novamente.');
    } finally {
      setSaving(false);
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
                  <td>{getObraName(obra)}</td>
                  <td>{renderStatusBadge(obra.status, obra.is_obra_futura)}</td>
                  {hasId && (
                    <td>
                      <FiEdit2
                        size={18}
                        className="edit-icon"
                        title="Editar nome da obra"
                        onClick={() => openEditModal(obra)}
                      />
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

      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar nome da obra</h3>
              <button
                className="modal-close-btn"
                onClick={closeEditModal}
                type="button"
                disabled={saving}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="obra-edit-name">Nome da obra:</label>
                <input
                  type="text"
                  id="obra-edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                  }}
                  placeholder="Digite o nome da obra..."
                  className="obra-name-input"
                  autoFocus
                  disabled={saving}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={closeEditModal}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirm"
                onClick={handleSaveName}
                disabled={saving || !editName.trim()}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
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
        .edit-icon {
          cursor: pointer;
          color: #3182ce;
          margin-right: 8px;
        }
        .edit-icon:hover {
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
