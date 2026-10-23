(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let activeSiteLocale = 'en-US';

  // Remote artwork must not leave broken-image icons in the header or hero.
  function installExternalImageFallbacks() {
    const handleImageFailure = (image) => {
      if (image.dataset.fallbackApplied === 'true') return;
      image.dataset.fallbackApplied = 'true';

      if (image.classList.contains('brand-full-logo') || image.classList.contains('brand-qf-logo')) {
        const fallback = document.createElement('span');
        fallback.className = 'brand-text-fallback';
        fallback.textContent = 'QueryFixr';
        image.replaceWith(fallback);
        return;
      }

      if (image.classList.contains('hero-banner-image')) {
        const fallback = document.createElement('div');
        fallback.className = 'hero-banner-fallback';
        fallback.setAttribute('role', 'img');
        fallback.setAttribute('aria-label', 'QueryFixr product banner artwork unavailable');

        const mark = document.createElement('span');
        mark.className = 'hero-banner-fallback-mark';
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = 'QF';

        const name = document.createElement('strong');
        name.textContent = 'QueryFixr';

        const tagline = document.createElement('span');
        tagline.textContent = 'Queries Solved. Support Evolved.';
        fallback.append(mark, name, tagline);
        image.replaceWith(fallback);
        return;
      }

      // The CTA logo is decorative; the orbit itself remains meaningful without it.
      image.remove();
    };

    $$('.brand-full-logo, .brand-qf-logo, .hero-banner-image, .cta-logo').forEach((image) => {
      image.addEventListener('error', () => handleImageFailure(image), { once: true });
      // A cached failure can occur before this deferred script installs listeners.
      if (image.complete && image.naturalWidth === 0) handleImageFailure(image);
    });
  }
  installExternalImageFallbacks();

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
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || menuToggle.getAttribute('aria-expanded') !== 'true') return;
      closeMenu();
      menuToggle.focus();
    });
    document.addEventListener('pointerdown', (event) => {
      if (menuToggle.getAttribute('aria-expanded') !== 'true') return;
      const target = event.target;
      if (target instanceof Element && !target.closest('.site-header')) closeMenu();
    });

    // Reset the compact menu whenever the viewport crosses its CSS breakpoint.
    // Otherwise a menu opened on a phone can reappear unexpectedly after rotation.
    if (typeof window.matchMedia === 'function') {
      const mobileViewport = window.matchMedia('(max-width: 760px)');
      const syncNavigationForViewport = (event) => {
        const focusWasInToggle = document.activeElement === menuToggle;
        const focusWasInNav = nav.contains(document.activeElement);
        closeMenu();
        if (event.matches && focusWasInNav) {
          // The nav is hidden on mobile when closed, so keep keyboard focus visible.
          menuToggle.focus();
        } else if (!event.matches && focusWasInToggle) {
          // The toggle disappears on desktop; move focus into the now-visible nav.
          const firstNavigableItem = $('a, button', nav);
          if (firstNavigableItem) firstNavigableItem.focus();
        }
      };
      if (typeof mobileViewport.addEventListener === 'function') {
        mobileViewport.addEventListener('change', syncNavigationForViewport);
      } else if (typeof mobileViewport.addListener === 'function') {
        // Compatibility with older Safari versions.
        mobileViewport.addListener(syncNavigationForViewport);
      }
    }
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
      button.addEventListener('click', async () => {
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
        const localizedState = await translateRuntimeTexts([state.title, state.description, state.next]);
        if (title) title.textContent = localizedState[0];
        if (description) description.textContent = localizedState[1];
        if (next) next.textContent = localizedState[2];
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
      const runtimeLabels = await translateRuntimeTexts([success ? 'Copied' : 'Select & copy', success ? 'Copied!' : 'Copy manually', success ? 'Copied command' : 'Copy the command']);
      if (label) label.textContent = runtimeLabels[0];
      else button.textContent = runtimeLabels[1];
      button.classList.toggle('is-copied', success);
      button.setAttribute('aria-label', runtimeLabels[2] + ' ' + value);
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
  let readingProgressFrame = 0;
  const updateReadingProgress = () => {
    if (!progressBar || readingProgressFrame) return;
    // Coalesce scroll/resize events so layout reads and the progress-bar write happen
    // at most once per animation frame, rather than once per raw scroll event.
    readingProgressFrame = window.requestAnimationFrame(() => {
      readingProgressFrame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressBar.style.transform = 'scaleX(' + ratio + ')';
    });
  };
  if (progressBar) {
    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    window.addEventListener('resize', updateReadingProgress, { passive: true });
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
  const searchItems = [];
  let searchIndexPromise = null;
  let searchIndexState = 'idle';

  const SEARCH_EXPANSIONS = {
    'system-at-a-glance': 'about overview product purpose discord ticketing customer support help desk helpdesk workflow administration architecture current capabilities',
    'overview': 'about what is QueryFixr product identity discord bot support ticketing case management helpdesk static website command prefix capabilities limits',
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
    'commands': 'command slash commands syntax copy reference /supportforge settings-reports reporting taxonomy report-categories report-subcategory-add report-subcategory-edit report-subcategory-remove panel-create template-save locale',
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
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘`]/g, "'")
      .replace(/[–—‐‑]/g, ' ')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }
  function searchTerms(query) {
    return normalizeSearchText(query).split(/\s+/u)
      .filter((term) => term.length > 1 && !SEARCH_STOP_WORDS.has(term));
  }
  function boundedEditDistanceOne(a, b) {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 4) return false;
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i += 1; j += 1; continue; }
      edits += 1;
      if (edits > 1) return false;
      if (a.length > b.length) i += 1;
      else if (b.length > a.length) j += 1;
      else { i += 1; j += 1; }
    }
    if (i < a.length || j < b.length) edits += 1;
    return edits <= 1;
  }
  const synonymGroupFor = (term) => SEARCH_SYNONYM_GROUPS.find((values) =>
    values.some((value) => normalizeSearchText(value) === term));
  function bestTokenScore(term, tokens, corpus) {
    let best = 0;
    for (const candidate of tokens) {
      if (candidate === term) best = Math.max(best, 7);
      else if (candidate.startsWith(term) && term.length >= 2) best = Math.max(best, 4.3);
      else if (term.startsWith(candidate) && candidate.length >= 4) best = Math.max(best, 2.1);
      else if (term.length >= 5 && candidate.includes(term)) best = Math.max(best, 2.7);
      else if (boundedEditDistanceOne(term, candidate)) best = Math.max(best, 1.7);
      if (best >= 7) return best;
    }
    if (best) return best;
    const group = synonymGroupFor(term);
    if (!group) return 0;
    for (const synonym of group) {
      const alias = normalizeSearchText(synonym);
      if (!alias) continue;
      if (alias.includes(' ')) {
        if (corpus.includes(alias)) best = Math.max(best, 2.9);
      } else if (tokens.includes(alias)) {
        best = Math.max(best, 3.1);
      } else if (alias.length >= 3 && tokens.some((candidate) => candidate.startsWith(alias))) {
        best = Math.max(best, 2.2);
      }
    }
    return best;
  }
  function searchScore(corpusText, query) {
    const rawQuery = String(query || '').trim();
    if (!rawQuery) return 1;
    const corpus = normalizeSearchText(corpusText);
    const terms = searchTerms(rawQuery);
    if (!terms.length || !corpus) return 0;
    const tokens = corpus.split(/\s+/u).filter(Boolean);
    let hits = 0;
    let score = 0;
    for (const term of terms) {
      const part = bestTokenScore(term, tokens, corpus);
      if (part > 0) { hits += 1; score += part; }
    }
    if (!hits) return 0;
    const coverage = hits / terms.length;
    const phrase = normalizeSearchText(rawQuery);
    const phraseBonus = phrase.length > 2 && corpus.includes(phrase) ? 12 : 0;
    const titleCompleteness = terms.length > 1 ? 0.35 + (coverage * 0.65) : 1;
    return (score + coverage * 6 + phraseBonus) * titleCompleteness;
  }
  function matchesSearchCorpus(corpusText, query) {
    return searchScore(corpusText, query) > 0;
  }
  function searchItemCorpus(item) {
    const hash = new URL(item.url, document.baseURI).hash.slice(1);
    return [item.title, item.description, item.keywords, item.text, SEARCH_EXPANSIONS[hash] || ''].join(' ');
  }
  function safeText(element, selector) {
    return (element.querySelector(selector)?.textContent || '').replace(/\\s+/gu, ' ').trim();
  }
  function indexRecord({ element, pageUrl, type, forcedUrl = null }) {
    const title = safeText(element, 'h1,h2,h3,h4,summary') || element.getAttribute('aria-label') || '';
    const text = (element.textContent || '').replace(/\\s+/gu, ' ').trim();
    if (!title || text.length < 8) return null;
    const description = safeText(element, 'p').slice(0, 280) || text.slice(0, 280);
    const rawHref = forcedUrl || element.getAttribute('href') || (element.id ? pageUrl.pathname + '#' + element.id : pageUrl.href);
    const url = new URL(rawHref, pageUrl).href;
    return {
      title,
      description,
      sourceTitle: title,
      sourceDescription: description,
      url,
      keywords: element.getAttribute('data-search-keywords') || element.dataset?.searchKeywords || '',
      text,
      type,
    };
  }
  async function buildSearchIndex() {
    const pages = [
      { path: 'index.html', type: 'Home' },
      { path: 'features.html', type: 'Features' },
      { path: 'wiki.html', type: 'Wiki' },
    ];
    const loaded = await Promise.all(pages.map(async (page) => {
      const url = new URL(page.path, document.baseURI);
      const response = await fetch(url.href, {
        headers: { Accept: 'text/html' },
        credentials: 'same-origin',
        cache: 'force-cache',
      });
      if (!response.ok) throw new Error('Could not load ' + page.path + ' (HTTP ' + response.status + ')');
      return { ...page, url, doc: new DOMParser().parseFromString(await response.text(), 'text/html') };
    }));
    const records = [];
    const seen = new Set();
    const add = (record) => {
      if (!record) return;
      const identity = record.type + '|' + record.url + '|' + normalizeSearchText(record.title);
      if (seen.has(identity)) return;
      seen.add(identity);
      records.push(record);
    };
    for (const page of loaded) {
      const { doc, url, type } = page;
      if (type === 'Features') {
        doc.querySelectorAll('[data-feature-card]').forEach((element) => add(indexRecord({ element, pageUrl: url, type })));
        const heroHeading = doc.querySelector('main h1');
        if (heroHeading) add(indexRecord({ element: heroHeading.closest('section') || heroHeading.parentElement, pageUrl: url, type, forcedUrl: url.href }));
      } else if (type === 'Wiki') {
        doc.querySelectorAll('[data-wiki-article]').forEach((element) => {
          add(indexRecord({ element, pageUrl: url, type, forcedUrl: url.pathname + '#' + element.id }));
        });
        doc.querySelectorAll('[data-wiki-faq]').forEach((element) => {
          const summary = safeText(element, 'summary');
          if (!summary) return;
          const description = safeText(element, 'p').slice(0, 280);
          add({
            title: summary,
            description,
            sourceTitle: summary,
            sourceDescription: description,
            url: url.pathname + '#faq',
            keywords: '',
            text: (element.textContent || '').replace(/\\s+/gu, ' ').trim(),
            type: 'FAQ',
          });
        });
      } else {
        const main = doc.querySelector('main') || doc.body;
        main.querySelectorAll('section[id]').forEach((element) => {
          if (element.matches('.closing-cta')) return;
          add(indexRecord({ element, pageUrl: url, type }));
        });
        main.querySelectorAll('.hero-copy, .capability-card').forEach((element) => add(indexRecord({ element, pageUrl: url, type })));
      }
    }
    if (records.length < 40) throw new Error('Search index is incomplete: only ' + records.length + ' destinations were indexed');
    return records.sort((a, b) => a.title.localeCompare(b.title));
  }
  async function ensureSearchIndex() {
    if (searchIndexState === 'ready') return searchItems;
    if (searchIndexPromise) return searchIndexPromise;
    searchIndexState = 'loading';
    searchIndexPromise = buildSearchIndex().then((records) => {
      searchItems.splice(0, searchItems.length, ...records);
      searchIndexState = 'ready';
      return searchItems;
    }).catch((error) => {
      searchIndexState = 'error';
      console.error('QueryFixr search index could not be prepared:', error);
      throw error;
    });
    try {
      return await searchIndexPromise;
    } finally {
      if (searchIndexState !== 'ready') searchIndexPromise = null;
    }
  }

  const overlay = $('[data-search-overlay]');
  const globalInput = $('[data-global-search]');
  const globalResults = $('[data-global-results]');
  let previousFocus = null;
  let previousSearchIndexStatus = '';
  const openSearch = () => {
    if (!overlay || !globalInput) return;
    const activeElement = document.activeElement;
    const mobileMenuWasOpen = Boolean(menuToggle && nav && menuToggle.getAttribute('aria-expanded') === 'true' && nav.contains(activeElement));
    previousFocus = mobileMenuWasOpen ? menuToggle : activeElement;
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
    void ensureSearchIndex().then(() => renderGlobalResults(globalInput.value)).catch(() => renderGlobalResults(globalInput.value));
  };
  const closeSearch = () => {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove('search-open');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  };
  const SEARCH_RUNTIME_COPY = Object.fromEntries([
    "en-US|Preparing cross-page search…|Search index unavailable. Check your connection and retry.|Retry search|No close matches. Try fewer words or synonyms.|Search the home page, features, wiki, and FAQs.|All guides visible|Home|Features|Wiki|FAQ|section|sections|FAQ answer|FAQ answers|of|capabilities",
    "hi-IN|सभी पेजों की खोज तैयार हो रही है…|सर्च इंडेक्स उपलब्ध नहीं है। कनेक्शन जाँचें और फिर प्रयास करें।|फिर प्रयास करें|मिलते-जुलते परिणाम नहीं मिले। कम शब्द या समानार्थी शब्द आज़माएँ।|होम, फ़ीचर, विकि और FAQ की पूरी सामग्री खोजें।|सभी गाइड दिखाई दे रहे हैं|होम|फ़ीचर|विकी|FAQ|अनुभाग|अनुभाग|FAQ उत्तर|FAQ उत्तर|में से|क्षमताएँ",
    "bn-IN|সব পৃষ্ঠার অনুসন্ধান প্রস্তুত হচ্ছে…|সার্চ ইনডেক্স পাওয়া যাচ্ছে না। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।|আবার চেষ্টা করুন|কাছাকাছি ফল নেই। কম শব্দ বা সমার্থক শব্দ ব্যবহার করুন।|হোম, ফিচার, উইকি ও FAQ-এর সব বিষয়বস্তু খুঁজুন।|সব গাইড দৃশ্যমান|হোম|ফিচার|উইকি|FAQ|বিভাগ|বিভাগ|FAQ উত্তর|FAQ উত্তর|এর মধ্যে|সক্ষমতা",
    "es-ES|Preparando la búsqueda entre páginas…|Índice no disponible. Comprueba la conexión e inténtalo de nuevo.|Reintentar búsqueda|No hay coincidencias cercanas. Prueba menos palabras o sinónimos.|Busca en Inicio, funciones, wiki y preguntas frecuentes.|Todas las guías visibles|Inicio|Funciones|Wiki|FAQ|sección|secciones|respuesta FAQ|respuestas FAQ|de|funciones",
    "fr-FR|Préparation de la recherche inter-pages…|Index indisponible. Vérifiez la connexion puis réessayez.|Réessayer|Aucun résultat proche. Essayez moins de mots ou des synonymes.|Recherchez dans l’accueil, les fonctions, le wiki et la FAQ.|Tous les guides visibles|Accueil|Fonctions|Wiki|FAQ|section|sections|réponse FAQ|réponses FAQ|sur|fonctions",
    "de-DE|Suche über alle Seiten wird vorbereitet…|Suchindex nicht verfügbar. Verbindung prüfen und erneut versuchen.|Erneut suchen|Keine nahen Treffer. Verwenden Sie weniger Wörter oder Synonyme.|Startseite, Funktionen, Wiki und FAQ durchsuchen.|Alle Anleitungen sichtbar|Startseite|Funktionen|Wiki|FAQ|Abschnitt|Abschnitte|FAQ-Antwort|FAQ-Antworten|von|Funktionen",
    "pt-BR|Preparando a busca entre páginas…|Índice indisponível. Verifique a conexão e tente novamente.|Tentar novamente|Nenhuma correspondência próxima. Tente menos palavras ou sinônimos.|Pesquise no Início, recursos, wiki e perguntas frequentes.|Todos os guias visíveis|Início|Recursos|Wiki|FAQ|seção|seções|resposta FAQ|respostas FAQ|de|recursos",
    "ar|جارٍ إعداد البحث بين الصفحات…|الفهرس غير متاح. تحقق من الاتصال ثم حاول مجددًا.|إعادة البحث|لا توجد نتائج قريبة. جرّب كلمات أقل أو مرادفات.|ابحث في الرئيسية والميزات والويكي والأسئلة الشائعة.|كل الأدلة ظاهرة|الرئيسية|الميزات|الويكي|الأسئلة الشائعة|قسم|أقسام|إجابة شائعة|إجابات شائعة|من|ميزات",
    "ja-JP|全ページ検索を準備しています…|検索インデックスを利用できません。接続を確認して再試行してください。|再試行|近い候補がありません。語数を減らすか類義語を試してください。|ホーム、機能、Wiki、FAQ全体を検索します。|すべてのガイドを表示|ホーム|機能|Wiki|FAQ|セクション|セクション|FAQ回答|FAQ回答|件中|機能",
    "it-IT|Preparazione della ricerca tra le pagine…|Indice non disponibile. Controlla la connessione e riprova.|Riprova ricerca|Nessun risultato vicino. Prova meno parole o sinonimi.|Cerca in Home, funzionalità, wiki e FAQ.|Tutte le guide visibili|Home|Funzioni|Wiki|FAQ|sezione|sezioni|risposta FAQ|risposte FAQ|di|funzionalità",
    "id-ID|Menyiapkan pencarian lintas halaman…|Indeks tidak tersedia. Periksa koneksi lalu coba lagi.|Coba lagi|Tidak ada hasil yang mendekati. Coba kata yang lebih sedikit atau sinonim.|Cari Beranda, fitur, wiki, dan FAQ.|Semua panduan terlihat|Beranda|Fitur|Wiki|FAQ|bagian|bagian|jawaban FAQ|jawaban FAQ|dari|fitur",
    "ko-KR|전체 페이지 검색을 준비하는 중…|검색 색인을 사용할 수 없습니다. 연결을 확인하고 다시 시도하세요.|다시 검색|가까운 결과가 없습니다. 단어를 줄이거나 동의어를 사용해 보세요.|홈, 기능, 위키, FAQ 전체를 검색합니다.|모든 가이드 표시|홈|기능|위키|FAQ|섹션|섹션|FAQ 답변|FAQ 답변|중|기능",
    "ru-RU|Подготовка поиска по всем страницам…|Индекс недоступен. Проверьте соединение и повторите попытку.|Повторить поиск|Близких совпадений нет. Попробуйте меньше слов или синонимы.|Поиск по главной странице, функциям, вики и FAQ.|Все руководства видны|Главная|Функции|Вики|FAQ|раздел|раздела|ответ FAQ|ответа FAQ|из|функции",
    "zh-CN|正在准备跨页面搜索…|搜索索引不可用。请检查网络连接后重试。|重试搜索|没有接近的匹配项。请减少关键词或尝试同义词。|搜索主页、功能、Wiki 和常见问题的全部内容。|显示所有指南|主页|功能|Wiki|常见问题|个章节|个章节|条 FAQ 答案|条 FAQ 答案|共|项功能",
    "tr-TR|Sayfalar arası arama hazırlanıyor…|Arama dizini kullanılamıyor. Bağlantıyı kontrol edip yeniden deneyin.|Yeniden ara|Yakın eşleşme yok. Daha az kelime veya eş anlamlı deneyin.|Ana sayfa, özellikler, wiki ve SSS içinde ara.|Tüm rehberler görünür|Ana sayfa|Özellikler|Wiki|SSS|bölüm|bölüm|SSS yanıtı|SSS yanıtı|içinden|özellik",
    "nl-NL|Zoeken over alle pagina’s wordt voorbereid…|Zoekindex niet beschikbaar. Controleer de verbinding en probeer opnieuw.|Opnieuw zoeken|Geen nabije resultaten. Probeer minder woorden of synoniemen.|Zoek in Home, functies, wiki en FAQ.|Alle handleidingen zichtbaar|Home|Functies|Wiki|FAQ|sectie|secties|FAQ-antwoord|FAQ-antwoorden|van|functies",
    "pl-PL|Przygotowywanie wyszukiwania na wszystkich stronach…|Indeks wyszukiwania jest niedostępny. Sprawdź połączenie i spróbuj ponownie.|Ponów wyszukiwanie|Brak podobnych wyników. Użyj mniej słów lub synonimów.|Przeszukaj stronę główną, funkcje, wiki i FAQ.|Wszystkie poradniki widoczne|Strona główna|Funkcje|Wiki|FAQ|sekcja|sekcje|odpowiedź FAQ|odpowiedzi FAQ|z|funkcje",
    "uk-UA|Підготовка пошуку по всіх сторінках…|Індекс недоступний. Перевірте з’єднання та спробуйте знову.|Повторити пошук|Близьких збігів немає. Спробуйте менше слів або синоніми.|Пошук на головній сторінці, у функціях, вікі та FAQ.|Усі посібники видимі|Головна|Функції|Вікі|FAQ|розділ|розділи|відповідь FAQ|відповіді FAQ|з|функції",
    "el-GR|Προετοιμασία αναζήτησης σε όλες τις σελίδες…|Το ευρετήριο δεν είναι διαθέσιμο. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.|Επανάληψη αναζήτησης|Δεν υπάρχουν κοντινά αποτελέσματα. Δοκιμάστε λιγότερες λέξεις ή συνώνυμα.|Αναζήτηση στην Αρχική, στις λειτουργίες, στο wiki και στις FAQ.|Όλοι οι οδηγοί ορατοί|Αρχική|Λειτουργίες|Wiki|FAQ|ενότητα|ενότητες|απάντηση FAQ|απαντήσεις FAQ|από|λειτουργίες",
    "cs-CZ|Připravuje se vyhledávání napříč stránkami…|Index není dostupný. Zkontrolujte připojení a zkuste to znovu.|Zkusit znovu|Žádné blízké výsledky. Zkuste méně slov nebo synonyma.|Hledat na úvodní stránce, ve funkcích, wiki a FAQ.|Všechny návody jsou viditelné|Domů|Funkce|Wiki|FAQ|sekce|sekce|odpověď FAQ|odpovědi FAQ|z|funkce",
    "sv-SE|Förbereder sökning över alla sidor…|Sökindexet är inte tillgängligt. Kontrollera anslutningen och försök igen.|Försök igen|Inga nära träffar. Prova färre ord eller synonymer.|Sök på startsidan, bland funktioner, i wikin och FAQ.|Alla guider visas|Startsida|Funktioner|Wiki|FAQ|avsnitt|avsnitt|FAQ-svar|FAQ-svar|av|funktioner",
  ].map((row) => {
    const [locale, preparing, indexError, retry, noMatches, prompt, allGuides, home, features, wiki, faq, sectionOne, sectionMany, answerOne, answerMany, of, capabilities] = row.split('|');
    return [locale, { preparing, indexError, retry, noMatches, prompt, allGuides, home, features, wiki, faq, sectionOne, sectionMany, answerOne, answerMany, of, capabilities }];
  }));
  const searchRuntimeCopy = () => SEARCH_RUNTIME_COPY[activeSiteLocale] || SEARCH_RUNTIME_COPY['en-US'];
  const searchRuntimeText = (key) => searchRuntimeCopy()[key] || SEARCH_RUNTIME_COPY['en-US'][key];
  const searchRuntimeType = (type) => {
    const copy = searchRuntimeCopy();
    return type === 'Home' ? copy.home : type === 'Features' ? copy.features : type === 'Wiki' ? copy.wiki : type === 'FAQ' ? copy.faq : type;
  };
  const searchRuntimeWikiCount = (sections, answers) => {
    const copy = searchRuntimeCopy();
    return sections + ' ' + (sections === 1 ? copy.sectionOne : copy.sectionMany) + ' · ' +
      answers + ' ' + (answers === 1 ? copy.answerOne : copy.answerMany);
  };
  const searchRuntimeFeatureCount = (visible, total, filtered) => {
    const copy = searchRuntimeCopy();
    return filtered ? visible + ' ' + copy.of + ' ' + total + ' ' + copy.capabilities
      : total + ' ' + copy.capabilities;
  };

  const renderGlobalResults = (query) => {
    if (!globalResults) return;
    globalResults.replaceChildren();
    if (searchIndexState !== 'ready') {
      const message = document.createElement('p');
      message.className = 'global-search-empty';
      message.setAttribute('role', 'status');
      message.textContent = searchIndexState === 'error'
        ? searchRuntimeText('indexError')
        : searchRuntimeText('preparing');
      globalResults.appendChild(message);
      if (searchIndexState === 'error') {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'global-search-retry';
        retry.textContent = searchRuntimeText('retry');
        retry.addEventListener('click', () => {
          searchIndexPromise = null;
          searchIndexState = 'idle';
          renderGlobalResults(query);
          void ensureSearchIndex().then(() => renderGlobalResults(globalInput?.value || query)).catch(() => renderGlobalResults(globalInput?.value || query));
        });
        globalResults.appendChild(retry);
      }
      return;
    }
    const ranked = searchItems.map((item) => {
      const corpus = searchItemCorpus(item);
      let score = searchScore(corpus, query);
      score += searchScore(item.title, query) * 1.65;
      score += searchScore(item.description, query) * 0.35;
      return { item, score };
    }).filter(({ score }) => score > 0);
    ranked.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
    if (!String(query || '').trim()) ranked.splice(9);
    else ranked.splice(10);
    if (!ranked.length) {
      const empty = document.createElement('p');
      empty.className = 'global-search-empty';
      empty.textContent = String(query || '').trim()
        ? searchRuntimeText('noMatches')
        : searchRuntimeText('prompt');
      globalResults.appendChild(empty);
      return;
    }
    ranked.forEach(({ item }, index) => {
      const anchor = document.createElement('a');
      anchor.href = item.url;
      anchor.className = 'global-search-result';
      anchor.setAttribute('data-search-result', '');
      anchor.setAttribute('aria-label', item.title + '. ' + item.type);
      const symbol = document.createElement('span');
      symbol.className = 'search-result-icon';
      symbol.textContent = item.type === 'FAQ' ? '?' : item.type === 'Features' ? '▦' : item.type === 'Home' ? '⌂' : '↗';
      const body = document.createElement('span');
      body.className = 'search-result-copy';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const description = document.createElement('small');
      description.textContent = item.description || item.keywords || item.type;
      const category = document.createElement('span');
      category.className = 'search-result-category';
      category.textContent = searchRuntimeType(item.type);
      body.append(title, description, category);
      const key = document.createElement('kbd');
      key.textContent = String(index + 1);
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
      if (!overlay.hidden && event.key === 'Tab') {
        const dialog = $('.search-dialog', overlay);
        const focusable = $$('input:not([disabled]), button:not([disabled]), a[href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', dialog)
          .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
        if (!focusable.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
      if (!overlay.hidden && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        const results = $$('[data-search-result]', globalResults || document);
        if (results.length) {
          event.preventDefault();
          const currentIndex = results.indexOf(document.activeElement);
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          const nextIndex = document.activeElement === globalInput
            ? (direction > 0 ? 0 : results.length - 1)
            : (currentIndex < 0 ? 0 : (currentIndex + direction + results.length) % results.length);
          results[nextIndex].focus();
        }
        return;
      }
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.key.toLowerCase() === 'k' && event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && !typing) {
        event.preventDefault();
        event.stopPropagation();
        if (overlay.hidden) openSearch();
        else closeSearch();
      }
    }, true);
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
    $$('[data-wiki-faq]', article).forEach((item) => originalWikiFaqText.set(item, item.textContent || ''));
  });
  const FAQ_SEARCH_KEYWORDS = {
    'What does QueryFixr do?': 'purpose overview discord support ticket helpdesk request management',
    'Can I invite the bot from this website?': 'invite install add bot discord oauth authorization link missing setup',
    'Does the website run bot commands or show live tickets?': 'website static github pages vercel dashboard login api live data connection',
    'Why is the slash-command root /supportforge?': 'slash command root rename brand registered name deployed command',
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
    const normalized = String(query || '').trim();
    const hasQuery = normalized.length > 0;
    let visibleArticles = 0;
    let visibleFaqs = 0;
    wikiArticles.forEach((article) => {
      const faqItems = $$('[data-wiki-faq]', article);
      let matches;
      if (faqItems.length) {
        let matchedItems = 0;
        faqItems.forEach((item) => {
          const sourceText = (originalWikiFaqText.get(item) || '') + ' ' + (item.textContent || '');
          const summaryText = (item.querySelector('summary')?.textContent || '').replace(/\s+/g, ' ').trim();
          const keywordTitle = Object.keys(FAQ_SEARCH_KEYWORDS).find((title) => sourceText.includes(title));
          const extraTerms = FAQ_SEARCH_KEYWORDS[keywordTitle || summaryText] || '';
          const match = !hasQuery || searchScore(sourceText + ' ' + summaryText + ' ' + extraTerms, query) > 0;
          item.hidden = !match;
          if (match) matchedItems += 1;
        });
        const articleSource = (originalWikiArticleText.get(article) || '') + ' ' + (article.textContent || '');
        const titleText = (article.querySelector('h2')?.textContent || '') + ' ' + (article.querySelector('.article-eyebrow')?.textContent || '');
        const articleKeywords = (article.dataset.searchKeywords || '') + ' ' + (SEARCH_EXPANSIONS[article.id] || '');
        matches = !hasQuery || matchedItems > 0 || searchScore(articleSource + ' ' + titleText + ' ' + articleKeywords, query) > 0;
        visibleFaqs += matchedItems;
      } else {
        const sourceText = (originalWikiArticleText.get(article) || '') + ' ' + (article.textContent || '');
        const articleKeywords = (article.dataset.searchKeywords || '') + ' ' + (SEARCH_EXPANSIONS[article.id] || '');
        matches = !hasQuery || searchScore(sourceText + ' ' + articleKeywords, query) > 0;
      }
      article.hidden = !matches;
      if (matches) visibleArticles += 1;
      const link = tocByArticle.get(article.id);
      if (link) link.hidden = !matches;
    });
    if (wikiNoResults) wikiNoResults.hidden = !hasQuery || visibleArticles > 0;
    if (wikiCount) wikiCount.textContent = !hasQuery ? searchRuntimeText('allGuides') : searchRuntimeWikiCount(visibleArticles, visibleFaqs);
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
  const featureCards = $$('[data-feature-card]');
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
      featureResultCount.textContent = searchRuntimeFeatureCount(visible, featureCards.length, Boolean(normalized));
    }
    if (featureNoResults) featureNoResults.hidden = !normalized || visible > 0;
  };
  if (featureSearchInput) {
    applyFeatureSearch('');
    featureSearchInput.addEventListener('input', () => applyFeatureSearch(featureSearchInput.value));
  }
  $$('[data-clear-feature-search]').forEach((button) => button.addEventListener('click', () => {
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
    'en-US': { label: 'Language', button: 'Translate', busy: 'Translating this page…', done: 'Page translated. This is machine translation; wording may be imperfect. Code and command names are preserved.', original: 'Original English restored.', failed: 'Translation service unavailable or timed out. English text was restored. Try again later or configure a public LibreTranslate endpoint.', },
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
  const originalTextNodes = new Map();
  const originalAttributeValues = new Map();
  const defaultDocumentTitle = document.title;
  const defaultDocumentDir = document.documentElement.getAttribute('dir');
  const SAME_ORIGIN_TRANSLATION_ENDPOINT = new URL('api/translate', document.baseURI).href;
  const NETLIFY_TRANSLATION_ENDPOINT = new URL('/.netlify/functions/translate', window.location.origin).href;
  const SITE_TRANSLATION_ENDPOINTS = (() => {
    const configured = typeof window.QUERYFIXR_TRANSLATION_ENDPOINT === 'string'
      ? window.QUERYFIXR_TRANSLATION_ENDPOINT.trim()
      : '';
    // Prefer the same-origin server proxy when available, then documented public mirrors.
    const publicMirrors = [
      'https://libretranslate.de/translate',
      'https://translate.mentality.rip/translate',
      'https://translate.argosopentech.com/translate',
      'https://translate.api.skitzen.com/translate',
      'https://trans.zillyhuhn.com/translate',
      'https://libretranslate.esmailelbob.xyz/translate',
      'https://translate.pussthecat.org/translate',
    ];
    return [...new Set([configured, SAME_ORIGIN_TRANSLATION_ENDPOINT, NETLIFY_TRANSLATION_ENDPOINT, ...publicMirrors].filter(Boolean))];
  })();
  const TRANSLATION_CACHE_KEY = 'queryfixr-translation-cache-v3';
  const TRANSLATION_CACHE_LIMIT = 2200;
  const translationCache = new Map();
  const translationEndpointHealth = new Map();
  let preferredTranslationEndpoint = '';
  let translationCacheLoaded = false;

  // Parsing up to 2,200 saved translations is unnecessary on a normal English page
  // view. Load the cache only when the visitor actually requests a translation.
  function ensureTranslationCacheLoaded() {
    if (translationCacheLoaded) return;
    translationCacheLoaded = true;
    try {
      const cached = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '[]');
      if (Array.isArray(cached)) {
        cached.slice(-TRANSLATION_CACHE_LIMIT).forEach((entry) => {
          if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && typeof entry[1] === 'string') {
            translationCache.set(entry[0], entry[1]);
          }
        });
      }
      preferredTranslationEndpoint = localStorage.getItem('queryfixr-translation-endpoint-v1') || '';
    } catch (_) { /* Storage being disabled must not disable translation. */ }
  }
  const translationCacheKey = (target, source) => JSON.stringify([target, source]);
  function persistTranslationCache() {
    try {
      while (translationCache.size > TRANSLATION_CACHE_LIMIT) {
        translationCache.delete(translationCache.keys().next().value);
      }
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(Array.from(translationCache.entries())));
    } catch (_) { /* Current requests continue even if cache storage is full. */ }
  }
  function orderedTranslationEndpoints() {
    const now = Date.now();
    const healthy = SITE_TRANSLATION_ENDPOINTS.filter((endpoint) => (translationEndpointHealth.get(endpoint)?.retryAfter || 0) <= now);
    const candidates = healthy.length ? healthy : SITE_TRANSLATION_ENDPOINTS;
    return candidates.slice().sort((a, b) => {
      if (a === preferredTranslationEndpoint) return -1;
      if (b === preferredTranslationEndpoint) return 1;
      return (translationEndpointHealth.get(a)?.failures || 0) - (translationEndpointHealth.get(b)?.failures || 0);
    });
  }
  function markTranslationEndpointSuccess(endpoint) {
    translationEndpointHealth.set(endpoint, { failures: 0, retryAfter: 0 });
    preferredTranslationEndpoint = endpoint;
    try { localStorage.setItem('queryfixr-translation-endpoint-v1', endpoint); } catch (_) {}
  }
  function markTranslationEndpointFailure(endpoint, error) {
    const previous = translationEndpointHealth.get(endpoint) || { failures: 0, retryAfter: 0 };
    const failures = previous.failures + 1;
    const status = Number(error?.status || 0);
    const cooldown = status === 429 ? 60000 : (status >= 500 || status === 0 ? 20000 : 90000);
    translationEndpointHealth.set(endpoint, { failures, retryAfter: Date.now() + cooldown });
  }
  const normalizeSiteLocale = (value) => SITE_LANGUAGES.find((language) => language.code.toLowerCase() === String(value || '').toLowerCase() || language.api === String(value || '').toLowerCase())?.code || 'en-US';
  const translateUiCopy = (code, key) => (SITE_LANGUAGE_UI[code] || SITE_LANGUAGE_UI['en-US'])[key] || SITE_LANGUAGE_UI['en-US'][key];
  function collectTranslatableSegments() {
    const segments = [];
    if (defaultDocumentTitle && defaultDocumentTitle.trim().length > 1) {
      segments.push({ text: defaultDocumentTitle, apply: (translated) => { document.title = translated; } });
    }
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
    const attrSelector = 'input[placeholder],textarea[placeholder],[aria-label],[title],[alt],meta[name="description"],meta[property^="og:"]';
    $$(attrSelector).forEach((element) => {
      if (element.closest('.site-language-switcher,[data-no-translate],code,pre,script,style,svg')) return;
      if (!originalAttributeValues.has(element)) {
        const attrs = {};
        ['placeholder', 'aria-label', 'title', 'alt', 'content'].forEach((name) => {
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
  async function requestTranslationBatch(endpoint, values, targetApi) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutMs = endpoint === SAME_ORIGIN_TRANSLATION_ENDPOINT || endpoint === NETLIFY_TRANSLATION_ENDPOINT ? 24000 : 4000;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ q: values, source: 'en', target: targetApi, format: 'text' }),
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (!response.ok) {
        const error = new Error('Translation endpoint responded with HTTP ' + response.status);
        error.status = response.status;
        throw error;
      }
      const result = await response.json();
      let translated;
      if (Array.isArray(result?.translatedText)) translated = result.translatedText;
      else if (Array.isArray(result)) translated = result.map((item) => typeof item === 'string' ? item : item?.translatedText);
      else if (typeof result?.translatedText === 'string' && values.length === 1) translated = [result.translatedText];
      if (!Array.isArray(translated) || translated.length !== values.length ||
          translated.some((item) => typeof item !== 'string' || !item.trim())) {
        throw new Error('Translation endpoint returned an incomplete or unexpected response');
      }
      markTranslationEndpointSuccess(endpoint);
      return translated;
    } catch (error) {
      markTranslationEndpointFailure(endpoint, error);
      throw error;
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }
  async function translateBatch(values, targetApi) {
    ensureTranslationCacheLoaded();
    const translations = new Array(values.length);
    const missing = [];
    const missingIndexes = [];
    values.forEach((value, index) => {
      const cached = translationCache.get(translationCacheKey(targetApi, value));
      if (typeof cached === 'string' && cached.trim()) translations[index] = cached;
      else {
        missing.push(value);
        missingIndexes.push(index);
      }
    });
    if (!missing.length) return translations;
    let lastError = null;
    const endpoints = orderedTranslationEndpoints();
    for (const endpoint of endpoints) {
      try {
        const response = await requestTranslationBatch(endpoint, missing, targetApi);
        response.forEach((value, index) => {
          translations[missingIndexes[index]] = value;
          translationCache.set(translationCacheKey(targetApi, missing[index]), value);
        });
        persistTranslationCache();
        return translations;
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error('Translation did not complete after trying ' + endpoints.length + ' providers: ' +
      (lastError?.message || 'no provider completed the request'));
  }
  const TRANSLATION_BATCH_MAX_ITEMS = 16;
  const TRANSLATION_BATCH_MAX_CHARACTERS = 3600;
  const TRANSLATION_TEXT_MAX_CHARACTERS = 2400;

  function createTranslationBatches(values) {
    const batches = [];
    let currentValues = [];
    let currentIndexes = [];
    let currentCharacters = 0;
    const flush = () => {
      if (!currentValues.length) return;
      batches.push({ values: currentValues, indexes: currentIndexes });
      currentValues = [];
      currentIndexes = [];
      currentCharacters = 0;
    };

    values.forEach((value, index) => {
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error('Translation input contains an empty text segment.');
      }
      if (value.length > TRANSLATION_TEXT_MAX_CHARACTERS) {
        throw new Error('A text segment exceeds the translation provider limit. No partial translation was applied.');
      }
      if (currentValues.length >= TRANSLATION_BATCH_MAX_ITEMS ||
          (currentValues.length > 0 && currentCharacters + value.length > TRANSLATION_BATCH_MAX_CHARACTERS)) {
        flush();
      }
      currentValues.push(value);
      currentIndexes.push(index);
      currentCharacters += value.length;
    });
    flush();
    return batches;
  }

  async function translateBatchesWithConcurrency(batches, targetApi, onProgress = () => {}, translateBatchFn = translateBatch) {
    const results = new Array(batches.length);
    let cursor = 0;
    let completed = 0;
    let firstError = null;
    const workerCount = Math.min(3, batches.length);

    async function worker() {
      while (firstError === null) {
        const index = cursor++;
        if (index >= batches.length) return;
        try {
          results[index] = await translateBatchFn(batches[index].values, targetApi);
        } catch (error) {
          firstError = error;
          return;
        }
        completed += 1;
        onProgress(completed, batches.length);
      }
    }

    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    if (firstError) throw firstError;
    return results;
  }

  function getSearchIndexDisplaySegments() {
    const segments = [];
    for (const item of searchItems) {
      if (!item.sourceTitle) item.sourceTitle = item.title;
      if (typeof item.sourceDescription !== 'string') item.sourceDescription = item.description || '';
      if (item.sourceTitle.trim()) segments.push({ text: item.sourceTitle, apply: (value) => { item.title = value; } });
      if (item.sourceDescription.trim()) segments.push({ text: item.sourceDescription, apply: (value) => { item.description = value; } });
    }
    return segments;
  }
  function restoreSearchIndexDisplayText() {
    searchItems.forEach((item) => {
      if (item.sourceTitle) item.title = item.sourceTitle;
      if (typeof item.sourceDescription === 'string') item.description = item.sourceDescription;
    });
  }
  const TRANSLATION_FAILURE_COPY = {
    'en-US': 'Translation could not complete after trying multiple servers. Your current page language was kept. Please retry.',
    'hi-IN': 'कई सर्वरों पर प्रयास के बाद भी अनुवाद पूरा नहीं हुआ। पृष्ठ की मौजूदा भाषा बरकरार है। कृपया फिर से प्रयास करें।',
    'bn-IN': 'একাধিক সার্ভারে চেষ্টা করেও অনুবাদ সম্পূর্ণ হয়নি। পৃষ্ঠার বর্তমান ভাষা অপরিবর্তিত আছে। আবার চেষ্টা করুন।',
    'es-ES': 'La traducción no se completó tras probar varios servidores. Se conservó el idioma actual de la página. Inténtalo de nuevo.',
    'fr-FR': 'La traduction n’a pas abouti après plusieurs serveurs. La langue actuelle de la page a été conservée. Réessayez.',
    'de-DE': 'Die Übersetzung konnte trotz mehrerer Server nicht abgeschlossen werden. Die aktuelle Seitensprache bleibt erhalten. Bitte erneut versuchen.',
    'pt-BR': 'A tradução não foi concluída após várias tentativas em servidores diferentes. O idioma atual da página foi mantido. Tente novamente.',
    ar: 'تعذرت إكمال الترجمة بعد تجربة عدة خوادم. تم الإبقاء على لغة الصفحة الحالية. يرجى المحاولة مجددًا.',
    'ja-JP': '複数のサーバーを試しましたが翻訳を完了できませんでした。現在のページ言語を維持しています。もう一度お試しください。',
    'it-IT': 'La traduzione non è riuscita dopo vari tentativi su server diversi. La lingua attuale della pagina è stata mantenuta. Riprova.',
    'id-ID': 'Terjemahan tidak selesai setelah mencoba beberapa server. Bahasa halaman saat ini tetap dipertahankan. Silakan coba lagi.',
    'ko-KR': '여러 서버를 시도했지만 번역을 완료하지 못했습니다. 현재 페이지 언어는 유지됩니다. 다시 시도해 주세요.',
    'ru-RU': 'Не удалось завершить перевод после проверки нескольких серверов. Текущий язык страницы сохранён. Попробуйте ещё раз.',
    'zh-CN': '尝试多个服务器后仍无法完成翻译。已保留当前页面语言，请重试。',
    'tr-TR': 'Birden fazla sunucu denendi ancak çeviri tamamlanamadı. Sayfanın mevcut dili korundu. Lütfen yeniden deneyin.',
    'nl-NL': 'De vertaling kon na pogingen via meerdere servers niet worden voltooid. De huidige paginataal is behouden. Probeer het opnieuw.',
    'pl-PL': 'Nie udało się ukończyć tłumaczenia po próbach na wielu serwerach. Zachowano obecny język strony. Spróbuj ponownie.',
    'uk-UA': 'Не вдалося завершити переклад після спроб на кількох серверах. Поточну мову сторінки збережено. Спробуйте ще раз.',
    'el-GR': 'Η μετάφραση δεν ολοκληρώθηκε μετά από δοκιμές σε πολλούς διακομιστές. Διατηρήθηκε η τρέχουσα γλώσσα της σελίδας. Δοκιμάστε ξανά.',
    'cs-CZ': 'Překlad se nepodařilo dokončit ani po vyzkoušení několika serverů. Aktuální jazyk stránky zůstal zachován. Zkuste to znovu.',
    'sv-SE': 'Översättningen kunde inte slutföras efter försök med flera servrar. Sidans nuvarande språk behölls. Försök igen.',
  };
  async function translateRuntimeTexts(values) {
    const locale = activeSiteLocale;
    const selected = SITE_LANGUAGES.find((language) => language.code === locale);
    if (!selected || selected.api === 'en') return values;
    try {
      const result = await translateBatch(values, selected.api);
      return activeSiteLocale === locale ? result : values;
    } catch (error) {
      console.warn('QueryFixr dynamic UI translation could not complete:', error);
      return values;
    }
  }
  async function translateSitePage(targetLocale, statusNode, applyButton) {
    const locale = normalizeSiteLocale(targetLocale);
    statusNode.textContent = translateUiCopy(locale, 'busy');
    applyButton.disabled = true;
    const languageSelect = $('#queryfixr-site-language');
    if (languageSelect) languageSelect.disabled = true;
    const selected = SITE_LANGUAGES.find((language) => language.code === locale);
    try {
      if (locale === 'en-US') {
        restoreOriginalPageText();
        restoreSearchIndexDisplayText();
        activeSiteLocale = 'en-US';
        statusNode.textContent = translateUiCopy(locale, 'original');
        try { localStorage.setItem('queryfixr-site-locale', locale); } catch (_) {}
        return;
      }
      if (!selected) throw new Error('Unsupported website language: ' + locale);

      // Load every cross-page search snippet first so visible and future search results share the selected language.
      try {
        await ensureSearchIndex();
      } catch (indexError) {
        indexError.code = 'SEARCH_INDEX_UNAVAILABLE';
        throw indexError;
      }
      if (searchIndexState !== 'ready') {
        const indexError = new Error('The cross-page search index is unavailable.');
        indexError.code = 'SEARCH_INDEX_UNAVAILABLE';
        throw indexError;
      }

      // Keep the current display intact until every page segment is translated successfully.
      const segments = collectTranslatableSegments();
      const texts = segments.map((segment) => segment.text);
      const translated = new Array(texts.length);
      const batches = createTranslationBatches(texts);
      const batchResults = await translateBatchesWithConcurrency(batches, selected.api, (completed, total) => {
        statusNode.textContent = translateUiCopy(locale, 'busy') + ' ' + completed + '/' + total;
      });
      batchResults.forEach((response, batchIndex) => {
        response.forEach((value, index) => {
          translated[batches[batchIndex].indexes[index]] = value;
        });
      });

      const indexSegments = getSearchIndexDisplaySegments();
      const indexValues = indexSegments.map((segment) => segment.text);
      const indexBatches = createTranslationBatches(indexValues);
      const indexResults = await translateBatchesWithConcurrency(indexBatches, selected.api, (completed, total) => {
        statusNode.textContent = translateUiCopy(locale, 'busy') + ' ' + completed + '/' + total;
      });
      const indexTranslations = new Array(indexValues.length);
      indexResults.forEach((response, batchIndex) => {
        response.forEach((value, index) => {
          indexTranslations[indexBatches[batchIndex].indexes[index]] = value;
        });
      });

      // Apply DOM and search-index translations only after every request has succeeded.
      indexSegments.forEach((segment, index) => segment.apply(indexTranslations[index]));
      segments.forEach((segment, index) => segment.apply(translated[index]));
      const runtimeSourceTexts = Object.values(lifecycleStates).flatMap((state) => [state.title, state.description, state.next]).concat(['Copied', 'Select & copy', 'Copied!', 'Copy manually', 'Copied command', 'Copy the command']);
      void translateRuntimeTexts(runtimeSourceTexts).catch((runtimeError) => console.warn('QueryFixr optional dynamic-copy prefetch failed:', runtimeError));
      document.documentElement.lang = selected.code;
      document.documentElement.dir = selected.api === 'ar' ? 'rtl' : 'ltr';
      activeSiteLocale = locale;
      if (wikiInput) applyWikiSearch(wikiInput.value);
      if (featureSearchInput) applyFeatureSearch(featureSearchInput.value);
      if (globalInput && searchIndexState === 'ready') renderGlobalResults(globalInput.value);
      try { localStorage.setItem('queryfixr-site-locale', locale); } catch (_) {}
      statusNode.textContent = translateUiCopy(locale, 'done');
    } catch (error) {
      // The current page language is preserved; no partial page translation is applied.
      statusNode.textContent = error?.code === 'SEARCH_INDEX_UNAVAILABLE'
        ? (SEARCH_RUNTIME_COPY[locale]?.indexError || SEARCH_RUNTIME_COPY['en-US'].indexError)
        : (TRANSLATION_FAILURE_COPY[locale] || TRANSLATION_FAILURE_COPY['en-US']);
      console.warn('QueryFixr site translation failed:', error);
    } finally {
      if (languageSelect) languageSelect.disabled = false;
      applyButton.disabled = false;
      applyButton.textContent = translateUiCopy(locale, 'button');
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
    select.id = 'queryfixr-site-language';
    select.setAttribute('aria-label', 'Choose website language');
    select.title = 'Translate public website copy through an external service. The site does not connect to Discord or ticket data.';
    const initial = (() => {
      try { return localStorage.getItem('queryfixr-site-locale') || navigator.language || 'en-US'; } catch (_) { return navigator.language || 'en-US'; }
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
      status.textContent = '';
    });
    button.addEventListener('click', () => { void translateSitePage(select.value, status, button); });
    const saved = (() => { try { return localStorage.getItem('queryfixr-site-locale'); } catch (_) { return null; } })();
    if (saved && normalizeSiteLocale(saved) !== 'en-US') void translateSitePage(saved, status, button);
  }
  installSiteLanguageControl();


  // Visual motion layer: reveal sections on scroll and add a restrained pointer spotlight.
  function installVisualMotionEnhancements() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const revealTargets = Array.from(document.querySelectorAll([
      '.hero-copy',
      '.hero-art.hero-banner-art',
      '.trust-banner',
      '.intro-grid > *',
      '.capability-card',
      '.workflow-copy',
      '.workflow-demo',
      '.principle-card',
      '.faq-preview > *',
      '.faq-preview-list > a',
      '.closing-cta .cta-content',
      '.closing-cta .cta-decoration',
      '.page-hero',
      '.feature-library-hero',
      '.feature-filter',
      '.wiki-hero',
      '.wiki-search-card',
      '.wiki-sidebar'
    ].join(',')));
    const pointerTargets = document.querySelectorAll([
      '.capability-card',
      '.principle-card',
      '.catalog-card',
      '.hero-art.hero-banner-art',
      '.workflow-demo',
      '.closing-cta:not(.compact-cta)'
    ].join(','));

    if (!reducedMotion.matches && 'IntersectionObserver' in window && revealTargets.length) {
      document.documentElement.classList.add('motion-enhanced');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('motion-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -7% 0px' });

      revealTargets.forEach((element, index) => {
        element.classList.add('motion-reveal');
        element.style.setProperty('--motion-delay', String((index % 5) * 55) + 'ms');
        if (element.matches('.hero-art.hero-banner-art, .workflow-demo, .closing-cta .cta-decoration')) {
          element.classList.add('motion-slide-x');
        }
        observer.observe(element);
      });
    }

    if (reducedMotion.matches || !finePointer.matches) return;
    pointerTargets.forEach((element) => {
      let framePending = false;
      let latestX = 0;
      let latestY = 0;
      element.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'touch') return;
        latestX = event.clientX;
        latestY = event.clientY;
        if (framePending) return;
        framePending = true;
        window.requestAnimationFrame(() => {
          const bounds = element.getBoundingClientRect();
          element.style.setProperty('--pointer-x', String(Math.round(latestX - bounds.left)) + 'px');
          element.style.setProperty('--pointer-y', String(Math.round(latestY - bounds.top)) + 'px');
          framePending = false;
        });
      }, { passive: true });
      element.addEventListener('pointerleave', () => {
        element.style.removeProperty('--pointer-x');
        element.style.removeProperty('--pointer-y');
      }, { passive: true });
    });
  }
  installVisualMotionEnhancements();


})();