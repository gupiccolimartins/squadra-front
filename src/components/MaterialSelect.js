import React from 'react';
import { useMaterial } from '../MaterialContext';
import './MaterialSelect.css';

export default function MaterialSelect() {
  const { chooseMaterial } = useMaterial();

  return (
    <div className="material-select-overlay">
      <div className="material-select-card">
        <h1 className="material-select-title">Squadra PCM</h1>
        <p className="material-select-subtitle">Selecione o sistema que deseja acessar</p>
        <div className="material-select-buttons">
          <button
            className="material-btn material-btn-pvc"
            onClick={() => chooseMaterial('pvc')}
          >
            <span className="material-btn-icon">🏗️</span>
            <span className="material-btn-label">PVC</span>
            <span className="material-btn-desc">Controle de estoque de peças de PVC</span>
          </button>
          <button
            className="material-btn material-btn-aluminio"
            onClick={() => chooseMaterial('aluminio')}
          >
            <span className="material-btn-icon">⚙️</span>
            <span className="material-btn-label">Alumínio</span>
            <span className="material-btn-desc">Controle de estoque de peças de alumínio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
