import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ContractViewer.css';
import { sanitizeHtml } from '../../utils/safeHtml';
import { CONTRACT_LETTERHEAD_STYLE, getContractPageId } from './contractLayout';

const CONTRACT_PAGE_WIDTH_PX = 210 * 96 / 25.4;

function getPageId(page, index) {
    return getContractPageId(page, index);
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
    const pageStageRef = useRef(null);
    const [pageScale, setPageScale] = useState(1);

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

    useEffect(() => {
        const updatePageScale = () => {
            const stage = pageStageRef.current;
            if (!stage) return;

            const availableWidth = Math.max(0, stage.clientWidth - 2);
            const nextScale = Math.min(1, availableWidth / CONTRACT_PAGE_WIDTH_PX);
            setPageScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
        };

        updatePageScale();

        const stage = pageStageRef.current;
        const resizeObserver = typeof ResizeObserver !== 'undefined' && stage
            ? new ResizeObserver(updatePageScale)
            : null;

        if (resizeObserver && stage) {
            resizeObserver.observe(stage);
        }

        window.addEventListener('resize', updatePageScale);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', updatePageScale);
        };
    }, []);

    return (
        <div className="contract-viewer-wrap">
            <main className="contract-pages" aria-label="Contract document">
                <div
                    className="contract-page-stage"
                    ref={pageStageRef}
                    style={{ '--contract-page-scale': String(pageScale) }}
                >
                    {visiblePage ? (() => {
                        const pageId = getPageId(visiblePage, currentPageIndex);

                        return (
                            <section
                                key={pageId}
                                id={pageId}
                                data-page-id={pageId}
                                className="contract-page"
                                style={CONTRACT_LETTERHEAD_STYLE}
                            >
                                {(visiblePage.paragraphs || []).map((paragraph, paragraphIndex) => (
                                    <ContractParagraph
                                        key={paragraph.id || `${pageId}-${paragraphIndex}`}
                                        paragraph={paragraph}
                                    />
                                ))}
                            </section>
                        );
                    })() : null}
                </div>
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
