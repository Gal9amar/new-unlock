// Renders a "\n\n"-separated message into distinct visual blocks (line breaks
// preserved, last block — the totals — rendered bold) so multi-line invoice
// details don't collapse into one crowded paragraph in the email HTML.
function messageBlocksHtml(msg) {
  const blocks = String(msg || '').split('\n\n').filter(Boolean);
  return blocks.map((block, i) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const isLast = blocks.length > 1 && i === blocks.length - 1;
    const style = `${i > 0 ? 'margin-top:10px;' : ''}${isLast ? 'font-weight:700;' : ''}`;
    return `<div style="${style}">${lines.join('<br>')}</div>`;
  }).join('');
}

module.exports = { messageBlocksHtml };
