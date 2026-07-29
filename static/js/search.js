(function () {
  'use strict';

  var searchIndex = [];
  var searchOverlay = document.getElementById('searchOverlay');
  var searchToggle = document.getElementById('searchToggle');
  var searchInput = document.getElementById('searchInput');
  var searchClose = document.getElementById('searchClose');
  var searchResults = document.getElementById('searchResults');
  var selectedIndex = -1;

  // Fetch search index
  function loadSearchIndex() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/search-index.json', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          searchIndex = JSON.parse(xhr.responseText);
        } catch (e) {
          console.error('Search index parse error:', e);
        }
      }
    };
    xhr.send();
  }

  // Open search
  function openSearch() {
    searchOverlay.classList.add('active');
    setTimeout(function () {
      searchInput.focus();
    }, 100);
    document.body.style.overflow = 'hidden';
    selectedIndex = -1;
  }

  // Close search
  function closeSearch() {
    searchOverlay.classList.remove('active');
    document.body.style.overflow = '';
    searchInput.value = '';
    searchResults.innerHTML = '';
    selectedIndex = -1;
  }

  // Perform search
  function performSearch(query) {
    if (!query.trim()) {
      searchResults.innerHTML = '';
      selectedIndex = -1;
      return;
    }

    var q = query.toLowerCase();
    var results = searchIndex.filter(function (item) {
      return (
        item.title.toLowerCase().indexOf(q) !== -1 ||
        (item.author && item.author.toLowerCase().indexOf(q) !== -1) ||
        (item.description && item.description.toLowerCase().indexOf(q) !== -1) ||
        (item.content && item.content.toLowerCase().indexOf(q) !== -1)
      );
    });

    renderResults(results, q);
  }

  // Render search results
  function renderResults(results, query) {
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-empty">未找到相关文章</div>';
      selectedIndex = -1;
      return;
    }

    var html = '';
    for (var i = 0; i < results.length; i++) {
      var item = results[i];
      var titleHighlighted = highlightMatch(item.title, query);
      var descHighlighted = highlightMatch(item.description, query);
      html +=
        '<a href="' + item.url + '" class="search-result-item" data-index="' + i + '">' +
          '<div class="search-result-section">' + item.sectionName + '</div>' +
          '<h3 class="search-result-title">' + titleHighlighted + '</h3>' +
          '<p class="search-result-desc">' + descHighlighted + '</p>' +
        '</a>';
    }
    searchResults.innerHTML = html;
    selectedIndex = -1;
  }

  // Highlight matching text
  function highlightMatch(text, query) {
    if (!text || !query) return text || '';
    var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(' + escaped + ')', 'gi');
    return text.replace(regex, '<mark style="background:#e8f4f8;color:#1e88a8;border-radius:2px;padding:0 2px;">$1</mark>');
  }

  // Navigate results with keyboard
  function navigateResults(direction) {
    var items = searchResults.querySelectorAll('.search-result-item');
    if (items.length === 0) return;

    // Remove previous selection
    if (selectedIndex >= 0 && items[selectedIndex]) {
      items[selectedIndex].style.background = '';
    }

    selectedIndex += direction;

    if (selectedIndex < 0) {
      selectedIndex = items.length - 1;
    } else if (selectedIndex >= items.length) {
      selectedIndex = 0;
    }

    items[selectedIndex].style.background = 'var(--color-accent-light)';
    items[selectedIndex].focus();
  }

  // Event listeners
  searchToggle.addEventListener('click', openSearch);

  searchClose.addEventListener('click', closeSearch);

  searchOverlay.addEventListener('click', function (e) {
    if (e.target === searchOverlay) {
      closeSearch();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && searchOverlay.classList.contains('active')) {
      closeSearch();
    }
  });

  // Ctrl+K or Cmd+K to open search
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });

  searchInput.addEventListener('input', function () {
    performSearch(this.value);
  });

  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateResults(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateResults(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      var items = searchResults.querySelectorAll('.search-result-item');
      if (selectedIndex >= 0 && items[selectedIndex]) {
        window.location.href = items[selectedIndex].getAttribute('href');
      } else if (items.length > 0) {
        window.location.href = items[0].getAttribute('href');
      }
    }
  });

  // Load index on page load
  if (document.readyState === 'complete') {
    loadSearchIndex();
  } else {
    document.addEventListener('DOMContentLoaded', loadSearchIndex);
  }
})();