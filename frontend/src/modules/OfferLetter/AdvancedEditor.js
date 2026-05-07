import React, { useState, useRef, useEffect } from 'react';
import './AdvancedEditor.css';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdvancedEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState(location.state?.pdfUrl || '');
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [metadata, setMetadata] = useState({});
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const fileInputRef = useRef(null);
  const textareaRefs = useRef({});

  // Fetch data from backend on component mount
  useEffect(() => {
    fetchOfferLetterData();
  }, []);

  const fetchOfferLetterData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('http://localhost:5000/api/offerletter/data');
      
      if (response.data.success) {
        const { pages: backendPages, metadata: backendMetadata } = response.data.data;
        setPages(backendPages);
        setMetadata(backendMetadata);
        
        // Update PDF URL if available
        if (location.state?.pdfUrl) {
          setPdfUrl(location.state.pdfUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching offer letter data:', err);
      setError('Failed to load offer letter data. Please generate an offer letter first.');
    } finally {
      setLoading(false);
    }
  };

  const addNewPage = () => {
    const newPage = {
      pageNumber: pages.length + 1,
      paragraphs: [
        { id: `p${Date.now()}`, content: '', type: 'paragraph' }
      ]
    };
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
    
    setNotificationMessage('New page added');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const deletePage = (pageIndex) => {
    if (pages.length === 1) {
      setNotificationMessage('Cannot delete the last page');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
      return;
    }
    const updatedPages = pages.filter((_, index) => index !== pageIndex);
    // Renumber pages
    updatedPages.forEach((page, index) => {
      page.pageNumber = index + 1;
    });
    setPages(updatedPages);
    if (currentPageIndex === pageIndex) {
      setCurrentPageIndex(0);
    } else if (currentPageIndex > pageIndex) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
    
    setNotificationMessage('Page deleted');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const addParagraph = () => {
    const updatedPages = [...pages];
    const newParagraph = {
      id: `p${Date.now()}`,
      content: '',
      type: 'paragraph'
    };
    updatedPages[currentPageIndex].paragraphs.push(newParagraph);
    setPages(updatedPages);
    
    setNotificationMessage('Paragraph added');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const updateParagraph = (paragraphIndex, value) => {
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].paragraphs[paragraphIndex].content = value;
    setPages(updatedPages);
  };

  const updateParagraphType = (paragraphIndex, newType) => {
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].paragraphs[paragraphIndex].type = newType;
    setPages(updatedPages);
  };

  const deleteParagraph = (paragraphIndex) => {
    const currentPage = pages[currentPageIndex];
    if (currentPage.paragraphs.length === 1) {
      setNotificationMessage('Cannot delete the last paragraph on this page');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
      return;
    }
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].paragraphs = currentPage.paragraphs.filter((_, index) => index !== paragraphIndex);
    setPages(updatedPages);
    
    setNotificationMessage('Paragraph deleted');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const moveParagraphUp = (paragraphIndex) => {
    if (paragraphIndex === 0) {
      setNotificationMessage('Cannot move up - already at the top');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
      return;
    }
    const updatedPages = [...pages];
    const paragraphs = updatedPages[currentPageIndex].paragraphs;
    
    // Swap with previous paragraph
    [paragraphs[paragraphIndex - 1], paragraphs[paragraphIndex]] = 
    [paragraphs[paragraphIndex], paragraphs[paragraphIndex - 1]];
    
    setPages(updatedPages);
  };

  const moveParagraphDown = (paragraphIndex) => {
    const currentPage = pages[currentPageIndex];
    if (paragraphIndex === currentPage.paragraphs.length - 1) {
      setNotificationMessage('Cannot move down - already at the bottom');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
      return;
    }
    const updatedPages = [...pages];
    const paragraphs = updatedPages[currentPageIndex].paragraphs;
    
    // Swap with next paragraph
    [paragraphs[paragraphIndex], paragraphs[paragraphIndex + 1]] = 
    [paragraphs[paragraphIndex + 1], paragraphs[paragraphIndex]];
    
    setPages(updatedPages);
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedPages = [...pages];
        const newImage = {
          id: `img${Date.now()}`,
          content: reader.result,
          type: 'image',
          alt: file.name
        };
        updatedPages[currentPageIndex].paragraphs.push(newImage);
        setPages(updatedPages);
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteImage = (paragraphIndex) => {
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].paragraphs = updatedPages[currentPageIndex].paragraphs.filter((_, index) => index !== paragraphIndex);
    setPages(updatedPages);
  };

  const compilePDF = async () => {
    try {
      setCompiling(true);
      setError('');

      const response = await axios.post('http://localhost:5000/api/offerletter/compile', {
        pages,
        metadata
      });

      if (response.data.path) {
        // Add timestamp to force iframe reload
        const newPdfUrl = response.data.path + '?t=' + Date.now();
        setPdfUrl(newPdfUrl);
        
        setNotificationMessage('PDF compiled successfully!');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
      }
    } catch (err) {
      console.error('Error compiling PDF:', err);
      setError('Failed to compile PDF. Please try again.');
      
      setNotificationMessage('Failed to compile PDF');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } finally {
      setCompiling(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfUrl) {
      setNotificationMessage('Please compile the PDF first');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
      return;
    }

    // Remove query parameters and open in new tab
    const cleanUrl = pdfUrl.split('?')[0];
    window.open(cleanUrl, "_blank");
    
    setNotificationMessage('PDF opened in new tab');
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 2000);
  };

  const goBack = () => {
    navigate('/');
  };

  // Insert predefined data at cursor position
  const insertAtCursor = (paragraphIndex, variable) => {
    const textarea = textareaRefs.current[`${currentPageIndex}-${paragraphIndex}`];
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = currentPage.paragraphs[paragraphIndex].content;
    
    const newContent = 
      currentContent.substring(0, start) + 
      variable + 
      currentContent.substring(end);
    
    updateParagraph(paragraphIndex, newContent);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variable.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
    
    setNotificationMessage(`Inserted ${variable}`);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 1500);
  };

  // Predefined data variables
  const predefinedVariables = [
    { label: 'Name', value: '${name}' },
    { label: 'Upper Name', value: '${upperName}' },
    { label: 'Gender', value: '${gender}' },
    { label: 'Intern Type', value: '${internType}' },
    { label: 'Duration Type', value: '${durationType}' },
    { label: 'Duration', value: '${duration}' },
    { label: 'Role', value: '${role}' },
    { label: 'Start Date', value: '${startDate}' },
    { label: 'End Date', value: '${endDate}' },
    { label: 'Salary Type', value: '${salaryType}' },
    { label: 'Salary Amount', value: '${salaryAmount}' },
    { label: 'Date', value: '${date}' }
  ];

  if (loading) {
    return (
      <div className="AdvancedEditor">
        <div className="loading-container">
          <h2>Loading offer letter data...</h2>
        </div>
      </div>
    );
  }

  if (error && pages.length === 0) {
    return (
      <div className="AdvancedEditor">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={goBack} className="back-btn">← Back to Generator</button>
        </div>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex] || { paragraphs: [] };

  return (
    <div className="AdvancedEditor">
      {showNotification && (
        <div className="notification-popup">
          ✓ {notificationMessage}
        </div>
      )}

      <div className="editor-header">
        <button onClick={goBack} className="back-btn">← Back to Generator</button>
        <h1>Advanced PDF Editor</h1>
        <div className="header-actions">
          <button onClick={compilePDF} disabled={compiling} className="compile-btn">
            {compiling ? 'Compiling...' : '🔨 Compile PDF'}
          </button>
          <button onClick={downloadPDF} disabled={!pdfUrl} className="download-btn">
            ⬇️ Download PDF
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="editor-container">
        {/* Left Sidebar - Page Management */}
        <div className="sidebar">
          <div className="sidebar-section">
            <h3>Pages ({pages.length})</h3>
            <button onClick={addNewPage} className="add-page-btn">+ Add New Page</button>
            <div className="pages-list">
              {pages.map((page, index) => (
                <div
                  key={page.pageNumber}
                  className={`page-item ${currentPageIndex === index ? 'active' : ''}`}
                  onClick={() => setCurrentPageIndex(index)}
                >
                  <span>Page {page.pageNumber} ({page.paragraphs.length})</span>
                  {pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(index);
                      }}
                      className="delete-page-btn"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Tools</h3>
            <button onClick={addParagraph} className="tool-btn">+ Add Paragraph</button>
            <button onClick={() => fileInputRef.current.click()} className="tool-btn">
              + Add Image
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          <div className="sidebar-section">
            <h3>Predefined Data</h3>
            <p className="helper-text">Click to insert at cursor</p>
            <div className="variables-list">
              {predefinedVariables.map((variable, idx) => (
                <button
                  key={idx}
                  className="variable-btn"
                  onClick={() => {
                    // Find the currently focused textarea
                    const focusedKey = Object.keys(textareaRefs.current).find(key => {
                      const textarea = textareaRefs.current[key];
                      return textarea && document.activeElement === textarea;
                    });
                    
                    if (focusedKey) {
                      const [pageIdx, paraIdx] = focusedKey.split('-').map(Number);
                      if (pageIdx === currentPageIndex) {
                        insertAtCursor(paraIdx, variable.value);
                      }
                    } else {
                      setNotificationMessage('Please click in a text field first');
                      setShowNotification(true);
                      setTimeout(() => setShowNotification(false), 2000);
                    }
                  }}
                  title={`Insert ${variable.value}`}
                >
                  {variable.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Editor Area */}
        <div className="editor-area">
          <div className="editor-toolbar">
            <h2>Editing Page {currentPage.pageNumber}</h2>
            <p className="paragraph-count">{currentPage.paragraphs.length} items on this page</p>
          </div>

          <div className="editor-content">
            {currentPage.paragraphs.map((para, index) => (
              <div key={para.id || index} className="paragraph-editor">
                <div className="paragraph-header">
                  <div className="paragraph-info">
                    <label>
                      {para.type === 'image' ? '🖼️ Image' : `📝 ${para.type || 'Paragraph'}`} #{index + 1}
                    </label>
                    {para.type !== 'image' && (
                      <select
                        value={para.type || 'paragraph'}
                        onChange={(e) => updateParagraphType(index, e.target.value)}
                        className="type-selector"
                      >
                        <option value="date">Date</option>
                        <option value="to">To (Recipient)</option>
                        <option value="subject">Subject</option>
                        <option value="paragraph">Paragraph</option>
                        <option value="signature">Signature</option>
                        <option value="company">Company</option>
                        <option value="separator">Separator</option>
                        <option value="footer">Footer</option>
                      </select>
                    )}
                  </div>
                  <div className="paragraph-actions">
                    <button
                      onClick={() => moveParagraphUp(index)}
                      disabled={index === 0}
                      className="move-btn move-up-btn"
                      title="Move Up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveParagraphDown(index)}
                      disabled={index === currentPage.paragraphs.length - 1}
                      className="move-btn move-down-btn"
                      title="Move Down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => para.type === 'image' ? deleteImage(index) : deleteParagraph(index)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                {para.type === 'image' ? (
                  <div className="image-preview">
                    <img src={para.content} alt={para.alt || 'Uploaded'} />
                  </div>
                ) : (
                  <textarea
                    ref={(el) => textareaRefs.current[`${currentPageIndex}-${index}`] = el}
                    value={para.content}
                    onChange={(e) => updateParagraph(index, e.target.value)}
                    placeholder="Enter text content..."
                    rows="4"
                  />
                )}
              </div>
            ))}

            {currentPage.paragraphs.length === 0 && (
              <div className="no-content">
                <p>No content on this page yet.</p>
                <p>Click "Add Paragraph" or "Add Image" to start editing.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Preview */}
        <div className="preview-section">
          <h3>PDF Preview</h3>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="PDF Preview"
              className="pdf-preview"
            />
          ) : (
            <div className="no-pdf">
              <p>No PDF to preview</p>
              <p>Click "Compile PDF" to generate preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdvancedEditor;
