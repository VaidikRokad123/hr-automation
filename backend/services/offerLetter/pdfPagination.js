import { stripHtml } from '../../utils/htmlHelpers.js';

export function splitParagraphToFit(para, metadata, maxHeightMm, estimateBlockHeightMm, replaceVariables = (value) => value) {
    const rawText = replaceVariables(para.content || '', metadata);
    const words = stripHtml(rawText).split(/\s+/).filter(Boolean);

    if (words.length === 0) {
        return [para];
    }

    const chunks = [];
    let current = [];
    let index = 1;

    for (const word of words) {
        const next = [...current, word].join(' ');
        const testPara = { ...para, content: next };

        if (estimateBlockHeightMm(testPara, metadata, replaceVariables) <= maxHeightMm || current.length === 0) {
            current.push(word);
            continue;
        }

        chunks.push({
            ...para,
            id: `${para.id || 'p'}_part_${index++}`,
            content: current.join(' ')
        });
        current = [word];
    }

    if (current.length > 0) {
        chunks.push({
            ...para,
            id: `${para.id || 'p'}_part_${index}`,
            content: current.join(' ')
        });
    }

    return chunks.length ? chunks : [para];
}

export function splitParagraphIntoFitAndRest(para, metadata, maxHeightMm, estimateBlockHeightMm, replaceVariables = (value) => value) {
    const rawText = replaceVariables(para.content || '', metadata);
    const words = stripHtml(rawText).split(/\s+/).filter(Boolean);

    if (words.length < 2) {
        return null;
    }

    let fitWords = [];

    for (const word of words) {
        const candidate = [...fitWords, word].join(' ');
        const h = estimateBlockHeightMm({ ...para, content: candidate }, metadata, replaceVariables);

        if (h <= maxHeightMm || fitWords.length === 0) {
            fitWords.push(word);
        } else {
            break;
        }
    }

    if (fitWords.length === 0 || fitWords.length >= words.length) {
        return null;
    }

    const restWords = words.slice(fitWords.length);
    return {
        fit: { ...para, content: fitWords.join(' ') },
        rest: { ...para, content: restWords.join(' ') }
    };
}

export function repaginateForFooterSafety(pages, metadata, estimateBlockHeightMm, replaceVariables = (value) => value) {
    const repaginated = [];
    let pageNumber = 1;

    for (const page of pages) {
        let currentParagraphs = [];
        let currentHeight = 0;

        for (const para of page.paragraphs || []) {
            const pageUsableHeight = 297 - 30 - 28;
            const queue = [para];

            while (queue.length > 0) {
                const block = queue.shift();
                const h = estimateBlockHeightMm(block, metadata, replaceVariables);
                const PARAGRAPH_EXTRA_BOTTOM_RESERVE_MM = 4;
                const extraReserveForParagraph = block.type === 'paragraph' ? PARAGRAPH_EXTRA_BOTTOM_RESERVE_MM : 0;
                const effectivePageUsableHeight = pageUsableHeight - extraReserveForParagraph;
                const willOverflow = (currentHeight + h) > effectivePageUsableHeight;

                if (!willOverflow) {
                    currentParagraphs.push(block);
                    currentHeight += h;
                    continue;
                }

                if (currentParagraphs.length > 0) {
                    repaginated.push({ pageNumber: pageNumber++, paragraphs: currentParagraphs });
                    currentParagraphs = [];
                    currentHeight = 0;
                    queue.unshift(block);
                } else {
                    currentParagraphs.push(block);
                    currentHeight += h;
                }
            }
        }

        if (currentParagraphs.length > 0) {
            repaginated.push({ pageNumber: pageNumber++, paragraphs: currentParagraphs });
        }
    }

    return repaginated;
}
