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
  const lastFocusedTextarea = useRef(null);
  const measurementRootRef = useRef(null);

  // Keep editor fullness aligned with template layout and footer safety.
  const PAGE_HEIGHT_MM = 297;
  const TOP_PADDING_MM = 30;
  const BOTTOM_SAFE_MM = 28;
  const REALISTIC_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - TOP_PADDING_MM - BOTTOM_SAFE_MM;
  const PX_PER_MM = 96 / 25.4;

  const stripHtml = (text = '') => String(text).replace(/<[^>]*>/g, '');

  const measureParagraphsHeightMm = (paragraphs = []) => {
    const root = measurementRootRef.current;
    if (!root || typeof window === 'undefined') {
      return paragraphs.reduce((total, para) => total + fallbackEstimateHeightMm(para), 0);
    }

    root.innerHTML = '';
    const pageEl = document.createElement('div');
    pageEl.style.width = '210mm';
    pageEl.style.minHeight = '297mm';
    pageEl.style.position = 'relative';
    pageEl.style.fontFamily = 'Arial, sans-serif';
    pageEl.style.fontSize = '11pt';
    pageEl.style.lineHeight = '1.5';
    pageEl.style.color = '#000';

    const contentEl = document.createElement('div');
    contentEl.style.padding = '30mm 25mm 30mm 25mm';
    contentEl.style.position = 'relative';
    contentEl.style.height = `${REALISTIC_CONTENT_HEIGHT_MM}mm`;
    contentEl.style.boxSizing = 'content-box';
    contentEl.style.overflow = 'visible';
    pageEl.appendChild(contentEl);
    root.appendChild(pageEl);

    paragraphs.forEach((para) => {
      if (!para || !String(para.content || '').trim()) return;

      let el = document.createElement('div');
      const paraType = para.type || 'paragraph';
      const safeText = stripHtml(para.content);

      if (paraType === 'date') {
        el.textContent = safeText;
        el.style.marginLeft = '125mm';
        el.style.marginBottom = '6mm';
        el.style.paddingBottom = '1mm';
      } else if (paraType === 'to') {
        el.innerHTML = para.content;
        el.style.lineHeight = '1.5';
        el.style.marginBottom = '4mm';
        el.style.paddingBottom = '1mm';
      } else if (paraType === 'subject') {
        el.textContent = safeText;
        el.style.textAlign = 'center';
        el.style.fontWeight = '700';
        el.style.marginTop = '4mm';
        el.style.marginBottom = '4mm';
        el.style.paddingBottom = '1mm';
      } else if (paraType === 'signature') {
        el.style.marginTop = '6mm';
        el.style.marginBottom = '4mm';
        el.style.paddingBottom = '2mm';
        const textEl = document.createElement('div');
        textEl.innerHTML = para.content;
        textEl.style.marginBottom = '1mm';
        const signEl = document.createElement('div');
        signEl.style.width = '40mm';
        signEl.style.height = '18mm';
        signEl.style.marginTop = '2mm';
        signEl.style.background = 'transparent';
        el.appendChild(textEl);
        el.appendChild(signEl);
      } else if (paraType === 'company') {
        el.textContent = safeText;
        el.style.marginTop = '4mm';
        el.style.marginBottom = '4mm';
        el.style.paddingBottom = '2mm';
      } else if (paraType === 'separator') {
        el.textContent = safeText;
        el.style.textAlign = 'center';
        el.style.marginTop = '4mm';
        el.style.marginBottom = '4mm';
        el.style.paddingBottom = '2mm';
      } else if (paraType === 'image') {
        const imageEl = document.createElement('img');
        imageEl.src = para.content;
        imageEl.style.maxWidth = '100%';
        imageEl.style.width = '100%';
        imageEl.style.height = '55mm';
        imageEl.style.objectFit = 'contain';
        imageEl.style.display = 'block';
        el.style.margin = '10mm 0';
        el.appendChild(imageEl);
      } else {
        el.style.marginBottom = '4mm';
        el.style.paddingBottom = '1mm';
        const p = document.createElement('p');
        p.textContent = safeText;
        p.style.margin = '0';
        p.style.marginBottom = '1mm';
        p.style.lineHeight = '1.5';
        p.style.textAlign = 'justify';
        el.appendChild(p);
      }

      contentEl.appendChild(el);
    });

    const contentRect = contentEl.getBoundingClientRect();
    // Measure from the top of the *content box* (excluding padding-top),
    // so this matches the backend's CONTENT_MAX_HEIGHT_MM semantics.
    const contentAreaTop = contentRect.top + (TOP_PADDING_MM * PX_PER_MM);
    let maxBottom = contentAreaTop;
    Array.from(contentEl.children).forEach((child) => {
      const rect = child.getBoundingClientRect();
      maxBottom = Math.max(maxBottom, rect.bottom);
    });

    const usedPx = Math.max(0, maxBottom - contentAreaTop);
    return usedPx / PX_PER_MM;
  };

  const fallbackEstimateHeightMm = (paragraph) => {
    const content = stripHtml(paragraph.content || '').trim();
    if (paragraph.type === 'date') return 9;
    if (paragraph.type === 'to') return 14;
    if (paragraph.type === 'subject') return 12;
    if (paragraph.type === 'signature') return 50;
    if (paragraph.type === 'company') return 13;
    if (paragraph.type === 'separator') return 13;
    if (paragraph.type === 'footer') return 10;
    if (paragraph.type === 'image') return 65;
    const lines = Math.max(1, Math.ceil(content.length / 78));
    return (lines * 6.2) + 5;
  };

  // Calculate total page height
  const calculatePageHeight = (paragraphs) => {
    return measureParagraphsHeightMm(paragraphs);
  };

  // Auto-paginate when content changes
  const autoRebalancePages = (updatedPages) => {
    const rebalanced = [];
    let currentPageParagraphs = [];
    let currentHeight = 0;
    let pageNumber = 1;

    // Flatten all paragraphs
    const allParagraphs = updatedPages.flatMap(page => page.paragraphs);

    for (const para of allParagraphs) {
      const paraHeight = calculatePageHeight([para]);
      
      // Check if adding this paragraph would exceed capacity
      if (currentHeight + paraHeight > REALISTIC_CONTENT_HEIGHT_MM && currentPageParagraphs.length > 0) {
        // Save current page and start new one
        rebalanced.push({
          pageNumber: pageNumber++,
          paragraphs: [...currentPageParagraphs]
        });
        currentPageParagraphs = [];
        currentHeight = 0;
      }

      currentPageParagraphs.push(para);
      currentHeight += paraHeight;
    }

    // Add remaining paragraphs
    if (currentPageParagraphs.length > 0) {
      rebalanced.push({
        pageNumber: pageNumber,
        paragraphs: currentPageParagraphs
      });
    }

    // Ensure at least one page exists
    if (rebalanced.length === 0) {
      rebalanced.push({
        pageNumber: 1,
        paragraphs: [{ id: `p${Date.now()}`, content: '', type: 'paragraph' }]
      });
    }

    return rebalanced;
  };

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
    // Check if the value contains newlines (multiple paragraphs)
    const hasNewlines = value.includes('\n\n') || value.includes('\r\n\r\n');
    
    if (hasNewlines) {
      // Split by double newlines to separate paragraphs
      const splitParagraphs = value
        .split(/\n\n+|\r\n\r\n+/)
        .map(text => text.trim())
        .filter(text => text.length > 0);
      
      if (splitParagraphs.length > 1) {
        // User pasted multiple paragraphs - split them
        const updatedPages = [...pages];
        const currentPara = updatedPages[currentPageIndex].paragraphs[paragraphIndex];
        
        // Replace current paragraph with first split
        updatedPages[currentPageIndex].paragraphs[paragraphIndex] = {
          ...currentPara,
          content: splitParagraphs[0]
        };
        
        // Insert remaining splits as new paragraphs after current one
        for (let i = 1; i < splitParagraphs.length; i++) {
          const newPara = {
            id: `p${Date.now()}_${i}`,
            content: splitParagraphs[i],
            type: currentPara.type || 'paragraph'
          };
          updatedPages[currentPageIndex].paragraphs.splice(paragraphIndex + i, 0, newPara);
        }
        
        setPages(updatedPages);
        setNotificationMessage(`Split into ${splitParagraphs.length} paragraphs`);
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 2000);
        return;
      }
    }
    
    // Normal update without splitting
    const updatedPages = [...pages];
    updatedPages[currentPageIndex].paragraphs[paragraphIndex].content = value;
    
    // Check if current page is overflowing
    const currentPageHeight = calculatePageHeight(updatedPages[currentPageIndex].paragraphs);
    
    if (currentPageHeight > REALISTIC_CONTENT_HEIGHT_MM * 1.1) {
      // Trigger auto-rebalancing (10% overflow tolerance)
      const rebalanced = autoRebalancePages(updatedPages);
      setPages(rebalanced);
      
      // Try to keep user on the same page or adjust
      if (currentPageIndex >= rebalanced.length) {
        setCurrentPageIndex(rebalanced.length - 1);
      }
      
      setNotificationMessage('Content rebalanced across pages');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    } else {
      setPages(updatedPages);
    }
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

  // Split a long paragraph by newlines
  const splitParagraph = (paragraphIndex) => {
    const currentPara = pages[currentPageIndex].paragraphs[paragraphIndex];
    const content = currentPara.content || '';
    
    // Split by single or double newlines
    const splitParagraphs = content
      .split(/\n+/)
      .map(text => text.trim())
      .filter(text => text.length > 0);
    
    if (splitParagraphs.length <= 1) {
      setNotificationMessage('No newlines found to split');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
      return;
    }
    
    const updatedPages = [...pages];
    
    // Replace current paragraph with first split
    updatedPages[currentPageIndex].paragraphs[paragraphIndex] = {
      ...currentPara,
      content: splitParagraphs[0]
    };
    
    // Insert remaining splits as new paragraphs after current one
    for (let i = 1; i < splitParagraphs.length; i++) {
      const newPara = {
        id: `p${Date.now()}_${i}`,
        content: splitParagraphs[i],
        type: currentPara.type || 'paragraph'
      };
      updatedPages[currentPageIndex].paragraphs.splice(paragraphIndex + i, 0, newPara);
    }
    
    setPages(updatedPages);
    setNotificationMessage(`Split into ${splitParagraphs.length} paragraphs`);
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

  // Manual rebalance function
  const manualRebalance = () => {
    const rebalanced = autoRebalancePages(pages);
    setPages(rebalanced);
    
    // Adjust current page index if needed
    if (currentPageIndex >= rebalanced.length) {
      setCurrentPageIndex(rebalanced.length - 1);
    }
    
    setNotificationMessage(`Content rebalanced into ${rebalanced.length} page${rebalanced.length > 1 ? 's' : ''}`);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
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

  // Handle variable button click
  const handleVariableClick = (variable) => {
    if (lastFocusedTextarea.current) {
      const key = lastFocusedTextarea.current;
      const [pageIdx, paraIdx] = key.split('-').map(Number);
      
      if (pageIdx === currentPageIndex) {
        insertAtCursor(paraIdx, variable.value);
      } else {
        setNotificationMessage('Please select a text field on the current page');
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 2000);
      }
    } else {
      setNotificationMessage('Please click in a text field first');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 2000);
    }
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
            <button onClick={manualRebalance} className="tool-btn rebalance-btn" title="Automatically redistribute content across pages">
              ⚖️ Rebalance Pages
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
            <p className="helper-text">Click in a text field, then click a variable to insert</p>
            <div className="variables-list">
              {predefinedVariables.map((variable, idx) => (
                <button
                  key={idx}
                  className="variable-btn"
                  onClick={() => handleVariableClick(variable)}
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
            <div>
              <h2>Editing Page {currentPage.pageNumber}</h2>
              <p className="paragraph-count">{currentPage.paragraphs.length} items on this page</p>
            </div>
            <div className="page-capacity-indicator">
              {(() => {
                const currentHeight = calculatePageHeight(currentPage.paragraphs);
                const percentage = (currentHeight / REALISTIC_CONTENT_HEIGHT_MM) * 100;
                const isOverflow = percentage > 100;
                const isNearFull = percentage > 85;
                
                return (
                  <div className="capacity-wrapper">
                    <span className={`capacity-label ${isOverflow ? 'overflow' : isNearFull ? 'warning' : ''}`}>
                      {isOverflow ? '⚠️ Page Overflow!' : isNearFull ? '⚠️ Near Full' : '✓ Page OK'}
                    </span>
                    <div className="capacity-bar">
                      <div 
                        className={`capacity-fill ${isOverflow ? 'overflow' : isNearFull ? 'warning' : ''}`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                    <span className="capacity-text">
                      {Math.round(percentage)}% full ({Math.round(currentHeight)}mm / {REALISTIC_CONTENT_HEIGHT_MM}mm)
                    </span>
                  </div>
                );
              })()}
            </div>
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
                    {para.type !== 'image' && (
                      <button
                        onClick={() => splitParagraph(index)}
                        className="split-btn"
                        title="Split by newlines"
                      >
                        ✂️
                      </button>
                    )}
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
                    onFocus={() => lastFocusedTextarea.current = `${currentPageIndex}-${index}`}
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
      <div
        ref={measurementRootRef}
        style={{
          position: 'fixed',
          left: '-100000px',
          top: '-100000px',
          visibility: 'hidden',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}

export default AdvancedEditor;
