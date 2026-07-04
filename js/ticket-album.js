(function(global) {
  'use strict';

  var STORAGE_KEY = 'wgcTicketStubs';
  var SLOT_COUNT = 6;

  /* 六个槽位：image 路径稍后上传到 tickets/ 目录 */
  var STUBS = [
    {
      id: 'stub-mlp-hidden',
      image: 'tickets/stub-mlp-hidden.png',
      labelZh: '野菌计划 · 隐藏蘑菇',
      labelEn: 'Mushroom Land · hidden mushroom'
    },
    { id: 'stub-02', image: 'tickets/stub-02.png', labelZh: '待收集', labelEn: 'Locked' },
    { id: 'stub-03', image: 'tickets/stub-03.png', labelZh: '待收集', labelEn: 'Locked' },
    { id: 'stub-04', image: 'tickets/stub-04.png', labelZh: '待收集', labelEn: 'Locked' },
    { id: 'stub-05', image: 'tickets/stub-05.png', labelZh: '待收集', labelEn: 'Locked' },
    { id: 'stub-06', image: 'tickets/stub-06.png', labelZh: '待收集', labelEn: 'Locked' }
  ];

  var HIDDEN_MUSHROOM_STUB_ID = 'stub-mlp-hidden';

  function getLang() {
    if (typeof global.getSiteLang === 'function') return global.getSiteLang();
    var lang = document.documentElement.lang;
    return lang === 'en' ? 'en' : 'zh';
  }

  function t(zh, en) {
    return getLang() === 'en' ? en : zh;
  }

  function readCollected() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data.filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  }

  function writeCollected(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function isCollected(stubId) {
    return readCollected().indexOf(stubId) !== -1;
  }

  function unlock(stubId) {
    var list = readCollected();
    if (list.indexOf(stubId) !== -1) return false;
    list.push(stubId);
    writeCollected(list);
    updateBookletBadge();
    return true;
  }

  function getCount() {
    return readCollected().length;
  }

  function getStub(stubId) {
    for (var i = 0; i < STUBS.length; i += 1) {
      if (STUBS[i].id === stubId) return STUBS[i];
    }
    return null;
  }

  function updateBookletBadge() {
    var badge = document.getElementById('ticketBookletBadge');
    if (!badge) return;
    var count = getCount();
    badge.textContent = String(count);
    badge.setAttribute('data-count', String(count));
  }

  function showToast(message, durationMs) {
    var toast = document.getElementById('ticketToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function() {
      toast.classList.remove('visible');
    }, durationMs || 4200);
  }

  function renderAlbumGrid() {
    var grid = document.getElementById('ticketAlbumGrid');
    if (!grid) return;
    var collected = readCollected();
    grid.innerHTML = '';

    for (var i = 0; i < SLOT_COUNT; i += 1) {
      var stub = STUBS[i];
      var slot = document.createElement('div');
      slot.className = 'ticket-slot';

      if (stub && collected.indexOf(stub.id) !== -1) {
        slot.classList.add('is-filled');
        var img = document.createElement('img');
        img.src = stub.image;
        img.alt = t(stub.labelZh, stub.labelEn);
        img.loading = 'lazy';
        slot.appendChild(img);
        var label = document.createElement('div');
        label.className = 'ticket-slot-label';
        label.textContent = t(stub.labelZh, stub.labelEn);
        slot.appendChild(label);
      } else {
        var empty = document.createElement('div');
        empty.className = 'ticket-slot-empty';
        empty.textContent = t('空槽', 'Empty');
        slot.appendChild(empty);
      }

      grid.appendChild(slot);
    }

    var foot = document.getElementById('ticketAlbumFoot');
    if (foot) {
      foot.textContent = t(
        '已收集 ' + collected.length + ' / ' + SLOT_COUNT + ' 张纪念票根',
        collected.length + ' / ' + SLOT_COUNT + ' souvenir tickets collected'
      );
    }
  }

  function openAlbum() {
    var overlay = document.getElementById('ticketAlbumOverlay');
    if (!overlay) return;
    renderAlbumGrid();
    overlay.classList.remove('hidden');
  }

  function closeAlbum() {
    var overlay = document.getElementById('ticketAlbumOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function initBooklet() {
    var btn = document.getElementById('ticketBookletBtn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.setAttribute('aria-label', t('纪念票根册', 'Souvenir ticket album'));
    btn.addEventListener('click', openAlbum);

    var titleEl = document.getElementById('ticketAlbumTitle');
    if (titleEl) titleEl.textContent = t('纪念票根册', 'Souvenir Ticket Album');
    var subEl = document.getElementById('ticketAlbumSub');
    if (subEl) subEl.textContent = t('收藏你在俱乐部找到的纪念票根', 'Tickets found across the club');

    var closeBtn = document.getElementById('ticketAlbumClose');
    if (closeBtn) {
      closeBtn.setAttribute('aria-label', t('关闭', 'Close'));
      closeBtn.addEventListener('click', closeAlbum);
    }

    var overlay = document.getElementById('ticketAlbumOverlay');
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeAlbum();
      });
    }

    updateBookletBadge();
  }

  function showRewardModal(stub) {
    var overlay = document.getElementById('ticketRewardOverlay');
    if (!overlay) return;

    document.getElementById('ticketRewardTitle').textContent =
      t('恭喜你找到了隐藏的蘑菇！', 'You found the hidden mushroom!');
    document.getElementById('ticketRewardBody').textContent = t(
      '已收集 ' + getCount() + ' 张纪念票根，可到异味林地中查看。',
      getCount() + ' souvenir ticket(s) collected — view in The Humid Wilds.'
    );

    var preview = document.getElementById('ticketRewardPreview');
    if (preview && stub) {
      preview.innerHTML = '<img src="' + stub.image + '" alt="">';
    }

    overlay.classList.remove('hidden');
  }

  function closeRewardModal() {
    var overlay = document.getElementById('ticketRewardOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  function initHiddenMushroom() {
    var btn = document.getElementById('hiddenFindMushroom');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';

    btn.setAttribute('aria-label', t('寻找隐藏的蘑菇', 'Find the hidden mushroom'));

    btn.addEventListener('mouseenter', function() { btn.classList.add('is-hovering'); });
    btn.addEventListener('mouseleave', function() { btn.classList.remove('is-hovering'); });
    btn.addEventListener('focus', function() { btn.classList.add('is-hovering'); });
    btn.addEventListener('blur', function() { btn.classList.remove('is-hovering'); });

    btn.addEventListener('click', function() {
      var stub = getStub(HIDDEN_MUSHROOM_STUB_ID);
      if (isCollected(HIDDEN_MUSHROOM_STUB_ID)) {
        showToast(t('你已经找到过这朵蘑菇了。', 'You already found this mushroom.'));
        return;
      }
      unlock(HIDDEN_MUSHROOM_STUB_ID);
      showRewardModal(stub);
    });

    var rewardClose = document.getElementById('ticketRewardClose');
    if (rewardClose) {
      rewardClose.textContent = t('知道了', 'Got it');
      rewardClose.addEventListener('click', closeRewardModal);
    }

    var rewardOverlay = document.getElementById('ticketRewardOverlay');
    if (rewardOverlay) {
      rewardOverlay.addEventListener('click', function(e) {
        if (e.target === rewardOverlay) closeRewardModal();
      });
    }
  }

  global.TicketAlbum = {
    STORAGE_KEY: STORAGE_KEY,
    STUBS: STUBS,
    HIDDEN_MUSHROOM_STUB_ID: HIDDEN_MUSHROOM_STUB_ID,
    getLang: getLang,
    t: t,
    readCollected: readCollected,
    isCollected: isCollected,
    unlock: unlock,
    getCount: getCount,
    initBooklet: initBooklet,
    initHiddenMushroom: initHiddenMushroom,
    updateBookletBadge: updateBookletBadge,
    openAlbum: openAlbum,
    closeAlbum: closeAlbum
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateBookletBadge);
  } else {
    updateBookletBadge();
  }
})(typeof window !== 'undefined' ? window : globalThis);
