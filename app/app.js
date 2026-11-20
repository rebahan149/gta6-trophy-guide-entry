// app.js — The Leonida Trophy Ledger: an offline guide & tracker for the 55
// GTA VI PlayStation 5 trophies. Loads the trophy data from data/trophies.json
// (a file of this app), renders the checklist, the guides, the platinum
// roadmap and the missable flags, and keeps the reader's progress locally.

import {
  GRADE_POINTS,
  idsFromShareLink,
  loadState,
  parseImportedProgress,
  progressSummary,
  exportProgress,
  saveState,
} from './js/tracker.js';
import { ROADMAP_STAGES, trophiesInStage } from './js/roadmap.js';

const data = await (await fetch('data/trophies.json')).json();
const trophies = data.trophies;
const trophyById = new Map(trophies.map((t) => [t.id, t]));
const validIds = new Set(trophies.map((t) => t.id));

const state = loadState();
const earned = new Set(state.earned.filter((id) => validIds.has(id)));
for (const id of idsFromShareLink(location.search)) {
  if (validIds.has(id)) earned.add(id);
}

const params = new URLSearchParams(location.search);
if (params.get('spoilers') === 'off') state.spoilers = false;
if (params.get('spoilers') === 'on') state.spoilers = true;
const filters = {
  kind: params.get('kind') || 'all',
  grade: params.get('grade') || 'all',
  query: '',
};
let currentView = params.get('view') || 'checklist';
let selectedId = Number.parseInt(params.get('open') || '', 10);
if (!validIds.has(selectedId)) selectedId = 9; // Break the Bank, a story heist, opens the guide panel.

const els = {
  percent: document.getElementById('progress-percent'),
  count: document.getElementById('progress-count'),
  points: document.getElementById('progress-points'),
  bar: document.getElementById('progress-bar'),
  fill: document.getElementById('progress-fill'),
  list: document.getElementById('trophy-list'),
  listSummary: document.getElementById('list-summary'),
  detail: document.getElementById('detail'),
  search: document.getElementById('search'),
  gradeFilter: document.getElementById('grade-filter'),
  kindChips: document.getElementById('kind-chips'),
  spoilerToggle: document.getElementById('spoiler-toggle'),
  hideEarnedToggle: document.getElementById('hide-earned-toggle'),
  importNote: document.getElementById('import-note'),
  roadmap: document.getElementById('roadmap-stages'),
  missables: document.getElementById('missable-cards'),
  sources: document.getElementById('source-list'),
};

function persist() {
  state.earned = [...earned];
  state.spoilers = els.spoilerToggle.checked;
  state.hideEarned = els.hideEarnedToggle.checked;
  saveState(state);
}

function isMasked(trophy) {
  return state.spoilers && trophy.kind === 'story' && !earned.has(trophy.id);
}

function displayName(trophy) {
  return isMasked(trophy) ? 'Hidden story trophy' : trophy.name;
}

function displayDescription(trophy) {
  return isMasked(trophy)
    ? 'Spoiler shield is on: this story trophy reveals itself once you earn it.'
    : trophy.description;
}

function gradeBadge(trophy) {
  const span = document.createElement('span');
  span.className = `badge badge-${trophy.grade}`;
  span.textContent = trophy.grade;
  return span;
}

function flagBadge(text, cls) {
  const span = document.createElement('span');
  span.className = `flag ${cls}`;
  span.textContent = text;
  return span;
}

function renderProgress() {
  const s = progressSummary(trophies, earned);
  els.percent.textContent = `${s.percent}%`;
  els.count.textContent = `${s.earnedCount} of ${s.total} trophies earned`;
  els.points.textContent = `${s.points.toLocaleString('en-US')} of ${s.totalPoints.toLocaleString('en-US')} trophy points`;
  els.fill.style.width = `${s.percent}%`;
  els.bar.setAttribute('aria-valuenow', String(s.earnedCount));
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const total = trophies.filter((t) => t.grade === grade).length;
    document.getElementById(`count-${grade}`).textContent = `${s.byGrade[grade]}/${total}`;
  }
}

function matchesFilters(trophy) {
  if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
  if (filters.kind === 'missable' && !trophy.missable) return false;
  if (filters.kind !== 'all' && filters.kind !== 'missable' && trophy.kind !== filters.kind) return false;
  if (state.hideEarned && earned.has(trophy.id)) return false;
  if (filters.query) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(filters.query)) return false;
  }
  return true;
}

function renderList() {
  const shown = trophies.filter(matchesFilters);
  els.list.replaceChildren();
  els.listSummary.textContent = `Showing ${shown.length} of ${trophies.length} trophies — click one to read its guide.`;
  for (const trophy of shown) {
    const li = document.createElement('li');
    li.className = 'trophy-row';
    if (earned.has(trophy.id)) li.classList.add('is-earned');
    if (trophy.id === selectedId) li.classList.add('is-selected');

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(trophy.id);
      else earned.delete(trophy.id);
      persist();
      renderAll();
    });

    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'row-main';
    main.addEventListener('click', () => {
      selectedId = trophy.id;
      renderList();
      renderDetail();
    });
    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = displayName(trophy);
    const desc = document.createElement('span');
    desc.className = 'row-desc';
    desc.textContent = displayDescription(trophy);
    main.append(name, desc);

    const meta = document.createElement('span');
    meta.className = 'row-meta';
    meta.append(gradeBadge(trophy));
    if (trophy.missable) meta.append(flagBadge('Missable', 'flag-missable'));
    if (trophy.target) meta.append(flagBadge(`Target ${trophy.target.toLocaleString('en-US')}`, 'flag-target'));

    li.append(box, main, meta);
    els.list.append(li);
  }
}

function sourceList(trophy) {
  const ul = document.createElement('ul');
  ul.className = 'detail-sources';
  for (const source of trophy.sources ?? []) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = source.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = source.name;
    li.append(a);
    ul.append(li);
  }
  return ul;
}

function renderDetail() {
  const trophy = trophyById.get(selectedId) ?? trophies[0];
  const panel = els.detail;
  panel.replaceChildren();

  const head = document.createElement('div');
  head.className = 'detail-head';
  const title = document.createElement('h3');
  title.textContent = displayName(trophy);
  head.append(title, gradeBadge(trophy));
  if (trophy.missable) head.append(flagBadge('Missable', 'flag-missable'));
  panel.append(head);

  const official = document.createElement('p');
  official.className = 'detail-official';
  official.textContent = isMasked(trophy)
    ? 'Official description: hidden by the spoiler shield until this trophy is earned.'
    : `Official description: \u201C${trophy.description}\u201D`;
  panel.append(official);

  const facts = document.createElement('p');
  facts.className = 'detail-facts';
  const stage = ROADMAP_STAGES.find((s) => s.n === trophy.stage);
  facts.textContent =
    `Kind: ${trophy.kind} · Roadmap stage ${trophy.stage} — ${stage ? stage.title : ''}` +
    ` · Worth ${GRADE_POINTS[trophy.grade]} points` +
    (trophy.target ? ` · Tracked target: ${trophy.target.toLocaleString('en-US')}` : '');
  panel.append(facts);

  const guideHead = document.createElement('h4');
  guideHead.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.className = 'detail-guide';
  guide.textContent = isMasked(trophy)
    ? 'The spoiler shield hides this guide until the trophy is earned. Tick it off in the checklist to reveal it — or switch the shield off above.'
    : trophy.guide;
  panel.append(guideHead, guide);

  const srcHead = document.createElement('h4');
  srcHead.textContent = 'Sources';
  panel.append(srcHead, sourceList(trophy));

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'detail-toggle';
  toggle.textContent = earned.has(trophy.id) ? 'Earned — undo' : 'Mark as earned';
  toggle.addEventListener('click', () => {
    if (earned.has(trophy.id)) earned.delete(trophy.id);
    else earned.add(trophy.id);
    persist();
    renderAll();
  });
  panel.append(toggle);
}

function roadmapCard(trophy) {
  const li = document.createElement('li');
  li.className = 'roadmap-item';
  if (earned.has(trophy.id)) li.classList.add('is-earned');
  const name = document.createElement('span');
  name.className = 'roadmap-name';
  name.textContent = displayName(trophy);
  li.append(name, gradeBadge(trophy));
  if (trophy.missable) li.append(flagBadge('Missable', 'flag-missable'));
  return li;
}

function renderRoadmap() {
  els.roadmap.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const section = document.createElement('section');
    section.className = 'stage';
    const h = document.createElement('h3');
    h.textContent = `Stage ${stage.n} — ${stage.title}`;
    const blurb = document.createElement('p');
    blurb.textContent = stage.blurb;
    const ul = document.createElement('ul');
    ul.className = 'roadmap-list';
    for (const trophy of trophiesInStage(trophies, stage.n)) ul.append(roadmapCard(trophy));
    section.append(h, blurb, ul);
    els.roadmap.append(section);
  }
}

function renderMissables() {
  els.missables.replaceChildren();
  document.getElementById('missable-count').textContent = String(trophies.filter((t) => t.missable).length);
  for (const trophy of trophies.filter((t) => t.missable)) {
    const card = document.createElement('article');
    card.className = 'missable-card';
    const h = document.createElement('h3');
    h.textContent = trophy.name;
    const quote = document.createElement('blockquote');
    quote.textContent = `\u201C${trophy.description}\u201D — official description`;
    const guide = document.createElement('p');
    guide.textContent = trophy.guide;
    const meta = document.createElement('p');
    meta.className = 'detail-facts';
    const stage = ROADMAP_STAGES.find((s) => s.n === trophy.stage);
    meta.textContent = `Roadmap stage ${trophy.stage} — ${stage ? stage.title : ''}`;
    card.append(h, quote, guide, meta, sourceList(trophy));
    els.missables.append(card);
  }
}

function renderSources() {
  const seen = new Map();
  for (const trophy of trophies) {
    for (const source of trophy.sources ?? []) {
      if (!seen.has(source.url)) seen.set(source.url, source.name);
    }
  }
  els.sources.replaceChildren();
  for (const [url, name] of seen) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = name;
    const span = document.createElement('span');
    span.className = 'source-url';
    span.textContent = url;
    li.append(a, span);
    els.sources.append(li);
  }
}

function renderAll() {
  renderProgress();
  renderList();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

function showView(view) {
  currentView = view;
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('is-active', tab.dataset.view === view);
  }
  for (const section of document.querySelectorAll('.view')) {
    section.classList.toggle('is-active', section.id === `view-${view}`);
  }
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => showView(tab.dataset.view));
}

els.gradeFilter.value = filters.grade;
els.gradeFilter.addEventListener('change', () => {
  filters.grade = els.gradeFilter.value;
  renderList();
});

for (const chip of els.kindChips.querySelectorAll('.chip')) {
  chip.classList.toggle('is-active', chip.dataset.kind === filters.kind);
  chip.addEventListener('click', () => {
    filters.kind = chip.dataset.kind;
    for (const c of els.kindChips.querySelectorAll('.chip')) {
      c.classList.toggle('is-active', c === chip);
    }
    renderList();
  });
}

els.search.addEventListener('input', () => {
  filters.query = els.search.value.trim().toLowerCase();
  renderList();
});

els.spoilerToggle.checked = state.spoilers;
els.spoilerToggle.addEventListener('change', () => {
  persist();
  renderAll();
});

els.hideEarnedToggle.checked = state.hideEarned;
els.hideEarnedToggle.addEventListener('change', () => {
  persist();
  renderList();
});

document.getElementById('export-button').addEventListener('click', () => {
  persist();
  exportProgress(state);
});

document.getElementById('import-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const ids = parseImportedProgress(await file.text(), validIds);
    earned.clear();
    for (const id of ids) earned.add(id);
    persist();
    renderAll();
    els.importNote.hidden = false;
    els.importNote.textContent = `Imported progress: ${ids.length} trophies marked as earned.`;
  } catch {
    els.importNote.hidden = false;
    els.importNote.textContent = 'That file could not be read as a progress export — nothing was changed.';
  }
  event.target.value = '';
});

renderSources();
renderAll();
showView(['checklist', 'roadmap', 'missables', 'sources'].includes(currentView) ? currentView : 'checklist');
persist();

const scrollTarget = Number.parseInt(params.get('scroll') || '', 10);
if (Number.isInteger(scrollTarget) && scrollTarget > 0) {
  requestAnimationFrame(() => window.scrollTo(0, scrollTarget));
}
