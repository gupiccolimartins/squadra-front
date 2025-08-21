import React, { useState, useEffect, useMemo } from 'react';
import { FiArrowUp, FiArrowDown, FiLoader, FiDownload, FiFile, FiSearch } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { authFetch } from '../auth';

/**
 * Página Compras
 *
 * Estrutura esperada de cada item vindos da API /compras
 * {
 *   codigo: string,
 *   descricao: string,
 *   estoqueAtual: number,
 *   consumoObras: number,            // total já considerado em Obras
 *   estoquePosObras: number,      // estoqueAtual - consumoObras
 *   estoquePosCompras: number,         // estoquePosObras + soma(compras.quantidade_comprada)
 *   compras: [                       // compras futuras previstas
 *     {
 *       _id: string,
 *       descricao: string,           // pode ser número do pedido, data, etc.
 *       quantidade_comprada: number
 *     }
 *   ]
 * }
 */

const Compras = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [comprasData, setComprasData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Export loading states
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Função para buscar dados da API
  const fetchCompras = async (page = 1, pageSize = 10, codigo = null, descricao = null) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pageSize.toString()
      });
      if (codigo) params.append('codigo', codigo);
      if (descricao) params.append('descricao', descricao);
      console.log("params", params);
      const response = await authFetch(`${API_BASE_URL}/compras?${params}`);
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();

      setComprasData(data.items || []);
      setTotalItems(data.total || 0);
    } catch (err) {
      console.error('Erro ao carregar compras:', err);
      setError(err.message);
      setComprasData([]);
    } finally {
      setLoading(false);
    }
    };
  
  // Function to handle PDF export
  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const params = new URLSearchParams({
        type: 'produtos-compras'
      });

      // Add filters if search term exists
      if (appliedSearchTerm.trim()) {
        const isCodeSearch = /^[0-9.]+/.test(appliedSearchTerm);
        if (isCodeSearch) {
          params.append('codigo', appliedSearchTerm.trim());
        } else {
          params.append('descricao', appliedSearchTerm.trim());
        }
      }

      const response = await authFetch(`${API_BASE_URL}/export_pdf?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'produtos-compras.pdf';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }

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
        type: 'produtos-compras'
      });

      if (appliedSearchTerm.trim()) {
        const isCodeSearch = /^[0-9.]+/.test(appliedSearchTerm);
        if (isCodeSearch) {
          params.append('codigo', appliedSearchTerm.trim());
        } else {
          params.append('descricao', appliedSearchTerm.trim());
        }
      }

      const response = await authFetch(`${API_BASE_URL}/export_excel?${params}`);
      console.log("response", response);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'produtos-compras.xlsx';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }

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
  
  useEffect(() => {
    if (appliedSearchTerm.trim()) {
      const isCodeSearch = /^[0-9.]+/.test(appliedSearchTerm);
      fetchCompras(
        currentPage,
        perPage,
        isCodeSearch ? appliedSearchTerm : null,
        !isCodeSearch ? appliedSearchTerm : null
      );
    } else {
      fetchCompras(currentPage, perPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage, appliedSearchTerm]);

  // Extrair compras únicas (máx. 5 colunas visíveis, scroll para mais)
  const uniqueCompras = useMemo(() => {
    const comprasSet = new Map(); // descricao -> id
    comprasData.forEach(produto => {
      (produto.compras || []).forEach(compra => {
        if (!comprasSet.has(compra.descricao)) {
          comprasSet.set(compra.descricao, compra._id);
        }
      });
    });

    return Array.from(comprasSet.entries())
      .map(([descricao, id]) => ({ descricao, id }))
      .sort((a, b) => a.descricao.localeCompare(b.descricao));
  }, [comprasData]);

  const filteredData = useMemo(() => {
    // Quando há termo aplicado, os dados já vêm filtrados da API
    return comprasData;
  }, [appliedSearchTerm, comprasData]);

  const handleSearch = () => {
    const term = searchTerm.trim();
    setCurrentPage(1);
    if (term) {
      const isCodeSearch = /^[0-9.]+/.test(term);
      fetchCompras(1, perPage, isCodeSearch ? term : null, !isCodeSearch ? term : null);
      setAppliedSearchTerm(term);
    } else {
      setAppliedSearchTerm('');
      fetchCompras(1, perPage);
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aValue, bValue;

      if (uniqueCompras.some(c => c.descricao === sortField)) {
        // Sorting by compra column
        const aCompra = (a.compras || []).find(c => c.descricao === sortField);
        const bCompra = (b.compras || []).find(c => c.descricao === sortField);
        aValue = aCompra ? aCompra.quantidade_comprada : 0;
        bValue = bCompra ? bCompra.quantidade_comprada : 0;
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
      }
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
    });
  }, [filteredData, sortField, sortDirection, uniqueCompras]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Página / perPage helpers
  const totalPages = Math.ceil(totalItems / perPage);
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  const formatNumber = (num) => {
    return (num ?? 0).toLocaleString('pt-BR');
  };

  const getBadgeClass = (value) => {
    if (value < 0) return 'badge-red';
    if (value === 0) return 'badge-yellow';
    return 'badge-green';
  };

  return (
    <div className="stock-control">
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          /* Adaptar estilos de scroll para compras (máx 5 colunas visíveis) */
          .compras-header-container {
            padding: 0;
            position: relative;
            width: ${Math.min(uniqueCompras.length, 5) * 120}px;
            max-width: ${Math.min(uniqueCompras.length, 5) * 120}px;
            border-left: 1px solid #e2e8f0;
          }
          .compras-header-scroll {
            display: flex;
            overflow-x: auto;
            scrollbar-width: thin;
            scrollbar-color: #cbd5e0 #f7fafc;
            max-width: ${5 * 120}px;
          }
          .compras-header-scroll::-webkit-scrollbar {
            height: 6px;
          }
          .compras-header-scroll::-webkit-scrollbar-track {
            background: #f7fafc;
            border-radius: 3px;
          }
          .compras-header-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e0;
            border-radius: 3px;
          }
          .compras-header-scroll::-webkit-scrollbar-thumb:hover {
            background: #a0aec0;
          }
          .compra-header-item {
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
          .compra-header-item:hover { background: #e2e8f0; }

          .compras-data-container {
            position: relative;
            width: ${Math.min(uniqueCompras.length, 5) * 120}px;
            max-width: ${Math.min(uniqueCompras.length, 5) * 120}px;
            padding: 0;
            border-left: 1px solid #e2e8f0;
          }
          .compras-data-scroll {
            display: flex;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
            max-width: ${5 * 120}px;
          }
          .compras-data-scroll::-webkit-scrollbar { display: none; }
          .compra-data-item {
            min-width: 120px;
            padding: 12px 8px;
            text-align: center;
            border-right: 1px solid #e2e8f0;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .search-group {
            display: flex;
            align-items: center;
          }

          .icon-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 36px;
            width: 40px;
            border: 1px solid #cbd5e1;
            background: #f1f5f9;
            color: #334155;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.15s ease, border-color 0.15s ease;
            margin-left: 8px;
          }

          .icon-btn:hover {
            background: #e2e8f0;
            border-color: #94a3b8;
          }
        `}
      </style>
      <h1 className="page-title">Compras Planejadas</h1>

      {/* Filtros / busca simples */}
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
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="search-group">
            <label>Procurar:</label>
            <input
              type="text"
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite código, produto ou compra..."
            />
            <button
              type="button"
              className="icon-btn"
              onClick={handleSearch}
              disabled={loading}
              title="Buscar"
              aria-label="Buscar"
            >
              <FiSearch size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ position: 'relative' }}>
        {loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '8px'
          }}>
            <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '22px', color: '#007bff' }} />
          </div>
        )}

        <table className="stock-table">
          <thead>
            <tr>
              <th className="sortable fixed-column" onClick={() => handleSort('codigo')}>
                Código {sortField === 'codigo' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
              </th>
              <th className="sortable fixed-column" onClick={() => handleSort('descricao')}>
                Produto {sortField === 'descricao' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
              </th>
              <th className="sortable fixed-column" onClick={() => handleSort('estoqueAtual')}>
                Estoque Atual {sortField === 'estoqueAtual' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
              </th>
              <th className="sortable fixed-column" onClick={() => handleSort('consumoObras')}>
                Consumo Obras {sortField === 'consumoObras' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
              </th>
              <th className="sortable fixed-column" onClick={() => handleSort('estoquePosObras')}>
                Saldo Intermediário {sortField === 'estoquePosObras' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
              </th>
              {/* Colunas dinâmicas de compras */}
              <th className="compras-header-container">
                <div className="compras-header-scroll" onScroll={(e) => {
                  const scrollLeft = e.target.scrollLeft;
                  document.querySelectorAll('.compras-data-scroll').forEach(el => {
                    if (el !== e.target) el.scrollLeft = scrollLeft;
                  });
                }}>
                  {uniqueCompras.map((compra) => (
                    <div key={compra.descricao} className="compra-header-item" onClick={() => handleSort(compra.descricao)}>
                      {compra.descricao}
                      {sortField === compra.descricao && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                    </div>
                  ))}
                </div>
              </th>
              <th className="sortable fixed-column" onClick={() => handleSort('estoquePosCompras')}>
                Saldo Após Compras {sortField === 'estoquePosCompras' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
              </th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
                  Erro ao carregar dados: {error}
                </td>
              </tr>
            )}
            {sortedData.length === 0 && !loading && !error && (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Nenhum item encontrado</td>
              </tr>
            )}
            {sortedData.map((item, idx) => (
              <tr key={item.codigo || idx}>
                <td className="fixed-column">{item.codigo}</td>
                <td className="fixed-column">{item.descricao}</td>
                <td className="fixed-column"><span className="status-badge badge-blue">{formatNumber(item.estoqueAtual)}</span></td>
                <td className="fixed-column"><span className="status-badge badge-purple">{formatNumber(item.consumoObras)}</span></td>
                <td className="fixed-column"><span className={`status-badge ${getBadgeClass(item.estoquePosObras)}`}>{formatNumber(item.estoquePosObras)}</span></td>
                {/* Dados compras */}
                <td className="compras-data-container">
                  <div className="compras-data-scroll" onScroll={(e) => {
                    const scrollLeft = e.target.scrollLeft;
                    document.querySelectorAll('.compras-header-scroll').forEach(el => {
                      if (el !== e.target) el.scrollLeft = scrollLeft;
                    });
                  }}>
                    {uniqueCompras.map(compra => {
                      const comp = (item.compras || []).find(c => c.descricao === compra.descricao);
                      const qtd = comp ? comp.quantidade_comprada : 0;
                      return (
                        <div key={compra.descricao} className="compra-data-item">
                          {qtd > 0 ? <span className="status-badge badge-green">{formatNumber(qtd)}</span> : <span className="empty-cell">-</span>}
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="fixed-column"><span className={`status-badge ${getBadgeClass(item.estoquePosCompras)}`}>{formatNumber(item.estoquePosCompras)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="pagination-info">
        <div className="pagination-text">
          {!loading && !error && totalItems > 0 && (
            <>
              Mostrando {startItem} a {endItem} de {totalItems} itens
              {totalPages > 1 && (<span> (Página {currentPage} de {totalPages})</span>)}
            </>
          )}
        </div>
        {totalPages > 1 && (
          <div className="pagination-controls">
            <button onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1 || loading} className="pagination-btn">Anterior</button>
            <span className="page-numbers">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                return (
                  <button key={pageNum} onClick={() => setCurrentPage(pageNum)} disabled={loading} className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}>{pageNum}</button>
                );
              })}
            </span>
            <button onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages || loading} className="pagination-btn">Próxima</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Compras;
