const ALLOWED_TAGS = new Set([
    'A',
    'B',
    'BR',
    'DIV',
    'EM',
    'I',
    'LI',
    'OL',
    'P',
    'SPAN',
    'STRONG',
    'SUB',
    'SUP',
    'U',
    'UL'
]);

const ALLOWED_ATTRIBUTES = {
    A: new Set(['href', 'title', 'target', 'rel']),
    DIV: new Set(['style']),
    P: new Set(['style']),
    SPAN: new Set(['style'])
};

const ALLOWED_STYLE_PROPERTIES = new Set([
    'font-weight',
    'font-style',
    'text-decoration',
    'text-align'
]);

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeStyle(value = '') {
    return String(value)
        .split(';')
        .map((declaration) => declaration.trim())
        .filter(Boolean)
        .filter((declaration) => {
            const [property, ...rawValueParts] = declaration.split(':');
            const propertyName = property?.trim().toLowerCase();
            const propertyValue = rawValueParts.join(':').trim().toLowerCase();

            return ALLOWED_STYLE_PROPERTIES.has(propertyName)
                && !propertyValue.includes('url(')
                && !propertyValue.includes('expression(');
        })
        .join('; ');
}

function sanitizeNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        node.remove();
        return;
    }

    if (!ALLOWED_TAGS.has(node.tagName)) {
        const textNode = document.createTextNode(node.textContent || '');
        node.replaceWith(textNode);
        return;
    }

    const allowedAttributes = ALLOWED_ATTRIBUTES[node.tagName] || new Set();
    Array.from(node.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value || '';

        if (!allowedAttributes.has(attribute.name)) {
            node.removeAttribute(attribute.name);
            return;
        }

        if (name === 'href' && /^\s*javascript:/i.test(value)) {
            node.removeAttribute(attribute.name);
            return;
        }

        if (name === 'target' && value !== '_blank') {
            node.removeAttribute(attribute.name);
            return;
        }

        if (name === 'style') {
            const cleanStyle = sanitizeStyle(value);
            if (cleanStyle) {
                node.setAttribute('style', cleanStyle);
            } else {
                node.removeAttribute('style');
            }
        }
    });

    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noreferrer');
    }

    Array.from(node.childNodes).forEach(sanitizeNode);
}

export function sanitizeHtml(value = '') {
    const rawHtml = String(value || '');

    if (typeof document === 'undefined') {
        return escapeHtml(rawHtml).replace(/\n/g, '<br>');
    }

    const template = document.createElement('template');
    template.innerHTML = rawHtml.replace(/\n/g, '<br>');
    Array.from(template.content.childNodes).forEach(sanitizeNode);
    return template.innerHTML;
}
