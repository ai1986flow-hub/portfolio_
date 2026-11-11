/* =========================================================================
   Suju S — Portfolio
   script.js  (vanilla ES6+, no framework)

   Edit SITE_CONFIG below to personalise the site. Everything marked
   REPLACE is a placeholder you should fill in.
   ========================================================================= */

const SITE_CONFIG = {
  name: "Suju S",
  // Roles cycled by the hero typing animation. REPLACE with your own titles.
  roles: [
    "Creative Developer",
    "3D Experience Builder",
    "Unreal Engine Tool Maker",
    "Interactive Web Designer",
  ],
  email: "suju198@gmail.com",
  location: "Remote · Worldwide", // REPLACE: e.g. "Thiruvananthapuram, India"
  links: {
    github: "",   // REPLACE: "https://github.com/your-username"
    linkedin: "", // REPLACE: "https://www.linkedin.com/in/your-profile"
    youtube: "https://www.youtube.com/@suju198",
    resume: "",   // REPLACE: "assets/Suju-S-CV.pdf" or a hosted link
  },
  // Optional real form backend (e.g. a Formspree endpoint "https://formspree.io/f/xxxx").
  // Leave empty and the form opens the visitor's email app instead.
  FORM_ENDPOINT: "",
  // Netlify Forms delivers contact messages to your email. "auto" turns it on when the site
  // runs on *.netlify.app; set to true if you connect your own domain on Netlify.
  netlifyForms: "auto",
};

/* ---------- Environment checks ---------- */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const root = document.documentElement;
const body = document.body;

const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
let reduceMotion = reduceMotionQuery.matches;
const finePointer = finePointerQuery.matches;

root.classList.add("js");
if (finePointer && !reduceMotion) body.classList.add("has-pointer");

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* Shared pointer state used by several effects */
const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
window.addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.active = true;
}, { passive: true });

/* ---------- Toast ---------- */
const toastEl = $("#toast");
let toastTimer;
function showToast(message, ms = 3200) {
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), ms);
}

/* =========================================================================
   1. Apply config to the page
   ========================================================================= */
function applyConfig() {
  $$("[data-config]").forEach((el) => {
    const key = el.dataset.config;
    if (key === "bio") return; // bio lives in the HTML so it stays readable without JS
    if (SITE_CONFIG[key]) el.textContent = SITE_CONFIG[key];
  });
  $$("[data-config-email]").forEach((el) => {
    el.href = `mailto:${SITE_CONFIG.email}`;
    if (el.classList.contains("contact__value")) el.textContent = SITE_CONFIG.email;
  });
  $("#year").textContent = new Date().getFullYear();
  $("#typedSr").textContent = SITE_CONFIG.roles.join(", ");

  // Social / CV links: real URL if set, otherwise an honest "not added yet" notice.
  const labels = { github: "GitHub", linkedin: "LinkedIn", youtube: "YouTube", resume: "CV" };
  $$("[data-link]").forEach((el) => {
    const key = el.dataset.link;
    const url = SITE_CONFIG.links[key];
    if (url) {
      el.href = url;
      if (key === "resume") el.setAttribute("download", "");
      else { el.target = "_blank"; el.rel = "noopener"; }
    } else {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        showToast(`${labels[key]} link not added yet — set SITE_CONFIG.links.${key} in script.js`);
      });
    }
  });
}

/* =========================================================================
   2. Loading screen
   ========================================================================= */
function initLoader() {
  const loader = $("#loader");
  const bar = $("#loaderBar");
  const count = $("#loaderCount");
  const duration = reduceMotion ? 200 : 1300;
  const start = performance.now();
  let loaded = document.readyState === "complete";
  window.addEventListener("load", () => { loaded = true; });

  function tick(now) {
    // Ease to 90% on a timer, then finish once the window has loaded.
    const t = clamp((now - start) / duration, 0, 1);
    const target = loaded ? 100 : 90;
    const pct = Math.round(target * (1 - Math.pow(1 - t, 3)));
    bar.style.width = pct + "%";
    count.textContent = pct;
    if (t < 1 || !loaded) return requestAnimationFrame(tick);
    bar.style.width = "100%";
    count.textContent = "100";
    setTimeout(() => {
      loader.classList.add("is-done");
      body.classList.remove("is-loading");
      body.classList.add("is-ready");
      startTyping();
    }, reduceMotion ? 0 : 250);
  }
  requestAnimationFrame(tick);
  // Safety net: never trap the visitor behind the loader.
  setTimeout(() => { loaded = true; }, 4000);
}

/* =========================================================================
   3. Background particle network (canvas 2D)
   ========================================================================= */
function initParticles() {
  const canvas = $("#bgCanvas");
  const ctx = canvas.getContext("2d");
  let w, h, dpr, particles = [], running = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    const area = window.innerWidth * window.innerHeight;
    const count = clamp(Math.round(area / (finePointer ? 16000 : 26000)), 24, 90);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25 * dpr,
      vy: (Math.random() - 0.5) * 0.25 * dpr,
      r: (Math.random() * 1.4 + 0.4) * dpr,
      hue: Math.random() < 0.55 ? 212 : 42, // blue city light / warm gold
    }));
    if (reduceMotion) draw(false);
  }

  function draw(move = true) {
    ctx.clearRect(0, 0, w, h);
    const linkDist = 130 * dpr;
    const mx = pointer.x * dpr, my = pointer.y * dpr;

    for (const p of particles) {
      if (move) {
        // Gentle repel from the pointer
        if (finePointer && pointer.active) {
          const dx = p.x - mx, dy = p.y - my;
          const dist = Math.hypot(dx, dy);
          if (dist < 140 * dpr && dist > 0) {
            p.x += (dx / dist) * 0.9 * dpr;
            p.y += (dy / dist) * 0.9 * dpr;
          }
        }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 85%, 72%, 0.6)`;
      ctx.fill();
    }

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < linkDist) {
          ctx.strokeStyle = `rgba(120, 150, 255, ${0.08 * (1 - d / linkDist)})`;
          ctx.lineWidth = dpr * 0.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
  }

  function loop() {
    if (running && !reduceMotion) draw(true);
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener("resize", debounce(resize, 200));
  document.addEventListener("visibilitychange", () => { running = !document.hidden; });
  if (reduceMotion) draw(false); else loop();
}

/* =========================================================================
   4. Custom cursor + mouse-following spotlight (fine pointers only)
   ========================================================================= */
function initCursor() {
  if (!finePointer || reduceMotion) return;
  const cursor = $("#cursor");
  const dot = $(".cursor__dot", cursor);
  const ring = $(".cursor__ring", cursor);
  const spot = $("#spotlight");
  let rx = pointer.x, ry = pointer.y, sx = pointer.x, sy = pointer.y;

  function frame() {
    rx = lerp(rx, pointer.x, 0.18);
    ry = lerp(ry, pointer.y, 0.18);
    sx = lerp(sx, pointer.x, 0.08);
    sy = lerp(sy, pointer.y, 0.08);
    dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    spot.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
    requestAnimationFrame(frame);
  }
  frame();

  const hoverables = "a, button, .filter, .skill-card, .service, input, textarea, .ring";
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest(hoverables)) cursor.classList.add("is-hover");
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest(hoverables)) cursor.classList.remove("is-hover");
  });
  document.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  document.addEventListener("pointerup", () => cursor.classList.remove("is-down"));
  document.addEventListener("mouseleave", () => cursor.classList.add("is-hidden"));
  document.addEventListener("mouseenter", () => cursor.classList.remove("is-hidden"));
}

/* =========================================================================
   5. Magnetic buttons, 3D tilt, card glow, parallax
   ========================================================================= */
function initMagnetic() {
  if (!finePointer || reduceMotion) return;
  $$(".magnetic").forEach((el) => {
    const strength = el.classList.contains("social") ? 0.4 : 0.28;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.setProperty("--mx", `${x * strength}px`);
      el.style.setProperty("--my", `${y * strength}px`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--mx", "0px");
      el.style.setProperty("--my", "0px");
    });
  });
}

function initTilt() {
  if (!finePointer || reduceMotion) return;
  $$(".tilt").forEach((el) => {
    const max = parseFloat(el.dataset.tiltMax) || 7;
    el.addEventListener("pointerenter", () => el.classList.add("is-tilting"));
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      if (el.classList.contains("project")) {
        el.style.setProperty("--rx", `${(-py * max).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${(px * max).toFixed(2)}deg`);
      } else {
        el.style.transform = `perspective(900px) rotateX(${-py * max}deg) rotateY(${px * max}deg)`;
      }
    });
    el.addEventListener("pointerleave", () => {
      el.classList.remove("is-tilting");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      if (!el.classList.contains("project")) el.style.transform = "";
    });
  });
}

function initCardGlow() {
  if (!finePointer) return;
  $$(".skill-card, .service").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--x", `${e.clientX - r.left}px`);
      card.style.setProperty("--y", `${e.clientY - r.top}px`);
    });
  });
}

function initParallax() {
  if (reduceMotion) return;
  const shapes = $$(".hero__shapes .shape");
  const eclipse = $("#eclipse");
  const heroBg = $("#heroBg");
  const hero = $("#home");
  let ticking = false;

  function update() {
    ticking = false;
    const scrollY = window.scrollY;
    if (scrollY > hero.offsetHeight) return;
    const cx = finePointer ? (pointer.x / window.innerWidth - 0.5) : 0;
    const cy = finePointer ? (pointer.y / window.innerHeight - 0.5) : 0;
    shapes.forEach((s) => {
      const d = parseFloat(s.dataset.depth) || 1;
      s.style.transform = `translate3d(${cx * 40 * d}px, ${cy * 40 * d - scrollY * 0.15 * d}px, 0)`;
    });
    eclipse.style.translate = `${cx * -30}px ${scrollY * 0.35}px`;
    heroBg.style.transform = `translate3d(0, ${scrollY * 0.3}px, 0)`;
  }
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", request, { passive: true });
  if (finePointer) window.addEventListener("pointermove", request, { passive: true });
}

/* =========================================================================
   6. Typing animation
   ========================================================================= */
let typingStarted = false;
function startTyping() {
  if (typingStarted) return;
  typingStarted = true;
  const el = $("#typed");
  const roles = SITE_CONFIG.roles;

  if (reduceMotion) { el.textContent = roles[0]; return; }

  let roleIndex = 0, charIndex = 0, deleting = false;
  function step() {
    const word = roles[roleIndex];
    charIndex += deleting ? -1 : 1;
    el.textContent = word.slice(0, charIndex);
    let delay = deleting ? 40 : 85;
    if (!deleting && charIndex === word.length) { delay = 1800; deleting = true; }
    else if (deleting && charIndex === 0) { deleting = false; roleIndex = (roleIndex + 1) % roles.length; delay = 350; }
    setTimeout(step, delay);
  }
  step();
}

/* =========================================================================
   7. Navigation: scrolled state, mobile menu, active link, back-to-top
   ========================================================================= */
function initNav() {
  const nav = $("#nav");
  const toggle = $("#navToggle");
  const menu = $("#navMenu");
  const toTop = $("#toTop");
  const links = $$(".nav__link");

  // Scrolled navbar + back-to-top visibility
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 30);
    const show = y > window.innerHeight * 0.8;
    if (show) toTop.hidden = false;
    toTop.classList.toggle("is-visible", show);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    $(".nav__logo").focus({ preventScroll: true });
  });

  // Mobile menu
  const setMenu = (open) => {
    menu.classList.toggle("is-open", open);
    body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) $(".nav__link", menu).focus();
  };
  toggle.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
  });
  // Keep keyboard focus inside the open mobile menu
  menu.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !menu.classList.contains("is-open")) return;
    const items = [...$$("a", menu), toggle];
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  window.addEventListener("resize", () => { if (window.innerWidth > 900) setMenu(false); });

  // Smooth scrolling for all in-page links (honours reduced motion, moves focus for a11y)
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.dataset.link || a.dataset.action) return;
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, "", id);
  });

  // Active section highlighting
  const sectionIds = links.map((l) => l.getAttribute("href").slice(1));
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
  const setActive = (id) => links.forEach((l) => {
    const on = l.getAttribute("href") === `#${id}`;
    l.classList.toggle("is-active", on);
    if (on) l.setAttribute("aria-current", "true"); else l.removeAttribute("aria-current");
  });
  const spy = () => {
    const line = window.innerHeight * 0.35;
    let current = sections[0].id;
    for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s.id;
    // At the very bottom, light up Contact even if it is shorter than the viewport.
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) current = "contact";
    setActive(current);
  };
  window.addEventListener("scroll", throttle(spy, 100), { passive: true });
  spy();
}

/* =========================================================================
   8. Scroll reveals, counters, skill bars, rings, timeline progress
   ========================================================================= */
function initReveals() {
  const items = $$(".reveal, .timeline__item");
  if (!("IntersectionObserver" in window)) { items.forEach((i) => i.classList.add("is-visible")); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      // Stagger siblings that reveal at the same time
      const siblings = $$(".reveal", el.parentElement);
      const idx = Math.max(0, siblings.indexOf(el));
      el.style.transitionDelay = reduceMotion ? "0s" : `${Math.min(idx, 6) * 70}ms`;
      el.classList.add("is-visible");
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  items.forEach((i) => io.observe(i));
}

function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  if (reduceMotion) { el.textContent = target + suffix; return; }
  const duration = 1600;
  const start = performance.now();
  const tick = (now) => {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initMeters() {
  const once = (els, fn, threshold = 0.4) => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { fn(e.target); io.unobserve(e.target); } });
    }, { threshold });
    els.forEach((el) => io.observe(el));
  };

  once($$("[data-count]"), animateCount, 0.6);

  once($$(".bar"), (bar) => { $("span", bar).style.width = `${bar.dataset.level}%`; });

  const circumference = 2 * Math.PI * 52;
  once($$(".ring"), (ring) => {
    const level = parseFloat(ring.dataset.level);
    const fill = $(".ring__fill", ring);
    fill.style.strokeDasharray = circumference;
    fill.style.strokeDashoffset = circumference * (1 - level / 100);
    const val = $(".ring__val", ring);
    val.dataset.count = level; val.dataset.suffix = "%";
    animateCount(val);
  });

  // Timeline rail fills as you scroll through it
  const timeline = $("#timeline");
  if (!timeline) return;
  const update = () => {
    const r = timeline.getBoundingClientRect();
    const progress = clamp((window.innerHeight * 0.6 - r.top) / r.height, 0, 1);
    timeline.style.setProperty("--progress", progress.toFixed(3));
  };
  window.addEventListener("scroll", throttle(update, 30), { passive: true });
  update();
}

/* =========================================================================
   9. Project filtering + project buttons
   ========================================================================= */
function initFilters() {
  const buttons = $$(".filter");
  const cards = $$(".project");
  const status = $("#filterStatus");
  const empty = $("#projectsEmpty");
  let animating;

  function apply(filter) {
    clearTimeout(animating);
    const matches = (c) => filter === "all" || c.dataset.category.split(" ").includes(filter);
    const show = cards.filter(matches);
    const hide = cards.filter((c) => !matches(c));

    // The wide feature card only spans 2 columns in the full view.

    if (reduceMotion) {
      hide.forEach((c) => c.classList.add("is-hidden"));
      show.forEach((c) => c.classList.remove("is-hidden"));
    } else {
      hide.forEach((c) => c.classList.add("is-leaving"));
      animating = setTimeout(() => {
        hide.forEach((c) => { c.classList.add("is-hidden"); c.classList.remove("is-leaving"); });
        show.forEach((c) => {
          const wasHidden = c.classList.contains("is-hidden");
          c.classList.remove("is-hidden", "is-leaving");
          if (wasHidden) {
            c.classList.add("is-entering");
            requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove("is-entering")));
          }
        });
      }, 280);
    }

    empty.hidden = show.length > 0;
    const label = buttons.find((b) => b.dataset.filter === filter).textContent;
    status.textContent = `Showing ${show.length} project${show.length === 1 ? "" : "s"}: ${label}`;
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", String(on));
      });
      apply(btn.dataset.filter);
    });
  });

  // Live Demo / Source Code: projects open inside the page in the viewer.
  $$(".project [data-action]").forEach((btn) => {
    const card = btn.closest(".project");
    const kind = btn.dataset.action; // "demo" | "source"
    const url = card.dataset[kind];
    const title = $(".project__title", card).textContent.trim();
    if (url) {
      btn.href = url;
      btn.dataset.view = kind === "demo" ? title : `${title} · Source`;
      btn.setAttribute("aria-label", `${btn.textContent} — ${title} (opens inside this page)`);
    } else if (kind === "source") {
      btn.remove(); // no public source yet
    } else {
      btn.textContent = "Coming soon";
      btn.classList.add("is-soon");
      btn.removeAttribute("href");
      btn.setAttribute("aria-disabled", "true");
    }
  });
}

/* =========================================================================
   10. Contact: copy email + validation + honest delivery
   ========================================================================= */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers/iframes that block the async clipboard API
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

function useNetlifyForms() {
  const v = SITE_CONFIG.netlifyForms;
  return v === true || (v === "auto" && /\.netlify\.app$/.test(location.hostname));
}

function initContact() {
  $("#copyEmail").addEventListener("click", async () => {
    const ok = await copyText(SITE_CONFIG.email);
    showToast(ok ? `Copied ${SITE_CONFIG.email}` : `Couldn't copy — the address is ${SITE_CONFIG.email}`);
  });

  const form = $("#contactForm");
  const submitBtn = $("#submitBtn");
  const label = $(".btn__label", submitBtn);
  const result = $("#formResult");
  const message = $("#message");
  const counter = $("#messageCount");
  $("#formNote").textContent = (useNetlifyForms() || SITE_CONFIG.FORM_ENDPOINT)
    ? "Messages go straight to my inbox."
    : "Valid messages open in your email app, pre-filled and addressed to me.";

  const rules = {
    name: (v) => v.length >= 2 || "Please enter your name (at least 2 characters).",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || "Please enter a valid email address.",
    subject: (v) => v.length >= 3 || "Please add a short subject (at least 3 characters).",
    message: (v) => v.length >= 20 || `Please write a little more (${Math.max(0, 20 - v.length)} more characters).`,
  };

  function validateField(input) {
    const value = input.value.trim();
    const outcome = rules[input.name](value);
    const field = input.closest(".field");
    const error = $(`#${input.name}Error`);
    const ok = outcome === true;
    field.classList.toggle("is-invalid", !ok);
    field.classList.toggle("is-valid", ok);
    input.setAttribute("aria-invalid", String(!ok));
    error.textContent = ok ? "" : outcome;
    return ok;
  }

  const inputs = $$("input:not([type=hidden]):not([name=bot-field]), textarea", form);
  inputs.forEach((input) => {
    input.addEventListener("blur", () => { if (input.value.trim()) validateField(input); });
    input.addEventListener("input", () => {
      if (input.closest(".field").classList.contains("is-invalid")) validateField(input);
    });
  });
  message.addEventListener("input", () => { counter.textContent = `${message.value.length} / 2000`; });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const results = inputs.map(validateField);
    if (results.includes(false)) {
      inputs[results.indexOf(false)].focus();
      showToast("Please fix the highlighted fields.");
      return;
    }

    const data = Object.fromEntries(inputs.map((i) => [i.name, i.value.trim()]));
    submitBtn.disabled = true;
    submitBtn.classList.add("is-loading");
    label.textContent = "· · ·";

    // Path A — Netlify Forms: Netlify stores the message and emails it to you.
    if (useNetlifyForms()) {
      try {
        const body = new URLSearchParams({ "form-name": "contact", "bot-field": form.elements["bot-field"].value, ...data });
        const res = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
        if (!res.ok) throw new Error(res.status);
        finish(`<strong>Message sent.</strong> Thanks, ${escapeHtml(data.name)} — I'll reply to ${escapeHtml(data.email)} soon.`);
        $("#formNote").textContent = "Messages go straight to my inbox.";
        form.reset(); counter.textContent = "0 / 2000";
        $$(".field", form).forEach((f) => f.classList.remove("is-valid"));
        return;
      } catch { /* fall through to the email-app option below */ }
    }

    // Path B — a custom backend is configured: actually send it.
    if (SITE_CONFIG.FORM_ENDPOINT) {
      try {
        const res = await fetch(SITE_CONFIG.FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(res.status);
        finish(`<strong>Message sent.</strong> Thanks, ${escapeHtml(data.name)} — I'll reply to ${escapeHtml(data.email)} soon.`);
        form.reset(); counter.textContent = "0 / 2000";
        $$(".field", form).forEach((f) => f.classList.remove("is-valid"));
      } catch {
        finish("The message could not be sent right now. Please email me directly instead.", true);
      }
      return;
    }

    // Path C — no backend: hand the message to the visitor's own email app.
    const bodyText = `${data.message}\n\n— ${data.name} (${data.email})`;
    const mailto = `mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(bodyText)}`;
    finish(
      `<strong>Your message is ready — it hasn't been sent yet.</strong><br>
       Open it in your email app to send it to ${escapeHtml(SITE_CONFIG.email)}, or copy it and paste it into any mail service.<br>
       <a class="btn btn--small btn--primary" href="${mailto}">Open in email app</a>
       <button type="button" class="btn btn--small btn--ghost" id="copyMessage">Copy message</button>`
    );
    $("#copyMessage").addEventListener("click", async () => {
      const ok = await copyText(`To: ${SITE_CONFIG.email}\nSubject: ${data.subject}\n\n${bodyText}`);
      showToast(ok ? "Message copied to clipboard" : "Couldn't copy — please select the text manually");
    });
  });

  function finish(html, isError = false) {
    toastEl.classList.remove("is-visible");
    submitBtn.disabled = false;
    submitBtn.classList.remove("is-loading");
    submitBtn.classList.toggle("is-done", !isError);
    label.textContent = isError ? "RETRY" : "READY";
    setTimeout(() => { submitBtn.classList.remove("is-done"); label.textContent = "SEND"; }, 3000);
    result.innerHTML = html;
    result.hidden = false;
    result.style.borderColor = isError ? "rgba(255,92,122,.5)" : "";
  }
}

/* =========================================================================
   11. Reference-image features: orbit ring, constellation, map pins
   ========================================================================= */

/* Shared: spotlight the project cards whose titles/tags match */
let matchTimer;
function highlightProjects(test, message) {
  const allBtn = $('.filter[data-filter="all"]');
  if (!allBtn.classList.contains("is-active")) allBtn.click();
  const cards = $$(".project");
  const hits = cards.filter(test);
  $("#projects").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  clearTimeout(matchTimer);
  setTimeout(() => {
    cards.forEach((c) => {
      c.classList.toggle("is-match", hits.includes(c));
      c.classList.toggle("is-dim", !hits.includes(c));
    });
    showToast(message, 3800);
    matchTimer = setTimeout(() => cards.forEach((c) => c.classList.remove("is-match", "is-dim")), 3600);
  }, reduceMotion ? 0 : 650);
}
const cardTitle = (c) => $(".project__title", c).textContent.trim();
const cardTags = (c) => $$(".tags li", c).map((li) => li.textContent.trim());

/* Orbiting tool tiles (hero, image 3 look). Tags must match the project card tags. */
const TOOLS = [
  { mono: "JS", name: "JavaScript", tags: ["JavaScript", "HTML/CSS/JS"], ring: 0 },
  { mono: "3<small>JS</small>", name: "Three.js", tags: ["Three.js"], ring: 0 },
  { mono: "UE5", name: "Unreal Engine 5", tags: ["UE5"], ring: 0 },
  { mono: "GL", name: "WebGL", tags: ["WebGL"], ring: 1 },
  { mono: "3ds", name: "3ds Max · MAXScript", tags: ["3ds Max", "MAXScript"], ring: 1 },
  { mono: "XR", name: "WebXR (VR/AR)", tags: ["WebXR"], ring: 1 },
  { mono: "BP", name: "Unreal Blueprints", tags: ["Blueprints", "Editor Utility"], ring: 1 },
  { mono: "CAD", name: "AutoCAD · AutoLISP", tags: ["AutoCAD", "AutoLISP"], ring: 2 },
  { mono: "Ai", name: "Adobe Illustrator", tags: ["Illustrator"], ring: 2 },
  { mono: "H5", name: "HTML · CSS · JS", tags: ["HTML/CSS/JS"], ring: 2 },
];

function initOrbit() {
  const wrap = $("#orbit");
  const list = $("#orbitTiles");
  const tip = $("#orbitTip");
  list.innerHTML = TOOLS.map((t, i) =>
    `<li><button type="button" class="orbit-tile" data-i="${i}" aria-label="${t.name} — show projects"><span>${t.mono}</span></button></li>`).join("");
  const tiles = $$(".orbit-tile", list);

  const RADII = [108 / 280, 188 / 280, 262 / 280]; // match the SVG rings
  const SPEED = [0.16, -0.1, 0.06];                 // radians per second, alternating direction
  const counts = [0, 0, 0];
  TOOLS.forEach((t) => counts[t.ring]++);
  const seen = [0, 0, 0];
  const base = TOOLS.map((t) => {
    const k = seen[t.ring]++;
    return (k / counts[t.ring]) * Math.PI * 2 + t.ring * 0.6;
  });

  let paused = false, angle = 0, last = performance.now(), visible = true;
  let tiltX = 0, tiltY = 0;

  function place(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!paused && !reduceMotion) angle += dt;
    const half = wrap.clientWidth / 2;
    if (finePointer && !reduceMotion) {
      const r = wrap.getBoundingClientRect();
      tiltX = lerp(tiltX, ((pointer.x - (r.left + half)) / window.innerWidth) * 18, 0.06);
      tiltY = lerp(tiltY, ((pointer.y - (r.top + half)) / window.innerHeight) * 18, 0.06);
    }
    tiles.forEach((tile, i) => {
      const t = TOOLS[i];
      const a = base[i] + angle * SPEED[t.ring];
      const x = Math.cos(a) * RADII[t.ring] * half + tiltX * (t.ring + 1) * 0.5;
      const y = Math.sin(a) * RADII[t.ring] * half + tiltY * (t.ring + 1) * 0.5;
      tile.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  }
  (function loop(now) {
    if (visible && !document.hidden) place(now); else last = now;
    requestAnimationFrame(loop);
  })(performance.now());
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wrap);
  window.addEventListener("resize", debounce(() => place(performance.now()), 100));

  const show = (tile) => {
    tip.textContent = TOOLS[Number(tile.dataset.i)].name + " · click to see projects";
    tip.classList.add("is-visible");
    paused = true;
  };
  const hide = () => { tip.classList.remove("is-visible"); paused = false; };
  tiles.forEach((tile) => {
    tile.addEventListener("pointerenter", () => show(tile));
    tile.addEventListener("pointerleave", hide);
    tile.addEventListener("focus", () => show(tile));
    tile.addEventListener("blur", hide);
    tile.addEventListener("click", () => {
      const tool = TOOLS[Number(tile.dataset.i)];
      highlightProjects(
        (c) => cardTags(c).some((tag) => tool.tags.includes(tag)),
        `${tool.name}: highlighted ${$$(".project").filter((c) => cardTags(c).some((tag) => tool.tags.includes(tag))).length} project(s)`
      );
    });
  });
}

/* Constellation network behind the project grid (image 1 look) */
function initConstellation() {
  const svg = $("#constellation");
  const NS = "http://www.w3.org/2000/svg";
  function build() {
    const w = svg.clientWidth, h = svg.clientHeight;
    if (!w || !h) return;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = "";
    // Seeded random so the pattern is stable between rebuilds
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const count = clamp(Math.round((w * h) / 26000), 18, 60);
    const nodes = Array.from({ length: count }, () => {
      // Bias nodes toward the edges and gaps so they read as a network around the cards
      const edge = rand() < 0.55;
      const x = edge ? (rand() < 0.5 ? rand() * 60 : w - rand() * 60) : rand() * w;
      return { x, y: rand() * h, purple: rand() < 0.4 };
    });
    const frag = document.createDocumentFragment();
    nodes.forEach((n, i) => {
      const near = nodes
        .map((m, j) => ({ j, d: Math.hypot(m.x - n.x, m.y - n.y) }))
        .filter((o) => o.j > i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      near.forEach(({ j, d }) => {
        if (d > 420) return;
        const l = document.createElementNS(NS, "line");
        l.setAttribute("x1", n.x); l.setAttribute("y1", n.y);
        l.setAttribute("x2", nodes[j].x); l.setAttribute("y2", nodes[j].y);
        l.setAttribute("stroke", n.purple ? "rgba(192,86,255,.35)" : "rgba(56,214,255,.32)");
        frag.appendChild(l);
      });
    });
    nodes.forEach((n, i) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", n.x); c.setAttribute("cy", n.y);
      c.setAttribute("r", i % 5 === 0 ? 4.5 : 2.6);
      c.setAttribute("fill", n.purple ? "#c056ff" : "#38d6ff");
      c.setAttribute("class", "node");
      c.style.animationDelay = `${(i % 7) * 0.45}s`;
      c.style.filter = `drop-shadow(0 0 6px ${n.purple ? "#c056ff" : "#38d6ff"})`;
      frag.appendChild(c);
    });
    svg.appendChild(frag);
  }
  build();
  window.addEventListener("resize", debounce(build, 250));
  // The grid height changes when filtering
  $$(".filter").forEach((b) => b.addEventListener("click", () => setTimeout(build, 350)));
}

/* World-map pins in the contact HUD (image 2 look) */
function initMapPins() {
  $$(".pin").forEach((pin) => {
    pin.addEventListener("click", () => {
      if (!finePointer && !pin.classList.contains("is-open")) {
        $$(".pin").forEach((p) => p.classList.toggle("is-open", p === pin));
        return;
      }
      pin.classList.remove("is-open");
      const titles = pin.dataset.match.split("|");
      highlightProjects((c) => titles.includes(cardTitle(c)), `${pin.dataset.label} — highlighted in Projects`);
    });
  });
}

/* =========================================================================
   12. "Under the hood" feature checklist (mirrors portfolio-feature-checklist.xlsx)
   Each card scrolls to where the feature lives and highlights it.
   ========================================================================= */
const FEATURES = [
  { name: "Custom animated cursor", note: "Shows with a mouse, hidden on touch screens", target: "#home", hint: "Move your mouse — the ring grows over links and buttons." },
  { name: "Mouse-following spotlight", note: "A soft neon glow trails the pointer", target: "#home", hint: "Move your mouse to see the glow follow it." },
  { name: "Smooth scrolling navigation", note: "Every in-page link glides to its section", target: "#projects" },
  { name: "Animated loading screen", note: "Counts 0 → 100%, then fades", action: "replayLoader" },
  { name: "Scroll reveal animations", note: "Content rises in as it enters the screen", target: "#projects" },
  { name: "Typing text animation", note: "Cycles through 4 job titles", target: ".hero__role" },
  { name: "Project filters", note: "All / Web / Dev / UI/UX / Creative", target: ".filters" },
  { name: "3D card tilt", note: "Project cards lean toward the pointer", target: "#projectsGrid", hint: "Hover a project card and move across it." },
  { name: "Animated progress meter", note: "Fills as it scrolls into view", target: ".features__meter" },
  { name: "Counter animations", note: "The feature score counts up", target: ".features__score", action: "recount" },
  { name: "Mobile hamburger menu", note: "Opens, closes on link tap or Esc", target: "#navToggle", hint: "Shown on screens under 900px wide — narrow the window to try it." },
  { name: "Active nav highlighting", note: "The menu tracks the section you're in", target: ".nav__list" },
  { name: "Back-to-top button", note: "Appears after the hero, returns to the top", target: "#toTop" },
  { name: "Interactive background", note: "Particles drift away from the mouse", target: "#home", hint: "Move your mouse through the particle field." },
  { name: "Smooth section transitions", note: "Glowing dividers and staggered reveals", target: "#features" },
  { name: "Magnetic buttons", note: "Buttons pull toward the cursor", target: ".hero__ctas", hint: "Hover the buttons slowly." },
  { name: "3D parallax hero", note: "Clouds, peaks and sky move at different depths", target: "#home", hint: "Move your mouse (or drag) over the hero to look around." },
  { name: "Responsive navigation", note: "No sideways scrolling on phone, tablet or desktop", target: "#nav" },
  { name: "Contact form validation", note: "Catches empty fields and bad emails", target: "#contactForm", hint: "Press Send with empty fields to see it." },
  { name: "Keyboard accessibility", note: "Skip link first; every control works with Tab and Enter", target: "#nav", hint: "Press Tab from the top of the page." },
];

function initFeatures() {
  const grid = $("#featuresGrid");
  if (!grid) return; // section removed
  grid.innerHTML = FEATURES.map((f, i) => `
    <li>
      <button type="button" class="feature-item" data-index="${i}">
        <span class="feature-item__top">
          <span class="feature-item__num">${String(i + 1).padStart(2, "0")}</span>
          <span class="feature-item__status">Verified</span>
        </span>
        <span class="feature-item__name">${escapeHtml(f.name)}</span>
        <span class="feature-item__note">${escapeHtml(f.note)}</span>
        <span class="feature-item__go" aria-hidden="true">${f.action === "replayLoader" ? "Replay ↺" : "Try it →"}</span>
      </button>
    </li>`).join("");

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".feature-item");
    if (!btn) return;
    const f = FEATURES[Number(btn.dataset.index)];
    if (f.action === "replayLoader") return replayLoader();

    const el = $(f.target);
    if (!el) return;
    // Fixed elements (nav, back-to-top) don't need scrolling — just highlight them.
    const fixed = ["fixed", "sticky"].includes(getComputedStyle(el.closest("#nav, #toTop") || el).position);
    if (!fixed) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: el.tagName === "SECTION" ? "start" : "center" });
    if (f.target === "#toTop") { el.hidden = false; el.classList.add("is-visible"); }

    setTimeout(() => {
      el.classList.remove("is-highlight");
      void el.offsetWidth; // restart the animation
      el.classList.add("is-highlight");
      if (f.action === "recount") $$("[data-count]", el).forEach(animateCount);
      if (f.hint) showToast(f.hint, 4200);
    }, fixed || reduceMotion ? 0 : 600);
  });
  document.addEventListener("animationend", (e) => {
    if (e.animationName === "highlightPulse") e.target.classList.remove("is-highlight");
  });

  if (finePointer) {
    grid.addEventListener("pointermove", (e) => {
      const card = e.target.closest(".feature-item");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--x", `${e.clientX - r.left}px`);
      card.style.setProperty("--y", `${e.clientY - r.top}px`);
    });
  }

  // Fill the summary meter when it scrolls into view
  const meter = $("#featuresMeter");
  new IntersectionObserver(([entry], obs) => {
    if (!entry.isIntersecting) return;
    meter.style.width = "100%";
    obs.disconnect();
  }, { threshold: 0.5 }).observe(meter);
}

/* Replays the loading screen on demand (feature #4) */
function replayLoader() {
  const loader = $("#loader");
  const bar = $("#loaderBar");
  const count = $("#loaderCount");
  const duration = reduceMotion ? 300 : 1200;
  loader.classList.remove("is-done");
  const start = performance.now();
  (function tick(now) {
    const t = clamp((now - start) / duration, 0, 1);
    const pct = Math.round(100 * (1 - Math.pow(1 - t, 3)));
    bar.style.width = pct + "%";
    count.textContent = pct;
    if (t < 1) return requestAnimationFrame(tick);
    setTimeout(() => loader.classList.add("is-done"), 250);
  })(start);
}

/* =========================================================================
   13. Project viewer: any link with data-view opens inside this page
   ========================================================================= */
function initViewer() {
  const viewer = $("#viewer");
  const frame = $("#viewerFrame");
  const title = $("#viewerTitle");
  const loading = $("#viewerLoading");
  let opener = null;

  const blocked = $("#viewerBlocked"), blockedLink = $("#viewerBlockedLink");
  let externalFallback = null, blockTimer;
  // If the host page forbids embedding (e.g. the claude.ai preview), the browser reports
  // a CSP violation for frame-src: show a "Watch on YouTube" panel instead of a blank frame.
  document.addEventListener("securitypolicyviolation", (e) => {
    if (viewer.hidden || !externalFallback) return;
    if (/frame-src|child-src|default-src/.test(e.violatedDirective || e.effectiveDirective || "")) showBlocked();
  });
  function showBlocked() {
    clearTimeout(blockTimer);
    blockedLink.href = externalFallback;
    blocked.hidden = false;
    loading.classList.add("is-done");
  }
  function open(url, name, from, fallback) {
    opener = from || document.activeElement;
    externalFallback = fallback || null;
    blocked.hidden = true;
    title.textContent = name;
    frame.title = name;
    loading.classList.remove("is-done");
    frame.src = url;
    viewer.hidden = false;
    body.classList.add("viewer-open");
    $("#viewerExit").focus();
    clearTimeout(blockTimer);
    if (externalFallback) blockTimer = setTimeout(() => { if (!loading.classList.contains("is-done")) showBlocked(); }, 6000);
  }
  function close() {
    if (viewer.hidden) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    frame.src = "about:blank"; // stops video, audio and 3D rendering
    clearTimeout(blockTimer); blocked.hidden = true; externalFallback = null;
    viewer.hidden = true;
    body.classList.remove("viewer-open");
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  frame.addEventListener("load", () => {
    if (frame.src && !frame.src.endsWith("about:blank")) loading.classList.add("is-done");
  });

  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-view]");
    if (!link || !link.getAttribute("href")) return;
    e.preventDefault();
    const embed = link.dataset.embed;
    open(embed || link.getAttribute("href"), link.dataset.view, link, embed ? link.getAttribute("href") : null);
  });

  $("#viewerExit").addEventListener("click", close);
  $("#viewerReload").addEventListener("click", () => {
    loading.classList.remove("is-done");
    const src = frame.src; frame.src = "about:blank"; setTimeout(() => { frame.src = src; }, 50);
  });
  $("#viewerFull").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await viewer.requestFullscreen();
    } catch { showToast("Full screen isn't available here"); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !viewer.hidden) close();
    // Keep Tab focus on the viewer toolbar + frame while open
    if (e.key === "Tab" && !viewer.hidden) {
      const items = [...$$(".viewer__btn", viewer), frame];
      const i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
}

/* =========================================================================
   14. Hero cinemagraph: only the clouds drift (WebGL flow-map)
   The static image stays underneath as the fallback and for reduced motion.
   A mask image marks which pixels may move (white = clouds).
   ========================================================================= */
function initHeroClouds() {
  const wrap = $("#heroBg");
  const img = $("img", wrap);
  if (!wrap || !img || reduceMotion) return;
  const canvas = document.createElement("canvas");
  canvas.className = "hero__gl";
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false });
  if (!gl) return;

  const vs = `attribute vec2 p; varying vec2 v; void main(){ v = p*0.5+0.5; v.y = 1.0 - v.y; gl_Position = vec4(p,0.,1.); }`;
  const fs = `precision highp float;
    varying vec2 v; uniform sampler2D uImg, uMask; uniform vec4 uCrop; uniform float uT, uZoom; uniform vec2 uLook;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
    void main(){
      // camera: zoom toward the peaks, then 2.5D parallax from the depth map (G channel)
      vec2 c = uCrop.xy + uCrop.zw*.5;
      vec2 uv = c + (v - .5) * uCrop.zw / uZoom;
      float d = texture2D(uMask, uv).g;
      uv += uLook * vec2(.030, .018) * (d - .25);
      float m = texture2D(uMask, uv).r;
      // faster flow, with a per-pixel phase offset so the cross-fade never pulses
      vec2 flow = vec2(-1.0, 0.0) + vec2(fbm(uv*vec2(3.,6.)+uT*.05)-.5, (fbm(uv*vec2(4.,8.)-uT*.04)-.5)*.6)*1.3;
      float ph = fbm(uv*vec2(2.,5.)) * 1.7;
      float speed = 0.16, strength = 0.016 * (0.6 + d);  // nearer clouds travel further
      float p0 = fract(uT*speed + ph), p1 = fract(uT*speed + ph + .5);
      vec2 o0 = flow*p0*strength*m, o1 = flow*p1*strength*m;
      o0 *= texture2D(uMask, uv - o0).r; o1 *= texture2D(uMask, uv - o1).r;
      vec3 col = mix(texture2D(uImg, uv - o0).rgb, texture2D(uImg, uv - o1).rgb, abs(.5 - p0) * 2.);
      // two layers of fast mist at different depths
      float mist1 = smoothstep(.45, .9, fbm(uv*vec2(5.,14.) + vec2(uT*.09, uT*.01)));
      float mist2 = smoothstep(.5, .95, fbm(uv*vec2(9.,22.) + vec2(uT*.16, -uT*.02) + 7.));
      col += vec3(.55,.62,.85) * (mist1*.07 + mist2*.05*d) * m;
      // sunrise glow follows where you look
      vec2 sun = vec2(.78, .565);
      col += vec3(1.,.55,.25) * .10 * smoothstep(.35, 0., distance(uv*vec2(3.,1.), sun*vec2(3.,1.))) * (.6 + .4*uLook.x);
      gl_FragColor = vec4(col, 1.);
    }`;
  const sh = (t, src) => { const o = gl.createShader(t); gl.shaderSource(o, src); gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
  } catch (e) { return; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);

  const tex = (image, unit) => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach((k) => gl.texParameteri(gl.TEXTURE_2D, k, gl.CLAMP_TO_EDGE));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  };
  const load = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });

  Promise.all([load(img.currentSrc || img.src), load("assets/images/hero-summit-flow.png")]).then(([photo, mask]) => {
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (photo.naturalWidth > maxTex) return; // keep the static image
    tex(photo, 0); tex(mask, 1);
    gl.uniform1i(U("uImg"), 0); gl.uniform1i(U("uMask"), 1);
    const aspect = photo.naturalWidth / photo.naturalHeight;
    wrap.appendChild(canvas);

    let crop = [0, 0, 1, 1];
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = wrap.clientWidth, h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      // mirror CSS object-fit: cover + object-position of the <img>
      const pos = getComputedStyle(img).objectPosition.split(" ").map((v) => parseFloat(v) / 100);
      const box = w / h;
      const cw = box > aspect ? 1 : box / aspect, ch = box > aspect ? aspect / box : 1;
      crop = [(1 - cw) * (pos[0] || 0.5), (1 - ch) * (pos[1] ?? 0.5), cw, ch];
      }
    resize(); window.addEventListener("resize", debounce(resize, 120));

    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(wrap);

    // --- interaction: look around with the mouse, drag on touch, push in on scroll ---
    const hero = $("#home");
    const target = { x: 0, y: 0 }, look = { x: 0, y: 0 };
    let zoom = 1, dragStart = null, autoT = 0, idle = 0;
    if (finePointer) {
      window.addEventListener("pointermove", (e) => {
        if (window.scrollY > hero.offsetHeight) return;
        target.x = (e.clientX / window.innerWidth) * 2 - 1;
        target.y = (e.clientY / window.innerHeight) * 2 - 1;
        idle = 0;
      }, { passive: true });
    } else {
      hero.addEventListener("touchstart", (e) => { const t = e.touches[0]; dragStart = { x: t.clientX, y: t.clientY, lx: target.x, ly: target.y }; }, { passive: true });
      hero.addEventListener("touchmove", (e) => {
        if (!dragStart) return; const t = e.touches[0];
        target.x = clamp(dragStart.lx - (t.clientX - dragStart.x) / (window.innerWidth * .5), -1, 1);
        target.y = clamp(dragStart.ly - (t.clientY - dragStart.y) / (window.innerHeight * 1.5), -1, 1);
        idle = 0;
      }, { passive: true });
      hero.addEventListener("touchend", () => { dragStart = null; }, { passive: true });
    }
    // pan range: shift the crop across the wide panorama
    const panRange = () => Math.min(crop[0], 1 - crop[0] - crop[2]);

    const t0 = performance.now();
    let shown = false, last = t0;
    (function frame(now) {
      const dt = Math.min((now - last) / 1000, .05); last = now;
      if (visible && !document.hidden) {
        idle += dt;
        // when nobody interacts for 4 s, drift the camera slowly on its own
        if (idle > 4) { autoT += dt; target.x = Math.sin(autoT * .25) * .6; target.y = Math.sin(autoT * .17) * .25; }
        look.x += (target.x - look.x) * Math.min(1, dt * 4);
        look.y += (target.y - look.y) * Math.min(1, dt * 4);
        const prog = clamp(window.scrollY / (hero.offsetHeight || 1), 0, 1);
        zoom += ((1 + prog * .35) - zoom) * Math.min(1, dt * 6);
        const pan = panRange() * .8 * look.x;
        gl.uniform4fv(U("uCrop"), [crop[0] + pan, crop[1], crop[2], crop[3]]);
        gl.uniform2fv(U("uLook"), [look.x, look.y]);
        gl.uniform1f(U("uZoom"), zoom);
        gl.uniform1f(U("uT"), (now - t0) / 1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!shown) { shown = true; wrap.classList.add("is-gl"); }
      }
      requestAnimationFrame(frame);
    })(t0);
  }).catch(() => {});
}

/* =========================================================================
   15. Button FX: 3D tilt + press depth, and synthesized UI sounds
   Sounds are generated live with the Web Audio API (no audio files) and
   panned left/right by where the button sits on screen. A toggle in the
   nav mutes them; browsers allow sound only after the first click or tap.
   ========================================================================= */
const FX_TARGETS = ".btn, .filter, .social, .nav__link, .nav__logo, .feature-item, .copy-btn, .viewer__btn, .to-top, .pin, .nav__toggle, .sound-toggle, .btn--submit, .footer__links a";

const Sound = (() => {
  // Every sound is synthesized once with an OfflineAudioContext, turned into a WAV clip
  // and played through ordinary <audio> elements. That is louder and more reliable than
  // live Web Audio inside sandboxed frames and on iPhones (silent switch).
  let muted = false, unlocked = false, ready = false;
  try { muted = localStorage.getItem("ss-sound") === "off"; } catch {}
  const pools = {}, POOL = 4, idx = {};
  let ambient = null;

  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;

  function toWav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, rate = buf.sampleRate;
    // normalize to a healthy peak so clips are clearly audible
    let peak = 0.0001;
    for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i])); }
    const gain = 0.8 / peak;
    const bytes = 44 + len * ch * 2, ab = new ArrayBuffer(bytes), v = new DataView(ab);
    const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, bytes - 8, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, rate, true); v.setUint32(28, rate * ch * 2, true);
    v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, len * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const x = clamp(data[c][i] * gain, -1, 1); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2; }
    return URL.createObjectURL(new Blob([ab], { type: "audio/wav" }));
  }

  function render(seconds, build, rate = 44100, channels = 1) {
    const ctx = new OAC(channels, Math.ceil(seconds * rate), rate);
    build(ctx);
    return ctx.startRendering ? new Promise((ok) => { const r = ctx.startRendering(); if (r && r.then) r.then(ok); else ctx.oncomplete = (e) => ok(e.renderedBuffer); }) : null;
  }
  const tone = (ctx, type, f0, f1, t, dur, vol) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  const noise = (ctx, t, dur, fromHz, toHz, vol, type = "bandpass") => {
    const len = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = 1.1;
    f.frequency.setValueAtTime(fromHz, t); f.frequency.exponentialRampToValueAtTime(toHz, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t + dur);
  };

  const RECIPES = {
    hover:  [0.14, (c) => { tone(c, "sine", 2400, 1800, 0, 0.11, 0.5); tone(c, "triangle", 1200, null, 0, 0.08, 0.25); }],
    click:  [0.7,  (c) => { tone(c, "sine", 160, 70, 0, 0.1, 0.9); tone(c, "sine", 880, null, 0, 0.5, 0.5); tone(c, "sine", 1320, null, 0.05, 0.6, 0.38); tone(c, "triangle", 2640, null, 0.05, 0.2, 0.1); }],
    open:   [1.1,  (c) => { noise(c, 0, 0.5, 300, 3200, 0.9); tone(c, "sine", 660, null, 0.32, 0.7, 0.5); tone(c, "sine", 990, null, 0.38, 0.7, 0.4); tone(c, "sine", 1320, null, 0.44, 0.6, 0.25); }],
    close:  [0.6,  (c) => { noise(c, 0, 0.4, 2800, 250, 0.9); tone(c, "sine", 520, 240, 0.05, 0.35, 0.45); }],
    toggle: [0.5,  (c) => { tone(c, "sine", 1046, null, 0, 0.3, 0.5); tone(c, "sine", 1568, null, 0.07, 0.35, 0.45); }],
  };

  // Ambient: mountain wind + slow warm pad, rendered as a seamless 16 s loop
  function buildAmbient() {
    const rate = 22050, LEN = 16, XF = 2;
    return render(LEN + XF, (c) => {
      const n = Math.floor(c.sampleRate * (LEN + XF)), nb = c.createBuffer(1, n, c.sampleRate), d = nb.getChannelData(0);
      let last = 0; for (let i = 0; i < n; i++) { last = last * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = last * 6; } // brown-ish noise
      const src = c.createBufferSource(); src.buffer = nb;
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 2;
      const g = c.createGain(); g.gain.value = 0.55;
      for (let t = 0; t <= LEN + XF; t += 2) { lp.frequency.linearRampToValueAtTime(380 + 260 * Math.sin(t * 0.7) + 140 * Math.sin(t * 1.9), t); }
      src.connect(lp); lp.connect(g); g.connect(c.destination); src.start(0);
      // pad: A, E, A, C#, E — gentle, with slow swells
      [110, 164.8, 220, 277.2, 329.6].forEach((f, k) => {
        const o = c.createOscillator(), og = c.createGain();
        o.type = "sine"; o.frequency.value = f; o.detune.value = (k % 2 ? 4 : -4);
        og.gain.setValueAtTime(0.0001, 0);
        for (let t = 0; t <= LEN + XF; t += 4) og.gain.linearRampToValueAtTime(0.05 + 0.035 * Math.sin(t * 0.5 + k), t);
        o.connect(og); og.connect(c.destination); o.start(0); o.stop(LEN + XF);
      });
    }, rate, 2).then((buf) => {
      // fold the extra 2 s onto the start for a click-free loop
      const rateN = buf.sampleRate, L = LEN * rateN, X = XF * rateN;
      const out = new OAC(buf.numberOfChannels, L, rateN).createBuffer(buf.numberOfChannels, L, rateN);
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const src = buf.getChannelData(ch), dst = out.getChannelData(ch);
        for (let i = 0; i < L; i++) dst[i] = src[i];
        for (let i = 0; i < X; i++) { const a = i / X; dst[i] = src[i] * a + src[L + i] * (1 - a); }
      }
      return out;
    });
  }

  async function prepare() {
    if (!OAC || ready) return;
    try {
      for (const [name, [dur, fn]] of Object.entries(RECIPES)) {
        const url = toWav(await render(dur, fn));
        pools[name] = Array.from({ length: POOL }, () => { const a = new Audio(url); a.preload = "auto"; a.volume = name === "hover" ? 0.35 : 0.7; return a; });
        idx[name] = 0;
      }
      ambient = new Audio(toWav(await buildAmbient()));
      ambient.loop = true; ambient.volume = 0; ambient.preload = "auto";
      ready = true;
      if (unlocked && !muted) startAmbient();
    } catch (e) { /* audio unsupported: stay silent */ }
  }

  let fadeTimer;
  function fadeAmbient(to, ms) {
    if (!ambient) return;
    clearInterval(fadeTimer);
    const from = ambient.volume, steps = 30; let i = 0;
    fadeTimer = setInterval(() => {
      i++; ambient.volume = clamp(from + (to - from) * (i / steps), 0, 1);
      if (i >= steps) { clearInterval(fadeTimer); if (to === 0) ambient.pause(); }
    }, ms / steps);
  }
  function startAmbient() {
    if (!ambient || muted) return;
    ambient.play().then(() => fadeAmbient(0.22, 3000)).catch(() => {});
  }

  function play(kind) {
    if (muted || !ready || !pools[kind]) return;
    if (kind !== "hover" && !unlocked) unlock();
    if (!unlocked) return;
    const a = pools[kind][idx[kind]++ % POOL];
    try { a.currentTime = 0; } catch {}
    a.play().catch(() => {});
  }
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    // prime every clip inside this user gesture so later plays are allowed
    Object.values(pools).flat().forEach((a) => { const v = a.volume; a.volume = 0; a.play().then(() => { a.pause(); a.currentTime = 0; a.volume = v; }).catch(() => { a.volume = v; }); });
    startAmbient();
  }
  prepare();
  window.__ssSound = { pools, get ambient() { return ambient; }, get ready() { return ready; }, get unlocked() { return unlocked; } };
  return {
    play, unlock,
    get muted() { return muted; },
    set muted(v) {
      muted = v; try { localStorage.setItem("ss-sound", v ? "off" : "on"); } catch {}
      if (v) { clearInterval(fadeTimer); if (ambient) { ambient.volume = 0; ambient.pause(); } } else { unlock(); startAmbient(); }
    },
  };
})();

function initButtonFx() {
  // Sound toggle in the nav
  const tgl = document.createElement("button");
  tgl.type = "button"; tgl.className = "sound-toggle"; tgl.id = "soundToggle";
  tgl.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path class="sound-wave" d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"/><path class="sound-x" d="M16 9l5 6M21 9l-5 6"/></svg>';
  const syncTgl = () => {
    tgl.classList.toggle("is-muted", Sound.muted);
    tgl.setAttribute("aria-pressed", String(!Sound.muted));
    tgl.setAttribute("aria-label", Sound.muted ? "Turn interface sounds on" : "Turn interface sounds off");
    tgl.title = Sound.muted ? "Sounds off" : "Sounds on";
  };
  syncTgl();
  $("#navToggle").before(tgl);
  tgl.addEventListener("click", (e) => {
    Sound.muted = !Sound.muted; syncTgl();
    if (!Sound.muted) Sound.play("toggle");
    showToast(Sound.muted ? "Interface sounds off" : "Interface sounds on", 1600);
  });

  // First real gesture anywhere unlocks audio (browser rule): click, tap or key
  ["click", "touchend", "keydown"].forEach((ev) => window.addEventListener(ev, () => Sound.unlock(), { passive: true }));

  // Click / tap sounds (delegated so dynamically added buttons are covered too)
  document.addEventListener("click", (e) => {
    const el = e.target.closest(FX_TARGETS + ", [data-view], .orbit-tile");
    if (!el || el === tgl || el.closest("#soundToggle")) return;
    const kind = el.matches("[data-view]") ? "open" : el.id === "viewerExit" ? "close" : "click";
    Sound.play(kind);
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#viewer").hidden) Sound.play("close");
  });

  if (!finePointer) return; // touch: press depth via CSS :active only

  // Hover tick + 3D tilt toward the pointer
  let lastHover = null;
  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest(FX_TARGETS);
    if (!el || el === lastHover) return;
    lastHover = el;
    Sound.play("hover", e.clientX);
  });
  document.addEventListener("pointerout", (e) => {
    const el = e.target.closest(FX_TARGETS);
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
    if (lastHover === el) lastHover = null;
    el.style.removeProperty("--bx"); el.style.removeProperty("--by");
    el.style.removeProperty("--gx"); el.style.removeProperty("--gy");
  });
  if (reduceMotion) return;
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest(FX_TARGETS);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    const k = r.width > 220 ? 6 : 16; // big cards tilt less
    el.style.setProperty("--bx", `${((0.5 - py) * k).toFixed(2)}deg`);
    el.style.setProperty("--by", `${((px - 0.5) * k).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
  }, { passive: true });
}

/* =========================================================================
   Helpers
   ========================================================================= */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
function throttle(fn, ms) {
  let last = 0, t;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
    else { clearTimeout(t); t = setTimeout(() => { last = Date.now(); fn(...args); }, ms - (now - last)); }
  };
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* =========================================================================
   Boot
   ========================================================================= */
applyConfig();
initLoader();
initParticles();
initCursor();
initMagnetic();
initTilt();
initCardGlow();
initParallax();
initNav();
initFeatures();
initReveals();
initMeters();
initFilters();
initContact();
initOrbit();
initConstellation();
initMapPins();
initViewer();
initHeroClouds();
initButtonFx();

reduceMotionQuery.addEventListener?.("change", (e) => { reduceMotion = e.matches; });
