import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StockControl from './components/StockControl';
import Import from './components/Import';
import ListarObras from './components/ListarObras';
import Obras from './components/Obras';
import ObrasFuturas from './components/ObrasFuturas';
import Compras from './components/Compras';
import Login from './components/Login';
import { isAuthenticated as getIsAuthenticated } from './auth';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('estoques');
  const [isAuthed, setIsAuthed] = useState(getIsAuthenticated());

  useEffect(() => {
    const handleLogout = () => setIsAuthed(false);
    const handleLogin = () => setIsAuthed(true);
    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('auth:login', handleLogin);
    return () => {
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('auth:login', handleLogin);
    };
  }, []);

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

  if (!isAuthed) {
    return (
      <div className="App">
        <Login onSuccess={() => setIsAuthed(true)} />
      </div>
    );
  }

  return (
    <div className="App">
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      {renderCurrentPage()}
    </div>
  );
}

export default App;
