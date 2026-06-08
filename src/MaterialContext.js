import React, { createContext, useContext, useState } from 'react';

export const MaterialContext = createContext(null);

export function MaterialProvider({ children }) {
  const [materialType, setMaterialType] = useState(
    () => localStorage.getItem('material_type') || null
  );

  const chooseMaterial = (type) => {
    localStorage.setItem('material_type', type);
    setMaterialType(type);
  };

  const clearMaterial = () => {
    localStorage.removeItem('material_type');
    setMaterialType(null);
  };

  return (
    <MaterialContext.Provider value={{ materialType, chooseMaterial, clearMaterial }}>
      {children}
    </MaterialContext.Provider>
  );
}

export function useMaterial() {
  return useContext(MaterialContext);
}
