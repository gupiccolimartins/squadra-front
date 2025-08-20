import React, { useState, useMemo, useEffect } from 'react';
import { FiDownload, FiFile, FiArrowUp, FiArrowDown, FiLoader } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { authFetch } from '../auth';

const Obras = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [obrasData, setObrasData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [obrasConsidered, setObrasConsidered] = useState({});

  // Export loading states
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Função para buscar obras da API (sempre obras ativas)
  const fetchObras = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pageSize.toString()
      });
      
      const response = await authFetch(`${API_BASE_URL}/obras?${params}`);

      console.log("response", response);
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Estrutura esperada: { items: [...], total: number, page: number, per_page: number, pages: number }
      setObrasData(data.items || []);
      setTotalItems(data.total || 0);
      
    } catch (err) {
      console.error('Erro ao carregar obras:', err);
      setError(err.message);
      setObrasData([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle PDF export
  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const params = new URLSearchParams({
        type: 'produtos-obras'
      });
      
      // Add search term as a general filter (could be codigo, descricao, or obra)
      if (searchTerm.trim()) {
        // For obras page, we can pass the search term as both codigo and descricao
        // The backend can handle filtering by any of these fields
        const isCodeSearch = /^[0-9.]+/.test(searchTerm);
        if (isCodeSearch) {
          params.append('codigo', searchTerm.trim());
        } else {
          params.append('descricao', searchTerm.trim());
        }
      }

      const response = await authFetch(`${API_BASE_URL}/export_pdf?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'produtos-obras.pdf';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Function to handle Excel export
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const params = new URLSearchParams({
        type: 'produtos-obras'
      });
      
      // Add search term as a general filter (could be codigo, descricao, or obra)
      if (searchTerm.trim()) {
        const isCodeSearch = /^[0-9.]+/.test(searchTerm);
        if (isCodeSearch) {
          params.append('codigo', searchTerm.trim());
        } else {
          params.append('descricao', searchTerm.trim());
        }
      }

      const response = await authFetch(`${API_BASE_URL}/export_excel?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'produtos-obras.xlsx';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      console.error('Error exporting Excel:', err);
      alert('Erro ao gerar Excel. Tente novamente.');
    } finally {
      setExportingExcel(false);
    }
  };

  // Carregar dados quando o componente montar e quando os filtros mudarem
  useEffect(() => {
    fetchObras(currentPage, perPage);
  }, [currentPage, perPage]);

  // Extrair todas as obras únicas dos dados e seus estados is_considered
  const uniqueObras = useMemo(() => {
    const obrasMap = new Map(); // Usar Map para armazenar descricao -> {id, is_considered}
    const obrasConsideredTemp = {};
    
    obrasData.forEach(produto => {
      produto.obras.forEach(obra => {
        if (!obrasMap.has(obra.descricao)) {
          obrasMap.set(obra.descricao, {
            id: obra._id,
            is_considered: obra.is_considered || false
          });
        }
        // Se ainda não definimos o estado desta obra, usar o is_considered da primeira ocorrência
        if (obrasConsideredTemp[obra.descricao] === undefined) {
          obrasConsideredTemp[obra.descricao] = obra.is_considered || false;
        }
      });
    });
    
    // Atualizar o estado das obras consideradas apenas se houver mudanças
    setObrasConsidered(prev => {
      const hasChanges = Object.keys(obrasConsideredTemp).some(
        obra => prev[obra] !== obrasConsideredTemp[obra]
      ) || Object.keys(prev).length !== Object.keys(obrasConsideredTemp).length;
      
      return hasChanges ? obrasConsideredTemp : prev;
    });
    
    // Retornar array com informações necessárias para renderização e API
    return Array.from(obrasMap.entries())
      .map(([descricao, info]) => ({ descricao, ...info }))
      .sort((a, b) => a.descricao.localeCompare(b.descricao));
  }, [obrasData]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return obrasData;
    
    return obrasData.filter(item =>
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.obras.some(obra => 
        obra.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [searchTerm, obrasData]);

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aValue, bValue;
      
      if (uniqueObras.some(obra => obra.descricao === sortField)) {
        // Sorting by obra column
        const aObra = a.obras.find(obra => obra.descricao === sortField);
        const bObra = b.obras.find(obra => obra.descricao === sortField);
        aValue = aObra ? aObra.quantidade_consumida : 0;
        bValue = bObra ? bObra.quantidade_consumida : 0;
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  }, [filteredData, sortField, sortDirection, uniqueObras]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getEstoqueBadgeClass = (estoqueAtual, estoquePosObras) => {
    if (estoquePosObras < 0) return 'badge-red';
    if (estoquePosObras > estoqueAtual) return 'badge-green';
    return 'badge-yellow';
  };

  const formatNumber = (num) => {
    return num.toLocaleString('pt-BR');
  };

  // Função para mudar de página
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Função para alterar itens por página
  const handlePerPageChange = (newPerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset para primeira página
  };

  // Calcular informações de paginação
  const totalPages = Math.ceil(totalItems / perPage);
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  // Função para obter a quantidade consumida de uma obra específica para um produto
  const getObraQuantidade = (produto, obraDescricao) => {
    const obra = produto.obras.find(o => o.descricao === obraDescricao);
    return obra ? obra.quantidade_consumida : 0;
  };

  // Função para alternar o estado de uma obra considerada
  const toggleObraConsidered = async (obra) => {
    console.log(obra);
    const newValue = !obrasConsidered[obra.descricao];
    
    try {
      const response = await authFetch(`${API_BASE_URL}/obras/${obra.id}/is-considered`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_considered: newValue
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }
      
      // Se a requisição foi bem-sucedida, atualizar o estado local
      setObrasConsidered(prev => ({
        ...prev,
        [obra.descricao]: newValue
      }));
      
      // Recarregar os dados para garantir sincronização
      await fetchObras(currentPage, perPage);
      
    } catch (err) {
      console.error('Erro ao atualizar obra considerada:', err);
      // Você pode adicionar uma notificação de erro aqui
      alert(`Erro ao atualizar obra: ${err.message}`);
    }
  };

  return (
    <div className="stock-control">
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .table-wrapper {
            position: relative;
            overflow: hidden;
            border-radius: 8px;
          }
          
          .stock-table {
            width: 100%;
            table-layout: fixed;
          }
          
          .fixed-column {
            position: relative;
            z-index: 2;
          }
          
          .obras-header-container {
            padding: 0;
            position: relative;
            width: ${Math.min(uniqueObras.length, 7) * 120}px;
            max-width: ${Math.min(uniqueObras.length, 7) * 120}px;
          }
          
          .obras-header-scroll {
            display: flex;
            overflow-x: auto;
            scrollbar-width: thin;
            scrollbar-color: #cbd5e0 #f7fafc;
            max-width: ${7 * 120}px;
          }
          
          .obras-header-scroll::-webkit-scrollbar {
            height: 6px;
          }
          
          .obras-header-scroll::-webkit-scrollbar-track {
            background: #f7fafc;
            border-radius: 3px;
          }
          
          .obras-header-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e0;
            border-radius: 3px;
          }
          
          .obras-header-scroll::-webkit-scrollbar-thumb:hover {
            background: #a0aec0;
          }
          
          .obra-header-item {
            min-width: 120px;
            max-width: 120px;
            padding: 12px 8px;
            text-align: center;
            cursor: pointer;
            border-right: 1px solid #e2e8f0;
            background: #f8f9fa;
            font-weight: 600;
            white-space: normal;
            word-break: break-word;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            flex-shrink: 0;
          }
          
          .obra-header-item:hover {
            background: #e2e8f0;
          }
          
          .obras-scroll-container {
            padding: 0;
            position: relative;
            width: ${Math.min(uniqueObras.length, 7) * 120}px;
            max-width: ${Math.min(uniqueObras.length, 7) * 120}px;
          }
          
          .obras-scroll-content {
            display: flex;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
            max-width: ${7 * 120}px;
          }
          
          .obras-scroll-content::-webkit-scrollbar {
            display: none;
          }
          
          .obra-checkbox-wrapper {
            min-width: 120px;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-right: 1px solid #e2e8f0;
            flex-shrink: 0;
          }
          
          .obras-data-container {
            position: relative;
            width: ${Math.min(uniqueObras.length, 7) * 120}px;
            max-width: ${Math.min(uniqueObras.length, 7) * 120}px;
            padding: 0;
          }
          
          .obras-data-scroll {
            display: flex;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
            max-width: ${7 * 120}px;
          }
          
          .obras-data-scroll::-webkit-scrollbar {
            display: none;
          }
          
          .obra-data-item {
            min-width: 120px;
            padding: 12px 8px;
            text-align: center;
            border-right: 1px solid #e2e8f0;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}
      </style>
      <h1 className="page-title">Estoque Obras</h1>
      
      <div className="controls-section">
        <div className="action-buttons">
          <button className="action-btn" onClick={handleExportPDF} disabled={exportingPDF || loading}>
            {exportingPDF ? (
              <>
                <FiLoader 
                  size={16} 
                  style={{ animation: 'spin 1s linear infinite' }} 
                />
                Gerando PDF...
              </>
            ) : (
              <>
                <FiFile size={16} />
                Gerar PDF
              </>
            )}
          </button>
          <button className="action-btn" onClick={handleExportExcel} disabled={exportingExcel || loading}>
            {exportingExcel ? (
              <>
                <FiLoader 
                  size={16} 
                  style={{ animation: 'spin 1s linear infinite' }} 
                />
                Gerando Excel...
              </>
            ) : (
              <>
                <FiDownload size={16} />
                Excel
              </>
            )}
          </button>
        </div>

        <div className="search-section">
          <div className="search-group">
            <label>Itens por página:</label>
            <select
              className="search-input"
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
          <div className="search-group">
            <label>Procurar:</label>
            <input
              type="text"
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite código, produto ou obra..."
            />
          </div>
        </div>
      </div>

      <div className="table-container" style={{ position: 'relative' }}>
        {/* Overlay de loading */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
            }}>
              <FiLoader 
                className="loading-icon" 
                style={{ 
                  animation: 'spin 1s linear infinite',
                  fontSize: '20px',
                  color: '#007bff'
                }} 
              />
              <span style={{ fontSize: '16px', fontWeight: '500' }}>
                Carregando dados...
              </span>
            </div>
          </div>
        )}
        
        <div className="table-wrapper">
          <table className="stock-table">
            <thead>
              {/* Linha de obras consideradas */}
              <tr className="obras-consideradas-row">
                <td colSpan="3" className="obras-consideradas-label">
                  <strong>Obras consideradas</strong>
                </td>
                {/* Container scrollável para checkboxes das obras */}
                <td className="obras-scroll-container">
                  <div className="obras-scroll-content" onScroll={(e) => {
                    // Sincronizar scroll com outras seções
                    const scrollLeft = e.target.scrollLeft;
                    document.querySelectorAll('.obras-header-scroll, .obras-data-scroll').forEach(el => {
                      if (el !== e.target) el.scrollLeft = scrollLeft;
                    });
                  }}>
                    {uniqueObras.map((obra, index) => (
                      <div key={`checkbox-${obra.descricao}`} className="obra-checkbox-wrapper">
                        <div className="checkbox-container">
                          <input
                            type="checkbox"
                            id={`obra-${obra.descricao}`}
                            checked={obrasConsidered[obra.descricao] || false}
                            onChange={() => toggleObraConsidered(obra)}
                            className="obra-checkbox"
                          />
                          <label htmlFor={`obra-${obra.descricao}`} className="checkbox-label">
                            {/* Label vazio, só visual */}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
                <td colSpan="1" className="obras-consideradas-spacer"></td>
              </tr>
              {/* Cabeçalho principal da tabela */}
              <tr>
                <th 
                  className="sortable fixed-column" 
                  onClick={() => handleSort('codigo')}
                >
                  Código
                  {sortField === 'codigo' && (
                    sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                  )}
                </th>
                <th 
                  className="sortable fixed-column" 
                  onClick={() => handleSort('descricao')}
                >
                  Produto
                  {sortField === 'descricao' && (
                    sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                  )}
                </th>
                <th 
                  className="sortable fixed-column" 
                  onClick={() => handleSort('estoqueAtual')}
                >
                  Estoque Atual
                  {sortField === 'estoqueAtual' && (
                    sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                  )}
                </th>
                {/* Container scrollável para colunas de obras */}
                <th className="obras-header-container">
                  <div className="obras-header-scroll" onScroll={(e) => {
                    // Sincronizar scroll com outras seções
                    const scrollLeft = e.target.scrollLeft;
                    document.querySelectorAll('.obras-scroll-content, .obras-data-scroll').forEach(el => {
                      if (el !== e.target) el.scrollLeft = scrollLeft;
                    });
                  }}>
                    {uniqueObras.map((obra, index) => (
                      <div
                        key={obra.descricao}
                        className="obra-header-item"
                        onClick={() => handleSort(obra.descricao)}
                        title={obra.descricao}
                      >
                        {obra.descricao}
                        {sortField === obra.descricao && (
                          sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                        )}
                      </div>
                    ))}
                  </div>
                </th>
                <th 
                  className="sortable fixed-column" 
                  onClick={() => handleSort('estoquePosObras')}
                >
                  Saldo Intermediário
                  {sortField === 'estoquePosObras' && (
                    sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                  )}
                </th>
              </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
                  Erro ao carregar dados: {error}
                  <br />
                  <button 
                    onClick={() => fetchObras(currentPage, perPage)}
                    style={{ marginTop: '10px', padding: '5px 10px', cursor: 'pointer' }}
                  >
                    Tentar novamente
                  </button>
                </td>
              </tr>
            )}
            {sortedData.length === 0 && !loading && !error && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                  Nenhum item encontrado
                </td>
              </tr>
            )}
            {sortedData.map((item, index) => {
              return (
                <tr key={item.codigo || index}>
                  <td className="fixed-column">{item.codigo}</td>
                  <td className="fixed-column">{item.descricao}</td>
                  <td className="fixed-column">
                    <span className="status-badge badge-blue">
                      {formatNumber(item.estoqueAtual)}
                    </span>
                  </td>
                  {/* Container scrollável para dados das obras */}
                  <td className="obras-data-container">
                    <div className="obras-data-scroll" onScroll={(e) => {
                      // Sincronizar scroll com outras seções
                      const scrollLeft = e.target.scrollLeft;
                      document.querySelectorAll('.obras-scroll-content, .obras-header-scroll').forEach(el => {
                        if (el !== e.target) el.scrollLeft = scrollLeft;
                      });
                    }}>
                      {uniqueObras.map((obra) => {
                        const quantidade = getObraQuantidade(item, obra.descricao);
                        return (
                          <div key={obra.descricao} className="obra-data-item">
                            {quantidade > 0 ? (
                              <span className="status-badge badge-purple">
                                {formatNumber(quantidade)}
                              </span>
                            ) : (
                              <span className="empty-cell">-</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="fixed-column">
                    <span className={`status-badge ${getEstoqueBadgeClass(item.estoqueAtual, item.estoquePosObras)}`}>
                      {formatNumber(item.estoquePosObras)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
      
      <div className="pagination-info">
        <div className="pagination-text">
          {!loading && !error && totalItems > 0 && (
            <>
              Mostrando {startItem} a {endItem} de {totalItems} itens
              {totalPages > 1 && (
                <span> (Página {currentPage} de {totalPages})</span>
              )}
            </>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="pagination-btn"
            >
              Anterior
            </button>
            
            <span className="page-numbers">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={loading}
                    className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </span>
            
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="pagination-btn"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Obras; 