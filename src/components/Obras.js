import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FiDownload, FiFile, FiArrowUp, FiArrowDown, FiLoader, FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { authFetch } from '../auth';
import { useMaterial } from '../MaterialContext';

const Obras = () => {
  const { materialType } = useMaterial();
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
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

  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const isSyncingScroll = useRef(false);

  const COL_CODIGO = 120;
  const COL_PRODUTO = 200;
  const COL_ESTOQUE = 130;
  const COL_OBRA = 130;
  const COL_SALDO = 150;

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

  const scrollObrasBy = (direction) => {
    const amount = COL_OBRA * 2 * direction;
    const topEl = topScrollRef.current;
    const tableEl = tableScrollRef.current;
    if (!topEl && !tableEl) return;
    const nextLeft = (topEl || tableEl).scrollLeft + amount;
    if (topEl) topEl.scrollLeft = nextLeft;
    if (tableEl) tableEl.scrollLeft = nextLeft;
  };

  // Função para buscar obras da API (sempre obras ativas)
  const fetchObras = async (page = 1, pageSize = 10, codigo = null, descricao = null) => {
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
        type: 'produtos-obras',
        material_type: materialType
      });
      
      // Add search term as a general filter (could be codigo, descricao, or obra)
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
        type: 'produtos-obras',
        material_type: materialType
      });
      
      // Add search term as a general filter (could be codigo, descricao, or obra)
      if (appliedSearchTerm.trim()) {
        const isCodeSearch = /^[0-9.]+/.test(appliedSearchTerm);
        if (isCodeSearch) {
          params.append('codigo', appliedSearchTerm.trim());
        } else {
          params.append('descricao', appliedSearchTerm.trim());
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
    if (appliedSearchTerm.trim()) {
      const isCodeSearch = /^[0-9.]+/.test(appliedSearchTerm);
      fetchObras(
        currentPage,
        perPage,
        isCodeSearch ? appliedSearchTerm : null,
        !isCodeSearch ? appliedSearchTerm : null
      );
    } else {
      fetchObras(currentPage, perPage);
    }
  }, [currentPage, perPage, appliedSearchTerm]);

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
    // Com termo aplicado, os dados já vêm filtrados pela API por codigo/descricao
    return obrasData;
  }, [appliedSearchTerm, obrasData]);

  const handleSearch = () => {
    const term = searchTerm.trim();
    setCurrentPage(1);
    if (term) {
      const isCodeSearch = /^[0-9.]+/.test(term);
      fetchObras(1, perPage, isCodeSearch ? term : null, !isCodeSearch ? term : null);
      setAppliedSearchTerm(term);
    } else {
      setAppliedSearchTerm('');
      fetchObras(1, perPage);
    }
  };

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

  const tableWidth =
    COL_CODIGO + COL_PRODUTO + COL_ESTOQUE + uniqueObras.length * COL_OBRA + COL_SALDO;

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

          /* Override App.css th { position: relative; width/max-width } */
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
            box-shadow: 2px 0 4px -2px rgba(0, 0, 0, 0.12);
          }

          .stock-control .stock-table .sticky-col-saldo {
            right: 0;
            width: ${COL_SALDO}px;
            min-width: ${COL_SALDO}px;
            max-width: ${COL_SALDO}px;
            box-shadow: -2px 0 4px -2px rgba(0, 0, 0, 0.12);
          }

          .stock-control .stock-table .obras-consideradas-label {
            text-align: left;
            padding-left: 12px;
            white-space: nowrap;
            background: #fff;
          }

          .stock-control .stock-table th.obra-col,
          .stock-control .stock-table td.obra-col {
            width: ${COL_OBRA}px;
            min-width: ${COL_OBRA}px;
            max-width: ${COL_OBRA}px;
            text-align: center;
            border-right: 1px solid #e2e8f0;
            position: static !important;
          }

          .stock-control .stock-table th.obra-col-header {
            background: #f8f9fa;
            font-weight: 600;
            vertical-align: middle;
            white-space: normal;
            word-break: break-word;
            font-size: 12px;
            line-height: 1.25;
            padding: 10px 6px;
          }

          .stock-control .stock-table th.obra-col-header:hover {
            background: #e2e8f0;
          }

          .stock-control .stock-table th.sortable::after {
            display: none;
          }

          .stock-control .stock-table td.obra-col-checkbox {
            padding: 8px;
            vertical-align: middle;
            background: #fff;
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
        
        <div className="table-scroll-bar">
          <button
            type="button"
            className="table-scroll-arrow"
            onClick={() => scrollObrasBy(-1)}
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
            onClick={() => scrollObrasBy(1)}
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
              {uniqueObras.map((obra) => (
                <col key={`col-${obra.descricao}`} style={{ width: COL_OBRA }} />
              ))}
              <col style={{ width: COL_SALDO }} />
            </colgroup>
            <thead>
              {/* Linha de obras consideradas — 1 célula por coluna para não quebrar larguras */}
              <tr className="obras-consideradas-row">
                <td className="sticky-col sticky-col-codigo"></td>
                <td className="sticky-col sticky-col-produto obras-consideradas-label">
                  <strong>Obras consideradas</strong>
                </td>
                <td className="sticky-col sticky-col-estoque"></td>
                {uniqueObras.map((obra) => (
                  <td key={`checkbox-${obra.descricao}`} className="obra-col obra-col-checkbox">
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
                  </td>
                ))}
                <td className="sticky-col sticky-col-saldo obras-consideradas-spacer"></td>
              </tr>
              {/* Cabeçalho principal da tabela */}
              <tr>
                <th
                  className="sortable sticky-col sticky-col-codigo"
                  onClick={() => handleSort('codigo')}
                >
                  Código
                  {sortField === 'codigo' && (
                    sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                  )}
                </th>
                <th
                  className="sortable sticky-col sticky-col-produto"
                  onClick={() => handleSort('descricao')}
                >
                  Produto
                  {sortField === 'descricao' && (
                    sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                  )}
                </th>
                <th
                  className="sortable sticky-col sticky-col-estoque"
                  onClick={() => handleSort('estoqueAtual')}
                >
                  Estoque Atual
                  {sortField === 'estoqueAtual' && (
                    sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                  )}
                </th>
                {uniqueObras.map((obra) => (
                  <th
                    key={obra.descricao}
                    className="sortable obra-col obra-col-header"
                    onClick={() => handleSort(obra.descricao)}
                    title={obra.descricao}
                  >
                    {obra.descricao}
                    {sortField === obra.descricao && (
                      sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />
                    )}
                  </th>
                ))}
                <th
                  className="sortable sticky-col sticky-col-saldo"
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
                <td colSpan={4 + uniqueObras.length} style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
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
                <td colSpan={4 + uniqueObras.length} style={{ textAlign: 'center', padding: '20px' }}>
                  Nenhum item encontrado
                </td>
              </tr>
            )}
            {sortedData.map((item, index) => {
              return (
                <tr key={item.codigo || index}>
                  <td className="sticky-col sticky-col-codigo">{item.codigo}</td>
                  <td className="sticky-col sticky-col-produto">{item.descricao}</td>
                  <td className="sticky-col sticky-col-estoque">
                    <span className="status-badge badge-blue">
                      {formatNumber(item.estoqueAtual)}
                    </span>
                  </td>
                  {uniqueObras.map((obra) => {
                    const quantidade = getObraQuantidade(item, obra.descricao);
                    return (
                      <td key={obra.descricao} className="obra-col">
                        {quantidade > 0 ? (
                          <span className="status-badge badge-purple">
                            {formatNumber(quantidade)}
                          </span>
                        ) : (
                          <span className="empty-cell">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="sticky-col sticky-col-saldo">
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