(function () {
  var STORAGE_KEY = 'unlockCookieConsent';
  if (localStorage.getItem(STORAGE_KEY)) return;

  var inPages = /\/pages\//.test(window.location.pathname);
  var policyHref = (inPages ? 'privacy-policy.html' : 'pages/privacy-policy.html') + '#cookies';

  var style = document.createElement('style');
  style.textContent =
    '.cookie-consent-banner{position:fixed;inset-inline:0;bottom:0;z-index:9998;' +
    'background:rgba(10,22,40,0.97);backdrop-filter:blur(10px);' +
    'border-top:1px solid rgba(212,168,83,0.3);' +
    'padding:1rem 1.25rem;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:1rem;' +
    'font-family:Heebo,Arial,sans-serif;box-shadow:0 -4px 24px rgba(0,0,0,0.35);' +
    'animation:cookieBannerUp .35s ease both;}' +
    '@keyframes cookieBannerUp{from{transform:translateY(100%)}to{transform:translateY(0)}}' +
    '.cookie-consent-text{color:#e2e8f0;font-size:0.88rem;line-height:1.6;max-width:640px;flex:1 1 320px;}' +
    '.cookie-consent-text a{color:#d4a853;text-decoration:underline;}' +
    '.cookie-consent-actions{display:flex;gap:0.6rem;flex-wrap:wrap;flex:0 0 auto;}' +
    '.cookie-consent-btn{font-family:Heebo,Arial,sans-serif;font-size:0.85rem;font-weight:700;' +
    'border-radius:10px;padding:0.55rem 1.1rem;cursor:pointer;border:1.5px solid transparent;white-space:nowrap;}' +
    '.cookie-consent-accept{background:linear-gradient(135deg,#d4a853,#e8c87a);color:#0a1628;}' +
    '.cookie-consent-essential{background:transparent;border-color:rgba(255,255,255,0.25);color:#e2e8f0;}' +
    '@media (max-width:480px){.cookie-consent-banner{justify-content:flex-start;}.cookie-consent-actions{width:100%;}.cookie-consent-btn{flex:1;}}';
  document.head.appendChild(style);

  var banner = document.createElement('div');
  banner.className = 'cookie-consent-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'הסכמה לשימוש בעוגיות');
  banner.innerHTML =
    '<p class="cookie-consent-text">' +
    'האתר משתמש בעוגיות הכרחיות ותפקודיות (כגון Firebase ו-UserWay) לתפעול תקין ולשיפור החוויה. ' +
    'קראו את <a href="' + policyHref + '">מדיניות העוגיות שלנו</a>.' +
    '</p>' +
    '<div class="cookie-consent-actions">' +
    '<button type="button" class="cookie-consent-btn cookie-consent-essential" id="cookieEssentialBtn">הכרחיות בלבד</button>' +
    '<button type="button" class="cookie-consent-btn cookie-consent-accept" id="cookieAcceptBtn">מאשר/ת</button>' +
    '</div>';

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(banner);
    document.getElementById('cookieAcceptBtn').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, 'accepted');
      banner.remove();
    });
    document.getElementById('cookieEssentialBtn').addEventListener('click', function () {
      localStorage.setItem(STORAGE_KEY, 'essential');
      banner.remove();
    });
  });
})();
