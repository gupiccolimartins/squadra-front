import React, { useState, useMemo, useEffect } from 'react';
import { FiDownload, FiFile, FiArrowUp, FiArrowDown, FiLoader } from 'react-icons/fi';

const StockControl = () => {
  const [importDate, setImportDate] = useState('12/11/2024');
  const [compareDate, setCompareDate] = useState('12/11/2024');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // API related states
  const [apiData, setApiData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Export loading states
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Function to fetch data from API
  const fetchProdutosEstoque = async (page = 1, pageSize = 10, codigo = null, descricao = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pageSize.toString()
      });
      
      if (codigo) params.append('codigo', codigo);
      if (descricao) params.append('descricao', descricao);

      const response = await fetch(`http://localhost:8000/produtos-estoque?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Assuming the API returns data in the format: { items: [], total: number, page: number, per_page: number, pages: number }
      // Ensure all items have the required fields with default values
      const itemsWithDefaults = (data.items || []).map(item => ({
        ...item,
        estoqueAnterior: item.estoqueAnterior ?? 0,
        estoqueAtual: item.estoqueAtual ?? 0,
        comparacao: item.comparacao ?? 0,
        saldoInterm: item.saldoInterm ?? 0,
        saldoAposCompras: item.saldoAposCompras ?? 0,
        saldoAposNovasObras: item.saldoAposNovasObras ?? 0,
        dataEstoqueAtual: item.dataEstoqueAtual ?? '12/11/2024',
        dataEstoqueAnterior: item.dataEstoqueAnterior ?? '11/11/2024'
      }));
      
      setApiData(itemsWithDefaults);
      setTotalItems(data.total || 0);
      setCurrentPage(data.page || 1);
      setTotalPages(data.pages || 1);
      
    } catch (err) {
      console.error('Error fetching produtos estoque:', err);
      setError(err.message);
      setApiData([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle PDF export
  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const params = new URLSearchParams({
        type: 'produtos-estoque'
      });
      
      // Add filters if search term exists
      if (searchTerm.trim()) {
        const isCodeSearch = /^[0-9.]+/.test(searchTerm);
        if (isCodeSearch) {
          params.append('codigo', searchTerm.trim());
        } else {
          params.append('descricao', searchTerm.trim());
        }
      }

      const response = await fetch(`http://localhost:8000/export_pdf?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'produtos-estoque.pdf';
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
        type: 'produtos-estoque'
      });
      
      // Add filters if search term exists
      if (searchTerm.trim()) {
        const isCodeSearch = /^[0-9.]+/.test(searchTerm);
        if (isCodeSearch) {
          params.append('codigo', searchTerm.trim());
        } else {
          params.append('descricao', searchTerm.trim());
        }
      }

      const response = await fetch(`http://localhost:8000/export_excel?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'produtos-estoque.xlsx';
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

  // Fetch data on component mount and when pagination changes
  useEffect(() => {
    fetchProdutosEstoque(currentPage, perPage);
  }, [currentPage, perPage]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        // Check if searchTerm looks like a code (numbers/dots) or description (letters)
        const isCodeSearch = /^[0-9.]+/.test(searchTerm);
        fetchProdutosEstoque(1, perPage, isCodeSearch ? searchTerm : null, !isCodeSearch ? searchTerm : null);
      } else {
        fetchProdutosEstoque(currentPage, perPage);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use API data if available, otherwise use hardcoded data
  const dataToUse = apiData.length > 0 ? apiData : [];

  // Get the first item to extract the dates for display
  const firstItem = dataToUse[0];
  const dataEstoqueAtual = firstItem?.dataEstoqueAtual || '12/11/2024';
  const dataEstoqueAnterior = firstItem?.dataEstoqueAnterior || '11/11/2024';

  const filteredData = useMemo(() => {
    // If using API data and there's a search term, data is already filtered by the API
    if (apiData.length > 0 && searchTerm.trim()) {
      return dataToUse;
    }
    
    // When no search term, return all data
    if (!searchTerm) return dataToUse;
    
    return dataToUse.filter(item =>
      (item.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.cor || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dataToUse, searchTerm, apiData]);

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField] ?? 0;
      const bValue = b[sortField] ?? 0;

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
  }, [filteredData, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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
  const calculatedTotalPages = Math.ceil(totalItems / perPage);
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  const getBadgeClass = (value) => {
    if (value === undefined || value === null || value === 0) return 'badge-blue';
    if (value > 0 && value < 1000) return 'badge-green';
    if (value >= 1000 && value < 5000) return 'badge-green';
    if (value >= 5000) return 'badge-green';
    return 'badge-yellow';
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) {
      return '0';
    }
    return num.toLocaleString('pt-BR');
  };

  return (
    <div className="stock-control">
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <h1 className="page-title">PCM do dia {dataEstoqueAtual}</h1>
      
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
              placeholder="Digite código, produto ou cor..."
              disabled={loading}
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
        
        <table className="stock-table">
          <thead>
            <tr>
              <th 
                className="sortable" 
                onClick={() => handleSort('codigo')}
              >
                Código
                {sortField === 'codigo' && (
                  sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('descricao')}
              >
                Descrição
                {sortField === 'descricao' && (
                  sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('cor')}
              >
                Cor
                {sortField === 'cor' && (
                  sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('estoqueAtual')}
              >
                Estoque Atual
                {sortField === 'estoqueAtual' && (
                  sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('estoqueAnterior')}
              >
                Estoque Anterior ({dataEstoqueAnterior})
                {sortField === 'estoqueAnterior' && (
                  sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('comparacao')}
              >
                Diferença
                {sortField === 'comparacao' && (
                  sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('saldoInterm')}
              >
                Saldo Intermediário
                {sortField === 'saldoInterm' && (
                  sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('saldoAposCompras')}
              >
                Saldo Após Compras
                {sortField === 'saldoAposCompras' && (
                  sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                )}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('saldoAposNovasObras')}
              >
                Saldo Após Obras Futuras
                {sortField === 'saldoAposNovasObras' && (
                  sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
                  Erro ao carregar dados: {error}
                  <br />
                  <button 
                    onClick={() => fetchProdutosEstoque(currentPage, perPage)}
                    style={{ marginTop: '10px', padding: '5px 10px', cursor: 'pointer' }}
                  >
                    Tentar novamente
                  </button>
                </td>
              </tr>
            )}
            {sortedData.length === 0 && !loading && !error && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                  Nenhum item encontrado
                </td>
              </tr>
            )}
            {sortedData.map((item, index) => (
              <tr key={index}>
                <td>{item.codigo || ''}</td>
                <td>{item.descricao || ''}</td>
                <td>{item.cor || ''}</td>
                <td>
                  <span className={`status-badge ${getBadgeClass(item.estoqueAtual)}`}>
                    {formatNumber(item.estoqueAtual)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getBadgeClass(item.estoqueAnterior)}`}>
                    {formatNumber(item.estoqueAnterior)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getBadgeClass(item.comparacao)}`}>
                    {formatNumber(item.comparacao)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getBadgeClass(item.saldoInterm)}`}>
                    {formatNumber(item.saldoInterm)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getBadgeClass(item.saldoAposCompras)}`}>
                    {formatNumber(item.saldoAposCompras)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${item.saldoAposNovasObras === 3252 ? 'badge-red' : getBadgeClass(item.saldoAposNovasObras)}`}>
                    {formatNumber(item.saldoAposNovasObras)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="pagination-info">
        <div className="pagination-text">
          {!loading && !error && totalItems > 0 && (
            <>
              Mostrando {startItem} a {endItem} de {totalItems} itens
              {calculatedTotalPages > 1 && (
                <span> (Página {currentPage} de {calculatedTotalPages})</span>
              )}
            </>
          )}
        </div>
        
        {calculatedTotalPages > 1 && (
          <div className="pagination-controls">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="pagination-btn"
            >
              Anterior
            </button>
            
            <span className="page-numbers">
              {Array.from({ length: Math.min(5, calculatedTotalPages) }, (_, i) => {
                let pageNum;
                if (calculatedTotalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= calculatedTotalPages - 2) {
                  pageNum = calculatedTotalPages - 4 + i;
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
              disabled={currentPage === calculatedTotalPages || loading}
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

export default StockControl; 