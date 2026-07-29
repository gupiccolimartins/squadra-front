import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FiArrowUp, FiArrowDown, FiLoader, FiDownload, FiFile, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { authFetch } from '../auth';
import { useMaterial } from '../MaterialContext';

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
  const { materialType } = useMaterial();
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

  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const isSyncingScroll = useRef(false);

  const COL_CODIGO = 110;
  const COL_PRODUTO = 180;
  const COL_ESTOQUE = 120;
  const COL_CONSUMO = 120;
  const COL_SALDO_INTER = 140;
  const COL_COMPRA = 130;
  const COL_SALDO_COMPRAS = 150;

  const syncHorizontalScroll = (source) => (e) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const { scrollLeft } = e.target;
    if (source === 'top' && tableScrollRef.current) {
      tableScrollRef.current.scrollLeft = scrollLeft;
    }
    if (source === 'table' && topScrollRef.current) {
      topScrollRef.current.scrollLeft = scrollLeft;
    }
    isSyncingScroll.current = false;
  };

  const scrollComprasBy = (direction) => {
    const amount = COL_COMPRA * 2 * direction;
    const topEl = topScrollRef.current;
    const tableEl = tableScrollRef.current;
    if (!topEl && !tableEl) return;
    const nextLeft = (topEl || tableEl).scrollLeft + amount;
    if (topEl) topEl.scrollLeft = nextLeft;
    if (tableEl) tableEl.scrollLeft = nextLeft;
  };

  // Função para buscar dados da API
  const fetchCompras = async (page = 1, pageSize = 10, codigo = null, descricao = null) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pageSize.toString(),
        material_type: materialType
      });
      if (codigo) params.append('codigo', codigo);
      if (descricao) params.append('descricao', descricao);
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
        type: 'produtos-compras',
        material_type: materialType
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
        type: 'produtos-compras',
        material_type: materialType
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

  const leftStickyWidth =
    COL_CODIGO + COL_PRODUTO + COL_ESTOQUE + COL_CONSUMO + COL_SALDO_INTER;
  const tableWidth =
    leftStickyWidth + uniqueCompras.length * COL_COMPRA + COL_SALDO_COMPRAS;

  return (
    <div className="stock-control">
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .stock-control .table-container {
            overflow: visible;
          }

          .stock-control .table-scroll-bar {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
          }

          .stock-control .table-scroll-arrow {
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border: 1px solid #cbd5e1;
            background: #f1f5f9;
            color: #334155;
            border-radius: 6px;
            cursor: pointer;
            padding: 0;
            transition: background 0.15s ease, border-color 0.15s ease;
          }

          .stock-control .table-scroll-arrow:hover {
            background: #e2e8f0;
            border-color: #94a3b8;
            color: #0f172a;
          }

          .stock-control .table-scroll-arrow:active {
            background: #cbd5e1;
          }

          .stock-control .table-scroll-top {
            flex: 1;
            min-width: 0;
            overflow-x: scroll;
            overflow-y: hidden;
            height: 18px;
            background: #e2e8f0;
            border-radius: 6px;
            scrollbar-width: auto;
            scrollbar-color: #64748b #e2e8f0;
          }

          .stock-control .table-scroll-top::-webkit-scrollbar {
            -webkit-appearance: none;
            height: 14px;
            display: block;
          }

          .stock-control .table-scroll-top::-webkit-scrollbar-track {
            background: #e2e8f0;
            border-radius: 6px;
          }

          .stock-control .table-scroll-top::-webkit-scrollbar-thumb {
            background: #64748b;
            border-radius: 6px;
            border: 2px solid #e2e8f0;
            min-width: 40px;
          }

          .stock-control .table-scroll-top::-webkit-scrollbar-thumb:hover {
            background: #475569;
          }

          .stock-control .table-scroll-top-spacer {
            height: 1px;
            pointer-events: none;
          }

          .stock-control .table-wrapper {
            position: relative;
            overflow-x: auto;
            overflow-y: visible;
            border-radius: 8px;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .stock-control .table-wrapper::-webkit-scrollbar {
            display: none;
          }

          .stock-control .stock-table {
            width: ${tableWidth}px;
            min-width: ${tableWidth}px;
            max-width: none;
            table-layout: fixed;
            border-collapse: separate;
            border-spacing: 0;
          }

          .stock-control .stock-table th,
          .stock-control .stock-table td {
            box-sizing: border-box;
            overflow: hidden;
          }

          .stock-control .stock-table th.sticky-col,
          .stock-control .stock-table td.sticky-col {
            position: sticky !important;
            z-index: 3;
            background: #fff;
          }

          .stock-control .stock-table thead th.sticky-col {
            background: #f8f9fa;
            z-index: 5;
          }

          .stock-control .stock-table tbody tr:nth-child(even) td.sticky-col {
            background: #fdfdfd;
          }

          .stock-control .stock-table tbody tr:hover td.sticky-col {
            background: #f8f9fa;
          }

          .stock-control .stock-table .sticky-col-codigo {
            left: 0;
            width: ${COL_CODIGO}px;
            min-width: ${COL_CODIGO}px;
            max-width: ${COL_CODIGO}px;
          }

          .stock-control .stock-table .sticky-col-produto {
            left: ${COL_CODIGO}px;
            width: ${COL_PRODUTO}px;
            min-width: ${COL_PRODUTO}px;
            max-width: ${COL_PRODUTO}px;
          }

          .stock-control .stock-table .sticky-col-estoque {
            left: ${COL_CODIGO + COL_PRODUTO}px;
            width: ${COL_ESTOQUE}px;
            min-width: ${COL_ESTOQUE}px;
            max-width: ${COL_ESTOQUE}px;
          }

          .stock-control .stock-table .sticky-col-consumo {
            left: ${COL_CODIGO + COL_PRODUTO + COL_ESTOQUE}px;
            width: ${COL_CONSUMO}px;
            min-width: ${COL_CONSUMO}px;
            max-width: ${COL_CONSUMO}px;
          }

          .stock-control .stock-table .sticky-col-saldo-inter {
            left: ${COL_CODIGO + COL_PRODUTO + COL_ESTOQUE + COL_CONSUMO}px;
            width: ${COL_SALDO_INTER}px;
            min-width: ${COL_SALDO_INTER}px;
            max-width: ${COL_SALDO_INTER}px;
            box-shadow: 2px 0 4px -2px rgba(0, 0, 0, 0.12);
          }

          .stock-control .stock-table .sticky-col-saldo-compras {
            right: 0;
            width: ${COL_SALDO_COMPRAS}px;
            min-width: ${COL_SALDO_COMPRAS}px;
            max-width: ${COL_SALDO_COMPRAS}px;
            box-shadow: -2px 0 4px -2px rgba(0, 0, 0, 0.12);
          }

          .stock-control .stock-table th.compra-col,
          .stock-control .stock-table td.compra-col {
            width: ${COL_COMPRA}px;
            min-width: ${COL_COMPRA}px;
            max-width: ${COL_COMPRA}px;
            text-align: center;
            border-right: 1px solid #e2e8f0;
            position: static !important;
          }

          .stock-control .stock-table th.compra-col-header {
            background: #f8f9fa;
            font-weight: 600;
            vertical-align: middle;
            white-space: normal;
            word-break: break-word;
            font-size: 12px;
            line-height: 1.25;
            padding: 10px 6px;
          }

          .stock-control .stock-table th.compra-col-header:hover {
            background: #e2e8f0;
          }

          .stock-control .stock-table th.sortable::after {
            display: none;
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

        <div className="table-scroll-bar">
          <button
            type="button"
            className="table-scroll-arrow"
            onClick={() => scrollComprasBy(-1)}
            title="Rolar para a esquerda"
            aria-label="Rolar colunas para a esquerda"
          >
            <FiChevronLeft size={18} />
          </button>
          <div
            className="table-scroll-top"
            ref={topScrollRef}
            onScroll={syncHorizontalScroll('top')}
          >
            <div
              className="table-scroll-top-spacer"
              style={{ width: tableWidth }}
            />
          </div>
          <button
            type="button"
            className="table-scroll-arrow"
            onClick={() => scrollComprasBy(1)}
            title="Rolar para a direita"
            aria-label="Rolar colunas para a direita"
          >
            <FiChevronRight size={18} />
          </button>
        </div>

        <div
          className="table-wrapper"
          ref={tableScrollRef}
          onScroll={syncHorizontalScroll('table')}
        >
          <table className="stock-table">
            <colgroup>
              <col style={{ width: COL_CODIGO }} />
              <col style={{ width: COL_PRODUTO }} />
              <col style={{ width: COL_ESTOQUE }} />
              <col style={{ width: COL_CONSUMO }} />
              <col style={{ width: COL_SALDO_INTER }} />
              {uniqueCompras.map((compra) => (
                <col key={`col-${compra.descricao}`} style={{ width: COL_COMPRA }} />
              ))}
              <col style={{ width: COL_SALDO_COMPRAS }} />
            </colgroup>
            <thead>
              <tr>
                <th className="sortable sticky-col sticky-col-codigo" onClick={() => handleSort('codigo')}>
                  Código {sortField === 'codigo' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                </th>
                <th className="sortable sticky-col sticky-col-produto" onClick={() => handleSort('descricao')}>
                  Produto {sortField === 'descricao' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                </th>
                <th className="sortable sticky-col sticky-col-estoque" onClick={() => handleSort('estoqueAtual')}>
                  Estoque Atual {sortField === 'estoqueAtual' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                </th>
                <th className="sortable sticky-col sticky-col-consumo" onClick={() => handleSort('consumoObras')}>
                  Consumo Obras {sortField === 'consumoObras' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                </th>
                <th className="sortable sticky-col sticky-col-saldo-inter" onClick={() => handleSort('estoquePosObras')}>
                  Saldo Intermediário {sortField === 'estoquePosObras' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                </th>
                {uniqueCompras.map((compra) => (
                  <th
                    key={compra.descricao}
                    className="sortable compra-col compra-col-header"
                    onClick={() => handleSort(compra.descricao)}
                    title={compra.descricao}
                  >
                    {compra.descricao}
                    {sortField === compra.descricao && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                  </th>
                ))}
                <th className="sortable sticky-col sticky-col-saldo-compras" onClick={() => handleSort('estoquePosCompras')}>
                  Saldo Após Compras {sortField === 'estoquePosCompras' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                </th>
              </tr>
            </thead>
            <tbody>
              {error && (
                <tr>
                  <td colSpan={6 + uniqueCompras.length} style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
                    Erro ao carregar dados: {error}
                  </td>
                </tr>
              )}
              {sortedData.length === 0 && !loading && !error && (
                <tr>
                  <td colSpan={6 + uniqueCompras.length} style={{ textAlign: 'center', padding: '20px' }}>Nenhum item encontrado</td>
                </tr>
              )}
              {sortedData.map((item, idx) => (
                <tr key={item.codigo || idx}>
                  <td className="sticky-col sticky-col-codigo">{item.codigo}</td>
                  <td className="sticky-col sticky-col-produto">{item.descricao}</td>
                  <td className="sticky-col sticky-col-estoque">
                    <span className="status-badge badge-blue">{formatNumber(item.estoqueAtual)}</span>
                  </td>
                  <td className="sticky-col sticky-col-consumo">
                    <span className="status-badge badge-purple">{formatNumber(item.consumoObras)}</span>
                  </td>
                  <td className="sticky-col sticky-col-saldo-inter">
                    <span className={`status-badge ${getBadgeClass(item.estoquePosObras)}`}>{formatNumber(item.estoquePosObras)}</span>
                  </td>
                  {uniqueCompras.map(compra => {
                    const comp = (item.compras || []).find(c => c.descricao === compra.descricao);
                    const qtd = comp ? comp.quantidade_comprada : 0;
                    return (
                      <td key={compra.descricao} className="compra-col">
                        {qtd > 0 ? <span className="status-badge badge-green">{formatNumber(qtd)}</span> : <span className="empty-cell">-</span>}
                      </td>
                    );
                  })}
                  <td className="sticky-col sticky-col-saldo-compras">
                    <span className={`status-badge ${getBadgeClass(item.estoquePosCompras)}`}>{formatNumber(item.estoquePosCompras)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
