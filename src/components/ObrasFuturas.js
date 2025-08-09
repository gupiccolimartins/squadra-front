import React, { useState, useEffect, useMemo } from 'react';
import { FiArrowUp, FiArrowDown, FiLoader } from 'react-icons/fi';

/**
 * Página Estoque Obras Futuras
 *
 * Estrutura esperada de cada item vindo do endpoint /obras-futuras
 * {
 *   codigo: string,
 *   descricao: string,
 *   estoqueAtual: number,
 *   consumoObras: number,
 *   estoquePosObras: number,
 *   quantidadeCompras: number,
 *   estoquePosCompras: number,
 *   estoquePosObrasFuturas: number,
 *   obrasFuturas: [
 *     {
 *       _id: string,
 *       descricao: string,
 *       quantidade_consumida: number,
 *       is_considered: boolean
 *     }
 *   ]
 * }
 */
const ObrasFuturas = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [obrasFuturasData, setObrasFuturasData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Função para buscar dados da API
  const fetchObrasFuturas = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: pageSize.toString()
      });

      const response = await fetch(`http://localhost:8000/obras-futuras?${params}`);
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status}`);
      }

      const data = await response.json();
      setObrasFuturasData(data.items || []);
      setTotalItems(data.total || 0);
    } catch (err) {
      console.error('Erro ao carregar obras futuras:', err);
      setError(err.message);
      setObrasFuturasData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObrasFuturas(currentPage, perPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, perPage]);

  // Extrair obras futuras únicas (máx. 7 colunas visíveis, scroll para mais)
  const uniqueObrasFuturas = useMemo(() => {
    const obrasSet = new Map(); // descricao -> id
    obrasFuturasData.forEach(produto => {
      (produto.obrasFuturas || []).forEach(obra => {
        if (!obrasSet.has(obra.descricao)) {
          obrasSet.set(obra.descricao, obra._id);
        }
      });
    });

    return Array.from(obrasSet.entries())
      .map(([descricao, id]) => ({ descricao, id }))
      .sort((a, b) => a.descricao.localeCompare(b.descricao));
  }, [obrasFuturasData]);

  // Filtragem por texto
  const filteredData = useMemo(() => {
    if (!searchTerm) return obrasFuturasData;
    return obrasFuturasData.filter(item =>
      (item.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.obrasFuturas || []).some(o => (o.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, obrasFuturasData]);

  // Ordenação
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aValue, bValue;

      if (uniqueObrasFuturas.some(o => o.descricao === sortField)) {
        // Ordenar por coluna de obra futura
        const aObra = (a.obrasFuturas || []).find(o => o.descricao === sortField);
        const bObra = (b.obrasFuturas || []).find(o => o.descricao === sortField);
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
      }
      return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
    });
  }, [filteredData, sortField, sortDirection, uniqueObrasFuturas]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Paginação helpers
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
      {/* Inline styles para scrolls sincronizados */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .obras-futuras-header-container {
          padding: 0;
          position: relative;
          width: ${Math.min(uniqueObrasFuturas.length, 7) * 120}px;
          max-width: ${Math.min(uniqueObrasFuturas.length, 7) * 120}px;
          border-left: 1px solid #e2e8f0;
        }
        .obras-futuras-header-scroll {
          display: flex;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;
          max-width: ${7 * 120}px;
        }
        .obras-futuras-header-scroll::-webkit-scrollbar { height: 6px; }
        .obras-futuras-header-scroll::-webkit-scrollbar-track { background: #f7fafc; border-radius: 3px; }
        .obras-futuras-header-scroll::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 3px; }
        .obras-futuras-header-scroll::-webkit-scrollbar-thumb:hover { background: #a0aec0; }
        .obra-futura-header-item {
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
        .obra-futura-header-item:hover { background: #e2e8f0; }

        .obras-futuras-data-container {
          position: relative;
          width: ${Math.min(uniqueObrasFuturas.length, 7) * 120}px;
          max-width: ${Math.min(uniqueObrasFuturas.length, 7) * 120}px;
          padding: 0;
          border-left: 1px solid #e2e8f0;
        }
        .obras-futuras-data-scroll {
          display: flex;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          max-width: ${7 * 120}px;
        }
        .obras-futuras-data-scroll::-webkit-scrollbar { display: none; }
        .obra-futura-data-item {
          min-width: 120px;
          padding: 12px 8px;
          text-align: center;
          border-right: 1px solid #e2e8f0;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
      <h1 className="page-title">Estoque Obras Futuras</h1>

      {/* Filtros / busca simples */}
      <div className="controls-section">
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
              placeholder="Digite código, produto ou obra futura..."
            />
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
              <th className="sortable fixed-column" onClick={() => handleSort('quantidadeCompras')}>
                Quantidade Comprada {sortField === 'quantidadeCompras' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
              </th>
              <th className="sortable fixed-column" onClick={() => handleSort('estoquePosCompras')}>
                Saldo Após Compras {sortField === 'estoquePosCompras' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
              </th>
              {/* Colunas dinâmicas de obras futuras */}
              <th className="obras-futuras-header-container">
                <div className="obras-futuras-header-scroll" onScroll={(e) => {
                  const scrollLeft = e.target.scrollLeft;
                  document.querySelectorAll('.obras-futuras-data-scroll').forEach(el => {
                    if (el !== e.target) el.scrollLeft = scrollLeft;
                  });
                }}>
                  {uniqueObrasFuturas.map((obra) => (
                    <div key={obra.descricao} className="obra-futura-header-item" onClick={() => handleSort(obra.descricao)}>
                      {obra.descricao}
                      {sortField === obra.descricao && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
                    </div>
                  ))}
                </div>
              </th>
              <th className="sortable fixed-column" onClick={() => handleSort('estoquePosObrasFuturas')}>
                Saldo Pós Obras Futuras {sortField === 'estoquePosObrasFuturas' && (sortDirection === 'asc' ? <FiArrowUp size={12} /> : <FiArrowDown size={12} />)}
              </th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
                  Erro ao carregar dados: {error}
                </td>
              </tr>
            )}
            {sortedData.length === 0 && !loading && !error && (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>Nenhum item encontrado</td>
              </tr>
            )}
            {sortedData.map((item, idx) => (
              <tr key={item.codigo || idx}>
                <td className="fixed-column">{item.codigo}</td>
                <td className="fixed-column">{item.descricao}</td>
                <td className="fixed-column"><span className="status-badge badge-blue">{formatNumber(item.estoqueAtual)}</span></td>
                <td className="fixed-column"><span className="status-badge badge-purple">{formatNumber(item.consumoObras)}</span></td>
                <td className="fixed-column"><span className={`status-badge ${getBadgeClass(item.estoquePosObras)}`}>{formatNumber(item.estoquePosObras)}</span></td>
                <td className="fixed-column"><span className="status-badge badge-green">{formatNumber(item.quantidadeCompras)}</span></td>
                <td className="fixed-column"><span className={`status-badge ${getBadgeClass(item.estoquePosCompras)}`}>{formatNumber(item.estoquePosCompras)}</span></td>
                {/* Dados obras futuras */}
                <td className="obras-futuras-data-container">
                  <div className="obras-futuras-data-scroll" onScroll={(e) => {
                    const scrollLeft = e.target.scrollLeft;
                    document.querySelectorAll('.obras-futuras-header-scroll').forEach(el => {
                      if (el !== e.target) el.scrollLeft = scrollLeft;
                    });
                  }}>
                    {uniqueObrasFuturas.map(obra => {
                      const of = (item.obrasFuturas || []).find(o => o.descricao === obra.descricao);
                      const qtd = of ? of.quantidade_consumida : 0;
                      return (
                        <div key={obra.descricao} className="obra-futura-data-item">
                          {qtd > 0 ? <span className="status-badge badge-purple">{formatNumber(qtd)}</span> : <span className="empty-cell">-</span>}
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="fixed-column"><span className={`status-badge ${getBadgeClass(item.estoquePosObrasFuturas)}`}>{formatNumber(item.estoquePosObrasFuturas)}</span></td>
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

export default ObrasFuturas;
