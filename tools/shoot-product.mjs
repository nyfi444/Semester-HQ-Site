// Captures every product picture the site uses, from the real app.
//
//   1. serve the app (student-planner) on http://localhost:7448
//   2. node tools/shoot-product.mjs
//   3. python3 tools/export-product-images.py   (assets/product, inner pages)
//      python3 tools/export-home-images.py      (assets/v2, the home page)
//
// Playwright comes from the app repo's tests folder, so nothing is added here.
// The clock is pinned (Tuesday of week 4, 10:20 AM) so the pictures never
// show the time they were taken, and the sample semester, study group and
// club are built relative to that day. The demo bar, sample labels and
// "Not signed in" are removed at capture time; nothing in the app changes.
//
// Output: ../marketing-assets/after/*.png (desktop 2880x1800, phone
// 1170x2532) plus rects.json, the CSS-pixel boxes the home page's club
// highlight and the syllabus-panel crop are cut from.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(HERE, '..', '..', 'student-planner', 'tests', 'package.json'));
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:7448';
const OUT = join(HERE, '..', '..', 'marketing-assets', 'after');
const AT = new Date('2026-09-29T10:20:00');
// The demo student is Ashley in every picture (Nyla, Sep 30 2026).
const NAME = 'Ashley';
// Pastel class colors. Any class can be any color in the app (semester
// setup's spectrum), so this is a real choice a student can make.
const PASTELS = [[/CHEM/, '#9FBDE0'], [/PSY/, '#EDB0AC'], [/MATH/, '#A9D3B6'], [/MKT/, '#C7B4E6']];
mkdirSync(OUT, { recursive: true });

const errs = [];
const rects = {};
const b = await chromium.launch();

async function boot(dev, { dark = false } = {}) {
  const desk = dev === 'desk';
  const ctx = await b.newContext({
    viewport: desk ? { width: 1440, height: 900 } : { width: 390, height: 844 },
    deviceScaleFactor: desk ? 2 : 3, isMobile: !desk, hasTouch: !desk,
  });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(`${dev}: ${e.message}`));
  await pg.clock.setFixedTime(AT);
  await pg.goto(`${APP}/index.html?v=${Date.now()}`);
  await pg.waitForTimeout(1500);
  await pg.evaluate(([name, dark, pastels]) => {
    state.settings.displayName = name;
    state.settings.dark = dark;
    loadSampleSemester();
    const swap = {};
    for (const c of state.courses) {
      const hit = pastels.find(([re]) => new RegExp(re).test(c.code || ''));
      if (hit) { swap[(c.color || '').toLowerCase()] = hit[1]; c.color = hit[1]; }
    }
    // Events and blocks that carry a copy of a class color follow it.
    for (const list of Object.values(state)) {
      if (Array.isArray(list)) list.forEach(it => { if (it && typeof it.color === 'string' && swap[it.color.toLowerCase()]) it.color = swap[it.color.toLowerCase()]; });
    }
    if (typeof applyTheme === 'function') applyTheme();
  }, [NAME, dark, PASTELS.map(([re, hex]) => [re.source, hex])]);
  await pg.waitForTimeout(800);
  return { ctx, pg };
}

// Marketing tidy: what a signed-in student would see.
const tidy = (pg) => pg.evaluate((name) => {
  document.querySelectorAll('.demo-bar, .toast, .spw-card').forEach(e => e.remove());
  document.querySelectorAll('[class*="space-sample"]').forEach(e => {
    if (!e.parentElement?.closest('[class*="space-sample"]')) e.remove();
  });
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (w.nextNode()) nodes.push(w.currentNode);
  for (const n of nodes) {
    const t = n.nodeValue
      .replace('Not signed in', name)
      .replace(' (sample)', '')
      .replace(/\s*·\s*sample\b/i, '')
      .replace(/^Sample$/, '');
    if (t !== n.nodeValue) n.nodeValue = t;
  }
  document.querySelectorAll('a, button').forEach(e => { if (e.textContent.trim() === 'Log in') e.style.display = 'none'; });
  window.scrollTo(0, 0);
}, NAME);

async function shot(pg, name, { full = false } = {}) {
  await pg.waitForTimeout(700);
  await tidy(pg);
  await pg.waitForTimeout(200);
  await pg.screenshot({ path: join(OUT, `${name}.png`), fullPage: full });
}
const box = (pg, sel) => pg.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
}, sel);
// The card an element sits in (or the element itself).
const cardBox = (pg, sel) => pg.evaluate((sel) => {
  const el = document.querySelector(sel);
  const c = el && (el.closest('.card') || el);
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
}, sel);
const go = (pg, fn, arg) => pg.evaluate(fn, arg).then(() => pg.waitForTimeout(500));

for (const dev of ['desk', 'phone']) {
  const { ctx, pg } = await boot(dev);
  const course = await pg.evaluate(() => (activeCourses().find(c => /210/.test(c.code)) || activeCourses()[0]).id);

  await go(pg, () => navTo('dashboard'));
  await shot(pg, `dashboard-${dev === 'desk' ? 'desktop' : 'phone'}`);

  await go(pg, (id) => openCourse(id), course);
  await shot(pg, dev === 'desk' ? 'class-page-desktop' : 'course-phone');
  if (dev === 'desk') {
    // The syllabus details card on the class page.
    rects.syllabusPanel = await pg.evaluate(() => {
      const hit = [...document.querySelectorAll('main .card')].find(c => /office hours/i.test(c.textContent) && c.getBoundingClientRect().width < 600);
      if (!hit) return null;
      const r = hit.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
  }

  await go(pg, () => navTo('courses'));
  if (dev === 'phone') await shot(pg, 'class-page-phone');

  await go(pg, () => navTo('calendar'));
  await go(pg, () => setCalView('month'));
  await shot(pg, `calendar-${dev === 'desk' ? 'desktop' : 'phone'}`);
  await go(pg, () => setCalView('week'));
  await shot(pg, `calendar-week-${dev === 'desk' ? 'desktop' : 'phone'}`);

  for (const [route, name] of [['todos', 'todos'], ['assignments', 'assignments'], ['exams', 'exams'], ['projects', 'projects'], ['studytools', 'flashcards'], ['timer', 'timer'], ['career', 'applications']]) {
    await go(pg, (r) => navTo(r), route);
    await shot(pg, `${name}-${dev === 'desk' ? 'desktop' : 'phone'}`);
  }

  if (dev === 'desk') {
    // A Cornell page in the notebook, filed under the chemistry class.
    await go(pg, (cid) => {
      const id = 'shotcornell';
      state.notes.push({ id, type: 'note', name: 'Lecture 14: Reaction mechanisms', parentId: 'root', courseId: cid, pinned: false, content: '', updatedAt: Date.now() });
      setState({ route: 'notebook', notebookSelected: id });
    }, course);
    await go(pg, () => applyNoteTemplate('shotcornell', 'cornell'));
    // Fill the page the way a lecture would (the capture only, not saved).
    await go(pg, () => {
      const put = (sel, html) => { const el = document.querySelector(sel); if (el) el.innerHTML = html; };
      put('.nb-cornell-cues', '<p>SN1 vs SN2: what decides it?</p><p>Why do tertiary carbons favor SN1?</p><p>What makes a good leaving group?</p><p>Solvent: protic or aprotic?</p>');
      put('.nb-cornell-notes', '<p><strong>SN2</strong>: one step, backside attack, inversion of configuration.</p><ul><li>Rate = k[substrate][nucleophile]</li><li>Fastest on methyl and primary carbons</li><li>Polar aprotic solvents (acetone, DMSO)</li></ul><p><strong>SN1</strong>: two steps through a carbocation, so racemic mix.</p><ul><li>Rate = k[substrate] only</li><li>Tertiary carbons, stable carbocation</li><li>Polar protic solvents (water, ethanol)</li></ul><p>Good leaving groups are weak bases: I⁻ > Br⁻ > Cl⁻.</p>');
      put('.nb-cornell-summary', '<p>Substrate and solvent decide the path: crowded carbon and protic solvent means SN1, open carbon and aprotic solvent means SN2. Midterm 1 covers both.</p>');
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) if (/\b0 words\b/.test(w.currentNode.nodeValue)) w.currentNode.nodeValue = w.currentNode.nodeValue.replace(/\b0 words\b/, '112 words');
    });
    await shot(pg, 'notebook-desktop');
  }

  await go(pg, () => { navTo('studygroups'); createSampleGroup(); });
  await pg.waitForTimeout(600);
  const g = await pg.evaluate(() => state.subRoute);
  for (const t of ['overview', 'availability']) {
    await go(pg, ([c, t]) => openGroup(c, t), [g, t]);
    await shot(pg, `studygroups-${t === 'overview' ? '' : t + '-'}${dev === 'desk' ? 'desktop' : 'phone'}`);
  }

  await go(pg, () => { navTo('orgs'); createSampleOrg(); });
  await pg.waitForTimeout(800);
  const o = await pg.evaluate(() => state.subRoute);
  for (const t of ['overview', 'forms', 'calendar']) {
    await go(pg, ([c, t]) => openOrg(c, t), [o, t]);
    await shot(pg, `clubs-${t === 'overview' ? '' : t + '-'}${dev === 'desk' ? 'desktop' : 'phone'}`, { full: dev === 'desk' && t === 'overview' });
    if (dev === 'desk' && t === 'overview') {
      // Where each part of the club page sits, for the home page highlight.
      await tidy(pg);
      rects.clubPage = await pg.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
      rects.club = {
        main: await box(pg, 'main') || await box(pg, '#main'),
        cover: await box(pg, '.space-cover'),
        needs: await box(pg, '.space-needs'),
        next: await cardBox(pg, '.space-hero-grid'),
        week: await cardBox(pg, '.space-week-row, .org-week'),
        agenda: await box(pg, '.org-agenda'),
        officers: await box(pg, '.org-officer-mini'),
        announcements: await pg.evaluate(() => { const a = document.querySelector('.org-ann'); const c = a && a.closest('.card'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; }),
        files: await box(pg, '.org-rail-files'),
        faces: await pg.evaluate(() => { const a = document.querySelector('.org-officer-faces'); const c = a && a.closest('.card'); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }; }),
      };
    }
  }

  if (dev === 'phone') {
    // Quick capture's review sheet, filled the way a photo of a syllabus page reads.
    await go(pg, () => navTo('dashboard'));
    await pg.evaluate(() => {
      const byCode = (re) => (activeCourses().find(c => re.test(c.code)) || {}).id || '';
      const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
      window._capture = { files: [], text: '', items: [
        { include: true, kind: 'assignment', title: 'Problem set 4', courseId: byCode(/152/), type: 'assignment', dueDate: day(3), dueTime: '23:59', notes: '' },
        { include: true, kind: 'exam', title: 'Quiz 2: chapters 6 and 7', courseId: byCode(/101/), type: 'exam', dueDate: day(8), dueTime: '10:00', notes: 'Covers chapters 6 and 7' },
        { include: true, kind: 'assignment', title: 'Lab report 4', courseId: byCode(/210/), type: 'assignment', dueDate: day(5), dueTime: '17:00', notes: '' },
        { include: true, kind: 'todo', title: 'Email Dr. Patel about the makeup', courseId: byCode(/210/), type: 'assignment', dueDate: day(1), dueTime: '', notes: '' },
      ] };
      renderCaptureReview();
    });
    await shot(pg, 'capture-phone');
    await pg.evaluate(() => closeModal());

    await ctx.setOffline(true);
    await pg.waitForTimeout(600);
    await shot(pg, 'offline-phone');
    await ctx.setOffline(false);
  }
  await ctx.close();
}

// Dark mode, phone dashboard.
{
  const { ctx, pg } = await boot('phone', { dark: true });
  await go(pg, () => navTo('dashboard'));
  await shot(pg, 'dashboard-dark-phone');
  await ctx.close();
}

writeFileSync(join(OUT, 'rects.json'), JSON.stringify(rects, null, 2));
console.log(JSON.stringify({ errors: errs.slice(0, 10), rects }, null, 1));
await b.close();
