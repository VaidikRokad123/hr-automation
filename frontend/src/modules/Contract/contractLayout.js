export const CONTRACT_LETTERHEAD_STYLE = {
  backgroundImage: "url('/images/offerletter/temp.jpg')"
};

export const CONTRACT_PAGE_HEIGHT_MM = 297;
export const CONTRACT_TOP_PADDING_MM = 38;
export const CONTRACT_BOTTOM_PADDING_MM = 18;
export const CONTRACT_SIDE_PADDING_MM = 25;
export const CONTRACT_CONTENT_HEIGHT_MM = CONTRACT_PAGE_HEIGHT_MM - CONTRACT_TOP_PADDING_MM - CONTRACT_BOTTOM_PADDING_MM;
export const CONTRACT_CONTENT_WIDTH_MM = 210 - (CONTRACT_SIDE_PADDING_MM * 2);
export const CONTRACT_FONT_SIZE_PT = 11;
export const CONTRACT_LINE_HEIGHT = 1.5;
export const CONTRACT_FONT_MM = CONTRACT_FONT_SIZE_PT * 0.352778;
export const CONTRACT_LINE_MM = CONTRACT_FONT_MM * CONTRACT_LINE_HEIGHT;
export const CONTRACT_PACKING_LIMIT_MM = CONTRACT_CONTENT_HEIGHT_MM - 3;

export function getContractPageId(page, index) {
  return `page-${page.pageNumber || index + 1}`;
}
