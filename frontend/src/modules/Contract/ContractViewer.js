import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
    onViewedSectionsChange
}) {
    const pageRefs = useRef({});
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
        const handleContextMenu = (event) => event.preventDefault();
        const handleKeyDown = (event) => {
            const key = event.key?.toLowerCase();
            const blockedCtrl = event.ctrlKey && ['p', 's', 'u', 'c'].includes(key);
            const blockedInspect = event.key === 'F12' || (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key));

            if (blockedCtrl || blockedInspect) {
                event.preventDefault();
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if (!requiredPageIds.length) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                const newlyViewed = [];

                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.25) {
                        const pageId = entry.target.dataset.pageId;
                        if (pageId) newlyViewed.push(pageId);
                    }
                });

                markPagesViewed(newlyViewed);
            },
            { threshold: [0.25, 0.5, 0.75, 1] }
        );

        Object.values(pageRefs.current).forEach((element) => {
            if (element) observer.observe(element);
        });

        let animationFrame = 0;
        const checkVisiblePages = () => {
            animationFrame = 0;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const newlyViewed = [];

            Object.values(pageRefs.current).forEach((element) => {
                if (!element) return;

                const rect = element.getBoundingClientRect();
                const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
                const hasEnoughVisibleArea = visibleHeight >= Math.min(rect.height * 0.25, 180);
                const viewportCenterIsInsidePage = rect.top <= viewportHeight / 2 && rect.bottom >= viewportHeight / 2;

                if (hasEnoughVisibleArea || viewportCenterIsInsidePage) {
                    newlyViewed.push(element.dataset.pageId);
                }
            });

            markPagesViewed(newlyViewed);
        };

        const scheduleVisiblePageCheck = () => {
            if (animationFrame) return;
            animationFrame = window.requestAnimationFrame(checkVisiblePages);
        };

        scheduleVisiblePageCheck();
        window.addEventListener('scroll', scheduleVisiblePageCheck, { passive: true });
        window.addEventListener('resize', scheduleVisiblePageCheck);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', scheduleVisiblePageCheck);
            window.removeEventListener('resize', scheduleVisiblePageCheck);
            if (animationFrame) {
                window.cancelAnimationFrame(animationFrame);
            }
        };
    }, [markPagesViewed, requiredPageIds]);

    return (
        <div className="contract-viewer-wrap">
            <div className="contract-watermark" aria-hidden="true">
                {Array.from({ length: 28 }).map((_, index) => (
                    <span key={index}>Confidential - {workerName} - {workerEmail}</span>
                ))}
            </div>

            <aside className="contract-section-nav">
                <h2>Pages</h2>
                {requiredPageIds.map((pageId, index) => (
                    <a
                        key={pageId}
                        href={`#${pageId}`}
                        className={viewedSections.has(pageId) ? 'viewed' : ''}
                    >
                        Page {index + 1}
                    </a>
                ))}
            </aside>

            <main className="contract-pages" aria-label="Contract document">
                {(pagesData || []).map((page, pageIndex) => {
                    const pageId = getPageId(page, pageIndex);

                    return (
                        <section
                            key={pageId}
                            id={pageId}
                            data-page-id={pageId}
                            className="contract-page"
                            style={COMPANY_LETTERHEAD_STYLE}
                            ref={(element) => {
                                pageRefs.current[pageId] = element;
                            }}
                        >
                            <div className="contract-page-number">Page {pageIndex + 1}</div>
                            {(page.paragraphs || []).map((paragraph, paragraphIndex) => (
                                <ContractParagraph
                                    key={paragraph.id || `${pageId}-${paragraphIndex}`}
                                    paragraph={paragraph}
                                />
                            ))}
                        </section>
                    );
                })}
                <div className="contract-id-note">Contract ID: {contractId}</div>
            </main>
        </div>
    );
}

export { getPageId };
