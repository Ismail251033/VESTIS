/* =============================================
   VESTIS — Digital Closet — script.js
   ============================================= */

// ── PWA INSTALL ────────────────────────────────
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
const installBanner = document.getElementById('installBanner');
const installBannerClose = document.getElementById('installBannerClose');
const installBannerMsg = document.getElementById('installBannerMsg');

// Detect if already installed (standalone mode)
const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

// Android / Chrome / Edge / Desktop: beforeinstallprompt fires
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isInstalled()) {
    showInstallBtn();
  }
});

// iOS detection
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function showInstallBtn() {
  installBtn.style.display = 'flex';
}

function showInstallBanner(msg) {
  installBannerMsg.innerHTML = msg;
  installBanner.style.display = 'block';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => installBanner.classList.add('visible'));
  });
}

function hideInstallBanner() {
  installBanner.classList.remove('visible');
  setTimeout(() => installBanner.style.display = 'none', 500);
}

// Install button click
installBtn.addEventListener('click', async () => {
  if (deferredPrompt) {
    // Native prompt (Chrome/Edge/Android/Desktop)
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('✓ VESTIS installé avec succès !');
      installBtn.style.display = 'none';
    }
    deferredPrompt = null;
  } else if (isIOS()) {
    // iOS — show instructions
    showInstallBanner('Appuyez sur <b>Partager ↑</b> puis <b>"Sur l\'écran d\'accueil"</b>');
  } else {
    // Fallback for already-installed or unsupported
    showToast("L'app est déjà installée ou votre navigateur ne le supporte pas");
  }
});

installBannerClose.addEventListener('click', hideInstallBanner);

// After install
window.addEventListener('appinstalled', () => {
  installBtn.style.display = 'none';
  hideInstallBanner();
  showToast('🎉 VESTIS est maintenant installé sur votre appareil !');
  deferredPrompt = null;
});

// On load: show button if iOS and not installed
window.addEventListener('load', () => {
  if (isIOS() && !isInstalled()) {
    showInstallBtn();
  }
  // Show banner automatically on mobile after 3s if not installed
  if (!isInstalled()) {
    const dismissed = sessionStorage.getItem('vestis_install_dismissed');
    if (!dismissed) {
      setTimeout(() => {
        if (isIOS()) {
          showInstallBanner('Appuyez sur <b>Partager ↑</b> puis <b>"Sur l\'écran d\'accueil"</b> pour installer VESTIS');
        } else if (deferredPrompt && window.innerWidth < 768) {
          showInstallBanner('<b>Installer VESTIS</b> sur votre écran d\'accueil pour un accès rapide');
          // Override close to trigger native
          installBannerClose.addEventListener('click', () => {
            sessionStorage.setItem('vestis_install_dismissed', '1');
          }, { once: true });
        }
      }, 4000);
    }
  }
});

installBannerClose.addEventListener('click', () => {
  sessionStorage.setItem('vestis_install_dismissed', '1');
});

// ── STATE ──────────────────────────────────────
let clothes = [];
let savedOutfits = [];
let currentFilter = 'All';
let currentOutfit = null;
let selectedCategory = '';
let pendingImageData = null;

// ── STORAGE ────────────────────────────────────
function save() {
  localStorage.setItem('vestis_clothes', JSON.stringify(clothes));
  localStorage.setItem('vestis_outfits', JSON.stringify(savedOutfits));
}

function load() {
  try {
    clothes = JSON.parse(localStorage.getItem('vestis_clothes') || '[]');
    savedOutfits = JSON.parse(localStorage.getItem('vestis_outfits') || '[]');
  } catch (e) {
    clothes = [];
    savedOutfits = [];
  }
}

// ── CURSOR ─────────────────────────────────────
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursorDot');
let mouseX = 0, mouseY = 0;
let cursorX = 0, cursorY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursorDot.style.left = mouseX + 'px';
  cursorDot.style.top = mouseY + 'px';
});

function animateCursor() {
  cursorX += (mouseX - cursorX) * 0.12;
  cursorY += (mouseY - cursorY) * 0.12;
  cursor.style.left = cursorX + 'px';
  cursor.style.top = cursorY + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.querySelectorAll('a, button, .clothing-card, .upload-zone, .pill, .filter-btn').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hovered'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hovered'));
});

// ── PARTICLES ──────────────────────────────────
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 1.5 + 0.3;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = -Math.random() * 0.4 - 0.1;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.life = 0;
    this.maxLife = Math.random() * 300 + 200;
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life++;
    if (this.life > this.maxLife) this.reset();
  }
  draw() {
    const alpha = this.opacity * Math.sin((this.life / this.maxLife) * Math.PI);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(212, 175, 100, ${alpha})`;
    ctx.fill();
  }
}

for (let i = 0; i < 80; i++) {
  const p = new Particle();
  p.life = Math.random() * p.maxLife;
  particles.push(p);
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ── NAV SCROLL ─────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

// ── UPLOAD ZONE ────────────────────────────────
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const uploadBrowse = document.getElementById('uploadBrowse');
const addForm = document.getElementById('addForm');
const previewImg = document.getElementById('previewImg');
const formClear = document.getElementById('formClear');
const itemName = document.getElementById('itemName');
const saveItemBtn = document.getElementById('saveItemBtn');

uploadBrowse.addEventListener('click', e => {
  e.stopPropagation();
  fileInput.click();
});

uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    pendingImageData = e.target.result;
    previewImg.src = pendingImageData;
    addForm.classList.add('active');
    uploadZone.style.display = 'none';
    addForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  reader.readAsDataURL(file);
}

formClear.addEventListener('click', () => {
  resetForm();
});

function resetForm() {
  pendingImageData = null;
  selectedCategory = '';
  itemName.value = '';
  fileInput.value = '';
  addForm.classList.remove('active');
  uploadZone.style.display = '';
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
}

// ── CATEGORY PILLS ─────────────────────────────
document.getElementById('categoryPills').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('selected'));
  pill.classList.add('selected');
  selectedCategory = pill.dataset.cat;
});

// ── SAVE ITEM ──────────────────────────────────
saveItemBtn.addEventListener('click', () => {
  if (!pendingImageData) return showToast('Please upload an image first');
  const name = itemName.value.trim();
  if (!name) return showToast('Please enter a name for this item');
  if (!selectedCategory) return showToast('Please select a category');

  const item = {
    id: Date.now() + Math.random(),
    name,
    category: selectedCategory,
    image: pendingImageData,
    createdAt: new Date().toISOString(),
  };
  clothes.push(item);
  save();
  resetForm();
  renderCloset();
  showToast(`✓ "${name}" added to your closet`);
});

// ── FILTER ─────────────────────────────────────
document.getElementById('filterBar').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  renderCloset();
});

// ── RENDER CLOSET ──────────────────────────────
function renderCloset() {
  const grid = document.getElementById('closetGrid');
  const emptyState = document.getElementById('closetEmpty');
  const filtered = currentFilter === 'All' ? clothes : clothes.filter(c => c.category === currentFilter);

  grid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  emptyState.classList.remove('visible');

  filtered.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'clothing-card';
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${item.image}" alt="${item.name}" loading="lazy" />
        <div class="card-overlay">
          <button class="card-delete" data-id="${item.id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.5 7a1 1 0 001 1h5a1 1 0 001-1l.5-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      <div class="card-info">
        <div class="card-name">${item.name}</div>
        <div class="card-cat">${item.category}</div>
      </div>
    `;

    // Lightbox on image click
    card.querySelector('.card-img-wrap img').addEventListener('click', () => openLightbox(item.image));

    // Delete
    card.querySelector('.card-delete').addEventListener('click', e => {
      e.stopPropagation();
      deleteItem(item.id);
    });

    grid.appendChild(card);
  });
}

function deleteItem(id) {
  clothes = clothes.filter(c => c.id !== id);
  save();
  renderCloset();
  showToast('Item removed from closet');
}

// ── OUTFIT GENERATOR ───────────────────────────
document.getElementById('generateBtn').addEventListener('click', generateOutfit);
document.getElementById('regenBtn').addEventListener('click', generateOutfit);

function generateOutfit() {
  const tops = clothes.filter(c => c.category === 'Tops');
  const pants = clothes.filter(c => c.category === 'Pants');
  const shoes = clothes.filter(c => c.category === 'Shoes');
  const jackets = clothes.filter(c => c.category === 'Jackets');
  const accessories = clothes.filter(c => c.category === 'Accessories');

  if (tops.length === 0 && pants.length === 0 && shoes.length === 0) {
    showToast('Add at least some tops, pants, or shoes first!');
    return;
  }

  const outfit = {};
  if (tops.length) outfit.top = tops[Math.floor(Math.random() * tops.length)];
  if (pants.length) outfit.pants = pants[Math.floor(Math.random() * pants.length)];
  if (shoes.length) outfit.shoes = shoes[Math.floor(Math.random() * shoes.length)];
  if (jackets.length && Math.random() > 0.4) outfit.jacket = jackets[Math.floor(Math.random() * jackets.length)];
  if (accessories.length && Math.random() > 0.5) outfit.accessory = accessories[Math.floor(Math.random() * accessories.length)];

  currentOutfit = outfit;

  const display = document.getElementById('outfitDisplay');
  const stageEmpty = document.getElementById('stageEmpty');
  const slots = document.getElementById('outfitSlots');

  stageEmpty.style.display = 'none';
  display.style.display = 'block';
  slots.innerHTML = '';

  const labels = { top: 'Top', pants: 'Pants', shoes: 'Shoes', jacket: 'Jacket', accessory: 'Accessory' };
  const order = ['top', 'pants', 'shoes', 'jacket', 'accessory'];

  order.forEach(key => {
    if (!outfit[key]) return;
    const item = outfit[key];
    const slot = document.createElement('div');
    slot.className = 'outfit-slot';
    slot.innerHTML = `
      <div class="outfit-slot-img">
        <img src="${item.image}" alt="${item.name}" />
      </div>
      <div class="outfit-slot-label">${labels[key]}</div>
      <div class="outfit-slot-name">${item.name}</div>
    `;
    slots.appendChild(slot);
  });

  showToast('✨ New outfit generated!');
}

// ── SAVE OUTFIT ────────────────────────────────
document.getElementById('saveOutfitBtn').addEventListener('click', () => {
  if (!currentOutfit) return;
  const outfit = {
    id: Date.now(),
    items: Object.values(currentOutfit),
    savedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
  savedOutfits.unshift(outfit);
  save();
  renderSaved();
  showToast('💫 Outfit saved to your collection!');
});

// ── RENDER SAVED ───────────────────────────────
function renderSaved() {
  const grid = document.getElementById('savedGrid');
  const emptyState = document.getElementById('savedEmpty');
  grid.innerHTML = '';

  if (savedOutfits.length === 0) {
    emptyState.classList.add('visible');
    return;
  }
  emptyState.classList.remove('visible');

  savedOutfits.forEach((outfit, i) => {
    const card = document.createElement('div');
    card.className = 'saved-card';
    card.style.animationDelay = `${i * 0.08}s`;

    const thumbs = outfit.items.map(item => `
      <div class="saved-item-thumb">
        <img src="${item.image}" alt="${item.name}" loading="lazy" />
      </div>
    `).join('');

    card.innerHTML = `
      <div class="saved-card-header">
        <div class="saved-card-title">Look #${savedOutfits.length - i}</div>
        <div class="saved-card-date">${outfit.savedAt}</div>
      </div>
      <div class="saved-card-imgs">${thumbs}</div>
      <div class="saved-card-footer">
        <div class="saved-card-count">${outfit.items.length} piece${outfit.items.length !== 1 ? 's' : ''}</div>
        <button class="saved-delete" data-id="${outfit.id}" title="Remove outfit">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M5.5 6v4.5M8.5 6v4.5M3 3.5l.5 7a1 1 0 001 1h5a1 1 0 001-1l.5-7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;

    card.querySelector('.saved-delete').addEventListener('click', () => {
      savedOutfits = savedOutfits.filter(o => o.id !== outfit.id);
      save();
      renderSaved();
      showToast('Outfit removed');
    });

    grid.appendChild(card);
  });
}

// ── LIGHTBOX ───────────────────────────────────
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');

function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.add('open');
}

function closeLightbox() {
  lightbox.classList.remove('open');
}

document.getElementById('lightboxOverlay').addEventListener('click', closeLightbox);
document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// ── TOAST ──────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── SMOOTH SCROLL FOR NAV ──────────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ── INTERSECTION OBSERVER (reveal on scroll) ───
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.section-header').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)';
  observer.observe(el);
});

// ── HOVER CURSOR ON DYNAMIC ELEMENTS ──────────
function refreshCursorListeners() {
  document.querySelectorAll('.clothing-card, .saved-card, .pill, .filter-btn, button').forEach(el => {
    el.addEventListener('mouseenter', () => cursor && cursor.classList.add('hovered'));
    el.addEventListener('mouseleave', () => cursor && cursor.classList.remove('hovered'));
  });
}

// ── INIT ───────────────────────────────────────
function init() {
  load();
  renderCloset();
  renderSaved();
  refreshCursorListeners();

  // Reattach cursor listeners whenever DOM updates
  const mutObs = new MutationObserver(() => refreshCursorListeners());
  mutObs.observe(document.getElementById('closetGrid'), { childList: true });
  mutObs.observe(document.getElementById('savedGrid'), { childList: true });
}

document.addEventListener('DOMContentLoaded', init);