(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
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
  const renderGlobalResults = (query) => {
    if (!globalResults) return;
    globalResults.replaceChildren();
    if (searchIndexState !== 'ready') {
      const message = document.createElement('p');
      message.className = 'global-search-empty';
      message.setAttribute('role', 'status');
      message.textContent = searchIndexState === 'error'
        ? 'Search could not load the site index. Check your connection and retry.'
        : 'Preparing search across the home page, features, wiki, and FAQs…';
      globalResults.appendChild(message);
      if (searchIndexState === 'error') {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'global-search-retry';
        retry.textContent = 'Retry search';
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
        ? 'No close matches. Try fewer words, a synonym, or a shorter spelling.'
        : 'Search the full feature catalogue, every wiki guide, and FAQs.';
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
      category.textContent = item.type;
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
    'Does the website run bot comm  function normalizeSearchText(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .replace(/[’‘`]/g, "'")
      .replace(/[–—‐‑]/g, ' ')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^\\p{L}\\p{N}]+/gu, ' ')
      .trim();
  }
  function searchTerms(query) {
    return normalizeSearchText(query).split(/\\s+/u)
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
  function bestTokenScore(token, corpusTokens) {
    if (!token) return 0;
    let best = 0;
    for (const candidate of corpusTokens) {
      if (candidate === token) best = Math.max(best, 7);
      else if (candidate.startsWith(token) && token.length >= 2) best = Math.max(best, 4.2);
      else if (token.startsWith(candidate) && candidate.length >= 4) best = Math.max(best, 2.2);
      else if (token.length >= 5 && candidate.includes(token)) best = Math.max(best, 2.8);
      else if (boundedEditDistanceOne(token, candidate)) best = Math.max(best, 1.7);
      if (best >= 7) break;
    }
    if (best > 0) return best;
    const group = synonymGroupFor(token);
    if (!group) return 0;
    for (const synonym of group) {
      const normalized = normalizeSearchText(synonym);
      if (!normalized) continue;
      if (corpusTokens.includes(normalized)) best = Math.max(best, 3.1);
      else if (normalized.length >= 3 && corpusTokens.some((candidate) => candidate.startsWith(normalized))) best = Math.max(best, 2.2);
      else if (normalized.includes(' ') && normalizeSearchText(corpusTextForScore).includes(normalized)) best = Math.max(best, 2.4);
    }
    return best;
  }
  let corpusTextForScore = '';
  function searchScore(corpusText, query) {
    const rawQuery = String(query || '').trim();
    if (!rawQuery) return 1;
    const normalizedCorpus = normalizeSearchText(corpusText);
    const terms = searchTerms(rawQuery);
    if (!terms.length || !normalizedCorpus) return 0;
    const tokens = normalizedCorpus.split(/\\s+/u).filter(Boolean);
    let hitCount = 0;
    let score = 0;
    corpusTextForScore = normalizedCorpus;
    for (const term of terms) {
      const termScore = bestTokenScore(term, tokens);
      if (termScore > 0) {
        hitCount += 1;
        score += termScore;
      }
    }
    if (!hitCount) return 0;
    const coverage = hitCount / terms.length;
    const normalizedQuery = normalizeSearchText(rawQuery);
    const phraseBonus = normalizedQuery.length > 2 && normalizedCorpus.includes(normalizedQuery) ? 12 : 0;
    const coverageBonus = coverage * 6;
    // Multi-word searches may tolerate a missed word, but strongly prefer fuller matches.
    const completeness = terms.length > 1 ? coverage * coverage : 1;
    return (score + coverageBonus + phraseBonus) * completeness;
  }
  function matchesSearchCorpus(corpusText, query) {
    return searchScore(corpusText, query) > 0;
  }
  function searchItemCorpus(item) {
    const hash = (new URL(item.url, document.baseURI).hash || '').slice(1);
    return [item.title, item.description, item.keywords, item.text, SEARCH_EXPANSIONS[hash] || ''].join(' ');
  }
  function safeText(element, selector) {
    return (element.querySelector(selector)?.textContent || '').replace(/\\s+/gu, ' ').trim();
  }
  function indexRecord({ element, doc, pageUrl, type, forcedUrl = null }) {
    const title = safeText(element, 'h1,h2,h3,h4,summary') || element.getAttribute('aria-label') || '';
    const text = (element.textContent || '').replace(/\\s+/gu, ' ').trim();
    if (!title || text.length < 8) return null;
    const firstParagraph = safeText(element, 'p');
    const description = firstParagraph.slice(0, 280) || text.slice(0, 280);
    const rawHref = forcedUrl || element.getAttribute('href') || (element.id ? pageUrl.pathname + '#' + element.id : pageUrl.href);
    const url = new URL(rawHref, pageUrl).href;
    return {
      title,
      description,
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
        doc.querySelectorAll('[data-feature-card]').forEach((element) => add(indexRecord({ element, doc, pageUrl: url, type })));
        const hero = doc.querySelector('.feature-library-hero, .page-hero, main > section h1')?.closest('section') || doc.querySelector('main');
        if (hero) add(indexRecord({ element: hero, doc, pageUrl: url, type, forcedUrl: url.href }));
      } else if (type === 'Wiki') {
        doc.querySelectorAll('[data-wiki-article]').forEach((element) => {
          add(indexRecord({ element, doc, pageUrl: url, type, forcedUrl: url.pathname + '#' + element.id }));
        });
        doc.querySelectorAll('[data-wiki-faq]').forEach((element) => {
          const summary = safeText(element, 'summary');
          if (!summary) return;
          add({
            title: summary,
            description: safeText(element, 'p').slice(0, 280),
            url: url.pathname + '#faq',
            keywords: element.getAttribute('data-search-keywords') || '',
            text: (element.textContent || '').replace(/\\s+/gu, ' ').trim(),
            type: 'FAQ',
          });
        });
      } else {
        const main = doc.querySelector('main') || doc.body;
        main.querySelectorAll('section[id]').forEach((element) => {
          if (element.matches('.closing-cta')) return;
          add(indexRecord({ element, doc, pageUrl: url, type }));
        });
        main.querySelectorAll('.hero-copy, [data-capability-card], .capability-card').forEach((element) => {
          add(indexRecord({ element, doc, pageUrl: url, type }));
        });
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

enu live guild testing',
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
  const SITE_TRANSLATION_ENDPOINTS = (() => {
    const configured = typeof window.QUERYFIXR_TRANSLATION_ENDPOINT === 'string'
      ? window.QUERYFIXR_TRANSLATION_ENDPOINT.trim()
      : '';
    const publicMirrors = [
      'https://translate.fedilab.app/translate',
      'https://translate.cutie.dating/translate',
      'https://translate.argosopentech.com/translate',
      'https://libretranslate.de/translate',
      'https://trans.zillyhuhn.com/translate',
      'https://translate.api.skitzen.com/translate',
    ];
    return [...new Set([configured, ...publicMirrors].filter(Boolean))];
  })();
  const TRANSLATION_CACHE_KEY = 'queryfixr-translation-cache-v3';
  const TRANSLATION_CACHE_LIMIT = 2200;
  const translationCache = new Map();
  const translationEndpointHealth = new Map();
  let preferredTranslationEndpoint = '';
  try {
    const cached = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '[]');
    if (Array.isArray(cached)) cached.slice(-TRANSLATION_CACHE_LIMIT).forEach((entry) => {
      if (Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && typeof entry[1] === 'string') {
        translationCache.set(entry[0], entry[1]);
      }
    });
    preferredTranslationEndpoint = localStorage.getItem('queryfixr-translation-endpoint-v1') || '';
  } catch (_) { /* Private browsing and storage limits must not disable translation. */ }
  const translationCacheKey = (target, source) => target + '\\u241f' + source;
  function persistTranslationCache() {
    try {
      while (translationCache.size > TRANSLATION_CACHE_LIMIT) {
        translationCache.delete(translationCache.keys().next().value);
      }
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(Array.from(translationCache.entries())));
    } catch (_) { /* The active translation does not depend on local storage being writable. */ }
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
  con  async function requestTranslationBatch(endpoint, values, targetApi) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 7500) : null;
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
      let translated = null;
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
      if (timeoutId !== null) window.clearTimeout(t  async function translateSitePage(targetLocale, statusNode, applyButton) {
    const locale = normalizeSiteLocale(targetLocale);
    statusNode.textContent = translateUiCopy(locale, 'busy');
    applyButton.disabled = true;
    const selected = SITE_LANGUAGES.find((language) => language.code === locale);
    try {
      if (locale === 'en-US') {
        restoreOriginalPageText();
        activeSiteLocale = 'en-US';
        statusNode.textContent = translateUiCopy(locale, 'original');
        try { localStorage.setItem('queryfixr-site-locale', locale); } catch (_) {}
        if (searchIndexState === 'ready') restoreSearchIndexDisplayText();
        return;
      }
      if (!selected) throw new Error('Unsupported website language: ' + locale);

      // Keep the currently applied language on screen until every segment has translated.
      const segments = collectTranslatableSegments();
      const sourceTexts = segments.map((segment) => segment.text);
      const translated = new Array(sourceTexts.length);
      const batches = [];
      let batch = [];
      let batchIndexes = [];
      let batchChars = 0;
      const flush = () => {
        if (!batch.length) return;
        batches.push({ values: batch, indexes: batchIndexes });
        batch = [];
        batchIndexes = [];
        batchChars = 0;
      };
      for (let i = 0; i < sourceTexts.length; i += 1) {
        const value = sourceTexts[i];
        if (batch.length >= 16 || (batch.length > 0 && batchChars + value.length > 3600)) flush();
        batch.push(value);
        batchIndexes.push(i);
        batchChars += value.length;
      }
      flush();

      for (let i = 0; i < batches.length; i += 1) {
        const currentBatch = batches[i];
        const response = await translateBatch(currentBatch.values, selected.api);
        response.forEach((value, index) => { translated[currentBatch.indexes[index]] = value; });
        statusNode.textContent = translateUiCopy(locale, 'busy') + ' ' + (i + 1) + '/' + batches.length;
      }

      // If the site-wide search index was loaded before translation, localize the visible snippets too.
      const indexSegments = searchIndexState === 'ready' ? getSearchIndexDisplaySegments() : [];
      if (indexSegments.length) {
        const values = indexSegments.map((segment) => segment.text);
        const indexTranslations = new Array(values.length);
        let offset = 0;
        for (let i = 0; i < values.length; i += 16) {
          const group = values.slice(i, i + 16);
          const translatedGroup = await translateBatch(group, selected.api);
          translatedGroup.forEach((value, j) => { indexTranslations[offset + j] = value; });
          offset += group.length;
        }
        indexSegments.forEach((segment, index) => segment.apply(indexTranslations[index]));
      }

      segments.forEach((segment, index) => segment.apply(translated[index]));
      document.documentElement.lang = selected.code;
      document.documentElement.dir = selected.api === 'ar' ? 'rtl' : 'ltr';
      activeSiteLocale = locale;
      if (wikiInput) applyWikiSearch(wikiInput.value);
      if (featureSearchInput) applyFeatureSearch(featureSearchInput.value);
      if (globalInput && searchIndexState === 'ready') renderGlobalResults(globalInput.value);
      try { localStorage.setItem('queryfixr-site-locale', locale); } catch (_) {}
      statusNode.textContent = translateUiCopy(locale, 'done');
    } catch (error) {
      // No segment is applied until all requests succeed, so an existing translation remains intact.
      statusNode.textContent = translateUiCopy(locale, 'failed');
      console.warn('QueryFixr site translation failed:', error);
    } finally {
      applyButton.disabled = false;
      applyButton.textContent = translateUiCopy(locale, 'button');
    }
  }
ocument.documentElement.setAttribute('dir', defaultDocumentDir);
    document.documentElement.lang = 'en';
  }
  async function translateBatch(values, targetApi) {
    let finalError = null;
    for (const endpoint of SITE_TRANSLATION_ENDPOINTS) {
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timeoutId = controller ? window.setTimeout(() => controller.abort(), 10000) : null;
      try {
        const body = { q: values, source: 'en', target: targetApi, format: 'text' };
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body),
          mode: 'cors',
          credentials: 'omit',
          ...(controller ? { signal: controller.signal } : {}),
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
      } finally {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
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
        statusNode.textContent = translateUiCopy(locale, 'original');
        try { localStorage.setItem('queryfixr-site-locale', locale); } catch (_) {}
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
      document.documentElement.lang = locale;
      document.documentElement.dir = locale.toLowerCase().startsWith('ar') ? 'rtl' : 'ltr';
      if (wikiInput) applyWikiSearch(wikiInput.value);
      try { localStorage.setItem('queryfixr-site-locale', locale); } catch (_) {}
      statusNode.textContent = translateUiCopy(locale, 'done');
    } catch (error) {
      restoreOriginalPageText();
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
    });
    button.addEventListener('click', () => { void translateSitePage(select.value, status, button); });
    const saved = (() => { try { return localStorage.getItem('queryfixr-site-locale'); } catch (_) { return null; } })();
    if (saved && normalizeSiteLocale(saved) !== 'en-US') void translateSitePage(saved, status, button);
  }
  installSiteLanguageControl();

})();