/* MOHE Kuwait – E-Services listing
   Behaviour only; all content lives in index.html.
   Modules: mobile menu, service catalogue, hero search, newsletter, back to top. */
(function () {
  'use strict';

  var MAX_SUGGESTIONS = 5;

  function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /* Read the service list from the catalogue cards, so the markup stays the
     single source of truth for both the catalogue filters and the hero search. */
  function readServices() {
    return Array.prototype.map.call(document.querySelectorAll('[data-service]'), function (item, index) {
      var link = item.querySelector('.service-card__link');
      var icon = item.querySelector('.service-card__icon img');
      return {
        el: item,
        index: index,
        title: item.querySelector('.service-card__title').textContent.trim(),
        description: item.querySelector('.service-card__desc').textContent.trim(),
        category: item.dataset.category,
        audience: (item.dataset.audience || '').split(' '),
        popular: item.dataset.popular === 'true',
        icon: icon ? icon.getAttribute('src') : '',
        href: link ? link.getAttribute('href') : '#'
      };
    });
  }

  /* ----------------------------- Mobile menu ----------------------------- */
  function initMenu() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('site-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Reset when resizing up to the desktop header
    window.matchMedia('(min-width: 1280px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* --------------------------- Service catalogue ------------------------- */
  function initCatalogue(services) {
    var root = document.querySelector('[data-catalogue]');
    if (!root || !services.length) return;

    var form = root.querySelector('[data-catalogue-filters]');
    var searchInput = form.querySelector('input[name="filter"]');
    var grid = root.querySelector('[data-catalogue-grid]');
    var count = root.querySelector('[data-catalogue-count]');
    var empty = root.querySelector('[data-catalogue-empty]');
    var tabs = root.querySelectorAll('[data-tab]');
    var views = root.querySelectorAll('[data-view]');
    var sortButton = root.querySelector('[data-sort]');
    var shareStatus = root.querySelector('[data-share-status]');

    var state = { tab: 'all', category: 'all', query: '', sort: 'default' };
    var SORT_LABELS = { 'default': 'default order', asc: 'A to Z', desc: 'Z to A' };
    var SORT_NEXT = { 'default': 'asc', asc: 'desc', desc: 'default' };

    function matches(service) {
      if (state.tab === 'popular' && !service.popular) return false;
      if ((state.tab === 'individual' || state.tab === 'business') && service.audience.indexOf(state.tab) === -1) return false;
      if (state.category !== 'all' && service.category !== state.category) return false;
      if (state.query && (service.title + ' ' + service.description).toLowerCase().indexOf(state.query) === -1) return false;
      return true;
    }

    function render() {
      var ordered = services.slice().sort(function (a, b) {
        if (state.sort === 'default') return a.index - b.index;
        var order = a.title.localeCompare(b.title);
        return state.sort === 'asc' ? order : -order;
      });

      var visible = 0;
      ordered.forEach(function (service) {
        var show = matches(service);
        service.el.hidden = !show;
        if (show) visible += 1;
        grid.appendChild(service.el);
      });

      count.textContent = 'Showing (' + visible + ') ' + (visible === 1 ? 'service' : 'services');
      empty.hidden = visible > 0;
      grid.hidden = visible === 0;
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        state.tab = tab.dataset.tab;
        tabs.forEach(function (other) {
          other.setAttribute('aria-pressed', String(other === tab));
        });
        render();
      });
    });

    form.addEventListener('change', function (event) {
      if (event.target.name === 'category') {
        state.category = event.target.value;
        render();
      }
    });

    searchInput.addEventListener('input', function () {
      state.query = searchInput.value.trim().toLowerCase();
      render();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
    });

    // "Clear filters" is the form's reset button
    form.addEventListener('reset', function () {
      state.category = 'all';
      state.query = '';
      render();
    });

    views.forEach(function (button) {
      button.addEventListener('click', function () {
        grid.classList.toggle('is-list', button.dataset.view === 'list');
        views.forEach(function (other) {
          other.setAttribute('aria-pressed', String(other === button));
        });
      });
    });

    sortButton.addEventListener('click', function () {
      state.sort = SORT_NEXT[state.sort];
      sortButton.dataset.sort = state.sort;
      sortButton.setAttribute('aria-label', 'Sort services: ' + SORT_LABELS[state.sort]);
      render();
    });

    // Share: native share sheet where available, otherwise copy the link
    grid.addEventListener('click', function (event) {
      var button = event.target.closest('[data-share]');
      if (!button) return;

      var item = button.closest('[data-service]');
      var title = item.querySelector('.service-card__title').textContent.trim();
      var url = new URL(item.querySelector('.service-card__link').getAttribute('href'), window.location.href).href;

      function feedback(message) {
        button.dataset.feedback = message;
        shareStatus.textContent = message;
        window.setTimeout(function () {
          delete button.dataset.feedback;
          shareStatus.textContent = '';
        }, 2000);
      }

      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () { feedback('Link copied'); },
          function () { feedback('Could not copy link'); }
        );
      } else {
        feedback('Sharing is not supported');
      }
    });
  }

  /* ------------------- Hero search (suggestions dropdown) ---------------- */
  function initSearch(services) {
    var form = document.querySelector('[data-search]');
    if (!form) return;

    var input = form.querySelector('.search__input');
    var list = form.querySelector('.search__results');
    var status = form.querySelector('[data-search-status]');
    var field = form.querySelector('.search__field');
    var matches = [];
    var activeIndex = -1;

    function highlight(title, query) {
      var at = title.toLowerCase().indexOf(query);
      if (at === -1) return { html: escapeHtml(title), matched: false };
      return {
        matched: true,
        html:
          escapeHtml(title.slice(0, at)) +
          '<mark>' + escapeHtml(title.slice(at, at + query.length)) + '</mark>' +
          escapeHtml(title.slice(at + query.length))
      };
    }

    function close() {
      list.hidden = true;
      list.innerHTML = '';
      matches = [];
      activeIndex = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function setActive(index) {
      var options = list.querySelectorAll('[role="option"]');
      options.forEach(function (option, i) {
        var selected = i === index;
        option.classList.toggle('is-active', selected);
        option.setAttribute('aria-selected', String(selected));
      });
      activeIndex = index;
      if (index >= 0) input.setAttribute('aria-activedescendant', options[index].id);
      else input.removeAttribute('aria-activedescendant');
    }

    function render() {
      var query = input.value.trim().toLowerCase();
      form.classList.toggle('has-value', query.length > 0);
      if (!query) {
        close();
        status.textContent = '';
        return;
      }

      matches = services.filter(function (service) {
        return (service.title + ' ' + service.description).toLowerCase().indexOf(query) !== -1;
      }).slice(0, MAX_SUGGESTIONS);

      if (!matches.length) {
        list.innerHTML = '<li class="search-result search-result--empty" role="presentation">No services match your search.</li>';
        status.textContent = 'No services match your search.';
      } else {
        list.innerHTML = matches.map(function (service, i) {
          var title = highlight(service.title, query);
          return (
            '<li class="search-result" role="option" id="search-option-' + i + '" aria-selected="false" data-index="' + i + '">' +
              '<span class="search-result__icon"><img src="' + escapeHtml(service.icon) + '" alt="" width="24" height="24"></span>' +
              '<span class="search-result__text">' +
                '<span class="search-result__title' + (title.matched ? ' has-match' : '') + '">' + title.html + '</span>' +
                '<span class="search-result__desc">' + escapeHtml(service.description) + '</span>' +
              '</span>' +
            '</li>'
          );
        }).join('');
        status.textContent = matches.length + (matches.length === 1 ? ' service found.' : ' services found.');
      }

      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function go(index) {
      var service = matches[index];
      if (service) window.location.href = service.href;
    }

    input.addEventListener('input', render);
    input.addEventListener('focus', function () {
      if (input.value.trim()) render();
    });

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (!list.hidden) event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (list.hidden) render();
      if (!matches.length) return;
      event.preventDefault();
      var step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + matches.length) % matches.length);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (activeIndex >= 0) go(activeIndex);
      else if (matches.length) go(0);
    });

    // mousedown keeps focus in the input so the list does not close first
    list.addEventListener('mousedown', function (event) {
      event.preventDefault();
    });
    list.addEventListener('click', function (event) {
      var option = event.target.closest('[role="option"]');
      if (option) go(Number(option.dataset.index));
    });

    field.addEventListener('click', function (event) {
      if (event.target === field || event.target.classList.contains('search__icon')) input.focus();
    });

    document.addEventListener('click', function (event) {
      if (!form.contains(event.target)) close();
    });
    form.addEventListener('focusout', function (event) {
      if (!form.contains(event.relatedTarget)) close();
    });

    // Header search icon jumps to this field
    document.querySelectorAll('[data-focus-search]').forEach(function (button) {
      button.addEventListener('click', function () {
        input.focus();
      });
    });
  }

  /* ------------------------------ Newsletter ----------------------------- */
  function initNewsletter() {
    var form = document.querySelector('[data-newsletter]');
    if (!form) return;

    var input = form.querySelector('input[type="email"]');
    var status = form.querySelector('.newsletter__status');

    input.addEventListener('input', function () {
      input.removeAttribute('aria-invalid');
      status.textContent = '';
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!input.value.trim() || !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        status.textContent = 'Please enter a valid email address.';
        input.focus();
        return;
      }
      // TODO: send input.value to the newsletter endpoint.
      status.textContent = 'Thank you for subscribing.';
      form.reset();
    });
  }

  /* ------------------------------ Back to top ---------------------------- */
  function initBackToTop() {
    var button = document.querySelector('[data-back-to-top]');
    if (!button) return;

    button.addEventListener('click', function () {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      var skip = document.querySelector('.skip-link');
      if (skip) skip.focus({ preventScroll: true });
    });
  }

  var services = readServices();

  initMenu();
  initCatalogue(services);
  initSearch(services);
  initNewsletter();
  initBackToTop();
})();
