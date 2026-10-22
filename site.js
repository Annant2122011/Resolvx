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
    { title: 'Overview: what ResolvX does', description: 'Product purpose, architecture direction, and how the support journey fits together.', url: 'index.html#system-at-a-glance', keywords: 'about overview bot support discord product' },
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
    { title: 'How to publish a ticket panel', description: 'Configure buttons and role access, preview, then publish a panel snapshot.', url: 'wiki.html#panels', keywords: 'create panel configure button label emoji role preview publish' },
    { title: 'Language and automation settings', description: 'Choose supported bot-message locales and configure time zones, inactivity rules, and ticket workspace modes.', url: 'wiki.html#language-automation', keywords: 'language locale translation localization internationalization multilingual server-language support-hours timezone time-zone inactivity idle auto-close thread channel workspace' },
    { title: 'Support hours and inactivity automation', description: 'Configure IANA time zones, opening intervals, outside-hours intake, idle warnings, grace periods, and exemptions.', url: 'features.html#support-hours', keywords: 'support hours opening schedule timezone time zone IANA closed outside hours restrict inactivity idle auto-close warning grace roles department exemptions SLA business hours' },
    { title: 'Ticket workspace: private channels or threads', description: 'Choose the resource type used for newly created tickets and test its permission model.', url: 'features.html#ticket-workspace', keywords: 'ticket workspace private text channel channels threads private thread permissions create new ticket Discord' },
    { title: 'Bot message localization: fifteen languages', description: 'Set the server-level language for supported bot messages, with English fallback for unmigrated copy.', url: 'features.html#localization', keywords: 'translate translation language locale native language i18n localization Italian Indonesian Korean Russian Chinese Turkish Hindi Bengali Spanish French German Portuguese Arabic Japanese bot messages' },
  ];


  const SEARCH_EXPANSIONS = {
    'system-at-a-glance': 'about overview product purpose discord ticketing customer support help desk helpdesk workflow administration architecture current capabilities',
    'ticket-lifecycle': 'create open claim claimed unclaim unclaimed assign ownership pending waiting hold resume reopen close archive archived state status request case',
    'departments': 'category categories team routing route route-to issue labels tags presets usecase use-case use cases sales technical support accounts refunds abuse',
    'forms': 'form forms questionnaire application intake fields validation required conditional schema template reusable activate deactivate version answers submit',
    'panels': 'panel panels entry point entrypoint public message launcher buttons button labels emoji branding role access roles order preview publish draft layout',
    'team-tools': 'staff moderator agent priority severity critical urgent high normal low owner ownership claim unclaim reassign participant user internal note collaboration',
    'history-reports': 'report reports reporting complaint abuse flag threshold category subcategory moderation history events audit review safety',
    'voice': 'voice audio call sound voice chat join leave close voice session live conversation',
    'recovery': 'restore recovery recover undelete deletion deleted accidentally mistake wrong delete transcript attachments archived messages replay channel replacement backup',
    'settings': 'settings configuration config theme color appearance customize customization dashboard settings panel controls preference support hours language locale timezone inactivity ticket workspace private thread private text channel',
    'retention': 'retention archive closed-days archive-days cleanup purge erase delete deletion approval confirm review privacy data lifetime keep duration',
    'operations': 'setup install onboarding repair refresh restore deploy deployment github actions self-update watchdog restart host systemd environment variable configuration',
    'audit': 'audit developer diagnostics logs log summary daily accumulation activity security permissions destructive action',
    'reliability': 'neon postgresql postgres database persistence durable storage sqlite outbox retry backoff rate limit retry-after api error timeout transaction',
    'premium': 'premium paid subscription payments billing entitlement demo toggle simulated not real billing',
    'first-steps': 'setup install requirements environment variables token database permissions invite deploy test guild first ticket configuration getting started',
    'commands': 'command slash commands syntax copy reference /supportforge settings-reports reporting taxonomy report-categories report-subcategory-add report-subcategory-edit report-subcategory-remove',
    'faq': 'faq questions answers troubleshooting help guide common problem error issue invite website disconnected production acceptance',
    'roadmap': 'planned future not available roadmap workflow graph knowledge base quick replies sla csat customer satisfaction api web dashboard oauth multi channel ai',
    'overview': 'overview status documentation feature feature-list product current release',
    'storage-deployment': 'neon postgresql postgres database persistence durable store outbox retry update deploy deployment hosting github actions systemd env',
    'reports-voice': 'report categories subcategories thresholds user report flag voice audio conversation safety moderation',
    'team-tools': 'notes participants add-user remove-user reassignment owner priorities',
    'language-automation': 'locale language languages translation translate translated native language internationalization i18n italian indonesian korean russian chinese simplified turkish hindi bengali spanish french german portuguese arabic japanese support-hours timezone schedule opening hours closed behavior outside-hours inactivity idle grace auto-close exemptions roles departments workspace private-threads private text channels panel automation',
    'support-hours': 'support hours opening schedule timezone time zone IANA intervals weekday split shift closed outside-hours allow restrict intake next opening business hours support availability not SLA',
    'ticket-workspace': 'ticket workspace private text channel private thread channels threads new-ticket permissions member staff visibility archive create resource mode',
    'localization': 'bot message language locale translation localization i18n fifteen supported catalogs English Hindi Bengali Spanish French German Brazilian Portuguese Arabic Japanese Italian Indonesian Korean Russian Simplified Chinese Turkish native locale setting server language translated strings fallback user-authored text',

    'retention': 'eligibility deletion authorization review approvals policy data retention archive',
    'ticket-lifecycle': 'open claimed pending reopened closed archived ticket channel conversation status',
  };
  const SEARCH_SYNONYM_GROUPS = [
    ['ticket', 'tickets', 'request', 'requests', 'case', 'cases', 'tiket', 'bilet', 'заявка', 'заявки', '工单', 'チケット', 'टिकट', 'টিকিট', 'تذكرة', 'solicitud', 'solicitudes', 'demande', 'anfrage'],
    ['form', 'forms', 'questionnaire', 'intake', 'template', 'formulario', 'formulário', 'formulaire', 'formular', 'modulo', 'formulir', '양식', 'форма', '表单', 'نموذج', 'フォーム'],
    ['panel', 'panels', 'button', 'buttons', 'launcher', 'entrypoint', 'menú', 'menue', 'pannello', 'paneli', '패널', 'панель', '面板', 'パネル'],
    ['department', 'departments', 'category', 'categories', 'team', 'routing', 'route', 'equipo', 'departamento', 'département', 'abteilung', 'reparto', 'departemen', '부서', 'отдел', '部门', 'قسم', 'विभाग', 'বিভাগ'],
    ['tag', 'tags', 'label', 'labels', 'etiqueta', 'etiquetas', 'étiquette', 'marcador', 'tagar', '태그', 'метка', '标签', 'ラベル', 'टैग', 'ট্যাগ'],
    ['priority', 'urgent', 'critical', 'severity', 'urgency', 'prioridad', 'priorité', 'priorität', 'priorità', 'prioritas', '우선순위', 'приоритет', '优先级', '優先度', 'प्राथमिकता', 'অগ্রাধিকার'],
    ['claim', 'claimed', 'unclaim', 'unclaimed', 'assign', 'assigned', 'reassign', 'owner', 'ownership', 'handoff', 'release', 'responsibility', 'reasignar', 'zuweisen', 'назначить', '재할당', '담당자'],
    ['pending', 'waiting', 'hold', 'resume', 'reopen', 'reopened', 'close', 'closed', 'archive', 'archived', 'status', 'lifecycle', 'workflow state', 'espera', 'attente', 'wartend', 'beklemede', '대기', 'ожидание', '等待'],
    ['report', 'reports', 'reporting', 'complaint', 'abuse', 'flag', 'threshold', 'subcategory', 'denuncia', 'signalement', 'meldung', 'laporan', '신고', 'жалоба', '举报', '報告', 'रिपोर्ट', 'প্রতিবেদন'],
    ['audit', 'audits', 'logs', 'log', 'history', 'events', 'diagnostics', 'developer', 'actividad', 'journal', 'protokoll', 'riwayat', '감사', 'журнал', '审计', '監査', 'ऑडिट', 'নিরীক্ষা'],
    ['voice', 'audio', 'call', 'sound', 'voicechat', 'voice chat', 'llamada', 'vocal', 'sprachchat', 'suara', '음성', 'голос', '语音', '音声', 'आवाज़', 'ভয়েস'],
    ['restore', 'recovery', 'recover', 'undelete', 'rebuild', 'replay', 'restore channel', 'accidental deletion', 'mistake', 'transcript', 'backup', 'recoverable', 'restaurar', 'récupération', 'wiederherstellen', 'pemulihan', '복구', 'восстановление', '恢复', '復元', 'पुनर्प्राप्ति', 'পুনরুদ্ধার'],
    ['database', 'databases', 'postgres', 'postgresql', 'neon', 'persistence', 'storage', 'sqlite', 'outbox', 'durable', 'base de datos', 'datenbank', 'database', '데이터베이스', 'база', '数据库', 'データベース', 'डेटाबेस', 'ডেটাবেস'],
    ['translate', 'translation', 'language', 'languages', 'locale', 'localization', 'internationalization', 'i18n', 'multilingual', 'idioma', 'langue', 'sprache', 'lingua', 'bahasa', '언어', 'язык', '语言', '言語', 'भाषा', 'ভাষা', 'لغة', 'dil'],
    ['support-hours', 'opening', 'hours', 'schedule', 'timezone', 'time-zone', 'business-hours', 'horario', 'heures', 'öffnungszeiten', 'jam', '운영 시간', 'часы работы', '营业时间', '営業時間', 'समय', 'সময়'],
    ['inactivity', 'idle', 'inactive', 'timeout', 'grace', 'auto-close', 'autoclose', 'inactividad', 'inactivité', 'inaktivität', 'ketidakaktifan', '비활성', 'неактивность', '不活跃', '非アクティブ', 'निष्क्रियता', 'নিষ্ক্রিয়তা'],
    ['retention', 'retained', 'retaining', 'archive', 'cleanup', 'purge', 'delete', 'deletion', 'privacy', 'retención', 'conservation', 'aufbewahrung', 'retensi', '보존', 'хранение', '保留', '保持', 'प्रतिधारण', 'সংরক্ষণ'],
    ['premium', 'billing', 'payment', 'payments', 'subscription', 'entitlement', 'demo', 'facturación', 'paiement', 'zahlung', 'pembayaran', '결제', 'оплата', '账单', '請求', 'भुगतान', 'পেমেন্ট'],
    ['theme', 'themes', 'appearance', 'branding', 'style', 'color', 'colour', 'layout', 'personalization', 'appearance', 'tema', 'apparence', 'darstellung', 'tampilan', '테마', 'оформление', '主题', '外観', 'रूप-रंग', 'চেহারা'],
    ['setup', 'install', 'installation', 'configure', 'configuration', 'deploy', 'deployment', 'refresh', 'repair', 'update', 'upgrade', 'self-update', 'installation', 'instalación', 'installation', 'installation', 'instalasi', '설치', 'установка', '部署', 'インストール', 'स्थापना', 'ইনস্টল'],
    ['thread', 'threads', 'private-thread', 'channel', 'channels', 'workspace', 'text-channel', 'canal', 'faden', 'benang', '스레드', 'поток', '线程', 'スレッド', 'थ्रेड', 'থ্রেড'],
  ];
  const SEARCH_STOP_WORDS = new Set([
    'the','what','how','when','where','why','is','are','was','were','a','an','to','for','of','and','or','my','our','your',
    'can','does','do','it','in','on','with','from','me','please','show','find','view','read','tell','about','this','that',
    'all','every','much','many','way','ways','work','works','working','use','using','make','get','want','need','best','page',
  ]);
  function normalizeSearchText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function searchTerms(query) {
    return normalizeSearchText(query).split(/\s+/).filter((term) => term.length > 1 && !SEARCH_STOP_WORDS.has(term));
  }
  function termMatchesCorpus(corpus, term) {
    const group = SEARCH_SYNONYM_GROUPS.find((values) => values.some((value) => normalizeSearchText(value) === term));
    if (!group) return corpus.includes(term);
    return group.some((value) => corpus.includes(normalizeSearchText(value)));
  }
  function matchesSearchCorpus(corpusText, query) {
    if (!String(query || '').trim()) return true;
    const corpus = normalizeSearchText(corpusText);
    const terms = searchTerms(query);
    if (!terms.length) return true;
    return terms.every((term) => termMatchesCorpus(corpus, term));
  }
  function searchItemCorpus(item) {
    const hash = (item.url.split('#')[1] || '').trim();
    return [item.title, item.description, item.keywords, SEARCH_EXPANSIONS[hash] || ''].join(' ');
  }

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
    visibleSearchItems = searchItems.filter((item) => matchesSearchCorpus(searchItemCorpus(item), query));
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

  const originalWikiArticleText = new WeakMap();
  const originalWikiFaqText = new WeakMap();
  wikiArticles.forEach((article) => {
    originalWikiArticleText.set(article, article.textContent || '');
    $('[data-wiki-faq]', article).forEach((item) => originalWikiFaqText.set(item, item.textContent || ''));
  });
  const FAQ_SEARCH_KEYWORDS = {
    'What does ResolvX do?': 'purpose overview discord support ticket helpdesk request management',
    'Can I invite the bot from this website?': 'invite install add bot discord oauth authorization link missing setup',
    'Does the website run bot commands or show live tickets?': 'website static github pages vercel dashboard login api live data connection',
    'Why do command examples say /supportforge instead of /resolvx?': 'slash command root rename brand registered name deployed command',
    'What does a member do to open a ticket?': 'create new support request ticket panel button department form intake',
    'Can I customize multiple public support panels?': 'multi-panel builder draft publish entry button roles emoji style order',
    'Are form templates the same as active forms?': 'template activate deactivate schema version form builder',
    'Can ResolvX restore a deleted ticket exactly as it was?': 'restore recover recovery undelete delete accidental channel original ids authors replay transcript limit',
    'What happens to attachments during recovery?': 'attachment files size limit archived message media unavailable expired',
    'Which database should production use?': 'neon postgresql postgres sqlite durable database persistence',
    'Are slash commands and button controls both supported?': 'fallback parity command interaction component button select menu live guild testing',
    'Does Premium demo mode mean billing is connected?': 'premium payments subscription billing toggle entitlement demo fake simulated',
    'What should I check if a button or command does nothing?': 'troubleshoot error timeout permissions interaction expired database logs command registration',
    'Can I hide repair or destructive controls when customizing Settings?': 'settings layout builder protected repair refresh reset delete everything safety hide controls',
    'Does ResolvX provide AI answers, a knowledge base, SLA timers, or customer satisfaction surveys now?': 'roadmap planned ai knowledge base kb sla service level agreement business hours csat survey translation channels',
  };

  const applyWikiSearch = (query) => {
    const normalized = query.trim();
    let visibleArticles = 0;
    let visibleFaqs = 0;
    wikiArticles.forEach((article) => {
      const faqItems = $$('[data-wiki-faq]', article);
      let matches;
      if (faqItems.length) {
        let matchedItems = 0;
        faqItems.forEach((item) => {
          const sourceText = originalWikiFaqText.get(item) || item.textContent || '';
          const summaryText = (item.querySelector('summary')?.textContent || '').replace(/\s+/g, ' ').trim();
          const extraTerms = FAQ_SEARCH_KEYWORDS[summaryText] || '';
          const match = !normalized || matchesSearchCorpus(sourceText + ' ' + summaryText + ' ' + extraTerms, query);
          item.hidden = !match;
          if (match) matchedItems += 1;
        });
        const articleSource = originalWikiArticleText.get(article) || article.textContent || '';
        const titleText = (article.querySelector('h2')?.textContent || '') + ' ' + (article.querySelector('.article-eyebrow')?.textContent || '');
        const articleKeywords = (article.dataset.searchKeywords || '') + ' ' + (SEARCH_EXPANSIONS[article.id] || '');
        const articleTitleMatches = matchesSearchCorpus(titleText + ' ' + articleKeywords, query);
        if (normalized && matchedItems === 0 && articleTitleMatches) {
          faqItems.forEach((item) => { item.hidden = false; });
          matchedItems = faqItems.length;
        }
        matches = matchedItems > 0 || !normalized || matchesSearchCorpus(articleKeywords + ' ' + titleText, query);
        visibleFaqs += matchedItems;
      } else {
        const sourceText = originalWikiArticleText.get(article) || article.textContent || '';
        const articleKeywords = (article.dataset.searchKeywords || '') + ' ' + (SEARCH_EXPANSIONS[article.id] || '');
        matches = !normalized || matchesSearchCorpus(sourceText + ' ' + articleKeywords, query);
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

  // Full-page translation is opt-in. Only this static documentation page is sent to the configured translation provider.
  const SITE_LANGUAGES = [
    { code: 'en-US', api: 'en', label: 'English', native: 'English' },
    { code: 'hi-IN', api: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'bn-IN', api: 'bn', label: 'Bengali', native: 'বাংলা' },
    { code: 'es-ES', api: 'es', label: 'Spanish', native: 'Español' },
    { code: 'fr-FR', api: 'fr', label: 'French', native: 'Français' },
    { code: 'de-DE', api: 'de', label: 'German', native: 'Deutsch' },
    { code: 'pt-BR', api: 'pt', label: 'Portuguese (Brazil)', native: 'Português' },
    { code: 'ar', api: 'ar', label: 'Arabic', native: 'العربية' },
    { code: 'ja-JP', api: 'ja', label: 'Japanese', native: '日本語' },
    { code: 'it-IT', api: 'it', label: 'Italian', native: 'Italiano' },
    { code: 'id-ID', api: 'id', label: 'Indonesian', native: 'Bahasa Indonesia' },
    { code: 'ko-KR', api: 'ko', label: 'Korean', native: '한국어' },
    { code: 'ru-RU', api: 'ru', label: 'Russian', native: 'Русский' },
    { code: 'zh-CN', api: 'zh', label: 'Chinese (Simplified)', native: '简体中文' },
    { code: 'tr-TR', api: 'tr', label: 'Turkish', native: 'Türkçe' },
  ];
  const SITE_LANGUAGE_UI = {
    'en-US': { label: 'Language', button: 'Translate', busy: 'Translating this page…', done: 'Page translated. This is machine translation; wording may be imperfect. Code and command names are preserved.', original: 'Original English restored.', failed: 'Translation service unavailable. English text was restored. Try again later or configure a LibreTranslate endpoint.', },
    'hi-IN': { label: 'भाषा', button: 'अनुवाद करें', busy: 'पृष्ठ का अनुवाद हो रहा है…', done: 'पृष्ठ का मशीन अनुवाद हो गया। कुछ शब्द गलत हो सकते हैं; कोड और कमांड नाम नहीं बदले गए हैं।', original: 'मूल अंग्रेज़ी वापस आ गई।', failed: 'अनुवाद सेवा उपलब्ध नहीं है। अंग्रेज़ी पाठ बहाल कर दिया गया है।', },
    'bn-IN': { label: 'ভাষা', button: 'অনুবাদ করুন', busy: 'পাতাটি অনুবাদ করা হচ্ছে…', done: 'পাতাটি মেশিনে অনুবাদ করা হয়েছে। কিছু শব্দে ভুল থাকতে পারে; কোড ও কমান্ডের নাম অপরিবর্তিত।', original: 'মূল ইংরেজি ফিরিয়ে আনা হয়েছে।', failed: 'অনুবাদ পরিষেবা পাওয়া যাচ্ছে না। ইংরেজি লেখা ফিরিয়ে আনা হয়েছে।', },
    'es-ES': { label: 'Idioma', button: 'Traducir', busy: 'Traduciendo esta página…', done: 'Página traducida automáticamente. Puede haber imprecisiones; se conservan el código y los comandos.', original: 'Se ha restaurado el inglés original.', failed: 'El servicio de traducción no está disponible. Se ha restaurado el inglés.', },
    'fr-FR': { label: 'Langue', button: 'Traduire', busy: 'Traduction de la page…', done: 'Page traduite automatiquement. Le texte peut être imparfait ; le code et les commandes restent inchangés.', original: 'Le texte anglais original est rétabli.', failed: 'Service de traduction indisponible. Le texte anglais a été rétabli.', },
    'de-DE': { label: 'Sprache', button: 'Übersetzen', busy: 'Diese Seite wird übersetzt…', done: 'Seite maschinell übersetzt. Formulierungen können ungenau sein; Code und Befehle bleiben unverändert.', original: 'Der englische Originaltext wurde wiederhergestellt.', failed: 'Übersetzungsdienst nicht verfügbar. Englischer Text wurde wiederhergestellt.', },
    'pt-BR': { label: 'Idioma', button: 'Traduzir', busy: 'Traduzindo esta página…', done: 'Página traduzida por máquina. Pode haver imprecisões; código e comandos foram preservados.', original: 'O inglês original foi restaurado.', failed: 'Serviço de tradução indisponível. O texto em inglês foi restaurado.', },
    ar: { label: 'اللغة', button: 'ترجمة', busy: 'جارٍ ترجمة الصفحة…', done: 'تمت ترجمة الصفحة آليًا وقد لا تكون الصياغة دقيقة تمامًا. لم يتغير الكود أو أسماء الأوامر.', original: 'تمت استعادة النص الإنجليزي الأصلي.', failed: 'خدمة الترجمة غير متاحة. تمت استعادة النص الإنجليزي.', },
    'ja-JP': { label: '言語', button: '翻訳', busy: 'ページを翻訳しています…', done: '機械翻訳を適用しました。表現が不自然な場合があります。コードとコマンド名は変更していません。', original: '元の英語に戻しました。', failed: '翻訳サービスを利用できません。英語の文章に戻しました。', },
    'it-IT': { label: 'Lingua', button: 'Traduci', busy: 'Traduzione della pagina…', done: 'Traduzione automatica applicata. Il testo può essere impreciso; codice e comandi restano invariati.', original: 'Testo inglese originale ripristinato.', failed: 'Servizio di traduzione non disponibile. Testo inglese ripristinato.', },
    'id-ID': { label: 'Bahasa', button: 'Terjemahkan', busy: 'Menerjemahkan halaman…', done: 'Halaman diterjemahkan otomatis. Hasilnya mungkin kurang tepat; kode dan nama perintah tetap sama.', original: 'Teks bahasa Inggris asli dipulihkan.', failed: 'Layanan terjemahan tidak tersedia. Teks bahasa Inggris dipulihkan.', },
    'ko-KR': { label: '언어', button: '번역', busy: '페이지를 번역하는 중…', done: '기계 번역이 적용되었습니다. 표현이 부정확할 수 있으며 코드와 명령어 이름은 그대로 유지됩니다.', original: '원래 영어 문구로 복원했습니다.', failed: '번역 서비스를 사용할 수 없어 영어 문구로 복원했습니다.', },
    'ru-RU': { label: 'Язык', button: 'Перевести', busy: 'Перевод страницы…', done: 'Страница переведена автоматически. Возможны неточности; код и команды сохранены без изменений.', original: 'Исходный английский текст восстановлен.', failed: 'Сервис перевода недоступен. Английский текст восстановлен.', },
    'zh-CN': { label: '语言', button: '翻译页面', busy: '正在翻译此页面…', done: '页面已机器翻译，措辞可能不够准确；代码和命令名称保持不变。', original: '已恢复原始英文。', failed: '翻译服务不可用，已恢复英文文本。', },
    'tr-TR': { label: 'Dil', button: 'Çevir', busy: 'Sayfa çevriliyor…', done: 'Sayfa makine çevirisiyle çevrildi. İfadeler kusurlu olabilir; kod ve komut adları korunur.', original: 'Özgün İngilizce metin geri yüklendi.', failed: 'Çeviri hizmeti kullanılamıyor. İngilizce metin geri yüklendi.', },
  };
  let activeSiteLocale = 'en-US';
  const originalTextNodes = new Map();
  const originalAttributeValues = new Map();
  const defaultDocumentTitle = document.title;
  const defaultDocumentDir = document.documentElement.getAttribute('dir');
  const SITE_TRANSLATION_ENDPOINTS = [
    (typeof window.RESOLVX_TRANSLATION_ENDPOINT === 'string' && window.RESOLVX_TRANSLATION_ENDPOINT.trim())
      ? window.RESOLVX_TRANSLATION_ENDPOINT.trim()
      : 'https://translate.argosopentech.com/translate',
    'https://libretranslate.de/translate',
  ];
  const normalizeSiteLocale = (value) => SITE_LANGUAGES.find((language) => language.code.toLowerCase() === String(value || '').toLowerCase() || language.api === String(value || '').toLowerCase())?.code || 'en-US';
  const siteLanguageName = (code) => SITE_LANGUAGES.find((language) => language.code === code)?.native || 'English';
  const translateUiCopy = (code, key) => (SITE_LANGUAGE_UI[code] || SITE_LANGUAGE_UI['en-US'])[key] || SITE_LANGUAGE_UI['en-US'][key];
  function collectTranslatableSegments() {
    const segments = [];
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('.site-language-switcher,[data-no-translate],script,style,noscript,code,pre,kbd,svg,textarea,option')) continue;
      const sourceValue = node.nodeValue || '';
      if (sourceValue.trim().length < 2) continue;
      if (!originalTextNodes.has(node)) originalTextNodes.set(node, sourceValue);
      const original = originalTextNodes.get(node);
      const leading = original.match(/^\s*/u)?.[0] || '';
      const trailing = original.match(/\s*$/u)?.[0] || '';
      const text = original.slice(leading.length, original.length - trailing.length);
      if (!text.trim()) continue;
      segments.push({ text, apply: (translated) => { node.nodeValue = leading + translated + trailing; } });
    }
    const attrSelector = 'input[placeholder],textarea[placeholder],[aria-label],[title],meta[name="description"],meta[property^="og:"]';
    $$(attrSelector).forEach((element) => {
      if (element.closest('.site-language-switcher,[data-no-translate],code,pre,script,style')) return;
      if (!originalAttributeValues.has(element)) {
        const attrs = {};
        ['placeholder', 'aria-label', 'title', 'content'].forEach((name) => {
          if (element.hasAttribute(name)) attrs[name] = element.getAttribute(name);
        });
        originalAttributeValues.set(element, attrs);
      }
      const attrs = originalAttributeValues.get(element);
      Object.entries(attrs).forEach(([name, value]) => {
        if (!value || String(value).trim().length < 2) return;
        segments.push({ text: String(value).trim(), apply: (translated) => element.setAttribute(name, translated) });
      });
    });
    return segments;
  }
  function restoreOriginalPageText() {
    originalTextNodes.forEach((value, node) => { if (node.isConnected) node.nodeValue = value; });
    originalAttributeValues.forEach((attrs, element) => {
      if (!element.isConnected) return;
      Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
    });
    document.title = defaultDocumentTitle;
    if (defaultDocumentDir === null) document.documentElement.removeAttribute('dir');
    else document.documentElement.setAttribute('dir', defaultDocumentDir);
    document.documentElement.lang = 'en';
  }
  async function translateBatch(values, targetApi) {
    let finalError = null;
    for (const endpoint of SITE_TRANSLATION_ENDPOINTS) {
      try {
        const body = { q: values, source: 'en', target: targetApi, format: 'text' };
        if (typeof window.RESOLVX_TRANSLATION_API_KEY === 'string' && window.RESOLVX_TRANSLATION_API_KEY.trim()) body.api_key = window.RESOLVX_TRANSLATION_API_KEY.trim();
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body),
          mode: 'cors',
          credentials: 'omit',
        });
        if (!response.ok) throw new Error('Translation endpoint responded with HTTP ' + response.status);
        const result = await response.json();
        let translated = null;
        if (Array.isArray(result.translatedText)) translated = result.translatedText;
        else if (Array.isArray(result)) translated = result.map((item) => typeof item === 'string' ? item : item.translatedText);
        else if (typeof result.translatedText === 'string' && values.length === 1) translated = [result.translatedText];
        if (!Array.isArray(translated) || translated.length !== values.length || translated.some((item) => typeof item !== 'string')) {
          throw new Error('Translation endpoint returned an unexpected response shape');
        }
        return translated;
      } catch (error) {
        finalError = error;
      }
    }
    throw finalError || new Error('No translation endpoint is available');
  }
  async function translateSitePage(targetLocale, statusNode, applyButton) {
    const locale = normalizeSiteLocale(targetLocale);
    const copy = translateUiCopy(locale, 'busy');
    statusNode.textContent = copy;
    applyButton.disabled = true;
    const selected = SITE_LANGUAGES.find((language) => language.code === locale);
    try {
      restoreOriginalPageText();
      if (locale === 'en-US') {
        activeSiteLocale = locale;
        statusNode.textContent = translateUiCopy(locale, 'original');
        try { localStorage.setItem('resolvx-site-locale', locale); } catch (_) {}
        return;
      }
      const segments = collectTranslatableSegments();
      const texts = segments.map((segment) => segment.text);
      const translated = new Array(texts.length);
      let batch = [];
      let batchIndexes = [];
      let batchChars = 0;
      const flush = async () => {
        if (!batch.length) return;
        const response = await translateBatch(batch, selected.api);
        response.forEach((value, index) => { translated[batchIndexes[index]] = value; });
        batch = [];
        batchIndexes = [];
        batchChars = 0;
      };
      for (let i = 0; i < texts.length; i += 1) {
        const text = texts[i];
        if (batch.length >= 18 || (batch.length > 0 && batchChars + text.length > 5200)) await flush();
        batch.push(text);
        batchIndexes.push(i);
        batchChars += text.length;
      }
      await flush();
      segments.forEach((segment, index) => segment.apply(translated[index] || segment.text));
      activeSiteLocale = locale;
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
      if (wikiInput) applyWikiSearch(wikiInput.value);
      try { localStorage.setItem('resolvx-site-locale', locale); } catch (_) {}
      statusNode.textContent = translateUiCopy(locale, 'done');
    } catch (error) {
      restoreOriginalPageText();
      activeSiteLocale = 'en-US';
      statusNode.textContent = translateUiCopy(locale, 'failed');
      console.warn('ResolvX site translation failed:', error);
    } finally {
      applyButton.disabled = false;
      const current = SITE_LANGUAGES.find((language) => language.code === locale);
      if (current) applyButton.textContent = translateUiCopy(locale, 'button');
    }
  }
  function installSiteLanguageControl() {
    const navElement = $('.nav-links');
    if (!navElement || $('.site-language-switcher', navElement)) return;
    const box = document.createElement('div');
    box.className = 'site-language-switcher';
    box.setAttribute('data-no-translate', '');
    const label = document.createElement('label');
    label.textContent = translateUiCopy('en-US', 'label');
    const select = document.createElement('select');
    select.id = 'resolvx-site-language';
    select.setAttribute('aria-label', 'Choose website language');
    select.title = 'Translate public website copy through an external service. The site does not connect to Discord or ticket data.';
    const initial = (() => {
      try { return localStorage.getItem('resolvx-site-locale') || navigator.language || 'en-US'; } catch (_) { return navigator.language || 'en-US'; }
    })();
    SITE_LANGUAGES.forEach((language) => {
      const option = document.createElement('option');
      option.value = language.code;
      option.textContent = language.code === 'en-US' ? 'English' : (language.native + ' · ' + language.label);
      select.appendChild(option);
    });
    select.value = normalizeSiteLocale(initial);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = translateUiCopy(select.value, 'button');
    button.setAttribute('aria-label', 'Translate this page');
    const status = document.createElement('small');
    status.className = 'site-language-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    label.htmlFor = select.id;
    box.append(label, select, button, status);
    navElement.appendChild(box);
    select.addEventListener('change', () => {
      const code = normalizeSiteLocale(select.value);
      label.textContent = translateUiCopy(code, 'label');
      button.textContent = translateUiCopy(code, 'button');
    });
    button.addEventListener('click', () => { void translateSitePage(select.value, status, button); });
    const saved = (() => { try { return localStorage.getItem('resolvx-site-locale'); } catch (_) { return null; } })();
    if (saved && normalizeSiteLocale(saved) !== 'en-US') void translateSitePage(saved, status, button);
  }
  installSiteLanguageControl();

})();