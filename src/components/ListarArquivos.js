import React, { useEffect, useState } from 'react';
import { FiTrash } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { authFetch } from '../auth';

const ListarArquivos = () => {
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getArquivoId = (arquivo) => arquivo.id ?? arquivo._id;

  const fetchArquivos = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: '1',
        per_page: '100',
        file_type: 'estoque-fisico',
      });
      const response = await authFetch(`${API_BASE_URL}/files?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();
      setArquivos(data.items || []);
    } catch (err) {
      console.error('Erro ao carregar arquivos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArquivos();
  }, []);

  const handleDelete = async (arquivo) => {
    const arquivoId = getArquivoId(arquivo);
    if (!arquivoId) {
      alert('Não foi possível identificar o arquivo para remoção.');
      return;
    }

    const confirm = window.confirm('Tem certeza que deseja remover este arquivo?');
    if (!confirm) return;

    try {
      const response = await authFetch(`${API_BASE_URL}/files/${arquivoId}/estoque`, {
        method: 'DELETE',
      });

      const responseData = await response.json().catch(() => null);
      const responseMessage =
        responseData?.message ||
        responseData?.detail ||
        `Erro na requisição: ${response.status}`;

      if (!response.ok) {
        throw new Error(responseMessage);
      }

      setArquivos((prev) => prev.filter((item) => getArquivoId(item) !== arquivoId));
      alert(responseMessage);
    } catch (err) {
      console.error('Erro ao remover arquivo:', err);
      alert(err.message || 'Erro ao remover arquivo. Tente novamente.');
    }
  };

  if (loading) {
    return <div className="page-placeholder">Carregando arquivos...</div>;
  }

  if (error) {
    return <div className="page-placeholder error">Erro: {error}</div>;
  }

  return (
    <div className="listar-arquivos">
      <h1 className="page-title">Listar Arquivos</h1>

      {arquivos.length === 0 ? (
        <p>Nenhum arquivo encontrado.</p>
      ) : (
        <div className="table-container">
          <table className="stock-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Data importação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {arquivos.map((arquivo, index) => (
                <tr key={getArquivoId(arquivo) ?? index}>
                  <td>{arquivo.original_filename ?? arquivo.filename ?? '—'}</td>
                  <td>
                    {arquivo.created_at
                      ? new Date(arquivo.created_at).toLocaleString('pt-BR')
                      : '—'}
                  </td>
                  <td>
                    <FiTrash
                      size={18}
                      className="delete-icon"
                      title="Remover arquivo"
                      onClick={() => handleDelete(arquivo)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .listar-arquivos {
          padding: 20px;
          max-width: 1400px;
          margin: 0 auto;
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

export default ListarArquivos;
