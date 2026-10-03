/* Charles Loughrey Design — site behaviour. No framework; Lenis for smooth scroll. */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 1, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
  const onScroll = (fn) => (lenis ? lenis.on('scroll', fn) : addEventListener('scroll', fn, { passive: true }));

  /* ---------- header ---------- */
  const header = $('.site-header');
  const hero = $('.hero');
  let lastY = 0;
  const updateHeader = () => {
    const y = scrollY();
    const heroH = hero ? hero.offsetHeight - header.offsetHeight : 0;
    header.classList.toggle('is-over-dark', !!hero && y < heroH);
    header.classList.toggle('is-scrolled', hero ? y >= heroH : y > 20);
    const goingDown = y > lastY + 4, goingUp = y < lastY - 4;
    if (y > 400 && goingDown && !doc.classList.contains('menu-open')) header.classList.add('is-hidden');
    else if (goingUp || y < 400) header.classList.remove('is-hidden');
    lastY = y;
  };
  updateHeader();
  onScroll(updateHeader);
  addEventListener('resize', updateHeader);

  /* ---------- mobile menu ---------- */
  const menuBtn = $('.menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    const open = doc.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open);
    $('.menu').setAttribute('aria-hidden', !open);
    open ? lenis?.stop() : lenis?.start();
  });

  /* ---------- reveal on view ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal, .reveal-img').forEach((el) => io.observe(el));

  /* ---------- plates: pinned drawings with text in their open ground ---------- */
  const plates = $$('.plate');
  if (plates.length) {
    const placePlate = (pl) => {
      const pin = $('.plate-pin', pl), canvas = $('.plate-canvas', pl), text = $('.plate-text', pl);
      const vw = pin.clientWidth, vh = pin.clientHeight, ar = parseFloat(pl.dataset.ar);
      const [x, y, w, h] = pl.dataset.region.split(',').map((n) => parseFloat(n) / 100);
      // the drawing always covers the screen, zoomed in a little so the open ground reads larger;
      // then slide it so that ground sits as centrally as possible
      const zoom = vw >= 900 ? 1.32 : 1.1;
      const cw = Math.max(vw, vh * ar) * zoom, ch = cw / ar;
      const rx = x * cw, ry = y * ch, rw = w * cw, rh = h * ch;
      const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
      const ox = clamp(vw / 2 - (rx + rw / 2), vw - cw, 0);
      const oy = clamp(vh / 2 - (ry + rh / 2), vh - ch, 0);
      Object.assign(canvas.style, { left: ox + 'px', top: oy + 'px', width: cw + 'px', height: ch + 'px' });
      // the text fills the open ground; on narrow screens it may borrow a little extra width
      const tw = Math.min(vw - 40, 580, Math.max(rw * 0.9, Math.min(360, vw - 40)));
      text.style.width = tw + 'px';
      const left = clamp(ox + rx + (rw - tw) / 2, 20, vw - tw - 20);
      const th = text.offsetHeight;
      const headerH = header ? header.offsetHeight : 0;
      const top = clamp(oy + ry + (rh - th) / 2, headerH + 16, vh - th - 24);
      Object.assign(text.style, { left: left + 'px', top: top + 'px' });
    };
    const placeAll = () => plates.forEach(placePlate);
    placeAll();
    addEventListener('resize', placeAll);
    document.fonts?.ready.then(placeAll);
    const pio = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); pio.unobserve(e.target); }
    }), { threshold: 0.15 });
    plates.forEach((pl) => pio.observe(pl));
  }

  /* ---------- parallax (drawings) ---------- */
  const para = $$('[data-speed]');
  if (para.length && !reduced) {
    const tick = () => {
      const vh = innerHeight;
      para.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const offset = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.speed);
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    };
    tick();
    onScroll(tick);
    addEventListener('resize', tick);
  }

  /* ---------- Fibonacci hero: the logo, full screen ---------- */
  const fibEl = $('.fib');
  if (fibEl) {
    const PHI = (1 + Math.sqrt(5)) / 2;
    const SQUARES = 7;                       // golden squares; the leftover sliver is tile 8
    const N = SQUARES + 1;
    const COLORS = ['var(--green)', 'var(--oxblood)'];
    const photos = JSON.parse(fibEl.dataset.photos);
    const path = $('.fib-spiral path', hero);
    const svg = $('.fib-spiral', hero);
    const tiles = [];
    let geo = null, stage = 0;

    // A true golden rectangle (squares, so the arcs are circles) scaled to cover the hero.
    // Landscape screens get the logo as drawn; portrait screens get it turned a quarter.
    const layout = (W, H) => {
      const land = W >= H;
      let gw, gh;
      if (land) { if (H * PHI >= W) { gh = H; gw = H * PHI; } else { gw = W; gh = W / PHI; } }
      else { if (W * PHI >= H) { gw = W; gh = W * PHI; } else { gh = H; gw = H / PHI; } }
      const G = { x: (W - gw) / 2, y: (H - gh) / 2, w: gw, h: gh };
      const order = land ? ['left', 'top', 'right', 'bottom'] : ['top', 'right', 'bottom', 'left'];
      let r = { ...G };
      const sq = [], rem = [];
      for (let k = 0; k < SQUARES; k++) {
        rem.push({ ...r });
        const d = order[k % 4], s = Math.min(r.w, r.h);
        if (d === 'left') { sq.push({ x: r.x, y: r.y, w: s, h: s, d }); r = { x: r.x + s, y: r.y, w: r.w - s, h: r.h }; }
        if (d === 'right') { sq.push({ x: r.x + r.w - s, y: r.y, w: s, h: s, d }); r = { ...r, w: r.w - s }; }
        if (d === 'top') { sq.push({ x: r.x, y: r.y, w: s, h: s, d }); r = { x: r.x, y: r.y + s, w: r.w, h: r.h - s }; }
        if (d === 'bottom') { sq.push({ x: r.x, y: r.y + r.h - s, w: s, h: s, d }); r = { ...r, h: r.h - s }; }
      }
      sq.push({ ...r, d: null });            // leftover sliver
      rem.push({ ...r });
      return { W, H, G, sq, rem };
    };

    // quarter circle through each square, corner to corner, exactly like the mark
    const arc = ({ x, y, w, d }) => ({
      left: [[x, y + w], [x + w, y]], top: [[x, y], [x + w, y + w]],
      right: [[x + w, y], [x, y + w]], bottom: [[x + w, y + w], [x, y]],
    })[d];

    const setRect = (el, r, gap, G) => {
      const inL = r.x > G.x + 0.5 ? gap / 2 : 0, inT = r.y > G.y + 0.5 ? gap / 2 : 0;
      const inR = r.x + r.w < G.x + G.w - 0.5 ? gap / 2 : 0, inB = r.y + r.h < G.y + G.h - 0.5 ? gap / 2 : 0;
      el.style.left = r.x + inL + 'px'; el.style.top = r.y + inT + 'px';
      el.style.width = Math.max(0, r.w - inL - inR) + 'px'; el.style.height = Math.max(0, r.h - inT - inB) + 'px';
    };

    // stage 0: the whole screen is green. stage 1: green becomes its square, the red column appears.
    // stage 2: red becomes its square, the blue section (with its smaller squares) appears.
    let expanded = false;
    const render = () => {
      const gap = Math.max(2, Math.round(Math.min(geo.W, geo.H) * 0.0028));
      tiles.forEach((tile, k) => {
        if (expanded && k === 0) {
          Object.assign(tile.el.style, { left: '0px', top: '0px', width: geo.W + 'px', height: geo.H + 'px' });
          tile.w = geo.W; tile.h = geo.H;
          return;
        }
        let r;
        if (stage >= 2 || k < stage) r = geo.sq[k];
        else if (k === stage) r = geo.rem[k];
        else r = geo.sq[k];
        setRect(tile.el, r, gap, geo.G);
        tile.w = geo.sq[k].w; tile.h = geo.sq[k].h;
        tile.el.classList.toggle('is-in', stage >= 2 || k <= stage);
      });
    };

    const place = () => {
      geo = layout(hero.clientWidth, hero.clientHeight);
      svg.setAttribute('viewBox', `0 0 ${geo.W} ${geo.H}`);
      let d = '';
      geo.sq.slice(0, SQUARES).forEach((r, k) => {
        const [[x0, y0], [x1, y1]] = arc(r);
        if (!k) d += `M${x0.toFixed(2)} ${y0.toFixed(2)}`;
        d += `A${r.w.toFixed(2)} ${r.w.toFixed(2)} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
      });
      path.setAttribute('d', d);
      // re-measuring must never animate the dash, or a piece of line flashes before the draw
      const len = Math.ceil(path.getTotalLength()) + 2;
      const drawn = hero.classList.contains('is-drawn');
      const undrawn = hero.classList.contains('is-undrawn');
      path.style.transition = 'none';
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = undrawn ? -len : drawn ? 0 : len;
      void path.getBoundingClientRect();
      path.style.transition = '';
      render();
    };

    for (let k = 0; k < N; k++) {
      const el = document.createElement('div');
      el.className = 'fib-tile';
      el.style.setProperty('--c', COLORS[k] || 'var(--blue)');
      fibEl.appendChild(el);
      tiles.push({ el });
    }
    place();
    addEventListener('resize', place);
    // geometry is in place: only now allow tiles and the line to animate (no first-frame flash)
    requestAnimationFrame(() => hero.classList.add('fib-ready'));

    const pick = (tile, ph) => {
      const px = Math.max(tile.w, tile.h) * (devicePixelRatio || 1);
      return px <= 700 ? ph.t : px <= 1400 ? ph.m : ph.l;
    };
    // frames for the flicker: big tiles use the 1400px flash set, small tiles the thumbnails
    const frameSrc = (k, ph) => (Math.max(tiles[k].w, tiles[k].h) > 360 ? ph.f : ph.t);

    const settleSlugs = (fibEl.dataset.settle || '').split(' ');
    const bySlug = Object.fromEntries(photos.map((p) => [p.s, p]));
    const settle = tiles.map((_, k) => bySlug[settleSlugs[k]] || photos[k % photos.length]);
    const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
    const loadImg = (src) => new Promise((res) => {
      const im = new Image(); im.decoding = 'async';
      im.onload = im.onerror = () => res(im); im.src = src;
    });

    // each tile flickers through its own pool so frames are cached before they are needed
    const pools = tiles.map((_, k) => {
      const big = Math.max(tiles[k].w, tiles[k].h) > 360;
      const size = big ? 12 : 16;
      const start = (k * 7) % photos.length;
      return Array.from({ length: size }, (_, i) => photos[(start + i * 2) % photos.length]);
    });
    const framesReady = Promise.all(pools.flatMap((pool, k) => pool.map((p) => loadImg(frameSrc(k, p)))));
    settle.forEach((p, k) => loadImg(pick(tiles[k], p)));

    tiles.forEach((tile) => {
      tile.shuf = document.createElement('img'); tile.shuf.alt = '';
      tile.fin = document.createElement('img'); tile.fin.className = 'settle';
      tile.el.append(tile.shuf, tile.fin);
    });

    const settleTile = (k) => {
      const tile = tiles[k], p = settle[k];
      tile.fin.alt = p.a;
      tile.fin.src = pick(tile, p);
      // (no requestAnimationFrame here: it pauses in background tabs, which left the
      // final photo invisible; a forced reflow is enough to start the fade)
      const on = () => {
        void tile.fin.offsetWidth;
        tile.fin.classList.add('is-on');
        // once the final photo has faded in, retire the flicker frame beneath it
        setTimeout(() => { tile.shuf.style.visibility = 'hidden'; }, 1300);
      };
      // decode() resolves even when the file came straight from cache (a plain load
      // listener can miss that on mobile); the timeout is a last-resort safety net
      let done = false;
      const once = () => { if (!done) { done = true; on(); } };
      (tile.fin.decode ? tile.fin.decode() : Promise.reject()).then(once, () => {
        tile.fin.complete && tile.fin.naturalWidth ? once() : tile.fin.addEventListener('load', once, { once: true });
      });
      setTimeout(once, 3000);
    };

    // Which edge each tile's first photo slides in from: the first from the far side of its
    // square, every later one from the side facing the previous square, so the entrance
    // travels around the spiral (landscape: right, left, top, right, bottom, left, top ...).
    const OFF = { left: ['-100%', '0'], right: ['100%', '0'], top: ['0', '-100%'], bottom: ['0', '100%'] };
    const FAR = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
    const entryFrom = (k) => (k === 0 ? FAR[geo.sq[0].d] : geo.sq[k - 1].d);
    const SLIDE = 750;

    // one tile: its first photo slides in, then it flickers (frames ~55ms apart, easing out)
    // until it lands at `end` ms after the explosion began
    const explode = (k, delay, end) => new Promise((resolve) => {
      const tile = tiles[k], pool = pools[k];
      let last = -1, tNow = delay + SLIDE, gap = 55;
      const next = () => {
        let n; do { n = Math.floor(Math.random() * pool.length); } while (n === last && pool.length > 1);
        return (last = n);
      };
      const frame = () => {
        tile.shuf.classList.remove('slide');
        tile.shuf.src = frameSrc(k, pool[next()]);
        gap *= 1.16; tNow += gap;
        if (tNow + gap > end) { setTimeout(() => { settleTile(k); resolve(); }, Math.max(0, end - tNow)); return; }
        setTimeout(frame, gap);
      };
      setTimeout(() => {
        const [sx, sy] = OFF[entryFrom(k)];
        tile.shuf.style.setProperty('--sx', sx); tile.shuf.style.setProperty('--sy', sy);
        tile.shuf.src = frameSrc(k, pool[next()]);
        tile.shuf.classList.add('shuf', 'slide');
        setTimeout(frame, SLIDE);
      }, delay);
    });

    (async () => {
      if (reduced) {
        stage = 2; render();
        hero.classList.add('is-drawn', 'is-photos', 'is-titled');
        path.style.strokeDashoffset = 0;
        tiles.forEach((_, k) => settleTile(k));
        return;
      }
      // 1. green screen; the line begins in the green square as it forms
      await wait(700);
      stage = 1; render();
      hero.classList.add('is-drawn'); path.style.strokeDashoffset = 0;
      await wait(750);
      stage = 2; render();
      await Promise.all([wait(1500), framesReady]);
      // 2. every tile explodes into photographs at once, then slows and settles (big tile last)
      hero.classList.add('is-photos');
      await Promise.all(tiles.map((_, k) => explode(k, k * 170, 3200 + (N - 1 - k) * 150)));
      // 3. the title arrives once everything has landed
      await wait(450);
      hero.classList.add('is-titled');

      // 4. three seconds later the big square opens out to fill the hero...
      await wait(3000);
      expanded = true;
      hero.classList.add('is-expanded');
      render();
      // ...and once it has, the spiral undraws itself, from its start to its end
      await wait(900);
      hero.classList.add('is-undrawn');
      path.style.strokeDashoffset = -(parseFloat(path.style.strokeDasharray) || path.getTotalLength());
      await wait(2600);
      tiles.slice(1).forEach((tl) => { tl.el.style.visibility = 'hidden'; });

      // 5. then a slow montage of the best work, crossfading with a gentle zoom
      const reel = (fibEl.dataset.montage || '').split(' ').map((s) => bySlug[s]).filter(Boolean);
      if (!reel.length) return;
      const big = tiles[0];
      const srcFor = (p) => (Math.max(geo.W, geo.H) * (devicePixelRatio || 1) > 1600 ? p.l : p.m);
      let m = 0, paused = document.hidden;
      document.addEventListener('visibilitychange', () => { paused = document.hidden; });
      new IntersectionObserver(([e]) => { paused = !e.isIntersecting; }).observe(hero);
      loadImg(srcFor(reel[0]));
      while (true) {
        await wait(4200);
        while (paused) await wait(500);
        const p = reel[m % reel.length];
        const im = await loadImg(srcFor(p));
        im.alt = p.a; im.className = 'mont';
        big.el.appendChild(im);
        void im.offsetWidth;
        im.classList.add('is-on');
        loadImg(srcFor(reel[(m + 1) % reel.length]));
        const prev = [...big.el.querySelectorAll('img')].filter((x) => x !== im);
        setTimeout(() => prev.forEach((x) => x.remove()), 2000);
        m++;
      }
    })();
  }

  /* ---------- hero slideshow (previous design, kept for reference) ---------- */
  if (hero && $('.hero-slides')) {
    const slides = $$('.hero-slide', hero);
    const count = $('.hero-count b', hero);
    const bar = $('.hero-progress i', hero);
    const DURATION = 6500;
    let i = 0, elapsed = 0, last = 0, paused = false, loading = false;

    const load = (n) => {
      const s = slides[(n + slides.length) % slides.length];
      const img = $('img', s);
      if (!img.getAttribute('srcset')) img.srcset = s.dataset.srcset;
      return img;
    };
    const show = (n) => {
      const prev = slides[i];
      i = (n + slides.length) % slides.length;
      const next = slides[i];
      const img = load(i);
      load(i + 1);
      loading = true;
      const go = () => {
        loading = false;
        slides.forEach((s) => s.classList.remove('is-leaving'));
        if (prev !== next) { prev.classList.remove('is-active'); prev.classList.add('is-leaving'); }
        // restart ken burns
        const im = $('img', next); im.style.animation = 'none'; void im.offsetWidth; im.style.animation = '';
        next.classList.add('is-active');
        if (count) count.textContent = String(i + 1).padStart(2, '0');
        elapsed = 0;
      };
      img.complete && img.naturalWidth ? go() : img.addEventListener('load', go, { once: true });
    };
    const loop = (t) => {
      const dt = last ? Math.min(t - last, 100) : 0; last = t;
      if (!paused && !loading) {
        elapsed += dt;
        const p = Math.min(elapsed / DURATION, 1);
        if (bar) bar.style.transform = `scaleX(${p})`;
        if (p >= 1) show(i + 1);
      }
      requestAnimationFrame(loop);
    };
    show(0);
    if (!reduced) requestAnimationFrame(loop);
    $('[data-hero-prev]', hero)?.addEventListener('click', () => show(i - 1));
    $('[data-hero-next]', hero)?.addEventListener('click', () => show(i + 1));
    document.addEventListener('visibilitychange', () => { paused = document.hidden; });
    new IntersectionObserver(([e]) => { paused = !e.isIntersecting; }).observe(hero);
  }

  /* ---------- portfolio filters ---------- */
  const filters = $('.filters');
  if (filters) {
    filters.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', filters).forEach((x) => x.setAttribute('aria-pressed', x === b));
      const cat = b.dataset.filter;
      $$('.masonry .item').forEach((it) => it.classList.toggle('is-hidden', cat !== 'all' && it.dataset.cat !== cat));
      lenis?.resize();
      history.replaceState(null, '', cat === 'all' ? location.pathname : '#' + cat);
    });
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) $(`button[data-filter="${h}"]`, filters)?.click();
  }

  /* ---------- lightbox ---------- */
  const lb = $('.lightbox');
  if (lb) {
    const img = $('.lb-stage img', lb);
    const cap = $('.lb-cap', lb), idx = $('.lb-idx', lb);
    let group = [], k = 0;
    const visible = (g) => $$(`[data-lightbox="${g}"]`).filter((a) => !a.closest('.is-hidden'));
    const render = () => {
      const a = group[k];
      img.classList.remove('is-in');
      const src = a.dataset.full || a.getAttribute('href');
      const pre = new Image();
      pre.onload = () => { img.src = src; img.alt = a.dataset.alt || ''; img.classList.add('is-in'); };
      pre.src = src;
      cap.textContent = a.dataset.caption || '';
      idx.textContent = `${String(k + 1).padStart(2, '0')} / ${String(group.length).padStart(2, '0')}`;
    };
    const open = (a) => {
      group = visible(a.dataset.lightbox); k = group.indexOf(a);
      lb.classList.toggle('is-paper', a.dataset.lightbox === 'drawings');
      lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
      lenis?.stop(); render(); $('[data-lb-close]', lb).focus();
    };
    const close = () => { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); lenis?.start(); group[k]?.focus(); };
    const step = (d) => { k = (k + d + group.length) % group.length; render(); };
    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-lightbox]');
      if (a) { e.preventDefault(); open(a); }
    });
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', () => step(-1));
    $('[data-lb-next]', lb).addEventListener('click', () => step(1));
    $('.lb-stage', lb).addEventListener('click', (e) => { if (e.target !== img) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); x0 = null;
    });
  }

  /* ---------- contact form: compose an email (no server needed) ---------- */
  const form = $('form[data-mailto]');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const body = [
      `Name: ${f.get('name')}`, `Email: ${f.get('email')}`, `Phone: ${f.get('phone') || ''}`,
      `Project location: ${f.get('location') || ''}`, '', f.get('message'),
    ].join('\n');
    location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent('Request for Information')}&body=${encodeURIComponent(body)}`;
  });

  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
