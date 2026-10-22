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

  // Global index: feature page is a catalogue; detailed destinations live in the wiki.
  const searchItems = [
    { title: 'QueryFixr overview', description: 'Product purpose, current scope, and the boundary between the static site and Discord bot.', url: 'wiki.html#overview', keywords: 'about overview bot support discord help desk helpdesk product purpose static website' },
    { title: 'Feature catalogue', description: 'Search the inventory of capabilities represented in the bot project.', url: 'features.html#feature-catalog', keywords: 'feature features capability capabilities list catalogue catalog inventory implemented current' },
    { title: 'Getting started and permissions', description: 'Prepare the bot, database, permissions, and a safe first test ticket.', url: 'wiki.html#first-steps', keywords: 'start install setup onboarding requirements token permissions invite deploy test guild' },
    { title: 'Ticket lifecycle and statuses', description: 'Create, claim, pend, resume, close, reopen, and archive a ticket.', url: 'wiki.html#ticket-lifecycle', keywords: 'ticket tickets request case open claimed pending waiting resume close reopen archive status state' },
    { title: 'Duplicate prevention and ticket safety', description: 'Understand active-ticket prevention, cooldowns, state checks, and safe operations.', url: 'wiki.html#ticket-safety', keywords: 'duplicate cooldown spam already active repeated ticket create permission authorization safe transitions close order' },
    { title: 'Departments, tags and use-case presets', description: 'Route requests to a department and maintain useful issue labels.', url: 'wiki.html#departments', keywords: 'department category tag labels routing preset technical support sales refund account abuse staff role' },
    { title: 'Forms and reusable templates', description: 'Build versioned forms, validate answers, use conditional questions, and reuse templates.', url: 'wiki.html#forms', keywords: 'form schema field validation conditional template questionnaire intake branching activate deactivate' },
    { title: 'Custom support panels', description: 'Draft, preview, style, secure, publish, update, and remove public ticket panels.', url: 'wiki.html#panels', keywords: 'panel custom buttons role restrict branding publish preview draft snapshot confirmation layout' },
    { title: 'Ownership, priority and staff collaboration', description: 'Claim or reassign tickets, change priority, manage participants, and add internal notes.', url: 'wiki.html#team-tools', keywords: 'claim unclaim priority urgent critical assign reassign participants notes add remove user history staff' },
    { title: 'Reports, categories and voice actions', description: 'Manage report intake and taxonomy; learn the setup limits of ticket voice actions.', url: 'wiki.html#reports-voice', keywords: 'report complaint abuse moderation category subcategory flag threshold voice audio call' },
    { title: 'Transcripts, archive and recovery', description: 'Review what ticket records can be restored and what deleted Discord data cannot be recreated.', url: 'wiki.html#recovery', keywords: 'transcript html attachment reference archive restore recovery delete accidentally replay backup' },
    { title: 'Settings dashboard, themes and layout', description: 'Configure server defaults, visual themes, navigation labels, and administrative controls.', url: 'wiki.html#settings', keywords: 'settings dashboard theme color palette customization layout reorder buttons title description footer' },
    { title: 'Retention review and approved deletion', description: 'Review eligible closed or archived tickets before retention removal.', url: 'wiki.html#retention', keywords: 'retention archive cleanup purge delete eligible approve approval policy days privacy' },
    { title: 'Audit, event history and developer view', description: 'Inspect ticket events, overall and daily summaries, and restricted developer audit controls.', url: 'wiki.html#audit', keywords: 'audit logging logs event summary daily developer access accumulation diagnostics' },
    { title: 'Neon PostgreSQL, persistence and retries', description: 'Understand durable storage, outbox retries, rate limits, and operational failure handling.', url: 'wiki.html#storage-deployment', keywords: 'neon postgres postgresql database persistence durable outbox retry retry-after backoff rate-limit sqlite deployment' },
    { title: 'Bot languages and website translation', description: 'Understand server-level bot localization and the separate opt-in website translator.', url: 'wiki.html#language-automation', keywords: 'language locale translate translation localization multilingual native website translator twenty-one languages' },
    { title: 'Panel activity and control placement', description: 'Tune the supported rules that move ticket controls using message and visual-line thresholds.', url: 'wiki.html#panel-activity', keywords: 'auto move controls reposition bottom panel activity message cap visual line budget threshold' },
    { title: 'Support hours and time zones', description: 'Set weekday schedules, IANA time zones, overrides, and outside-hours intake behavior.', url: 'wiki.html#support-hours', keywords: 'schedule timezone time-zone IANA opening hours business hours closed interval department panel outside-hours' },
    { title: 'Inactivity warnings and auto-close', description: 'Configure idle thresholds, grace periods, and exemption roles or departments.', url: 'wiki.html#inactivity-automation', keywords: 'idle inactivity inactive timeout auto close autoclose warning grace deadline exemption roles department' },
    { title: 'Ticket channels and private threads', description: 'Choose where new tickets live and compare permission and capacity implications.', url: 'wiki.html#ticket-workspace', keywords: 'workspace private channel text-channel private-thread thread threads permissions visibility capacity' },
    { title: 'Premium demo mode', description: 'Use the demo entitlement toggle without mistaking it for subscription billing.', url: 'wiki.html#premium-demo', keywords: 'premium demo billing subscription payment entitlement pro tier paid simulated' },
    { title: 'Setup troubleshooting and recovery checks', description: 'Triage command errors, interaction timeouts, missing permissions, database access, and stale panels.', url: 'wiki.html#troubleshooting', keywords: 'troubleshoot error stack trace exception unknown message interaction failed timeout permission database startup command registration subcommand' },
    { title: 'Permissions and destructive-action safety', description: 'Understand admin gates, staff access, private ticket visibility, and confirmation requirements.', url: 'wiki.html#permissions-safety', keywords: 'permissions authorization administrator manage server staff role access ticket visibility privacy safe reset retention deletion confirmation' },
    { title: 'Command explorer', description: 'Browse the slash-command families documented by the bot source.', url: 'wiki.html#commands', keywords: 'command commands slash reference syntax copy category panel form ticket settings audit premium settings-reports' },
    { title: 'Roadmap and product boundaries', description: 'Separate implemented capabilities, live-acceptance requirements, and planned platform features.', url: 'wiki.html#roadmap', keywords: 'roadmap planned future unavailable workflow graph ai SLA CSAT knowledge base API dashboard OAuth' },
    { title: 'Frequently asked questions', description: 'Answers about installation, translation, privacy, database choices, recovery, and troubleshooting.', url: 'wiki.html#faq', keywords: 'faq question answers help feature availability database restore error permissions translation' },
  ];

  const SEARCH_EXPANSIONS = {
    'system-at-a-glance': 'about overview product purpose discord ticketing customer support help desk helpdesk workflow administration architecture current capabilities',
    'overview': 'about what is resolvx product identity discord bot support ticketing case management helpdesk static website command prefix capabilities limits',
    'first-steps': 'setup install requirements environment variables token database permissions invite deploy test guild first ticket node npm neon postgres configuration production',
    'ticket-lifecycle': 'create open claim claimed unclaim unclaimed assign ownership pending waiting hold resume reopen close archive archived state status request case duplicate prevention transcript upload lock permissions close order',
    'ticket-safety': 'duplicate open prevention already active cooldown spam request idempotency safe transitions authorized action permission gate transaction close sequence lock transcript retry duplicate ticket prevention',
    'departments': 'category categories team routing route-to issue labels tags presets usecase use-case sales technical support accounts refunds abuse staff role category create remove rename',
    'forms': 'form forms questionnaire application intake fields validation required conditional schema template reusable activate deactivate version answers submit branching template save apply list update delete',
    'panels': 'panel panels entry point entrypoint public message launcher buttons labels emoji branding role access roles order preview publish draft layout custom panel id snapshot republish target department form confirmation',
    'team-tools': 'staff moderator agent priority severity critical urgent high normal low owner ownership claim unclaim reassign participant user internal note collaboration priority roles audit notes add-user remove-user history',
    'reports-voice': 'report reports reporting complaint abuse flag threshold category subcategory moderation history events audit review safety voice private audio call join leave start end capacity report intake',
    'recovery': 'restore recovery recover undelete deletion deleted accidentally mistake wrong delete transcript attachments archived messages replay channel replacement backup restoration review intent source id author metadata not exact copy',
    'settings': 'settings configuration config theme color colour appearance customize customization dashboard controls preference support hours language locale timezone inactivity ticket workspace private thread private text channel layout button order labels emoji reset repair refresh protected controls',
    'retention': 'retention archive closed-days archive-days cleanup purge erase delete deletion approval confirm review privacy data lifetime keep duration eligible ticket archived closed cancellation',
    'operations': 'setup install onboarding repair refresh restore deploy deployment github actions self-update watchdog restart host systemd environment variable configuration diagnostics permissions',
    'audit': 'audit developer diagnostics logs log summary daily accumulation activity security permissions destructive action retention developer-view event history daily date raw event',
    'reliability': 'neon postgresql postgres database persistence durable storage sqlite outbox retry backoff rate limit retry-after api error timeout transaction source of truth migration environment variables',
    'premium': 'premium paid subscription payments billing entitlement demo toggle simulated not real billing tier pro free',
    'support-hours': 'support hours opening schedule timezone time zone IANA intervals weekday split shift closed outside-hours allow restrict intake next opening business hours not SLA department override panel override daylight saving',
    'inactivity-automation': 'inactivity idle inactive timeout grace auto-close autoclose warning threshold deadline exemptions exempt role exempt department clear warning stale ticket',
    'ticket-workspace': 'ticket workspace private text channel private thread channels threads new-ticket permissions member staff visibility archive create resource mode parent channel manage threads',
    'localization': 'bot message language locale translation localization i18n twenty-one 21 supported catalogs English Hindi Bengali Spanish French German Brazilian Portuguese Arabic Japanese Italian Indonesian Korean Russian Simplified Chinese Turkish Dutch Polish Ukrainian Greek Czech Swedish native locale server language fallback user-authored text',
    'language-automation': 'locale language languages translation translate translated native internationalization i18n Italian Indonesian Korean Russian Chinese simplified Turkish Hindi Bengali Spanish French German Portuguese Arabic Japanese Dutch Polish Ukrainian Greek Czech Swedish Nederlands Polski Українська Ελληνικά Čeština Svenska taal vertalen język tłumaczenie мова переклад γλώσσα μετάφραση jazyk překlad språk översättning website translator external endpoint machine translation public content right-to-left support-hours timezone inactivity private thread',
    'panel-activity': 'panel activity auto move move controls reposition ticket panel message cap visual line budget minimum messages threshold bottom placement control ordering',
    'premium-demo': 'premium demo entitlements tier status toggle simulated billing subscription payment no checkout free pro product mode',
    'troubleshooting': 'troubleshooting troubleshoot diagnostic stack trace error exception command registration invalid command application command 25 subcommands interaction failed unknown interaction unknown message unknown channel missing permissions permission overwrites database connection timeout postgres neon retry-after rate limit stale panel command deploy slash command startup build',
    'commands': 'command slash commands syntax copy reference /qf settings-reports reporting taxonomy report-categories report-subcategory-add report-subcategory-edit report-subcategory-remove panel-create template-save locale',
    'faq': 'faq questions answers troubleshooting help guide common problem error issue invite website disconnected production acceptance privacy translation locales restore limitations database use-case settings-reports',
    'roadmap': 'planned future not available roadmap workflow graph knowledge base quick replies sla csat customer satisfaction surveys api web dashboard oauth multi channel ai generative retrieval rag vector database real billing',
    'storage-deployment': 'neon postgresql postgres database persistence durable store outbox retry deploy deployment hosting github actions systemd env connection pool timeout rate limits backoff event record storage provider',
  };
  const SEARCH_SYNONYM_GROUPS = [
    ['ticket', 'tickets', 'request', 'requests', 'case', 'cases', 'tiket', 'bilet', 'заявка', 'заявки', '工单', 'チケット', 'टिकट', 'টিকিট', 'تذكرة', 'solicitud', 'solicitudes', 'demande', 'anfrage', 'ticketaanvraag', 'aanvraag', 'zaak', 'zgłoszenie', 'zgłoszenia', 'sprawa', 'звернення', 'запит', 'тікет', 'αίτημα', 'αίτηση', 'požadavek', 'požadavky', 'ärende', 'ärenden'],
    ['form', 'forms', 'questionnaire', 'intake', 'template', 'formulario', 'formulário', 'formulaire', 'formular', 'modulo', 'formulir', '양식', 'форма', '表单', 'نموذج', 'フォーム', 'formulier', 'formulier', 'formularz', 'форма-заявки', 'φόρμα', 'formulář', 'formulär'],
    ['panel', 'panels', 'button', 'buttons', 'launcher', 'entrypoint', 'menú', 'menue', 'pannello', 'paneli', '패널', 'панель', '面板', 'パネル', 'paneel', 'knop', 'knoppen', 'przycisk', 'przyciski', 'кнопка', 'кнопки', 'πίνακας', 'κουμπί', 'tlačítko', 'tlačítka', 'knapp', 'knappar'],
    ['department', 'departments', 'category', 'categories', 'team', 'routing', 'route', 'equipo', 'departamento', 'département', 'abteilung', 'reparto', 'departemen', '부서', 'отдел', '部门', 'قسم', 'विभाग', 'বিভাগ', 'afdeling', 'dział', 'відділ', 'τμήμα', 'oddělení', 'avdelning'],
    ['tag', 'tags', 'label', 'labels', 'etiqueta', 'etiquetas', 'étiquette', 'marcador', 'tagar', '태그', 'метка', '标签', 'ラベル', 'टैग', 'ট্যাগ', 'label', 'etykieta', 'позначка', 'ετικέτα', 'štítek', 'etikett'],
    ['priority', 'urgent', 'critical', 'severity', 'urgency', 'prioridad', 'priorité', 'priorität', 'priorità', 'prioritas', '우선순위', 'приоритет', '优先级', '優先度', 'प्राथमिकता', 'অগ্রাধিকার', 'prioriteit', 'priorytet', 'пріоритет', 'προτεραιότητα', 'priorita', 'prioritet'],
    ['claim', 'claimed', 'unclaim', 'unclaimed', 'assign', 'assigned', 'reassign', 'owner', 'ownership', 'handoff', 'release', 'responsibility', 'reasignar', 'zuweisen', 'назначить', '재할당', '담당자', 'toewijzen', 'toewijzing', 'przypisać', 'przypisanie', 'призначити', 'призначення', 'ανάθεση', 'přiřadit', 'přiřazení', 'tilldela', 'tilldelning'],
    ['pending', 'waiting', 'hold', 'resume', 'reopen', 'reopened', 'close', 'closed', 'archive', 'archived', 'status', 'lifecycle', 'workflow state', 'espera', 'attente', 'wartend', 'beklemede', '대기', 'ожидание', '等待', 'wachten', 'hervatten', 'heropenen', 'sluiten', 'archief', 'oczekuje', 'wznowić', 'zamknij', 'archiwum', 'очікує', 'відновити', 'закрити', 'очікування', 'αναμονή', 'επαναφορά', 'κλείσιμο', 'čeká', 'obnovit', 'zavřít', 'čekající', 'väntande', 'återuppta', 'stäng', 'arkiv'],
    ['report', 'reports', 'reporting', 'complaint', 'abuse', 'flag', 'threshold', 'subcategory', 'denuncia', 'signalement', 'meldung', 'laporan', '신고', 'жалоба', '举报', '報告', 'रिपोर्ट', 'প্রতিবেদন', 'melding', 'zgłoszenie', 'скарга', 'αναφορά', 'hlášení', 'rapport', 'zgłoszenia', 'скарги', 'καταγγελία', 'nahlášení', 'anmälan'],
    ['audit', 'audits', 'logs', 'log', 'history', 'events', 'diagnostics', 'developer', 'actividad', 'journal', 'protokoll', 'riwayat', '감사', 'журнал', '审计', '監査', 'ऑडिट', 'নিরীক্ষা', 'logboek', 'geschiedenis', 'dziennik', 'historia', 'журнал аудиту', 'έλεγχος', 'historie', 'logg', 'historik'],
    ['voice', 'audio', 'call', 'sound', 'voicechat', 'voice chat', 'llamada', 'vocal', 'sprachchat', 'suara', '음성', 'голос', '语音', '音声', 'आवाज़', 'ভয়েস', 'stem', 'spraak', 'głos', 'голосова', 'φωνή', 'hlas', 'röst'],
    ['restore', 'recovery', 'recover', 'undelete', 'rebuild', 'replay', 'restore channel', 'accidental deletion', 'mistake', 'transcript', 'backup', 'recoverable', 'restaurar', 'récupération', 'wiederherstellen', 'pemulihan', '복구', 'восстановление', '恢复', '復元', 'पुनर्प्राप्ति', 'পুনরুদ্ধার', 'herstellen', 'herstel', 'przywróć', 'odzyskiwanie', 'відновити', 'відновлення', 'επαναφορά', 'obnovení', 'obnovit', 'återställning', 'återställa'],
    ['database', 'databases', 'postgres', 'postgresql', 'neon', 'persistence', 'storage', 'sqlite', 'outbox', 'durable', 'base de datos', 'datenbank', 'database', '데이터베이스', 'база', '数据库', 'データベース', 'डेटाबेस', 'ডেটাবেস', 'databank', 'gegevensbank', 'baza danych', 'база даних', 'βάση δεδομένων', 'databáze', 'databas'],
    ['translate', 'translation', 'language', 'languages', 'locale', 'localization', 'internationalization', 'i18n', 'multilingual', 'idioma', 'langue', 'sprache', 'lingua', 'bahasa', '언어', 'язык', '语言', '言語', 'भाषा', 'ভাষা', 'لغة', 'dil', 'taal', 'vertalen', 'vertaling', 'język', 'tłumaczenie', 'tłumaczyć', 'мова', 'переклад', 'перекладати', 'γλώσσα', 'μετάφραση', 'jazyk', 'překlad', 'překládat', 'språk', 'översättning', 'översätta'],
    ['support-hours', 'opening', 'hours', 'schedule', 'timezone', 'time-zone', 'business-hours', 'horario', 'heures', 'öffnungszeiten', 'jam', '운영 시간', 'часы работы', '营业时间', '営業時間', 'समय', 'সময়', 'openingstijden', 'openingstijd', 'godziny pracy', 'часи роботи', 'ώρες λειτουργίας', 'provozní doba', 'öppettider', 'werktijden', 'werktijd', 'časový plán', 'pracovní doba', 'supporttider', 'öppettider'],
    ['inactivity', 'idle', 'inactive', 'timeout', 'grace', 'auto-close', 'autoclose', 'inactividad', 'inactivité', 'inaktivität', 'ketidakaktifan', '비활성', 'неактивность', '不活跃', '非アクティブ', 'निष्क्रियता', 'নিষ্ক্রিয়তা', 'inactiviteit', 'nieaktywność', 'неактивність', 'αδράνεια', 'neaktivita', 'inaktivitet', 'stilstand', 'bezczynność', 'бездіяльність', 'αδράνεια', 'nečinnost', 'inaktivitet'],
    ['retention', 'retained', 'retaining', 'archive', 'cleanup', 'purge', 'delete', 'deletion', 'privacy', 'retención', 'conservation', 'aufbewahrung', 'retensi', '보존', 'хранение', '保留', '保持', 'प्रतिधारण', 'সংরक्षण', 'bewaren', 'retentie', 'przechowywanie', 'zachowanie', 'зберігання', 'διατήρηση', 'uchovávání', 'lagring', 'bewaartermijn', 'bewaren', 'przechowywanie danych', 'зберігання даних', 'διατήρηση δεδομένων', 'uchovávání dat', 'datalagring'],
    ['premium', 'billing', 'payment', 'payments', 'subscription', 'entitlement', 'demo', 'facturación', 'paiement', 'zahlung', 'pembayaran', '결제', 'оплата', '账单', '請求', 'भुगतान', 'পেমেন্ট', 'betaling', 'betalning', 'płatność', 'abonament', 'оплата', 'підписка', 'πληρωμή', 'předplatné'],
    ['theme', 'themes', 'appearance', 'branding', 'style', 'color', 'colour', 'layout', 'personalization', 'appearance', 'tema', 'apparence', 'darstellung', 'tampilan', '테마', 'оформление', '主题', '外観', 'रूप-रंग', 'চেহারা', 'thema', 'uiterlijk', 'wygląd', 'тема', 'зовнішній вигляд', 'εμφάνιση', 'vzhled', 'utseende'],
    ['setup', 'install', 'installation', 'configure', 'configuration', 'deploy', 'deployment', 'refresh', 'repair', 'update', 'upgrade', 'self-update', 'installation', 'instalación', 'installation', 'installation', 'instalasi', '설치', 'установка', '部署', 'インストール', 'स्थापना', 'ইনস্টল', 'installeren', 'installatie', 'instalacja', 'встановлення', 'εγκατάσταση', 'instalace', 'installation', 'installera', 'installation', 'konfiguracja', 'налаштування', 'ρύθμιση', 'nastavení'],
    ['thread', 'threads', 'private-thread', 'channel', 'channels', 'workspace', 'text-channel', 'canal', 'faden', 'benang', '스레드', 'поток', '线程', 'スレッド', 'थ्रेड', 'থ্রেড', 'thread', 'wątek', 'гілка', 'νήμα', 'vlákno', 'tråd', 'draad', 'privéthread', 'kanaal', 'kanały', 'приватний потік', 'νήμα συζήτησης', 'vlákno', 'privátní vlákno', 'tråd', 'privat tråd'],
  ];
  const SEARCH_STOP_WORDS = new Set([
    'the','what','how','when','where','why','is','are','was','were','a','an','to','for','of','and','or','my','our','your',
    'can','does','do','it','in','on','with','from','me','please','show','find','view','read','tell','about','this','that',
    'all','every','much','many','way','ways','work','works','working','use','using','make','get','want','need','best','page','de','het','een','und','der','die','das','ein','eine','les','des','un','una','las','los','que','pour','con','dla','jest','i','w','na','do','ze','ta','į','и','та','для','це','що','και','το','στο','της','σε','je','na','do','och','att','som',
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
    'What does QueryFixr do?': 'purpose overview discord support ticket helpdesk request management',
    'Can I invite the bot from this website?': 'invite install add bot discord oauth authorization link missing setup',
    'Does the website run bot commands or show live tickets?': 'website static github pages vercel dashboard login api live data connection',
    'Why do command examples say /qf instead of /resolvx?': 'slash command root rename brand registered name deployed command',
    'What does a member do to open a ticket?': 'create new support request ticket panel button department form intake',
    'Can I customize multiple public support panels?': 'multi-panel builder draft publish entry button roles emoji style order',
    'Are form templates the same as active forms?': 'template activate deactivate schema version form builder',
    'Can QueryFixr restore a deleted ticket exactly as it was?': 'restore recover recovery undelete delete accidental channel original ids authors replay transcript limit',
    'What happens to attachments during recovery?': 'attachment files size limit archived message media unavailable expired',
    'Which database should production use?': 'neon postgresql postgres sqlite durable database persistence',
    'Are slash commands and button controls both supported?': 'fallback parity command interaction component button select menu live guild testing',
    'Does Premium demo mode mean billing is connected?': 'premium payments subscription billing toggle entitlement demo fake simulated',
    'What should I check if a button or command does nothing?': 'troubleshoot error timeout permissions interaction expired database logs command registration',
    'Can I hide repair or destructive controls when customizing Settings?': 'settings layout builder protected repair refresh reset delete everything safety hide controls',
    'Does QueryFixr provide AI answers, a knowledge base, SLA timers, or customer satisfaction surveys now?': 'roadmap planned ai knowledge base kb sla service level agreement business hours csat survey translation channels',
    "Does changing the website language change the bot's language?": 'website translator browser site copy external endpoint bot locale server language separate setting user-authored ticket text',
    'Which languages does the bot message catalog include?': '21 twenty-one English Hindi Bengali Spanish French German Portuguese Brazil Arabic Japanese Italian Indonesian Korean Russian Chinese Turkish Dutch Polish Ukrainian Greek Czech Swedish',
    'Will website translation translate code or ticket data?': 'public text code commands protected technical identifiers privacy no Discord data external translator machine translation',
    'Are support hours an SLA or response-time guarantee?': 'support hours business hours intake schedule time zone outside-hours no SLA response-time target escalation',
    'Does changing from channels to threads convert existing tickets?': 'workspace mode private channels private threads new tickets existing ticket stays same migration',
    'Why is report-category management under settings-reports?': 'command group 25 subcommands report categories taxonomy report subcategory registration Discord settings-reports group',
    'What should I share when asking for help with an error?': 'stack trace logs branch commit sanitized exception startup command deployment interaction permissions secrets token database url'

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

  // The feature page is a catalogue, so let visitors filter it without loading another service.
  const featureSearchInput = $('[data-feature-search]');
  const featureCards = $('[data-feature-card]');
  const featureResultCount = $('[data-feature-result-count]');
  const featureNoResults = $('[data-feature-no-results]');
  const applyFeatureSearch = (query) => {
    const normalized = String(query || '').trim();
    let visible = 0;
    featureCards.forEach((card) => {
      const corpus = (card.textContent || '') + ' ' + (card.dataset.searchKeywords || '');
      const matches = !normalized || matchesSearchCorpus(corpus, normalized);
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    if (featureResultCount) {
      featureResultCount.textContent = normalized
        ? (visible + ' of ' + featureCards.length + ' capabilities')
        : (featureCards.length + ' capabilities');
    }
    if (featureNoResults) featureNoResults.hidden = !normalized || visible > 0;
  };
  if (featureSearchInput) {
    applyFeatureSearch('');
    featureSearchInput.addEventListener('input', () => applyFeatureSearch(featureSearchInput.value));
  }
  $('[data-clear-feature-search]').forEach((button) => button.addEventListener('click', () => {
    if (!featureSearchInput) return;
    featureSearchInput.value = '';
    applyFeatureSearch('');
    featureSearchInput.focus();
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
    { code: 'nl-NL', api: 'nl', label: 'Dutch', native: 'Nederlands' },
    { code: 'pl-PL', api: 'pl', label: 'Polish', native: 'Polski' },
    { code: 'uk-UA', api: 'uk', label: 'Ukrainian', native: 'Українська' },
    { code: 'el-GR', api: 'el', label: 'Greek', native: 'Ελληνικά' },
    { code: 'cs-CZ', api: 'cs', label: 'Czech', native: 'Čeština' },
    { code: 'sv-SE', api: 'sv', label: 'Swedish', native: 'Svenska' },
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
    'nl-NL': { label: 'Taal', button: 'Vertalen', busy: 'Deze pagina wordt vertaald…', done: 'De pagina is automatisch vertaald. De formulering kan onnauwkeurig zijn; code en opdrachten blijven ongewijzigd.', original: 'De oorspronkelijke Engelse tekst is hersteld.', failed: 'De vertaaldienst is niet beschikbaar. De Engelse tekst is hersteld.', },
    'pl-PL': { label: 'Język', button: 'Przetłumacz', busy: 'Tłumaczenie strony…', done: 'Strona została przetłumaczona automatycznie. Sformułowania mogą być niedokładne; kod i komendy pozostają bez zmian.', original: 'Przywrócono oryginalny tekst angielski.', failed: 'Usługa tłumaczenia jest niedostępna. Przywrócono tekst angielski.', },
    'uk-UA': { label: 'Мова', button: 'Перекласти', busy: 'Перекладаємо сторінку…', done: 'Сторінку перекладено автоматично. Формулювання можуть бути неточними; код і команди не змінено.', original: 'Відновлено оригінальний англійський текст.', failed: 'Служба перекладу недоступна. Відновлено англійський текст.', },
    'el-GR': { label: 'Γλώσσα', button: 'Μετάφραση', busy: 'Μετάφραση σελίδας…', done: 'Η σελίδα μεταφράστηκε αυτόματα. Η διατύπωση μπορεί να μην είναι ακριβής· ο κώδικας και οι εντολές παραμένουν αμετάβλητα.', original: 'Το αρχικό αγγλικό κείμενο επαναφέρθηκε.', failed: 'Η υπηρεσία μετάφρασης δεν είναι διαθέσιμη. Επαναφέρθηκε το αγγλικό κείμενο.', },
    'cs-CZ': { label: 'Jazyk', button: 'Přeložit', busy: 'Probíhá překlad stránky…', done: 'Stránka byla strojově přeložena. Formulace mohou být nepřesné; kód a příkazy zůstávají beze změny.', original: 'Byl obnoven původní anglický text.', failed: 'Překladová služba není dostupná. Byl obnoven anglický text.', },
    'sv-SE': { label: 'Språk', button: 'Översätt', busy: 'Översätter sidan…', done: 'Sidan har maskinöversatts. Formuleringar kan vara oprecisa; kod och kommandon är oförändrade.', original: 'Den ursprungliga engelska texten har återställts.', failed: 'Översättningstjänsten är inte tillgänglig. Den engelska texten har återställts.', },
  };
  let activeSiteLocale = 'en-US';
  const originalTextNodes = new Map();
  const originalAttributeValues = new Map();
  const defaultDocumentTitle = document.title;
  const defaultDocumentDir = document.documentElement.getAttribute('dir');
  const SITE_TRANSLATION_ENDPOINTS = [
    (typeof window.QUERYFIXR_TRANSLATION_ENDPOINT === 'string' && window.QUERYFIXR_TRANSLATION_ENDPOINT.trim())
      ? window.QUERYFIXR_TRANSLATION_ENDPOINT.trim()
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
        if (typeof window.QUERYFIXR_TRANSLATION_API_KEY === 'string' && window.QUERYFIXR_TRANSLATION_API_KEY.trim()) body.api_key = window.QUERYFIXR_TRANSLATION_API_KEY.trim();
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
      console.warn('QueryFixr site translation failed:', error);
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