/**
 * BroMotors Backend API
 * Express + SQLite — Gestione veicoli (vendita + noleggio)
 */

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const sqlite3  = require('sqlite3').verbose();
const multer   = require('multer');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Cartelle ─────────────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_PATH     = path.join(__dirname, 'bromotors.db');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve il pannello admin
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve il frontend dal progetto padre
app.use('/', express.static(path.join(__dirname, '..')));

// ─── Upload foto (Multer) ──────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// ─── Database ──────────────────────────────────────────────────────────────────
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) { console.error('Errore apertura DB:', err); process.exit(1); }
  console.log('Database SQLite connesso:', DB_PATH);
});

db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  // Tabella veicoli (vendita + noleggio)
  db.run(`
    CREATE TABLE IF NOT EXISTS veicoli (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo           TEXT    NOT NULL CHECK(tipo IN ('vendita','noleggio')),
      stato          TEXT    NOT NULL DEFAULT 'attivo' CHECK(stato IN ('attivo','venduto','ritirato','manutenzione')),

      -- Dati principali
      marca          TEXT    NOT NULL,
      modello        TEXT    NOT NULL,
      versione       TEXT,
      anno           INTEGER NOT NULL,
      chilometri     INTEGER,
      colore         TEXT,
      colore_interno TEXT,
      targa          TEXT,
      telaio         TEXT,

      -- Motore & trasmissione
      carburante     TEXT    NOT NULL DEFAULT 'benzina'
                             CHECK(carburante IN ('benzina','diesel','ibrido','elettrico','gpl','metano')),
      cilindrata     INTEGER,
      potenza_cv     INTEGER,
      potenza_kw     INTEGER,
      cambio         TEXT    DEFAULT 'manuale' CHECK(cambio IN ('manuale','automatico','dsg','cvt')),
      trazione       TEXT    DEFAULT 'anteriore' CHECK(trazione IN ('anteriore','posteriore','integrale','4x4')),
      emissioni_co2  INTEGER,
      euro           TEXT,

      -- Carrozzeria
      categoria      TEXT    NOT NULL DEFAULT 'berlina'
                             CHECK(categoria IN ('berlina','suv','utilitaria','station','monovolume','cabrio','coupe','furgone','altro')),
      porte          INTEGER DEFAULT 5,
      posti          INTEGER DEFAULT 5,

      -- Vendita
      prezzo         REAL,
      prezzo_promo   REAL,
      permuta        INTEGER DEFAULT 0,
      garanzia_mesi  INTEGER DEFAULT 12,
      finanziabile   INTEGER DEFAULT 1,

      -- Noleggio
      prezzo_giorno   REAL,
      prezzo_settimana REAL,
      prezzo_mese     REAL,
      deposito        REAL,
      km_inclusi_giorno INTEGER DEFAULT 300,
      eta_minima      INTEGER DEFAULT 21,
      patente_minima  TEXT    DEFAULT '1 anno',

      -- Dotazioni & optional (JSON array)
      optional       TEXT    DEFAULT '[]',
      descrizione    TEXT,

      -- Foto (JSON array di nomi file)
      foto           TEXT    DEFAULT '[]',
      foto_copertina TEXT,

      -- Meta
      in_evidenza    INTEGER DEFAULT 0,
      creato_il      TEXT    DEFAULT (datetime('now')),
      aggiornato_il  TEXT    DEFAULT (datetime('now'))
    )
  `);

  // Tabella immagini sito (hero, chi siamo, catalogo, noleggio, ecc.)
  db.run(`
    CREATE TABLE IF NOT EXISTS immagini_sito (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      chiave      TEXT    NOT NULL UNIQUE,
      label       TEXT    NOT NULL,
      filename    TEXT,
      aggiornato_il TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed sezioni immagini
  db.run(`INSERT OR IGNORE INTO immagini_sito (chiave, label, filename) VALUES
    ('hero_bg',      'Hero — Sfondo principale',       'hero-bg.jpg'),
    ('hero_car',     'Hero — Auto in primo piano',     'hero-car.jpg'),
    ('chi_siamo',    'Chi Siamo — Foto salone/team',   'chi-siamo.jpg'),
    ('catalogo_bg',  'Catalogo — Sfondo sezione',      'catalogo-bg.jpg'),
    ('noleggio_bg',  'Noleggio — Sfondo sezione',      'noleggio-bg.jpg'),
    ('contatti_bg',  'Contatti — Sfondo sezione',      'contatti-bg.jpg')
  `);

  // Seed dati demo se la tabella è vuota
  db.get('SELECT COUNT(*) as n FROM veicoli', (err, row) => {
    if (err || row.n > 0) return;
    console.log('Inserimento dati demo...');

    const stmt = db.prepare(`
      INSERT INTO veicoli
        (tipo, marca, modello, versione, anno, chilometri, colore, carburante, cilindrata,
         potenza_cv, cambio, trazione, categoria, porte, posti, prezzo, garanzia_mesi,
         finanziabile, permuta, optional, descrizione, in_evidenza,
         prezzo_giorno, prezzo_settimana, km_inclusi_giorno)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);

    const demo = [
      ['vendita','Volkswagen','Tiguan','2.0 TDI 150cv Life',2021,48000,'Bianco Puro','diesel',1968,
       150,'automatico','anteriore','suv',5,5,28900,12,1,1,
       '["Navigatore","LED","Cruise Control","Sensori parcheggio","Clima bizona"]',
       'Ottimo stato, unico proprietario, tagliandi certificati VW.',1, null,null,null],

      ['vendita','BMW','Serie 3','320d xDrive Luxury',2020,62000,'Grigio Mineral','diesel',1995,
       190,'automatico','integrale','berlina',4,5,31500,12,1,1,
       '["Tetto apribile","Sedili pelle","HUD","Parcheggio automatico","Harman Kardon"]',
       'Full optional, service BMW completo.',0, null,null,null],

      ['vendita','Fiat','500X','1.5 T4 Hybrid 130cv Cross',2022,22000,'Rosso Passione','ibrido',1498,
       130,'dsg','anteriore','utilitaria',5,5,17900,24,1,1,
       '["Apple CarPlay","Android Auto","Cruise Adattivo","Telecamera posteriore"]',
       'Praticamente nuova, garanzia estesa disponibile.',1, null,null,null],

      ['vendita','Audi','A4 Avant','2.0 TDI 150cv S-tronic',2019,78000,'Grigio Nardò','diesel',1968,
       150,'automatico','anteriore','station',5,5,24500,12,1,1,
       '["MMI Navigation","Tetto panoramico","Sedili riscaldati","Matrix LED"]',
       'Station wagon spaziosa, ideale per famiglie o lavoro.',0, null,null,null],

      ['noleggio','Fiat','Panda','1.0 Hybrid 70cv',2023,8000,'Bianco','ibrido',999,
       70,'manuale','anteriore','utilitaria',5,5,null,null,1,0,
       '["Clima","Bluetooth","USB","ABS","ESP"]',
       'Perfetta per la città. Consumi ridottissimi.',1, 35,199,300],

      ['noleggio','Volkswagen','Polo','1.0 TSI 95cv Life',2023,12000,'Grigio','benzina',999,
       95,'manuale','anteriore','utilitaria',5,5,null,null,1,0,
       '["Clima automatico","Apple CarPlay","Sensori parcheggio post."]',
       'Utilitaria comoda, ideale per brevi spostamenti.',0, 42,245,300],

      ['noleggio','Toyota','RAV4','2.5 Hybrid AWD',2022,35000,'Bianco Perla','ibrido',2487,
       218,'automatico','integrale','suv',5,5,null,null,1,0,
       '["Navi","Telecamera 360","JBL Audio","Sedili riscaldati","Keyless"]',
       'SUV ibrido silenzioso, spazioso e sicuro. Perfetto per vacanze.',1, 65,390,300],

      ['noleggio','Mercedes-Benz','Classe E','300 d AMG Line',2022,28000,'Nero Ossidiana','diesel',1993,
       265,'automatico','posteriore','berlina',4,5,null,null,1,0,
       '["MBUX","Tetto panoramico","Burmester Audio","Parcheggio automatico","Massaggi"]',
       'Berlina premium per viaggi di lavoro o occasioni speciali.',1, 110,660,500],
    ];

    demo.forEach(d => stmt.run(d));
    stmt.finalize();
    console.log(`${demo.length} veicoli demo inseriti.`);
  });
});

// ─── Helper ────────────────────────────────────────────────────────────────────
const dbAll  = (sql, params=[]) => new Promise((res,rej) => db.all(sql, params, (e,r)=> e? rej(e): res(r)));
const dbGet  = (sql, params=[]) => new Promise((res,rej) => db.get(sql, params, (e,r)=> e? rej(e): res(r)));
const dbRun  = (sql, params=[]) => new Promise((res,rej) => db.run(sql, params, function(e){ e? rej(e): res({lastID: this.lastID, changes: this.changes}); }));

const parseVeicolo = (v) => {
  if (!v) return v;
  try { v.optional = JSON.parse(v.optional || '[]'); } catch { v.optional = []; }
  try { v.foto     = JSON.parse(v.foto     || '[]'); } catch { v.foto = []; }
  return v;
};

// ─── API Routes ────────────────────────────────────────────────────────────────

// GET /api/veicoli — lista con filtri
app.get('/api/veicoli', async (req, res) => {
  try {
    const { tipo, categoria, carburante, cambio, stato, evidenza, search, limit = 100, offset = 0 } = req.query;
    let where = ['1=1'];
    let params = [];

    if (tipo)      { where.push('tipo = ?');      params.push(tipo); }
    if (categoria) { where.push('categoria = ?'); params.push(categoria); }
    if (carburante){ where.push('carburante = ?');params.push(carburante); }
    if (cambio)    { where.push('cambio = ?');    params.push(cambio); }
    if (stato)     { where.push('stato = ?');     params.push(stato); }
    else           { where.push("stato = 'attivo'"); }
    if (evidenza)  { where.push('in_evidenza = 1'); }
    if (search)    {
      where.push('(marca LIKE ? OR modello LIKE ? OR versione LIKE ? OR descrizione LIKE ?)');
      const s = `%${search}%`;
      params.push(s,s,s,s);
    }

    const whereStr   = where.join(' AND ');
    const countParams = [...params];
    const countSQL    = `SELECT COUNT(*) as n FROM veicoli WHERE ${whereStr}`;

    params.push(parseInt(limit), parseInt(offset));
    const sql = `SELECT * FROM veicoli WHERE ${whereStr} ORDER BY in_evidenza DESC, creato_il DESC LIMIT ? OFFSET ?`;

    const rows = await dbAll(sql, params);
    const total = await dbGet(countSQL, countParams);

    res.json({ ok: true, total: total?.n, data: rows.map(parseVeicolo) });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/veicoli/:id
app.get('/api/veicoli/:id', async (req, res) => {
  try {
    const v = await dbGet('SELECT * FROM veicoli WHERE id = ?', [req.params.id]);
    if (!v) return res.status(404).json({ ok: false, error: 'Veicolo non trovato' });
    res.json({ ok: true, data: parseVeicolo(v) });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/veicoli — crea nuovo veicolo
app.post('/api/veicoli', async (req, res) => {
  try {
    const b = req.body;
    const optional = Array.isArray(b.optional) ? JSON.stringify(b.optional) : (b.optional || '[]');

    const r = await dbRun(`
      INSERT INTO veicoli
        (tipo, stato, marca, modello, versione, anno, chilometri, colore, colore_interno,
         targa, telaio, carburante, cilindrata, potenza_cv, potenza_kw, cambio, trazione,
         emissioni_co2, euro, categoria, porte, posti, prezzo, prezzo_promo, permuta,
         garanzia_mesi, finanziabile, prezzo_giorno, prezzo_settimana, prezzo_mese,
         deposito, km_inclusi_giorno, eta_minima, patente_minima,
         optional, descrizione, in_evidenza)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      b.tipo||'vendita', b.stato||'attivo', b.marca, b.modello, b.versione||'', b.anno, b.chilometri||0,
      b.colore||'', b.colore_interno||'', b.targa||'', b.telaio||'',
      b.carburante||'benzina', b.cilindrata||null, b.potenza_cv||null, b.potenza_kw||null,
      b.cambio||'manuale', b.trazione||'anteriore', b.emissioni_co2||null, b.euro||null,
      b.categoria||'berlina', b.porte||5, b.posti||5,
      b.prezzo||null, b.prezzo_promo||null, b.permuta?1:0, b.garanzia_mesi||12, b.finanziabile?1:1,
      b.prezzo_giorno||null, b.prezzo_settimana||null, b.prezzo_mese||null,
      b.deposito||null, b.km_inclusi_giorno||300, b.eta_minima||21, b.patente_minima||'1 anno',
      optional, b.descrizione||'', b.in_evidenza?1:0
    ]);

    const v = await dbGet('SELECT * FROM veicoli WHERE id = ?', [r.lastID]);
    res.status(201).json({ ok: true, data: parseVeicolo(v) });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PUT /api/veicoli/:id — aggiorna veicolo
app.put('/api/veicoli/:id', async (req, res) => {
  try {
    const b = req.body;
    const existing = await dbGet('SELECT * FROM veicoli WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Veicolo non trovato' });

    const optional = Array.isArray(b.optional) ? JSON.stringify(b.optional)
                   : (b.optional !== undefined ? b.optional : existing.optional);

    await dbRun(`
      UPDATE veicoli SET
        tipo=?, stato=?, marca=?, modello=?, versione=?, anno=?, chilometri=?, colore=?,
        colore_interno=?, targa=?, telaio=?, carburante=?, cilindrata=?, potenza_cv=?,
        potenza_kw=?, cambio=?, trazione=?, emissioni_co2=?, euro=?, categoria=?, porte=?,
        posti=?, prezzo=?, prezzo_promo=?, permuta=?, garanzia_mesi=?, finanziabile=?,
        prezzo_giorno=?, prezzo_settimana=?, prezzo_mese=?, deposito=?, km_inclusi_giorno=?,
        eta_minima=?, patente_minima=?, optional=?, descrizione=?, in_evidenza=?,
        aggiornato_il=datetime('now')
      WHERE id=?
    `, [
      b.tipo??existing.tipo, b.stato??existing.stato, b.marca??existing.marca,
      b.modello??existing.modello, b.versione??existing.versione, b.anno??existing.anno,
      b.chilometri??existing.chilometri, b.colore??existing.colore,
      b.colore_interno??existing.colore_interno, b.targa??existing.targa, b.telaio??existing.telaio,
      b.carburante??existing.carburante, b.cilindrata??existing.cilindrata,
      b.potenza_cv??existing.potenza_cv, b.potenza_kw??existing.potenza_kw,
      b.cambio??existing.cambio, b.trazione??existing.trazione,
      b.emissioni_co2??existing.emissioni_co2, b.euro??existing.euro,
      b.categoria??existing.categoria, b.porte??existing.porte, b.posti??existing.posti,
      b.prezzo??existing.prezzo, b.prezzo_promo??existing.prezzo_promo,
      b.permuta!==undefined?(b.permuta?1:0):existing.permuta,
      b.garanzia_mesi??existing.garanzia_mesi,
      b.finanziabile!==undefined?(b.finanziabile?1:0):existing.finanziabile,
      b.prezzo_giorno??existing.prezzo_giorno, b.prezzo_settimana??existing.prezzo_settimana,
      b.prezzo_mese??existing.prezzo_mese, b.deposito??existing.deposito,
      b.km_inclusi_giorno??existing.km_inclusi_giorno, b.eta_minima??existing.eta_minima,
      b.patente_minima??existing.patente_minima, optional,
      b.descrizione??existing.descrizione,
      b.in_evidenza!==undefined?(b.in_evidenza?1:0):existing.in_evidenza,
      req.params.id
    ]);

    const v = await dbGet('SELECT * FROM veicoli WHERE id = ?', [req.params.id]);
    res.json({ ok: true, data: parseVeicolo(v) });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/veicoli/:id
app.delete('/api/veicoli/:id', async (req, res) => {
  try {
    const v = await dbGet('SELECT * FROM veicoli WHERE id = ?', [req.params.id]);
    if (!v) return res.status(404).json({ ok: false, error: 'Veicolo non trovato' });

    // Elimina foto fisiche
    const foto = JSON.parse(v.foto || '[]');
    foto.forEach(f => {
      const fp = path.join(UPLOADS_DIR, f);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    });

    await dbRun('DELETE FROM veicoli WHERE id = ?', [req.params.id]);
    res.json({ ok: true, message: 'Veicolo eliminato' });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/veicoli/:id/foto — upload foto
app.post('/api/veicoli/:id/foto', upload.array('foto', 20), async (req, res) => {
  try {
    const v = await dbGet('SELECT * FROM veicoli WHERE id = ?', [req.params.id]);
    if (!v) return res.status(404).json({ ok: false, error: 'Veicolo non trovato' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ ok: false, error: 'Nessuna foto caricata' });

    const existingFoto = JSON.parse(v.foto || '[]');
    const newFoto      = req.files.map(f => f.filename);
    const allFoto      = [...existingFoto, ...newFoto];
    const copertina    = v.foto_copertina || newFoto[0];

    await dbRun(
      "UPDATE veicoli SET foto=?, foto_copertina=?, aggiornato_il=datetime('now') WHERE id=?",
      [JSON.stringify(allFoto), copertina, req.params.id]
    );

    res.json({
      ok: true,
      foto: allFoto,
      foto_copertina: copertina,
      uploaded: newFoto
    });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/veicoli/:id/foto/:filename — elimina singola foto
app.delete('/api/veicoli/:id/foto/:filename', async (req, res) => {
  try {
    const v = await dbGet('SELECT * FROM veicoli WHERE id = ?', [req.params.id]);
    if (!v) return res.status(404).json({ ok: false, error: 'Veicolo non trovato' });

    const foto = JSON.parse(v.foto || '[]').filter(f => f !== req.params.filename);
    const copertina = v.foto_copertina === req.params.filename ? (foto[0] || null) : v.foto_copertina;

    // Elimina file fisico
    const fp = path.join(UPLOADS_DIR, req.params.filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);

    await dbRun(
      "UPDATE veicoli SET foto=?, foto_copertina=?, aggiornato_il=datetime('now') WHERE id=?",
      [JSON.stringify(foto), copertina, req.params.id]
    );

    res.json({ ok: true, foto, foto_copertina: copertina });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// PATCH /api/veicoli/:id/copertina/:filename — imposta foto copertina
app.patch('/api/veicoli/:id/copertina/:filename', async (req, res) => {
  try {
    await dbRun(
      "UPDATE veicoli SET foto_copertina=?, aggiornato_il=datetime('now') WHERE id=?",
      [req.params.filename, req.params.id]
    );
    res.json({ ok: true, foto_copertina: req.params.filename });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/stats — statistiche dashboard
app.get('/api/stats', async (req, res) => {
  try {
    const totali      = await dbGet("SELECT COUNT(*) as n FROM veicoli");
    const vendita     = await dbGet("SELECT COUNT(*) as n FROM veicoli WHERE tipo='vendita' AND stato='attivo'");
    const noleggio    = await dbGet("SELECT COUNT(*) as n FROM veicoli WHERE tipo='noleggio' AND stato='attivo'");
    const venduti     = await dbGet("SELECT COUNT(*) as n FROM veicoli WHERE stato='venduto'");
    const manutenzione= await dbGet("SELECT COUNT(*) as n FROM veicoli WHERE stato='manutenzione'");
    res.json({ ok: true, data: {
      totali: totali.n, vendita: vendita.n, noleggio: noleggio.n,
      venduti: venduti.n, manutenzione: manutenzione.n
    }});
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── API Immagini Sito ─────────────────────────────────────────────────────────

// Serve anche la cartella images del frontend
app.use('/images', express.static(path.join(__dirname, '..', 'images')));

const uploadSite = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'images')),
    filename: (req, file, cb) => {
      const key = req.params.chiave || 'site';
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${key}${ext}`);
    }
  }),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20 MB per sfondi
});

// GET /api/immagini — lista tutte le immagini sito
app.get('/api/immagini', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM immagini_sito ORDER BY id');
    res.json({ ok: true, data: rows });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/immagini/:chiave — carica/sostituisce immagine sito
app.post('/api/immagini/:chiave', uploadSite.single('immagine'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'Nessun file caricato' });
    const filename = req.file.filename;
    await dbRun(
      "UPDATE immagini_sito SET filename=?, aggiornato_il=datetime('now') WHERE chiave=?",
      [filename, req.params.chiave]
    );
    res.json({ ok: true, chiave: req.params.chiave, filename, url: `/images/${filename}` });
  } catch(e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ BroMotors API avviata su http://localhost:${PORT}`);
  console.log(`   Frontend:  http://localhost:${PORT}/`);
  console.log(`   Admin:     http://localhost:${PORT}/admin/`);
  console.log(`   API docs:  http://localhost:${PORT}/api/veicoli\n`);
});
