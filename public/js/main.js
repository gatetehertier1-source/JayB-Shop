// public/js/main.js
// Progressive-enhancement layer for JayB Shop. The site works fully without
// this file (it's a plain MPA) — this just adds the motion and polish.
(function () {
  'use strict';

  /* ---------------- Reveal on scroll ---------------- */
  function initReveals() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Stagger product/announcement grids ---------------- */
  function initStagger() {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.classList.add('reveal');
        child.style.transitionDelay = Math.min(i * 60, 480) + 'ms';
      });
    });
  }

  /* ---------------- Sticky header shrink ---------------- */
  function initHeaderScroll() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var onScroll = function () {
      if (window.scrollY > 12) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------- 3D tilt on product cards ---------------- */
  function initTilt() {
    var cards = document.querySelectorAll('.card[data-tilt]');
    cards.forEach(function (card) {
      var bounds;
      card.addEventListener('pointerenter', function () {
        bounds = card.getBoundingClientRect();
      });
      card.addEventListener('pointermove', function (e) {
        if (!bounds) bounds = card.getBoundingClientRect();
        var px = (e.clientX - bounds.left) / bounds.width;
        var py = (e.clientY - bounds.top) / bounds.height;
        var rotateX = (0.5 - py) * 8;
        var rotateY = (px - 0.5) * 10;
        card.style.transform = 'perspective(700px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-6px)';
        card.style.setProperty('--glow-x', (px * 100) + '%');
        card.style.setProperty('--glow-y', (py * 100) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.style.transform = '';
      });
    });
  }

  /* ---------------- Magnetic buttons ---------------- */
  function initMagnetic() {
    var els = document.querySelectorAll('.btn-primary, .cart-link');
    els.forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var b = el.getBoundingClientRect();
        var x = (e.clientX - b.left - b.width / 2) * 0.18;
        var y = (e.clientY - b.top - b.height / 2) * 0.35;
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* ---------------- Button ripple ---------------- */
  function initRipple() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn');
      if (!btn) return;
      var circle = document.createElement('span');
      var d = Math.max(btn.clientWidth, btn.clientHeight);
      var rect = btn.getBoundingClientRect();
      circle.className = 'ripple';
      circle.style.width = circle.style.height = d + 'px';
      circle.style.left = (e.clientX - rect.left - d / 2) + 'px';
      circle.style.top = (e.clientY - rect.top - d / 2) + 'px';
      btn.appendChild(circle);
      setTimeout(function () { circle.remove(); }, 650);
    });
  }

  /* ---------------- Submit feedback (Buy / forms) ---------------- */
  function initSubmitFeedback() {
    document.querySelectorAll('form[data-loading-text]').forEach(function (form) {
      form.addEventListener('submit', function () {
        var btn = form.querySelector('button[type=submit]');
        if (!btn || btn.disabled) return;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = form.dataset.loadingText;
        btn.disabled = true;
        btn.classList.add('is-loading');
      });
    });
  }

  /* ---------------- Toast notifications ---------------- */
  function showToast(message) {
    var wrap = document.getElementById('toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    wrap.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('show'); });
    setTimeout(function () {
      toast.classList.remove('show');
      setTimeout(function () { toast.remove(); }, 300);
    }, 3200);
  }

  function initToastFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var msg = params.get('toast');
    if (msg) {
      showToast(decodeURIComponent(msg));
      params.delete('toast');
      var newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }

  /* ---------------- Count-up stats (admin dashboard) ---------------- */
  function initCountUp() {
    var nums = document.querySelectorAll('.stat-card .num[data-count]');
    if (!nums.length) return;
    nums.forEach(function (el) {
      var target = parseInt(el.dataset.count, 10) || 0;
      var start = 0;
      var duration = 700;
      var startTime = null;
      function step(ts) {
        if (!startTime) startTime = ts;
        var progress = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * eased).toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------------- Cart badge bump ---------------- */
  function initCartBump() {
    var badge = document.querySelector('.cart-count');
    if (!badge) return;
    var params = new URLSearchParams(window.location.search);
    if (params.get('bump')) {
      badge.classList.add('bump');
      setTimeout(function () { badge.classList.remove('bump'); }, 600);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('page-ready');
    initReveals();
    initStagger();
    initHeaderScroll();
    initTilt();
    initMagnetic();
    initRipple();
    initSubmitFeedback();
    initToastFromQuery();
    initCountUp();
    initCartBump();
  });
})();
