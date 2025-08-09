import React, { useState } from 'react';
import Header from './components/Header';
import StockControl from './components/StockControl';
import Import from './components/Import';
import ListarObras from './components/ListarObras';
import Obras from './components/Obras';
import ObrasFuturas from './components/ObrasFuturas';
import Compras from './components/Compras';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('estoques');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'principal':
        return <div className="page-placeholder">Página Principal em desenvolvimento...</div>;
      case 'estoques':
        return <StockControl />;
      case 'importacao':
        return <Import />;
      case 'obras':
        return <Obras />;
      case 'listar_obras':
        return <ListarObras />;
      case 'obras_futuras':
        return <ObrasFuturas />;
      case 'compras':
        return <Compras />;
      default:
        return <StockControl />;
    }
  };

  return (
    <div className="App">
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {renderCurrentPage()}
    </div>
  );
}

export default App;
