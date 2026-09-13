/* =============================================
   BROMOTORS.IT — Main JavaScript
   ============================================= */

const API_BASE    = 'http://localhost:3001/api';
const UPLOADS_URL = 'http://localhost:3001/uploads';

document.addEventListener('DOMContentLoaded', () => {

  /* ——— Navbar scroll ——— */
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ——— Hamburger menu ——— */
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  /* ——— Keyframe fade animazione ——— */
  const styleTag = document.createElement('style');
  styleTag.textContent = `
    @keyframes fadeInCard {
      from { opacity: 0; transform: scale(.95) translateY(12px); }
      to   { opacity: 1; transform: scale(1)   translateY(0); }
    }
  `;
  document.head.appendChild(styleTag);

  /* ——— Caricamento immagini sito dal backend ——— */
  loadSiteImages();

  /* ——— Caricamento veicoli dal backend ——— */
  loadCatalogoFromAPI();
  loadNoleggioFromAPI();

  /* ——— FAQ accordion ——— */
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn    = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-item').forEach(i => {
        i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        i.querySelector('.faq-answer').classList.remove('open');
      });
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        answer.classList.add('open');
      }
    });
  });

  /* ——— Form contatti ——— */
  const form        = document.getElementById('contattiForm');
  const formSuccess = document.getElementById('formSuccess');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => {
        field.style.borderColor = '';
        if (!field.value.trim() || (field.type === 'checkbox' && !field.checked)) {
          field.style.borderColor = '#e53e3e';
          valid = false;
        }
      });
      if (!valid) return;

      const btn = form.querySelector('button[type="submit"]');
      btn.textContent = 'Invio in corso...';
      btn.disabled = true;
      setTimeout(() => {
        formSuccess.classList.add('visible');
        form.reset();
        btn.textContent = 'Invia Messaggio';
        btn.disabled = false;
        formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => formSuccess.classList.remove('visible'), 6000);
      }, 1200);
    });
    form.querySelectorAll('input, select, textarea').forEach(f => {
      f.addEventListener('input', () => { f.style.borderColor = ''; });
    });
  }

  /* ——— Smooth scroll ——— */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ——— Active nav link su scroll ——— */
  const sections   = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
  new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navAnchors.forEach(a => a.classList.remove('nav-active'));
        const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('nav-active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' }).observe && sections.forEach(s => {
    new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navAnchors.forEach(a => a.classList.remove('nav-active'));
          const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
          if (active) active.classList.add('nav-active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' }).observe(s);
  });

  /* ——— Navbar hero ——— */
  const heroSection = document.getElementById('home');
  if (heroSection) {
    new IntersectionObserver((entries) => {
      entries.forEach(e => navbar.classList.toggle('on-hero', e.isIntersecting));
    }, { threshold: 0.1 }).observe(heroSection);
  }

});

/* =============================================
   IMMAGINI SITO — Caricamento da API
   ============================================= */
async function loadSiteImages() {
  try {
    const res  = await fetch(`${API_BASE}/immagini`);
    const data = await res.json();
    if (!data.ok) return;

    const map = {};
    data.data.forEach(img => { map[img.chiave] = img.filename; });

    // Hero background
    const heroBgEl = document.getElementById('heroBgImg');
    if (heroBgEl && map.hero_bg) {
      heroBgEl.style.backgroundImage = `url('images/${map.hero_bg}?t=${Date.now()}')`;
    }

    // Chi siamo
    const chiSiamoEl = document.getElementById('chiSiamoImg');
    if (chiSiamoEl && map.chi_siamo) {
      chiSiamoEl.style.backgroundImage = `url('images/${map.chi_siamo}?t=${Date.now()}')`;
      chiSiamoEl.classList.add('has-image');
    }

    // Noleggio sfondo
    if (map.noleggio_bg) {
      const nolEl = document.getElementById('noleggio');
      if (nolEl) nolEl.style.backgroundImage = `url('images/${map.noleggio_bg}?t=${Date.now()}')`;
    }

    // CSS variables per sfondi sezioni
    const root = document.documentElement;
    if (map.catalogo_bg)
      root.style.setProperty('--catalogo-bg', `url('images/${map.catalogo_bg}')`);
    if (map.noleggio_bg) {
      const noleggioSection = document.getElementById('noleggio');
      if (noleggioSection)
        noleggioSection.style.backgroundImage = `url('images/${map.noleggio_bg}')`;
    }
  } catch (e) {
    // Backend non disponibile, usa immagini locali già nel CSS
    console.warn('Immagini sito: backend non raggiungibile');
  }
}

/* =============================================
   CATALOGO AUTO USATE — Caricamento da API
   ============================================= */
async function loadCatalogoFromAPI() {
  const grid    = document.getElementById('autoGrid');
  const filtri  = document.querySelectorAll('.filtro');
  if (!grid) return;

  // Scheletro di caricamento
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:#6b7280;">
    <div class="api-spinner"></div>
    <p style="margin-top:12px;font-size:.9rem;">Caricamento veicoli...</p>
  </div>`;

  try {
    const res  = await fetch(`${API_BASE}/veicoli?tipo=vendita&limit=50`);
    const data = await res.json();

    if (!data.ok || !data.data.length) {
      // Fallback: lascia i veicoli statici già presenti nel HTML
      grid.innerHTML = '';
      renderStaticCards(grid);
      initFiltriStatici(filtri);
      return;
    }

    renderCatalogoCards(grid, data.data);
    initFiltroDinamico(filtri, grid);
    initFadeObserver();

  } catch (err) {
    // Backend non disponibile → usa i veicoli statici dell'HTML
    console.warn('Backend non raggiungibile, uso dati statici.');
    grid.innerHTML = '';
    renderStaticCards(grid);
    initFiltriStatici(filtri);
    initFadeObserver();
  }
}

function renderCatalogoCards(grid, veicoli) {
  grid.innerHTML = '';
  veicoli.forEach((v, i) => {
    const optional = Array.isArray(v.optional) ? v.optional : JSON.parse(v.optional || '[]');
    const foto     = Array.isArray(v.foto) ? v.foto : JSON.parse(v.foto || '[]');
    const fotoSrc  = v.foto_copertina ? `${UPLOADS_URL}/${v.foto_copertina}` : null;
    const prezzo   = v.prezzo ? `€ ${Number(v.prezzo).toLocaleString('it-IT')}` : 'Su richiesta';
    const promo    = v.prezzo_promo ? `<s style="font-size:.85rem;color:#999;">€ ${Number(v.prezzo_promo).toLocaleString('it-IT')}</s>` : '';
    const km       = v.chilometri ? `${Number(v.chilometri).toLocaleString('it-IT')} km` : '—';

    const badge3 = optional.slice(0, 3).map(o => `<span>${o}</span>`).join('');

    const card = document.createElement('div');
    card.className = 'auto-card';
    card.dataset.category = v.categoria;
    card.style.animation = `fadeInCard .4s ease ${i * 60}ms both`;
    card.innerHTML = `
      <div class="auto-img-wrap">
        ${fotoSrc
          ? `<img src="${fotoSrc}" alt="${v.marca} ${v.modello}" class="auto-img" style="object-fit:cover;" onerror="this.parentElement.innerHTML='<div class=\'auto-img placeholder-img\'></div>'">`
          : `<div class="auto-img placeholder-img"></div>`
        }
        <div class="auto-badge">${formatCategoria(v.categoria)}</div>
        ${v.in_evidenza ? '<div class="auto-badge-evidenza">In Evidenza</div>' : ''}
      </div>
      <div class="auto-info">
        <h3>${v.marca} ${v.modello}</h3>
        ${v.versione ? `<div style="font-size:.78rem;color:#6b7280;margin-bottom:8px;">${v.versione}</div>` : ''}
        <div class="auto-meta">
          <span>${v.anno}</span>
          <span>${km}</span>
          <span>${formatCarburante(v.carburante)}</span>
        </div>
        <div class="auto-features">${badge3}</div>
        <div class="auto-footer">
          <div class="auto-price">
            ${promo}
            <strong>${prezzo}</strong>
            ${v.finanziabile ? '<div style="font-size:.72rem;color:#6b7280;">Finanziabile</div>' : ''}
          </div>
          <a href="#contatti" class="btn btn-sm btn-primary">Info</a>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

/* =============================================
   NOLEGGIO — Caricamento da API
   ============================================= */
async function loadNoleggioFromAPI() {
  // La sezione noleggio ha card fisse (fasce prezzo).
  // Se il backend è disponibile, mostriamo anche le auto specifiche disponibili.
  try {
    const res  = await fetch(`${API_BASE}/veicoli?tipo=noleggio&limit=6`);
    const data = await res.json();
    if (!data.ok || !data.data.length) return;

    // Aggiungiamo una sotto-griglia sotto le card noleggio
    const noleggioSection = document.getElementById('noleggio');
    if (!noleggioSection) return;

    const container = document.createElement('div');
    container.className = 'container';
    container.style.marginTop = '0';
    container.innerHTML = `
      <div style="text-align:center;margin:0 0 32px;">
        <div class="section-tag tag-light">Flotta disponibile</div>
        <h3 style="color:#fff;margin-top:10px;">Scegli il tuo veicolo</h3>
      </div>
      <div class="auto-grid noleggio-auto-grid" id="noleggioAutoGrid"></div>
    `;
    noleggioSection.appendChild(container);

    const nGrid = container.querySelector('#noleggioAutoGrid');
    data.data.forEach((v, i) => {
      const foto    = Array.isArray(v.foto) ? v.foto : JSON.parse(v.foto || '[]');
      const fotoSrc = v.foto_copertina ? `${UPLOADS_URL}/${v.foto_copertina}` : null;
      const optional= Array.isArray(v.optional) ? v.optional : JSON.parse(v.optional || '[]');
      const badge3  = optional.slice(0, 3).map(o => `<span>${o}</span>`).join('');

      const card = document.createElement('div');
      card.className = 'auto-card noleggio-mini-card';
      card.style.cssText = 'background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);';
      card.innerHTML = `
        <div class="auto-img-wrap">
          ${fotoSrc
            ? `<img src="${fotoSrc}" alt="${v.marca} ${v.modello}" class="auto-img" style="object-fit:cover;" onerror="this.parentElement.innerHTML='<div class=\'auto-img placeholder-img\'></div>'">`
            : `<div class="auto-img placeholder-img"></div>`
          }
          <div class="auto-badge">${formatCategoria(v.categoria)}</div>
        </div>
        <div class="auto-info">
          <h3 style="color:#fff;">${v.marca} ${v.modello}</h3>
          <div class="auto-meta">
            <span style="color:rgba(255,255,255,.6);">${v.anno}</span>
            <span style="color:rgba(255,255,255,.6);">${formatCarburante(v.carburante)}</span>
          </div>
          <div class="auto-features">${badge3}</div>
          <div class="auto-footer" style="border-color:rgba(255,255,255,.1);">
            <div class="auto-price">
              ${v.prezzo_giorno ? `<strong style="color:#FF6B00;">€ ${v.prezzo_giorno}<span style="font-size:.75rem;font-weight:400;color:rgba(255,255,255,.6);">/gg</span></strong>` : '<strong style="color:#fff;">Su richiesta</strong>'}
            </div>
            <a href="#contatti" class="btn btn-sm btn-primary">Prenota</a>
          </div>
        </div>`;
      nGrid.appendChild(card);
    });

    initFadeObserver();
  } catch (e) {
    // Backend non disponibile, la sezione noleggio rimane statica
  }
}

/* =============================================
   FILTRI
   ============================================= */
function initFiltroDinamico(filtri, grid) {
  filtri.forEach(btn => {
    btn.addEventListener('click', () => {
      filtri.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      grid.querySelectorAll('.auto-card').forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !show);
        if (show) card.style.animation = 'fadeInCard .35s ease forwards';
      });
    });
  });
}

function initFiltriStatici(filtri) {
  filtri.forEach(btn => {
    btn.addEventListener('click', () => {
      filtri.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('#autoGrid .auto-card').forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !show);
        if (show) card.style.animation = 'fadeInCard .35s ease forwards';
      });
    });
  });
}

function renderStaticCards(grid) {
  // Mantiene le card statiche originali
  const staticHTML = `
    <div class="auto-card" data-category="suv">
      <div class="auto-img-wrap"><div class="auto-img placeholder-img suv-img"></div><div class="auto-badge">SUV</div></div>
      <div class="auto-info"><h3>Volkswagen Tiguan</h3><div class="auto-meta"><span>2021</span><span>48.000 km</span><span>Diesel</span></div><div class="auto-features"><span>Automatico</span><span>Navi</span><span>LED</span></div><div class="auto-footer"><div class="auto-price"><strong>€ 28.900</strong></div><a href="#contatti" class="btn btn-sm btn-primary">Info</a></div></div>
    </div>
    <div class="auto-card" data-category="berlina">
      <div class="auto-img-wrap"><div class="auto-img placeholder-img berlina-img"></div><div class="auto-badge">Berlina</div></div>
      <div class="auto-info"><h3>BMW Serie 3</h3><div class="auto-meta"><span>2020</span><span>62.000 km</span><span>Benzina</span></div><div class="auto-features"><span>Automatico</span><span>Tetto apri</span><span>Sport</span></div><div class="auto-footer"><div class="auto-price"><strong>€ 31.500</strong></div><a href="#contatti" class="btn btn-sm btn-primary">Info</a></div></div>
    </div>
    <div class="auto-card" data-category="utilitaria">
      <div class="auto-img-wrap"><div class="auto-img placeholder-img utilitaria-img"></div><div class="auto-badge">Utilitaria</div></div>
      <div class="auto-info"><h3>Fiat 500X</h3><div class="auto-meta"><span>2022</span><span>22.000 km</span><span>Ibrido</span></div><div class="auto-features"><span>Manuale</span><span>Apple Car</span><span>Cruise</span></div><div class="auto-footer"><div class="auto-price"><strong>€ 17.900</strong></div><a href="#contatti" class="btn btn-sm btn-primary">Info</a></div></div>
    </div>
    <div class="auto-card" data-category="suv">
      <div class="auto-img-wrap"><div class="auto-img placeholder-img suv2-img"></div><div class="auto-badge">SUV</div></div>
      <div class="auto-info"><h3>Toyota RAV4</h3><div class="auto-meta"><span>2020</span><span>55.000 km</span><span>Ibrido</span></div><div class="auto-features"><span>AWD</span><span>Navi</span><span>Cam 360</span></div><div class="auto-footer"><div class="auto-price"><strong>€ 33.200</strong></div><a href="#contatti" class="btn btn-sm btn-primary">Info</a></div></div>
    </div>
    <div class="auto-card" data-category="berlina">
      <div class="auto-img-wrap"><div class="auto-img placeholder-img berlina2-img"></div><div class="auto-badge">Berlina</div></div>
      <div class="auto-info"><h3>Mercedes Classe A</h3><div class="auto-meta"><span>2021</span><span>41.000 km</span><span>Diesel</span></div><div class="auto-features"><span>Automatico</span><span>MBUX</span><span>LED</span></div><div class="auto-footer"><div class="auto-price"><strong>€ 26.700</strong></div><a href="#contatti" class="btn btn-sm btn-primary">Info</a></div></div>
    </div>
    <div class="auto-card" data-category="station">
      <div class="auto-img-wrap"><div class="auto-img placeholder-img station-img"></div><div class="auto-badge">Station</div></div>
      <div class="auto-info"><h3>Audi A4 Avant</h3><div class="auto-meta"><span>2019</span><span>78.000 km</span><span>Diesel</span></div><div class="auto-features"><span>S-Tronic</span><span>MMI Navi</span><span>Tetto</span></div><div class="auto-footer"><div class="auto-price"><strong>€ 24.500</strong></div><a href="#contatti" class="btn btn-sm btn-primary">Info</a></div></div>
    </div>`;
  grid.innerHTML = staticHTML;
}

/* =============================================
   FADE UP OBSERVER
   ============================================= */
function initFadeObserver() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), Number(entry.target.dataset.delay) || 0);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  const targets = document.querySelectorAll(
    '.auto-card, .noleggio-card, .recensione-card, .faq-item, .value-item, .info-item, .noleggio-perks .perk, .stat'
  );
  targets.forEach((el, i) => {
    el.classList.add('fade-up');
    el.dataset.delay = (i % 4) * 80;
    obs.observe(el);
  });
}

/* =============================================
   UTILITY
   ============================================= */
function formatCategoria(cat) {
  const map = { berlina:'Berlina', suv:'SUV', utilitaria:'Utilitaria', station:'Station W.',
                monovolume:'Monovolume', cabrio:'Cabriolet', coupe:'Coupé', furgone:'Furgone', altro:'Altro' };
  return map[cat] || cat;
}
function formatCarburante(c) {
  const map = { benzina:'Benzina', diesel:'Diesel', ibrido:'Ibrido', elettrico:'Elettrico', gpl:'GPL', metano:'Metano' };
  return map[c] || c;
}
