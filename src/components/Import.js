import React, { useState, useMemo, useEffect } from 'react';
import { FiUpload, FiFile, FiArrowUp, FiArrowDown, FiDownload, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import { authFetch } from '../auth';

const Import = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('desc');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  
  // Estados para dados da API
  const [importData, setImportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Estados para o modal de nome da obra
  const [showObraModal, setShowObraModal] = useState(false);
  const [obraName, setObraName] = useState('');
  // Modal para confirmação de substituição de estoque
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  // Definição dinâmica de rótulos no modal
  const entityLabel = selectedType === 'compras' ? 'Compra' : 'Obra';

  // Sample import data based on the image
  const importTypes = [
    { id: 'estoque-fisico', label: 'Planilha - Atualização Estoque Físico' },
    { id: 'obras-perfis', label: 'Planilha de Obras (Perfis e Acessórios)' },
    { id: 'futuras-obras', label: 'Planilha de Futuras Obras' },
    { id: 'compras', label: 'Planilha de Compras' },
  ];

  const filteredData = useMemo(() => {
    if (!searchTerm) return importData;
    
    return importData.filter(item =>
      item.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.file_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, importData]);

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (sortField === 'created_at') {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
  };

  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
  };

  // Função para buscar arquivos do backend
  const fetchFiles = async (page = 1, perPage = itemsPerPage) => {
    setLoading(true);
    try {
      const response = await authFetch(`${API_BASE_URL}/files?page=${page}&per_page=${perPage}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(data);
        setImportData(data.items || []);
        setTotalItems(data.total || 0);
        setCurrentPage(data.page || 1);
        setTotalPages(data.pages || 0);
      } else {
        console.error('Erro ao buscar arquivos:', response.statusText);
        setImportData([]);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      setImportData([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados quando o componente montar ou quando itemsPerPage mudar
  useEffect(() => {
    fetchFiles(1, itemsPerPage);
  }, [itemsPerPage]);

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) {
      alert('Por favor, selecione um arquivo e o tipo de importação.');
      return;
    }

    // Verificar se o tipo requer nome da obra
    if (selectedType === 'obras-perfis' || selectedType === 'futuras-obras' || selectedType === 'compras') {
      setShowObraModal(true);
      return;
    }

    // Se for estoque físico, solicitar confirmação de substituição
    if (selectedType === 'estoque-fisico') {
      setShowReplaceModal(true);
      return;
    }

    // Se não requer modal, fazer upload direto
    await performUpload();
  };

  const performUpload = async (providedObraName = '', shouldReplace = false) => {
    setIsUploading(true);
    setUploadMessage('');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('file_type', selectedType);
      
      // Adicionar nome da obra se fornecido, senão usar nome do arquivo
      if (selectedType === 'obras-perfis' || selectedType === 'futuras-obras' || selectedType === 'compras') {
        const obraNameToUse = providedObraName.trim() || selectedFile.name.replace(/\.[^/.]+$/, "");
        formData.append('descricao_obra', obraNameToUse);
      }

      // Adicionar flag de substituição para estoque físico quando confirmado
      if (selectedType === 'estoque-fisico' && shouldReplace) {
        formData.append('replace', 'True');
      }
      
      const response = await authFetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        setUploadMessage(`Sucesso! Arquivo "${selectedFile.name}" foi enviado e está sendo processado.`);
        
        // Limpar o formulário após sucesso
        setSelectedFile(null);
        setSelectedType('');
        setObraName('');
        
        // Resetar o input file
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
          fileInput.value = '';
        }
        
        // Recarregar a lista de arquivos
        fetchFiles(currentPage, itemsPerPage);
        
        console.log('Upload realizado com sucesso:', result);
      } else {
        const errorData = await response.json();
        setUploadMessage(`Erro no upload: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      setUploadMessage('Erro de conexão. Verifique se o servidor está rodando.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleObraModalConfirm = async () => {
    setShowObraModal(false);
    await performUpload(obraName);
  };

  const handleObraModalCancel = () => {
    setShowObraModal(false);
    setObraName('');
  };

  // Handlers para modal de substituição de estoque
  const handleReplaceYes = async () => {
    setShowReplaceModal(false);
    await performUpload('', true);
  };

  const handleReplaceNo = async () => {
    setShowReplaceModal(false);
    await performUpload();
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'sucesso':
        return 'badge-green';
      case 'erro':
        return 'badge-red';
      case 'processando':
        return 'badge-yellow';
      default:
        return 'badge-blue';
    }
  };

  const handleDownload = async (item) => {
    try {
      // Fazer requisição para o endpoint de download
      const response = await authFetch(`${API_BASE_URL}/files/${item.id}/download`, {
        method: 'GET',
      });

      if (response.ok) {
        // Converter a resposta para blob
        const blob = await response.blob();
        
        // Criar URL temporária para o blob
        const url = window.URL.createObjectURL(blob);
        
        // Criar elemento <a> temporário para download
        const link = document.createElement('a');
        link.href = url;
        link.download = item.original_filename; // Nome do arquivo original
        
        // Adicionar ao DOM, clicar e remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar a URL temporária
        window.URL.revokeObjectURL(url);
        
        console.log('Download iniciado para:', item.original_filename);
      } else {
        // Tratar erros HTTP
        const errorData = await response.json();
        console.error('Erro no download:', errorData.detail || 'Erro desconhecido');
        alert(`Erro no download: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro na requisição de download:', error);
      alert('Erro de conexão. Verifique se o servidor está rodando.');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchFiles(newPage, itemsPerPage);
    }
  };

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  return (
    <div className="import-page">
      <h1 className="page-title">Importação</h1>
      
      {/* Import Section */}
      <div className="import-section">
        <div className="import-header">
          <h2>Importar Perfis ou Obras</h2>
        </div>
        
        <div className="import-form">
          <div className="file-upload-section">
            <h3>Planilha de Produtos / Obras</h3>
            
            <div className="file-input-group">
              <input
                type="file"
                id="file-upload"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-upload" className="file-input-label">
                <FiFile size={16} />
                Browse...
              </label>
              <span className="file-status">
                {selectedFile ? selectedFile.name : 'No file selected.'}
              </span>
            </div>

            <div className="import-types">
              {importTypes.map((type) => (
                <div key={type.id} className="radio-group">
                  <input
                    type="radio"
                    id={type.id}
                    name="importType"
                    value={type.id}
                    checked={selectedType === type.id}
                    onChange={handleTypeChange}
                  />
                  <label htmlFor={type.id}>{type.label}</label>
                </div>
              ))}
            </div>

            <button 
              className="upload-btn"
              onClick={handleUpload}
              disabled={!selectedFile || !selectedType || isUploading}
            >
              <FiUpload size={16} />
              {isUploading ? 'Enviando...' : 'Upload'}
            </button>
            
            {uploadMessage && (
              <div className={`upload-message ${uploadMessage.includes('Sucesso') ? 'success' : 'error'}`}>
                {uploadMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Imports History Section */}
      <div className="imports-history">
        <div className="history-controls">
          <div className="items-control">
            <label>Exibindo</label>
            <select 
              value={itemsPerPage} 
              onChange={handleItemsPerPageChange}
              className="items-select"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>importações</span>
          </div>

          <div className="search-control">
            <label>Procurar:</label>
            <input
              type="text"
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite para buscar..."
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-message">Carregando arquivos...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="imports-table">
                <thead>
                  <tr>
                    <th 
                      className="sortable" 
                      onClick={() => handleSort('original_filename')}
                    >
                      Arquivo
                      {sortField === 'original_filename' && (
                        sortDirection === 'asc' ? 
                        <FiArrowUp size={12} className="sort-icon" /> : 
                        <FiArrowDown size={12} className="sort-icon" />
                      )}
                    </th>
                    <th 
                      className="sortable" 
                      onClick={() => handleSort('file_type')}
                    >
                      Tipo
                      {sortField === 'file_type' && (
                        sortDirection === 'asc' ? 
                        <FiArrowUp size={12} className="sort-icon" /> : 
                        <FiArrowDown size={12} className="sort-icon" />
                      )}
                    </th>
                    <th 
                      className="sortable" 
                      onClick={() => handleSort('created_at')}
                    >
                      Data
                      {sortField === 'created_at' && (
                        sortDirection === 'asc' ? 
                        <FiArrowUp size={12} className="sort-icon" /> : 
                        <FiArrowDown size={12} className="sort-icon" />
                      )}
                    </th>
                    <th>Download</th>
                  </tr>
                </thead>
                                  <tbody>
                  {sortedData.map((item, index) => (
                    <tr key={item._id || index}>
                      <td className="file-name">{item.original_filename}</td>
                      <td>{item.file_type}</td>
                      <td>{new Date(item.created_at).toLocaleString('pt-BR')}</td>
                      <td>
                        {item.is_downloadable ? (
                          <button 
                            onClick={() => handleDownload(item)}
                            className="download-icon-btn"
                            title="Baixar arquivo"
                          >
                            <FiDownload size={18} />
                          </button>
                        ) : (
                          <span className="download-unavailable">
                            Download indisponível
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination-container">
              <div className="pagination-info">
                Mostrando {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} registros
              </div>
              
              <div className="pagination-controls">
                {currentPage > 1 && (
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="pagination-arrow-btn"
                    title="Página anterior"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                )}
                
                <span className="page-info">
                  Página {currentPage} de {totalPages}
                </span>
                
                {currentPage < totalPages && (
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="pagination-arrow-btn"
                    title="Próxima página"
                  >
                    <FiChevronRight size={20} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal para nome da obra */}
      {showObraModal && (
        <div className="modal-overlay" onClick={handleObraModalCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nome da {entityLabel}</h3>
              <button 
                className="modal-close-btn"
                onClick={handleObraModalCancel}
                type="button"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="obra-name">Nome da {entityLabel}:</label>
                <input
                  type="text"
                  id="obra-name"
                  value={obraName}
                  onChange={(e) => setObraName(e.target.value)}
                  placeholder={`Digite o nome da ${entityLabel.toLowerCase()}...`}
                  className="obra-name-input"
                  autoFocus
                />
              </div>
              
              <div className="modal-info">
                <p>
                  <strong>Atenção:</strong> Caso este campo fique em branco, será utilizado o nome do arquivo: 
                  <br />
                  <em>"{selectedFile?.name?.replace(/\.[^/.]+$/, "") || ''}"</em>
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                type="button"
                className="btn-cancel"
                onClick={handleObraModalCancel}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="btn-confirm"
                onClick={handleObraModalConfirm}
                disabled={isUploading}
              >
                {isUploading ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para substituição de estoque físico */}
      {showReplaceModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Substituir estoque atual</h3>
              <button 
                className="modal-close-btn"
                onClick={() => setShowReplaceModal(false)}
                type="button"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p>Você deseja substituir o estoque atual?</p>
            </div>

            <div className="modal-footer">
              <button 
                type="button"
                className="btn-cancel"
                onClick={handleReplaceNo}
                disabled={isUploading}
              >
                Não
              </button>
              <button 
                type="button"
                className="btn-confirm"
                onClick={handleReplaceYes}
                disabled={isUploading}
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Import; 