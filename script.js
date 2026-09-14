/* =============================================
   BROMOTORS.IT — Main JavaScript
   ============================================= */

/* ── CONFIG CENTRALE ─────────────────────────────
   Modifica QUI i dati reali di BroMotors.
   (numero WhatsApp in formato internazionale senza +, es. 393331234567)
──────────────────────────────────────────────── */
const CONFIG = {
  whatsappNumber: '390612345678',          // TODO: numero reale
  telefono:       '+39 06 123 4567',       // TODO: telefono reale
  email:          'info@bromotors.it',     // TODO: email reale
  indirizzo:      'Via Roma 42, 00100 Roma (RM)', // TODO: indirizzo reale
  orari:          'Lun-Sab: 9:00-19:00 | Dom: 10:00-13:00',
  partitaIVA:     '00000000000'            // TODO: P.IVA reale
};

/* API relative: funziona sia in locale (via backend)
   sia in produzione sullo stesso dominio.        */
const API_BASE    = '/api';
const UPLOADS_URL = '/uploads';

const waLink = (text) =>
  `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;

document.addEventListener('DOMContentLoaded', () => {

  /* ——— Navbar scroll ——— */
  const navbar = document.getElementById('navbar');
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 40);
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

  /* ——— Caricamento contenuti dal backend ——— */
  loadSiteImages();
  loadCatalogoFromAPI();
  loadNoleggioFromAPI();
  initDettaglioModal();

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

  /* ——— Form contatti → WhatsApp precompilato ——— */
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

      const nome      = form.querySelector('#nome').value.trim();
      const cognome   = form.querySelector('#cognome').value.trim();
      const email     = form.querySelector('#email').value.trim();
      const telefono  = form.querySelector('#telefono').value.trim();
      const interesse = form.querySelector('#interesse').value;
      const messaggio = form.querySelector('#messaggio').value.trim();

      const testo = [
        `Ciao BroMotors! 👋`,
        ``,
        `📌 *Nuova richiesta dal sito*`,
        `👤 Nome: ${nome} ${cognome}`,
        email ? `📧 Email: ${email}` : '',
        telefono ? `📞 Telefono: ${telefono}` : '',
        interesse ? `🚗 Interesse: ${interesse}` : '',
        ``,
        `💬 Messaggio:`,
        messaggio
      ].filter(l => l !== '').join('\n');

      window.open(waLink(testo), '_blank');

      formSuccess.textContent = 'Ti abbiamo aperto WhatsApp per inviare la richiesta. A presto!';
      formSuccess.classList.add('visible');
      form.reset();
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => formSuccess.classList.remove('visible'), 6000);
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

  /* ——— Active nav link su scroll (fix: singolo observer) ——— */
  const sections   = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
  if (sections.length && navAnchors.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navAnchors.forEach(a => a.classList.remove('nav-active'));
        const active = document.querySelector(`.nav-links a[href="#${entry.target.id}"]`);
        if (active) active.classList.add('nav-active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(s => spy.observe(s));
  }

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

    const heroBgEl = document.getElementById('heroBgImg');
    if (heroBgEl && map.hero_bg)
      heroBgEl.style.backgroundImage = `url('images/${map.hero_bg}?t=${Date.now()}')`;

    const chiSiamoEl = document.getElementById('chiSiamoImg');
    if (chiSiamoEl && map.chi_siamo) {
      chiSiamoEl.style.backgroundImage = `url('images/${map.chi_siamo}?t=${Date.now()}')`;
      chiSiamoEl.classList.add('has-image');
    }

    if (map.noleggio_bg) {
      const nolEl = document.getElementById('noleggio');
      if (nolEl) nolEl.style.backgroundImage = `url('images/${map.noleggio_bg}?t=${Date.now()}')`;
    }

    const root = document.documentElement;
    if (map.catalogo_bg)
      root.style.setProperty('--catalogo-bg', `url('images/${map.catalogo_bg}')`);
  } catch (e) {
    console.warn('Immagini sito: backend non raggiungibile');
  }
}

/* =============================================
   CATALOGO AUTO USATE — Caricamento da API
   ============================================= */
async function loadCatalogoFromAPI() {
  const grid   = document.getElementById('autoGrid');
  const filtri = document.querySelectorAll('.filtro');
  if (!grid) return;

  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:48px;color:#6b7280;">
    <div class="api-spinner"></div>
    <p style="margin-top:12px;font-size:.9rem;">Caricamento veicoli...</p>
  </div>`;

  try {
    const res  = await fetch(`${API_BASE}/veicoli?tipo=vendita&limit=50`);
    const data = await res.json();

    if (!data.ok || !data.data.length) {
      grid.innerHTML = '';
      renderStaticCards(grid);
      initFiltriStatici(filtri);
      return;
    }

    renderCatalogoCards(grid, data.data);
    initFiltroDinamico(filtri, grid);
    initFadeObserver();

  } catch (err) {
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
    const optional = safeJSON(v.optional);
    const fotoSrc  = v.foto_copertina ? `${UPLOADS_URL}/${v.foto_copertina}` : null;
    const prezzo   = v.prezzo ? `€ ${Number(v.prezzo).toLocaleString('it-IT')}` : 'Su richiesta';
    const promo    = v.prezzo_promo ? `<s style="font-size:.85rem;color:#999;">€ ${Number(v.prezzo_promo).toLocaleString('it-IT')}</s>` : '';
    const km       = v.chilometri ? `${Number(v.chilometri).toLocaleString('it-IT')} km` : '—';

    const badge3 = optional.slice(0, 3).map(o => `<span>${o}</span>`).join('');

    const card = document.createElement('div');
    card.className = 'auto-card';
    card.dataset.category = v.categoria;
    card.dataset.id = v.id;
    card.style.animation = `fadeInCard .4s ease ${i * 60}ms both`;
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <div class="auto-img-wrap">
        ${fotoSrc
          ? `<img src="${fotoSrc}" alt="${v.marca} ${v.modello}" class="auto-img" style="object-fit:cover;" onerror="this.parentElement.innerHTML='<div class=\\'auto-img placeholder-img\\'></div>'">`
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
          <a href="#dettaglio" class="btn btn-sm btn-primary" data-id="${v.id}">Dettagli</a>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

/* =============================================
   NOLEGGIO — Caricamento da API
   ============================================= */
async function loadNoleggioFromAPI() {
  try {
    const res  = await fetch(`${API_BASE}/veicoli?tipo=noleggio&limit=6`);
    const data = await res.json();
    if (!data.ok || !data.data.length) return;

    const noleggioSection = document.getElementById('noleggio');
    if (!noleggioSection) return;

    const container = document.createElement('div');
    container.className = 'container';
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
      const fotoSrc  = v.foto_copertina ? `${UPLOADS_URL}/${v.foto_copertina}` : null;
      const optional = safeJSON(v.optional);
      const badge3   = optional.slice(0, 3).map(o => `<span>${o}</span>`).join('');

      const card = document.createElement('div');
      card.className = 'auto-card noleggio-mini-card';
      card.dataset.id = v.id;
      card.style.cssText = 'background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);cursor:pointer;';
      card.innerHTML = `
        <div class="auto-img-wrap">
          ${fotoSrc
            ? `<img src="${fotoSrc}" alt="${v.marca} ${v.modello}" class="auto-img" style="object-fit:cover;" onerror="this.parentElement.innerHTML='<div class=\\'auto-img placeholder-img\\'></div>'">`
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
            <a href="#dettaglio" class="btn btn-sm btn-primary" data-id="${v.id}">Dettagli</a>
          </div>
        </div>`;
      nGrid.appendChild(card);
    });

    initFadeObserver();
  } catch (e) {
    /* sezione noleggio rimane statica */
  }
}

/* =============================================
   SCHEDA DETTAGLIO AUTO (modale)
   ============================================= */
function initDettaglioModal() {
  const modal = document.createElement('div');
  modal.className = 'dettaglio-modal';
  modal.id = 'dettaglioModal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="dettaglio-backdrop" data-close></div>
    <div class="dettaglio-dialog" role="dialog" aria-modal="true" aria-label="Dettaglio veicolo">
      <button class="dettaglio-close" data-close aria-label="Chiudi">&times;</button>
      <div class="dettaglio-body" id="dettaglioBody">
        <div class="api-spinner" style="margin:80px auto;"></div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const close = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Delega click su tutta la pagina: card e link "Dettagli"/#dettaglio
  document.addEventListener('click', (e) => {
    const card      = e.target.closest('.auto-card');
    const dettaglio = e.target.closest('a[href="#dettaglio"]');
    let id = null;
    if (dettaglio) {
      e.preventDefault();
      id = dettaglio.dataset.id;
    } else if (card) {
      if (e.target.closest('a, button')) return;
      id = card.dataset.id;
    }
    if (!id) return;
    apriDettaglio(id, modal);
  });

  const apriDettaglio = async (id, modal) => {
    openBodyLoading(modal);
    openModal(modal);

    /* Fallback statico: id "static-*" → dati presi dalla cache locale,
       nessuna chiamata al backend (funziona anche offline). */
    if (typeof id === 'string' && id.startsWith('static-')) {
      const veicolo = (window.STATIC_VEICOLI || []).find(v => v.id === id);
      if (veicolo) {
        renderDettaglio(veicolo, modal);
      } else {
        modal.querySelector('#dettaglioBody').innerHTML =
          `<p style="padding:60px;text-align:center;color:#6b7280;">Dettaglio non disponibile.</p>`;
      }
      return;
    }

    try {
      const res  = await fetch(`${API_BASE}/veicoli/${id}`);
      const data = await res.json();
      if (!data.ok) throw new Error('Veicolo non trovato');
      renderDettaglio(data.data, modal);
    } catch (err) {
      modal.querySelector('#dettaglioBody').innerHTML =
        `<p style="padding:60px;text-align:center;color:#6b7280;">Dettaglio non disponibile.</p>`;
    }
  };
}

function openBodyLoading(modal) {
  modal.querySelector('#dettaglioBody').innerHTML =
    `<div class="api-spinner" style="margin:80px auto;"></div>`;
}

function openModal(modal) {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function renderDettaglio(v, modal) {
  const foto     = safeJSON(v.foto);
  const optional = safeJSON(v.optional);
  const fotoSrc  = v.foto_copertina ? `${UPLOADS_URL}/${v.foto_copertina}` : null;
  const price    = v.prezzo ? `€ ${Number(v.prezzo).toLocaleString('it-IT')}` : 'Su richiesta';
  const promo    = v.prezzo_promo ? `€ ${Number(v.prezzo_promo).toLocaleString('it-IT')}` : null;

  const gallery = foto.length
    ? foto.map((f, idx) =>
        `<img src="${UPLOADS_URL}/${f}" class="${idx === 0 ? 'active' : ''}" data-idx="${idx}" alt="${v.marca} ${v.modello}">`
      ).join('')
    : (fotoSrc ? `<img src="${fotoSrc}" class="active" alt="${v.marca} ${v.modello}">` : `<div class="auto-img placeholder-img" style="height:100%;min-height:300px;"></div>`);

  const thumbs = foto.length
    ? foto.map((f, idx) =>
        `<button class="dettaglio-thumb ${idx === 0 ? 'active' : ''}" data-idx="${idx}"><img src="${UPLOADS_URL}/${f}" alt=""></button>`
      ).join('')
    : '';

  const riga = (label, value) => value
    ? `<div class="spec-row"><span class="spec-label">${label}</span><span class="spec-value">${value}</span></div>`
    : '';

  const specSx = [
    riga('Anno', v.anno),
    riga('Chilometri', v.chilometri ? `${Number(v.chilometri).toLocaleString('it-IT')} km` : null),
    riga('Carburante', formatCarburante(v.carburante)),
    riga('Cambio', formatCambio(v.cambio)),
    riga('Trazione', formatTrazione(v.trazione)),
    riga('Carrozzeria', formatCategoria(v.categoria)),
  ].join('');

  const specDx = [
    riga('Cilindrata', v.cilindrata ? `${v.cilindrata} cc` : null),
    riga('Potenza', v.potenza_cv ? `${v.potenza_cv} CV` : null),
    riga('Colore', v.colore),
    riga('Porte', v.porte),
    riga('Posti', v.posti),
    riga('Classe Euro', v.euro),
  ].join('');

  const infoNoleggio = v.tipo === 'noleggio'
    ? `<div class="dettaglio-noleggio">
        ${v.prezzo_giorno ? `<div><strong>€ ${v.prezzo_giorno}</strong><span>/ giorno</span></div>` : ''}
        ${v.prezzo_settimana ? `<div><strong>€ ${v.prezzo_settimana}</strong><span>/ settimana</span></div>` : ''}
        ${v.km_inclusi_giorno ? `<div><strong>${v.km_inclusi_giorno} km</strong><span>al giorno inclusi</span></div>` : ''}
      </div>`
    : '';

  const waMsg = `Buongiorno, sono interessato alla ${v.marca} ${v.modello}${v.versione ? ' ' + v.versione : ''} (${v.anno}). È ancora disponibile?`;

  modal.querySelector('#dettaglioBody').innerHTML = `
    <div class="dettaglio-top">
      <div class="dettaglio-gallery">
        ${gallery}
        ${thumbs ? `<div class="dettaglio-thumbs">${thumbs}</div>` : ''}
      </div>
      <div class="dettaglio-info">
        <div class="section-tag">${formatCategoria(v.categoria)}</div>
        <h2>${v.marca} ${v.modello}</h2>
        ${v.versione ? `<p class="dettaglio-versione">${v.versione}</p>` : ''}

        <div class="dettaglio-meta">
          ${v.anno ? `<span>${v.anno}</span>` : ''}
          ${v.chilometri ? `<span>${Number(v.chilometri).toLocaleString('it-IT')} km</span>` : ''}
          ${formatCarburante(v.carburante) ? `<span>${formatCarburante(v.carburante)}</span>` : ''}
        </div>

        ${v.tipo === 'vendita' ? `
        <div class="dettaglio-price">
          ${promo ? `<s>${promo}</s>` : ''}
          <strong>${price}</strong>
        </div>` : ''}

        ${infoNoleggio}

        <div class="dettaglio-azioni">
          <a href="${waLink(waMsg)}" target="_blank" class="btn btn-primary btn-lg">Chiedi su WhatsApp</a>
          <a href="#contatti" class="btn btn-outline btn-lg" data-close>Contattaci</a>
        </div>

        ${v.descrizione ? `<div class="dettaglio-desc"><h4>Descrizione</h4><p>${v.descrizione}</p></div>` : ''}

        ${optional.length ? `
        <div class="dettaglio-optional">
          <h4>Dotazioni e optional</h4>
          <div class="auto-features">${optional.map(o => `<span>${o}</span>`).join('')}</div>
        </div>` : ''}
      </div>
    </div>

    <div class="dettaglio-specs">
      <div class="spec-col">${specSx}</div>
      <div class="spec-col">${specDx}</div>
    </div>`;

  // Galleria / thumbs
  const imgs = modal.querySelectorAll('.dettaglio-gallery > img');
  const thumbsEl = modal.querySelectorAll('.dettaglio-thumb');
  if (imgs.length) {
    thumbsEl.forEach(t => t.addEventListener('click', () => {
      const idx = t.dataset.idx;
      imgs.forEach(img => img.classList.toggle('active', img.dataset.idx === idx || (imgs.length === 1)));
      thumbsEl.forEach(x => x.classList.toggle('active', x === t));
    }));
    imgs.forEach(img => img.classList.toggle('active', img.dataset.idx === '0'));
  }

  modal.querySelectorAll('[data-close]').forEach(el => {
    if (el.dataset.close === '') {
      el.addEventListener('click', () => {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }, { once: true });
    }
  });
}

/* =============================================
   FILTRI
   ============================================= */
function initFiltroDinamico(filtri, grid) {
  filtri.forEach(btn => addFiltro(btn, grid));
}
function initFiltriStatici(filtri) {
  filtri.forEach(btn => addFiltro(btn, document.getElementById('autoGrid')));
}
function addFiltro(btn, grid) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filtro').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    grid.querySelectorAll('.auto-card').forEach(card => {
      const show = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hidden', !show);
      if (show) card.style.animation = 'fadeInCard .35s ease forwards';
    });
  });
}

/* Veicoli demo usati quando il backend non è raggiungibile.
   Ogni scheda ha un id univoco "static-*" così apriDettaglio()
   può recuperarla dalla cache locale senza fetch (funziona anche offline). */
const STATIC_VEICOLI = [
  {
    id: 'static-tiguan', tipo: 'vendita', categoria: 'suv', imgClass: 'suv-img',
    marca: 'Volkswagen', modello: 'Tiguan', versione: '2.0 TDI Life',
    anno: 2021, chilometri: 48000, carburante: 'diesel', cambio: 'dsg', trazione: 'anteriore',
    cilindrata: 1968, potenza_cv: 150, colore: 'Grigio Platinum', porte: 5, posti: 5, euro: 'Euro 6D',
    prezzo: 28900, prezzo_promo: null,
    descrizione: 'Volkswagen Tiguan in ottime condizioni, tagliandata regolarmente presso rete ufficiale, unico proprietario, gomme quasi nuove.',
    optional: ['Automatico', 'Navigatore', 'Fari LED', 'Sensori parcheggio', 'Climatizzatore bizona'],
    foto: [], foto_copertina: null
  },
  {
    id: 'static-bmw3', tipo: 'vendita', categoria: 'berlina', imgClass: 'berlina-img',
    marca: 'BMW', modello: 'Serie 3', versione: '320d Business Advantage',
    anno: 2020, chilometri: 62000, carburante: 'benzina', cambio: 'automatico', trazione: 'posteriore',
    cilindrata: 1995, potenza_cv: 190, colore: 'Nero Sapphire', porte: 4, posti: 5, euro: 'Euro 6D',
    prezzo: 31500, prezzo_promo: null,
    descrizione: 'BMW Serie 3 con assetto sportivo, interni in pelle, sempre garantita e revisionata.',
    optional: ['Automatico', 'Tetto apribile', 'Pacchetto Sport', 'Cerchi in lega 18"', 'Head-up display'],
    foto: [], foto_copertina: null
  },
  {
    id: 'static-500x', tipo: 'vendita', categoria: 'utilitaria', imgClass: 'utilitaria-img',
    marca: 'Fiat', modello: '500X', versione: '1.0 Hybrid Cross',
    anno: 2022, chilometri: 22000, carburante: 'ibrido', cambio: 'manuale', trazione: 'anteriore',
    cilindrata: 999, potenza_cv: 110, colore: 'Bianco Gelato', porte: 5, posti: 5, euro: 'Euro 6D',
    prezzo: 17900, prezzo_promo: 16900,
    descrizione: 'Fiat 500X praticamente nuova, ancora in garanzia di fabbrica, consumi contenuti.',
    optional: ['Manuale', 'Apple CarPlay/Android Auto', 'Cruise control adattivo', 'Sensori posteriori'],
    foto: [], foto_copertina: null
  },
  {
    id: 'static-rav4', tipo: 'vendita', categoria: 'suv', imgClass: 'suv2-img',
    marca: 'Toyota', modello: 'RAV4', versione: '2.5 Hybrid AWD Style',
    anno: 2020, chilometri: 55000, carburante: 'ibrido', cambio: 'automatico', trazione: 'integrale',
    cilindrata: 2487, potenza_cv: 218, colore: 'Grigio Titanio', porte: 5, posti: 5, euro: 'Euro 6D',
    prezzo: 33200, prezzo_promo: null,
    descrizione: 'Toyota RAV4 Hybrid AWD, perfetta per famiglia, consumi ridotti e trazione integrale.',
    optional: ['Trazione integrale', 'Navigatore', 'Telecamera 360°', 'Sedili riscaldati'],
    foto: [], foto_copertina: null
  },
  {
    id: 'static-classeA', tipo: 'vendita', categoria: 'berlina', imgClass: 'berlina2-img',
    marca: 'Mercedes', modello: 'Classe A', versione: 'A200d Automatic Premium',
    anno: 2021, chilometri: 41000, carburante: 'diesel', cambio: 'automatico', trazione: 'anteriore',
    cilindrata: 1950, potenza_cv: 150, colore: 'Blu Cavansite', porte: 5, posti: 5, euro: 'Euro 6D',
    prezzo: 26700, prezzo_promo: null,
    descrizione: 'Mercedes Classe A con infotainment MBUX, full LED, interni Premium.',
    optional: ['Automatico', 'MBUX con comandi vocali', 'Full LED', 'Climatizzatore automatico'],
    foto: [], foto_copertina: null
  },
  {
    id: 'static-a4', tipo: 'vendita', categoria: 'station', imgClass: 'station-img',
    marca: 'Audi', modello: 'A4 Avant', versione: '2.0 TDI S-Tronic Business',
    anno: 2019, chilometri: 78000, carburante: 'diesel', cambio: 'dsg', trazione: 'anteriore',
    cilindrata: 1968, potenza_cv: 150, colore: 'Grigio Nardo', porte: 5, posti: 5, euro: 'Euro 6D',
    prezzo: 24500, prezzo_promo: null,
    descrizione: 'Audi A4 Avant S-Tronic, bagagliaio generoso, ideale per lunghi viaggi.',
    optional: ['Cambio S-Tronic', 'MMI Navi Plus', 'Tetto panoramico', 'Sensori parcheggio Plus'],
    foto: [], foto_copertina: null
  }
];
window.STATIC_VEICOLI = STATIC_VEICOLI;

function renderStaticCards(grid) {
  const badgeMap = {
    suv: 'SUV', berlina: 'Berlina', utilitaria: 'Utilitaria', station: 'Station'
  };
  grid.innerHTML = STATIC_VEICOLI.map(v => {
    const price = v.prezzo_promo
      ? `<s>€ ${v.prezzo.toLocaleString('it-IT')}</s> <strong>€ ${v.prezzo_promo.toLocaleString('it-IT')}</strong>`
      : `<strong>€ ${v.prezzo.toLocaleString('it-IT')}</strong>`;
    const feats = v.optional.slice(0, 3).map(o => `<span>${o}</span>`).join('');
    return `
    <div class="auto-card" data-category="${v.categoria}" data-id="${v.id}">
      <div class="auto-img-wrap"><div class="auto-img placeholder-img ${v.imgClass}"></div><div class="auto-badge">${badgeMap[v.categoria] || v.categoria}</div></div>
      <div class="auto-info">
        <h3>${v.marca} ${v.modello}</h3>
        <div class="auto-meta"><span>${v.anno}</span><span>${v.chilometri.toLocaleString('it-IT')} km</span><span>${formatCarburante(v.carburante)}</span></div>
        <div class="auto-features">${feats}</div>
        <div class="auto-footer">
          <div class="auto-price">${price}</div>
          <a href="#dettaglio" class="btn btn-sm btn-primary" data-id="${v.id}">Dettagli</a>
        </div>
      </div>
    </div>`;
  }).join('');
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

  document.querySelectorAll(
    '.auto-card, .noleggio-card, .recensione-card, .faq-item, .value-item, .info-item, .noleggio-perks .perk, .stat'
  ).forEach((el, i) => {
    el.classList.add('fade-up');
    el.dataset.delay = (i % 4) * 80;
    obs.observe(el);
  });
}

/* =============================================
   UTILITY
   ============================================= */
function safeJSON(v) {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v || '[]'); } catch { return []; }
}

function formatCategoria(cat) {
  const map = { berlina:'Berlina', suv:'SUV', utilitaria:'Utilitaria', station:'Station W.',
                monovolume:'Monovolume', cabrio:'Cabriolet', coupe:'Coupé', furgone:'Furgone', altro:'Altro' };
  return map[cat] || cat;
}
function formatCarburante(c) {
  const map = { benzina:'Benzina', diesel:'Diesel', ibrido:'Ibrido', elettrico:'Elettrico', gpl:'GPL', metano:'Metano' };
  return map[c] || c;
}
function formatCambio(c) {
  const map = { manuale:'Manuale', automatico:'Automatico', dsg:'DSG/Automatico', cvt:'CVT' };
  return map[c] || c;
}
function formatTrazione(t) {
  const map = { anteriore:'Anteriore', posteriore:'Posteriore', integrale:'Integrale', '4x4':'4x4' };
  return map[t] || t;
}
