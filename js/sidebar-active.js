// js/sidebar-active.js
// Activación dinámica del menú lateral sin tocar tu estructura existente.

function setupSidebarActiveMenu(options = {}) {
  const {
    navSelector = '.sidebar-nav',
    itemSelector = '.nav-item',
    activeClass = 'active',
    storageKey = 'sidebarActiveMenu'
  } = options;

  const nav = document.querySelector(navSelector);
  if (!nav) return;

  const items = Array.from(nav.querySelectorAll(itemSelector));
  if (items.length === 0) return;

  const storedId = localStorage.getItem(storageKey);
  if (storedId) {
    const saved = items.find(item => item.dataset.menuId === storedId || item.getAttribute('href') === storedId);
    if (saved) setActive(saved);
  }

  items.forEach(item => {
    item.addEventListener('click', event => {
      setActive(item);
      const id = item.dataset.menuId || item.getAttribute('href');
      if (id) localStorage.setItem(storageKey, id);
    });
  });

  function setActive(activeItem) {
    items.forEach(item => item.classList.toggle(activeClass, item === activeItem));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupSidebarActiveMenu();
});
