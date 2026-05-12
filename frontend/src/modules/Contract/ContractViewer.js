import React, { useCallback, useEffect, useMemo } from 'react';
import './ContractAcceptance.css';
import { sanitizeHtml } from '../../utils/safeHtml';

const COMPANY_LETTERHEAD_STYLE = {
    backgroundImage: "url('/images/offerletter/temp.jpg')"
};

function getPageId(page, index) {
    return `page-${page.pageNumber || index + 1}`;
}

function RichText({ children, className = '', as: Component = 'div' }) {
    return (
        <Component
            className={className}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(children) }}
        />
    );
}

function ContractParagraph({ paragraph }) {
    const content = paragraph?.content || '';
    const type = paragraph?.type || 'paragraph';

    if (type === 'image') {
        return (
            <div className="contract-viewer-image">
                <img src={content} alt={paragraph.alt || 'Contract visual'} />
            </div>
        );
    }

    if (type === 'date') {
        return <RichText className="contract-viewer-date">{content}</RichText>;
    }

    if (type === 'subject') {
        return <RichText className="contract-viewer-subject">{content}</RichText>;
    }

    if (type === 'signature') {
        return <RichText className="contract-viewer-signature">{content}</RichText>;
    }

    if (type === 'company') {
        return <RichText className="contract-viewer-company">{content}</RichText>;
    }

    if (type === 'separator') {
        return <RichText className="contract-viewer-separator">{content}</RichText>;
    }

    if (type === 'to') {
        return <RichText className="contract-viewer-to">{content}</RichText>;
    }

    return <RichText className="contract-viewer-paragraph">{content}</RichText>;
}

export default function ContractViewer({
    pagesData,
    workerName,
    workerEmail,
    contractId,
    viewedSections,
    onViewedSectionsChange,
    currentPageIndex = 0,
    onPageIndexChange
}) {
    const requiredPageIds = useMemo(
        () => (pagesData || []).map((page, index) => getPageId(page, index)),
        [pagesData]
    );

    const markPagesViewed = useCallback((pageIds) => {
        if (!pageIds.length) return;

        onViewedSectionsChange((currentViewedSections) => {
            const next = new Set(currentViewedSections);
            let changed = false;

            pageIds.forEach((pageId) => {
                if (pageId && !next.has(pageId)) {
                    next.add(pageId);
                    changed = true;
                }
            });

            return changed ? next : currentViewedSections;
        });
    }, [onViewedSectionsChange]);

    useEffect(() => {
        if (!requiredPageIds.length) return;
        markPagesViewed([requiredPageIds[currentPageIndex]]);
    }, [currentPageIndex, markPagesViewed, requiredPageIds]);

    const visiblePage = (pagesData || [])[currentPageIndex];

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPageIndex]);

    return (
        <div className="contract-viewer-wrap">
            <main className="contract-pages" aria-label="Contract document">
                {visiblePage ? (() => {
                    const pageId = getPageId(visiblePage, currentPageIndex);

                    return (
                        <section
                            key={pageId}
                            id={pageId}
                            data-page-id={pageId}
                            className="contract-page"
                            style={COMPANY_LETTERHEAD_STYLE}
                        >
                            <div className="contract-page-number">Page {currentPageIndex + 1}</div>
                            {(visiblePage.paragraphs || []).map((paragraph, paragraphIndex) => (
                                <ContractParagraph
                                    key={paragraph.id || `${pageId}-${paragraphIndex}`}
                                    paragraph={paragraph}
                                />
                            ))}
                        </section>
                    );
                })() : null}
                <div className="contract-id-note">Contract ID: {contractId}</div>
                <div className="contract-page-controls page-card">
                    <button
                        type="button"
                        className="page-button-secondary contract-secondary-btn"
                        onClick={() => onPageIndexChange?.(Math.max(0, currentPageIndex - 1))}
                        disabled={currentPageIndex === 0}
                    >
                        Previous
                    </button>

                    <div className="contract-page-strip" aria-label="Contract pages">
                        {requiredPageIds.map((pageId, index) => {
                            const isCurrent = index === currentPageIndex;
                            const isVisited = viewedSections.has(pageId);
                            return (
                                <button
                                    key={pageId}
                                    type="button"
                                    className={`contract-page-chip ${isCurrent ? 'current' : isVisited ? 'visited' : 'unvisited'}`}
                                    onClick={() => onPageIndexChange?.(index)}
                                >
                                    Page {index + 1}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        className="page-button-secondary contract-secondary-btn"
                        onClick={() => onPageIndexChange?.(Math.min(requiredPageIds.length - 1, currentPageIndex + 1))}
                        disabled={currentPageIndex >= requiredPageIds.length - 1}
                    >
                        Next
                    </button>
                </div>
            </main>
        </div>
    );
}

export { getPageId };
