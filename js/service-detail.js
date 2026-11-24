/* MOHE Kuwait – Service detail page
   Behaviour for the accordion, document tabs, "Load more" and country select.
   Header, footer and newsletter behaviour comes from main.js. */
(function () {
  'use strict';

  /* ----------------- Section nav: active tab + progress ------------------ */
  (function initSectionNav() {
    var nav = document.querySelector('[data-section-nav]');
    var root = document.querySelector('[data-section-nav-root]');
    if (!nav || !root) return;

    var list = nav.querySelector('.section-nav__list');
    var bar = nav.querySelector('[data-section-nav-progress]');
    var links = Array.prototype.slice.call(nav.querySelectorAll('.section-nav__link'));
    var sections = links.map(function (link) {
      return document.getElementById(link.getAttribute('href').slice(1));
    });
    var current = -1;
    var ticking = false;

    function setCurrent(index) {
      if (index === current) return;
      current = index;
      links.forEach(function (link, i) {
        if (i === index) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      // keep the active tab in view when the list scrolls sideways (mobile)
      var active = links[index];
      if (active && list.scrollWidth > list.clientWidth) {
        list.scrollTo({ left: active.offsetLeft - list.offsetLeft - 16, behavior: 'auto' });
      }
    }

    function update() {
      ticking = false;
      var navRect = nav.getBoundingClientRect();
      // a section becomes current just before it reaches its anchor position
      // (scroll-margin-top: 88px in service-detail.css)
      var line = Math.max(navRect.bottom, 0) + 48;

      var index = 0;
      sections.forEach(function (section, i) {
        if (section && section.getBoundingClientRect().top <= line) index = i;
      });
      // at the very bottom of the page the last short section may never reach the line
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        index = sections.length - 1;
      }
      setCurrent(index);

      var rootRect = root.getBoundingClientRect();
      var distance = rootRect.height - window.innerHeight;
      var progress = distance > 0 ? -rootRect.top / distance : (rootRect.top <= 0 ? 1 : 0);
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, progress)) + ')';

      nav.classList.toggle('is-stuck', navRect.top <= 0 && rootRect.top < 0);
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* ------------------------------ Accordion ------------------------------ */
  document.querySelectorAll('[data-accordion] .accordion__trigger').forEach(function (trigger) {
    var panel = document.getElementById(trigger.getAttribute('aria-controls'));
    trigger.addEventListener('click', function () {
      var open = trigger.getAttribute('aria-expanded') !== 'true';
      trigger.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    });
  });

  /* --------------------------------- Tabs -------------------------------- */
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));

    function select(tab, focus) {
      tabs.forEach(function (other) {
        var selected = other === tab;
        other.setAttribute('aria-selected', String(selected));
        other.tabIndex = selected ? 0 : -1;
        document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () {
        select(tab, false);
      });
      tab.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
        else if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
        else if (event.key === 'Home') next = tabs[0];
        else if (event.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        event.preventDefault();
        select(next, true);
      });
    });
  });

  /* ------------------------------- Load more ----------------------------- */
  // TODO: fetch the next page of documents. The design shows no further items,
  // so for now the button reports that the list is complete and steps aside.
  document.querySelectorAll('[data-load-more]').forEach(function (button) {
    var status = button.parentNode.querySelector('[data-load-more-status]');
    button.addEventListener('click', function () {
      if (status) status.textContent = 'All documents are shown.';
      button.hidden = true;
    });
  });

  /* ---------------------------- Country select --------------------------- */
  // TODO: swap the table rows per country once allocation data is available.
  var country = document.querySelector('[data-allocation-country]');
  var title = document.querySelector('[data-allocation-title]');
  if (country && title) {
    country.addEventListener('change', function () {
      title.textContent = country.value;
    });
  }
})();
