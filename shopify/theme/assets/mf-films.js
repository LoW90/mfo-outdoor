/* No press-play: every film plays by itself, muted, when at least a quarter of it is on screen, and pauses when it
 * leaves; a film the viewer paused stays paused. Films the theme already plays this way (marked muted in the markup)
 * keep their own script; the rest (click-to-play films) are taken over here. Every film without native controls or
 * its own button gets one small Pause/Play button. Reduced motion or data saver: nothing starts by itself and the
 * button reads Play. Written by shopify/films.mjs at build time. */
(function () {
  if (window.__mfFilms) return; window.__mfFilms = true;
  var quiet = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || (navigator.connection && navigator.connection.saveData);
  var TOGGLES = '[data-mf-film-toggle],[data-film-toggle],.film-toggle,.mf-fold__film-toggle,.mf-film-pause';
  var io = (!quiet && 'IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { if (v.dataset.mfFilmsHeld !== '1') play(v); }
      else if (!v.paused) v.pause();
    });
  }, {threshold: 0.25}) : null;
  function hasToggle(v) {
    var p = v.parentElement;
    return !!((p && p.querySelector(TOGGLES)) || (v.id && document.querySelector('[aria-controls="' + v.id + '"]')));
  }
  function load(v) {
    var changed = false;
    Array.prototype.forEach.call(v.querySelectorAll('source[data-src]'), function (s) { if (!s.getAttribute('src')) { s.src = s.dataset.src; changed = true; } });
    if (changed) v.load();
  }
  function play(v) { load(v); v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  function label(b, v) { var on = !v.paused; b.textContent = on ? 'Pause' : 'Play'; b.setAttribute('aria-pressed', String(!on)); b.setAttribute('aria-label', (on ? 'Pause' : 'Play') + ' film'); }
  function button(v) {
    var host = v.parentElement; if (!host) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'mf-film-pause';
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (v.paused) { v.dataset.mfFilmsHeld = ''; play(v); } else { v.dataset.mfFilmsHeld = '1'; v.pause(); }
    });
    /* A film the viewer paused stays paused, even if the theme's own script tries to restart it on scroll. */
    v.addEventListener('play', function () { if (v.dataset.mfFilmsHeld === '1') v.pause(); });
    ['play', 'pause', 'playing'].forEach(function (t) { v.addEventListener(t, function () { label(b, v); }); });
    host.appendChild(b); label(b, v);
  }
  function take(v) {
    if (v.dataset.mfFilms) return; v.dataset.mfFilms = '1';
    var themeOwned = v.hasAttribute('muted');
    if (!themeOwned) {
      v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.playsInline = true; v.setAttribute('playsinline', '');
      if (!v.hasAttribute('data-mf-films-keep-loop')) v.loop = true;
      v.removeAttribute('controls'); v.controls = false;
      if (io) io.observe(v);
    }
    if (!v.controls && !hasToggle(v)) button(v);
  }
  function scan(root) { Array.prototype.forEach.call((root || document).querySelectorAll('video'), take); }
  scan();
  if ('MutationObserver' in window) new MutationObserver(function (list) {
    list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType !== 1) return; if (n.tagName === 'VIDEO') take(n); else if (n.querySelector) scan(n); }); });
  }).observe(document.body, {childList: true, subtree: true});
})();
