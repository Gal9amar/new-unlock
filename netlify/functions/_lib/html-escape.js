// Escapes user-controlled strings before they're interpolated into email
// HTML — without this, a name/message/address field containing `<a href=...>`
// renders live as a clickable link/broken layout in an email the recipient
// (often the admin) implicitly trusts.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { escapeHtml };
