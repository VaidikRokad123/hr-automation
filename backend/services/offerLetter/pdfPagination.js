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
    const MIN_REMAINING_FOR_SPLIT_MM = 4;

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
                const remaining = effectivePageUsableHeight - currentHeight;
                const willOverflow = (currentHeight + h) > effectivePageUsableHeight;

                if (!willOverflow) {
                    currentParagraphs.push(block);
                    currentHeight += h;
                    continue;
                }

                const canSplitParagraph = block.type === 'paragraph' && stripHtml(block.content || '').trim().length > 0;
                if (canSplitParagraph) {
                    const targetFitHeight = remaining >= MIN_REMAINING_FOR_SPLIT_MM ? remaining : null;
                    const split = targetFitHeight === null
                        ? null
                        : splitParagraphIntoFitAndRest(block, metadata, targetFitHeight, estimateBlockHeightMm, replaceVariables);

                    if (split && split.fit?.content) {
                        if (currentParagraphs.length > 0) {
                            currentParagraphs.push(split.fit);
                            currentHeight += estimateBlockHeightMm(split.fit, metadata, replaceVariables);
                            repaginated.push({ pageNumber: pageNumber++, paragraphs: currentParagraphs });
                            currentParagraphs = [];
                            currentHeight = 0;
                        } else {
                            const splitBlocks = splitParagraphToFit(block, metadata, pageUsableHeight * 0.92, estimateBlockHeightMm, replaceVariables);
                            const firstBlock = splitBlocks.shift();
                            if (firstBlock) {
                                currentParagraphs.push(firstBlock);
                                currentHeight += estimateBlockHeightMm(firstBlock, metadata, replaceVariables);
                                repaginated.push({ pageNumber: pageNumber++, paragraphs: currentParagraphs });
                                currentParagraphs = [];
                                currentHeight = 0;
                            }
                            splitBlocks.reverse().forEach((b) => queue.unshift(b));
                            continue;
                        }

                        queue.unshift(split.rest);
                        continue;
                    }
                }

                if (currentParagraphs.length > 0 && block.type !== 'paragraph') {
                    const lastPlaced = currentParagraphs[currentParagraphs.length - 1];
                    if (lastPlaced?.type === 'paragraph') {
                        const lastH = estimateBlockHeightMm(lastPlaced, metadata, replaceVariables);
                        const heightWithoutLast = currentHeight - lastH;
                        const availableForLastFit = effectivePageUsableHeight - heightWithoutLast;

                        if (availableForLastFit >= MIN_REMAINING_FOR_SPLIT_MM) {
                            const splitLast = splitParagraphIntoFitAndRest(lastPlaced, metadata, availableForLastFit, estimateBlockHeightMm, replaceVariables);
                            if (splitLast?.fit?.content && splitLast?.rest?.content) {
                                currentParagraphs[currentParagraphs.length - 1] = splitLast.fit;
                                currentHeight = heightWithoutLast + estimateBlockHeightMm(splitLast.fit, metadata, replaceVariables);

                                repaginated.push({ pageNumber: pageNumber++, paragraphs: currentParagraphs });
                                currentParagraphs = [];
                                currentHeight = 0;

                                queue.unshift(block);
                                queue.unshift(splitLast.rest);
                                continue;
                            }
                        }
                    }
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
