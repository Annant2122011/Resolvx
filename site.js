(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const menuToggle = $('.menu-toggle');
  const nav = $('.nav-links');
  if (menuToggle && nav) {
    const closeMenu = () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open navigation');
      nav.classList.remove('open');
    };
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('open', open);
    });
    $$('a, button', nav).forEach((item) => item.addEventListener('click', (event) => {
      if (!event.currentTarget.matches('[data-open-search]') && event.currentTarget.matches('a')) closeMenu();
    }));
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
  }

  $$('[data-year]').forEach((node) => { node.textContent = String(new Date().getFullYear()); });
  $$('.faq-list').forEach((list) => {
    const items = $$('details.faq-item', list);
    items.forEach((item) => item.addEventListener('toggle', () => {
      if (item.open) items.forEach((other) => { if (other !== item) other.open = false; });
    }));
  });

  const lifecycleStates = {
    open: { title: 'Open · ready for triage', description: 'A member has submitted a request. The team can review the details, confirm the department, and decide who should take ownership.', next: 'Review the request and assign an owner.', percent: '16.67%', icon: '↗' },
    claimed: { title: 'Claimed · an owner is assigned', description: 'A staff member has taken responsibility. The next person opening the ticket should be able to see that someone is already handling it.', next: 'Investigate, update priority, and record useful notes.', percent: '33.33%', icon: '✓' },
    pending: { title: 'Pending · waiting on a prerequisite', description: 'The team cannot finish the next step yet, often because it needs information from the member or another dependency to be resolved.', next: 'Explain what is missing, then resume when actionable.', percent: '50%', icon: '◷' },
    reopened: { title: 'Reopened · follow-up is needed', description: 'A request that had been closed needs attention again. Its previous context should be reviewed before starting over.', next: 'Review the previous history before replying.', percent: '66.67%', icon: '↻' },
    closed: { title: 'Closed · active work is complete', description: 'The active support conversation has finished. The intended close workflow should complete the required transcript/archive and channel-state steps.', next: 'Confirm transcript/archive steps and permissions.', percent: '83.33%', icon: '✓' },
    archived: { title: 'Archived · retained for reference', description: 'The request is no longer part of the active queue, but its retained record may still be useful for an authorized future follow-up.', next: 'Consult the retained record if follow-up is needed.', percent: '100%', icon: '▣' }
  };
  const workflowDemo = $('[data-workflow-demo]');
  if (workflowDemo) {
    $$('[data-demo-state]', workflowDemo).forEach((button) => {
      button.addEventListener('click', () => {
        const state = lifecycleStates[button.dataset.demoState];
        if (!state) return;
        $$('[data-demo-state]', workflowDemo).forEach((candidate) => {
          const active = candidate === button;
          candidate.classList.toggle('active', active);
          candidate.setAttribute('aria-pressed', String(active));
        });
        const title = $('[data-state-title]', workflowDemo);
        const description = $('[data-state-description]', workflowDemo);
        const next = $('[data-state-next]', workflowDemo);
        const meter = $('[data-state-meter]', workflowDemo);
        const icon = $('[data-state-orb]', workflowDemo);
        if (title) title.textContent = state.title;
        if (description) description.textContent = state.description;
        if (next) next.textContent = state.next;
        if (meter) meter.style.width = state.percent;
        if (icon) icon.textContent = state.icon;
      });
    });
  }

  const fallbackCopy = (value) => {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
    textarea.remove();
    return copied;
  };
  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(value); return true; } catch (_) { /* fallback below */ }
    }
    return fallbackCopy(value);
  };
  $$('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.getAttribute('data-copy') || '';
      if (!value) return;
      const label = $('span', button);
      const originalLabel = label ? label.textContent : button.textContent;
      const success = await copyText(value);
      if (label) label.textContent = success ? 'Copied' : 'Select & copy';
      else button.textContent = success ? 'Copied!' : 'Copy manually';
      button.classList.toggle('is-copied', success);
      button.setAttribute('aria-label', success ? ('Copied ' + value) : ('Copy the command ' + value));
      if (button._copyReset) window.clearTimeout(button._copyReset);
      button._copyReset = window.setTimeout(() => {
        if (label) label.textContent = originalLabel;
        else button.textContent = originalLabel;
        button.classList.remove('is-copied');
        button.removeAttribute('aria-label');
      }, 1500);
    });
  });

  const progressBar = $('[data-reading-progress]');
  const updateReadingProgress = () => {
    if (!progressBar) return;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    progressBar.style.transform = 'scaleX(' + ratio + ')';
  };
  if (progressBar) {
    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    window.addEventListener('resize', updateReadingProgress);
    updateReadingProgress();
  }

  const tocLinks = $$('.wiki-toc-link');
  const tocTargets = tocLinks.map((link) => $(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && tocTargets.length) {
    const tocObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      const targetId = visible[0].target.id;
      tocLinks.forEach((link) => {
        const active = link.getAttribute('href') === ('#' + targetId);
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-16% 0px -68% 0px', threshold: 0 });
    tocTargets.forEach((target) => tocObserver.observe(target));
  }

  const searchItems = [
    { title: 'Overview: what ResolveX does', description: 'Product purpose, architecture direction, and how the support journey fits together.', url: 'index.html#system-at-a-glance', keywords: 'about overview bot support discord product' },
    { title: 'Ticket lifecycle', description: 'Create, claim, unclaim, pause, resume, close, reopen, and archive tickets.', url: 'features.html#ticket-lifecycle', keywords: 'tickets state status close reopen archive create claim pending' },
    { title: 'Departments and tags', description: 'Route requests to teams and keep issue labels consistent.', url: 'features.html#departments', keywords: 'category categories routing tag tags department' },
    { title: 'Forms and templates', description: 'Build versioned forms, add validation, and reuse templates.', url: 'features.html#forms', keywords: 'form forms schema validation field conditional template' },
    { title: 'Ticket panels', description: 'Create, brand, preview, order, and publish public support panels.', url: 'features.html#panels', keywords: 'panel panels buttons publish preview branding role access layout' },
    { title: 'Team tools and priority', description: 'Ownership, reassigning, staff notes, participants, and urgency.', url: 'features.html#team-tools', keywords: 'priority urgent critical claim assign owner staff notes add remove user' },
    { title: 'Reports and ticket history', description: 'Review event history and configure report categories and rules.', url: 'features.html#history-reports', keywords: 'audit report reporting history category flag' },
    { title: 'Ticket voice actions', description: 'Configuration notes and safe use of voice-related ticket tools.', url: 'features.html#voice', keywords: 'voice call audio join start end team' },
    { title: 'Archive and recovery', description: 'What can be restored, deletion review, attachments, and recovery limits.', url: 'features.html#recovery', keywords: 'restore recovery deleted channel messages attachment backup transcript archive' },
    { title: 'Settings dashboard and themes', description: 'Server-specific settings, theme choices, and the visual layout builder.', url: 'features.html#settings', keywords: 'settings theme appearance dashboard layout customization config' },
    { title: 'Retention and approved deletion', description: 'Review retained records before an approved removal operation.', url: 'features.html#retention', keywords: 'retention privacy data cleanup delete approval' },
    { title: 'Setup, repair, and deployment', description: 'Runtime requirements, test-guild setup, repair paths, and updates.', url: 'features.html#operations', keywords: 'setup install repair refresh restore host deploy update github actions' },
    { title: 'Audit and developer view', description: 'Summary views, daily reports, access control, and destructive-action safety.', url: 'features.html#audit', keywords: 'audit developer diagnostics summary daily accumulation logs' },
    { title: 'Neon PostgreSQL and reliability', description: 'Durable storage and retryable operations in the documented architecture.', url: 'features.html#reliability', keywords: 'neon postgres postgresql database sqlite outbox retry persistence' },
    { title: 'Premium demo mode', description: 'Understand the demo entitlement toggle without mistaking it for billing.', url: 'features.html#premium', keywords: 'premium demo billing subscription payments entitlement' },
    { title: 'Getting started safely', description: 'Runtime, database, setup, permissions, slash commands, and first test ticket.', url: 'wiki.html#first-steps', keywords: 'start install onboarding setup requirements permissions discord invite' },
    { title: 'Full command explorer', description: 'Browse documented /supportforge command paths and copy a command.', url: 'wiki.html#commands', keywords: 'commands slash command copy reference supportforge' },
    { title: 'Frequently asked questions', description: 'Answers on availability, product scope, forms, recovery, storage, and troubleshooting.', url: 'wiki.html#faq', keywords: 'faq questions help answer is it live troubleshoot support' },
    { title: 'Project roadmap and status labels', description: 'What is documented, what needs live verification, and what remains planned.', url: 'wiki.html#roadmap', keywords: 'roadmap planned status future workflow graph ai sla csat knowledge base' },
    { title: 'How ticket recovery works', description: 'Native deletion versus confirmed deletion, archive contents, and replay limits.', url: 'wiki.html#recovery', keywords: 'restore deleted ticket channel recovery mistake review replay archive' },
    { title: 'How to build a form', description: 'Create fields, add validation and conditions, template, activate, and test.', url: 'wiki.html#forms', keywords: 'create form fields validation conditional activate template' },
    { title: 'How to publish a ticket panel', description: 'Configure buttons and role access, preview, then publish a panel snapshot.', url: 'wiki.html#panels', keywords: 'create panel configure button label emoji role preview publish' }
  ];

  const overlay = $('[data-search-overlay]');
  const globalInput = $('[data-global-search]');
  const globalResults = $('[data-global-results]');
  let previousFocus = null;
  let visibleSearchItems = [];
  const openSearch = () => {
    if (!overlay || !globalInput) return;
    previousFocus = document.activeElement;
    if (menuToggle && nav) {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open navigation');
    }
    overlay.hidden = false;
    document.body.classList.add('search-open');
    globalInput.value = '';
    renderGlobalResults('');
    window.requestAnimationFrame(() => globalInput.focus());
  };
  const closeSearch = () => {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove('search-open');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  };
  const renderGlobalResults = (query) => {
    if (!globalResults) return;
    const normalized = query.trim().toLowerCase();
    visibleSearchItems = searchItems.filter((item) => !normalized || [item.title, item.description, item.keywords].join(' ').toLowerCase().includes(normalized));
    globalResults.replaceChildren();
    if (!visibleSearchItems.length) {
      const empty = document.createElement('p');
      empty.className = 'global-search-empty';
      empty.textContent = 'No matching pages or guides. Try a broader search.';
      globalResults.appendChild(empty);
      return;
    }
    visibleSearchItems.slice(0, 9).forEach((item, index) => {
      const anchor = document.createElement('a');
      anchor.href = item.url;
      anchor.className = 'global-search-result';
      const symbol = document.createElement('span');
      symbol.className = 'search-result-icon';
      symbol.textContent = index === 0 ? '↗' : index === 1 ? '▦' : '⌁';
      const body = document.createElement('span');
      body.className = 'search-result-copy';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const description = document.createElement('small');
      description.textContent = item.description;
      body.append(title, description);
      const key = document.createElement('kbd');
      key.textContent = '↵';
      anchor.append(symbol, body, key);
      anchor.addEventListener('click', closeSearch);
      globalResults.appendChild(anchor);
    });
  };
  $$('[data-open-search]').forEach((button) => button.addEventListener('click', openSearch));
  $$('[data-close-search]').forEach((button) => button.addEventListener('click', closeSearch));
  if (globalInput) {
    globalInput.addEventListener('input', () => renderGlobalResults(globalInput.value));
    const form = $('[data-global-search-form]');
    if (form) form.addEventListener('submit', (event) => {
      event.preventDefault();
      const first = $('.global-search-result', globalResults);
      if (first) window.location.href = first.getAttribute('href');
    });
  }
  if (overlay) {
    document.addEventListener('keydown', (event) => {
      if (!overlay.hidden && event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
        return;
      }
      if (!overlay.hidden && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        const results = $('.global-search-result', globalResults || document);
        if (results.length) {
          event.preventDefault();
          const currentIndex = results.indexOf(document.activeElement);
          let nextIndex;
          if (document.activeElement === globalInput) nextIndex = event.key === 'ArrowDown' ? 0 : results.length - 1;
          else if (currentIndex < 0) nextIndex = 0;
          else nextIndex = (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
          results[nextIndex].focus();
          return;
        }
      }
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (overlay.hidden) openSearch();
        else closeSearch();
      } else if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !typing && overlay.hidden) {
        event.preventDefault();
        openSearch();
      }
    });
  }

  const wikiInput = $('[data-wiki-search]');
  const wikiArticles = $$('[data-wiki-article]');
  const wikiNoResults = $('[data-wiki-no-results]');
  const wikiCount = $('[data-wiki-result-count]');
  const tocByArticle = new Map(tocLinks.map((link) => [link.getAttribute('href').slice(1), link]));
  const applyWikiSearch = (query) => {
    const normalized = query.trim().toLowerCase();
    let visibleArticles = 0;
    let visibleFaqs = 0;
    wikiArticles.forEach((article) => {
      const faqItems = $$('[data-wiki-faq]', article);
      let matches;
      if (faqItems.length) {
        let matchedItems = 0;
        faqItems.forEach((item) => {
          const match = !normalized || item.textContent.toLowerCase().includes(normalized);
          item.hidden = !match;
          if (match) matchedItems += 1;
        });
        const titleText = (article.querySelector('h2')?.textContent || '') + ' ' + (article.querySelector('.article-eyebrow')?.textContent || '');
        matches = matchedItems > 0 || !normalized || titleText.toLowerCase().includes(normalized);
        visibleFaqs += matchedItems;
      } else {
        matches = !normalized || article.textContent.toLowerCase().includes(normalized);
      }
      article.hidden = !matches;
      if (matches) visibleArticles += 1;
      const link = tocByArticle.get(article.id);
      if (link) link.hidden = !matches;
    });
    if (wikiNoResults) wikiNoResults.hidden = !normalized || visibleArticles > 0;
    if (wikiCount) wikiCount.textContent = !normalized ? 'All guides visible' : (visibleArticles + ' section' + (visibleArticles === 1 ? '' : 's') + ' · ' + visibleFaqs + ' FAQ answer' + (visibleFaqs === 1 ? '' : 's'));
  };
  if (wikiInput) {
    wikiInput.addEventListener('input', () => applyWikiSearch(wikiInput.value));
    document.addEventListener('keydown', (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      event.preventDefault();
      wikiInput.focus();
    });
  }
  $$('[data-clear-wiki-search]').forEach((button) => button.addEventListener('click', () => {
    if (!wikiInput) return;
    wikiInput.value = '';
    applyWikiSearch('');
    wikiInput.focus();
  }));
})();