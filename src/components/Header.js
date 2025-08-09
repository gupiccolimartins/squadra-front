import React, { useState, useEffect, useRef } from 'react';
import { FiHome } from 'react-icons/fi';

const Header = ({ currentPage, setCurrentPage }) => {
  const [showObrasMenu, setShowObrasMenu] = useState(false);
  const obrasRef = useRef(null);

  // Fecha o dropdown se clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (obrasRef.current && !obrasRef.current.contains(event.target)) {
        setShowObrasMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getPageTitle = () => {
    switch (currentPage) {
      case 'principal':
        return 'Principal';
      case 'estoques':
        return 'Estoque Controle';
      case 'importacao':
        return 'Importação';
      case 'obras':
        return 'Estoque Obras';
      case 'listar_obras':
        return 'Listar Obras';
      case 'obras_futuras':
        return 'Estoque Obras Futuras';
      case 'compras':
        return 'Compras';
      default:
        return 'Estoque Controle';
    }
  };

  const navigate = (page) => {
    setCurrentPage(page);
    setShowObrasMenu(false);
  };

  return (
    <header className="header">
      <div className="nav-menu">
        <button
          className={`nav-item ${currentPage === 'principal' ? 'active' : ''}`}
          onClick={() => navigate('principal')}
        >
          Principal
        </button>
        <button
          className={`nav-item ${currentPage === 'estoques' ? 'active' : ''}`}
          onClick={() => navigate('estoques')}
        >
          Estoques
        </button>
        <button
          className={`nav-item ${currentPage === 'importacao' ? 'active' : ''}`}
          onClick={() => navigate('importacao')}
        >
          Importação
        </button>
        <button
          className={`nav-item ${currentPage === 'compras' ? 'active' : ''}`}
          onClick={() => navigate('compras')}
        >
          Compras
        </button>

        {/* Dropdown de Obras */}
        <div
          className="nav-item dropdown"
          ref={obrasRef}
          onMouseEnter={() => setShowObrasMenu(true)}
          onMouseLeave={() => setShowObrasMenu(false)}
        >
          <button
            className={`nav-item ${['obras', 'listar_obras', 'obras_futuras'].includes(currentPage) ? 'active' : ''}`}
            onClick={() => navigate('obras')}
          >
            Obras ▾
          </button>
          {showObrasMenu && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={() => navigate('listar_obras')}>
                Listar Obras
              </button>
              <button className="dropdown-item" onClick={() => navigate('obras')}>
                Estoque Obras
              </button>
              <button className="dropdown-item" onClick={() => navigate('obras_futuras')}>
                Estoque Obras Futuras
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <div className="breadcrumb">
          <button onClick={() => navigate('principal')}>
            <FiHome size={16} />
          </button>
          <span> / {getPageTitle()}</span>
        </div>
      </div>

      {/* Estilos simples para o dropdown */}
      <style>
        {`
          .dropdown {
            position: relative;
          }
          .dropdown-menu {
            position: absolute;
            top: 100%;
            left: 0;
            background: #f8f9fa;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            min-width: 160px;
            z-index: 100;
          }
          .dropdown-item {
            padding: 8px 12px;
            text-align: left;
            background: transparent;
            border: none;
            cursor: pointer;
          }
          .dropdown-item:hover {
            background-color: #e2e8f0;
          }
        `}
      </style>
    </header>
  );
};

export default Header;
