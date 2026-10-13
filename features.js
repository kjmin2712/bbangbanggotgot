const shops = Array.isArray(window.BAKERIES) ? window.BAKERIES : [];
const byId = id => document.getElementById(id);
const storeCountFormat = value => new Intl.NumberFormat('ko-KR').format(value || 0);
const koreaMapTotal = byId('korea-map-total');
if (koreaMapTotal) koreaMapTotal.textContent = storeCountFormat(shops.length);
const distanceKm = (lat1, lon1, lat2, lon2) => {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const locateButton = byId('locate-button');
const nearbyStatus = byId('nearby-status');
const nearbyResults = byId('nearby-results');
const nearbyAll = byId('nearby-all');
const setNearbyStatus = (message, error = false) => {
  nearbyStatus.hidden = false;
  nearbyStatus.textContent = message;
  nearbyStatus.style.color = error ? '#a33b28' : '#594c39';
};

let nearbyPool = [];
let lastNearbyPick = -1;

const nearbyDistanceLabel = distance => distance < 1
  ? `${Math.max(1, Math.round(distance * 1000))}m`
  : `${distance.toFixed(1)}km`;

const renderRandomNearby = shop => {
  const card = document.createElement('article');
  card.className = 'nearby-place';
  card.innerHTML = '<div class="nearby-place-head"><span>오늘의 빵집</span><strong></strong></div><p class="nearby-place-copy">지금 위치에서 가볍게 들러볼까요?</p><small class="nearby-distance"></small><div class="nearby-actions"><a class="nearby-naver" target="_blank" rel="noopener noreferrer">네이버지도</a><a class="nearby-kakao" target="_blank" rel="noopener noreferrer">카카오맵</a><button type="button">다른 빵집 추천</button></div>';
  card.querySelector('strong').textContent = shop.name;
  card.querySelector('.nearby-distance').textContent = `현재 위치에서 약 ${nearbyDistanceLabel(shop.distance)}`;
  const naverLink = card.querySelector('.nearby-naver');
  const kakaoLink = card.querySelector('.nearby-kakao');
  const mapQuery = [shop.name, shop.address].filter(Boolean).join(' ');
  naverLink.href = shop.naverUrl;
  kakaoLink.href = `https://map.kakao.com/?q=${encodeURIComponent(mapQuery)}`;
  [naverLink, kakaoLink].forEach(link => link.addEventListener('click', () => window.bbangbangTrackView?.(shop)));
  card.querySelector('button').addEventListener('click', pickRandomNearby);
  nearbyResults.replaceChildren(card);
  nearbyResults.hidden = false;
  setNearbyStatus(`반경 ${shop.radius}km 안의 매장 ${nearbyPool.length}곳 중 한 곳을 추천했어요.`);
};

function pickRandomNearby() {
  if (!nearbyPool.length) return;
  let nextPick = Math.floor(Math.random() * nearbyPool.length);
  if (nearbyPool.length > 1 && nextPick === lastNearbyPick) {
    nextPick = (nextPick + 1 + Math.floor(Math.random() * (nearbyPool.length - 1))) % nearbyPool.length;
  }
  lastNearbyPick = nextPick;
  renderRandomNearby(nearbyPool[nextPick]);
}

locateButton.addEventListener('click', () => {
  if (!navigator.geolocation) return setNearbyStatus('이 기기에서는 위치 기능을 지원하지 않아요.', true);
  locateButton.disabled = true;
  locateButton.textContent = '위치 확인 중…';
  setNearbyStatus('현재 위치를 확인하고 있어요.');
  navigator.geolocation.getCurrentPosition(position => {
    const {latitude, longitude} = position.coords;
    nearbyAll.href = `https://map.naver.com/p/search/${encodeURIComponent('카페 베이커리')}?c=${longitude},${latitude},15,0,0,0,dh`;
    nearbyAll.hidden = false;
    const located = shops.filter(shop => Number.isFinite(shop.lat) && Number.isFinite(shop.lon))
      .map(shop => ({...shop, distance: distanceKm(latitude, longitude, shop.lat, shop.lon)}))
      .sort((a, b) => a.distance - b.distance);
    let selectedRadius = 2;
    let nearby = [];
    for (const radius of [2, 5, 10]) {
      nearby = located.filter(shop => shop.distance <= radius);
      selectedRadius = radius;
      if (nearby.length) break;
    }
    nearbyPool = nearby.map(shop => ({...shop, radius: selectedRadius}));
    lastNearbyPick = -1;
    if (nearbyPool.length) {
      pickRandomNearby();
    } else {
      nearbyResults.hidden = true;
      setNearbyStatus('반경 10km 안에서 등록된 빵집을 찾지 못했어요.', true);
    }
    locateButton.disabled = false;
    locateButton.textContent = '⌖ 위치 다시 찾기';
  }, error => {
    const messages = {1: '위치 권한을 허용해 주세요.', 2: '현재 위치를 확인할 수 없어요.', 3: '위치 확인 시간이 초과됐어요.'};
    setNearbyStatus(messages[error.code] || '위치를 확인하지 못했어요.', true);
    locateButton.disabled = false;
    locateButton.textContent = '⌖ 위치 다시 찾기';
  }, {enableHighAccuracy: false, timeout: 10000, maximumAge: 300000});
});

const regionalTop5 = Array.isArray(window.REGIONAL_TOP5) ? window.REGIONAL_TOP5 : [];
const regionGrid = byId('region-list-grid'), regionDialog = byId('region-dialog');
const regionTop5List = byId('region-top5-list'), regionDialogTitle = byId('region-dialog-title');
const regionSaveDialog = regionDialog?.querySelector('.region-save-dialog');
const toast = byId('share-toast');
const savedRegionKey = 'bbangbang_saved_regions_v1';
let activeRegion = null;
const showToast = (message, style = '') => {
  toast.textContent = message;
  toast.classList.toggle('text-only', style === 'text-only');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.remove('text-only');
  }, 2200);
};
const readSavedRegions = () => { try { return JSON.parse(localStorage.getItem(savedRegionKey)) || []; } catch (_) { return []; } };
const writeSavedRegions = value => { try { localStorage.setItem(savedRegionKey, JSON.stringify(value)); return true; } catch (_) { showToast('기기 저장 공간을 사용할 수 없어요'); return false; } };
const isRegionSaved = region => readSavedRegions().includes(region);
const syncRegionSaveButtons = () => {
  document.querySelectorAll('[data-save-region]').forEach(button => {
    const saved = isRegionSaved(button.dataset.saveRegion);
    button.classList.toggle('saved', saved);
    if (!button.classList.contains('region-save')) button.textContent = saved ? '★ 저장됨' : '☆ 저장하기';
    button.setAttribute('aria-label', `${button.dataset.saveRegion} ${saved ? '저장 취소' : '저장하기'}`);
    button.setAttribute('aria-pressed', String(saved));
  });
  if (activeRegion && regionSaveDialog) {
    const saved = isRegionSaved(activeRegion.region);
    regionSaveDialog.classList.toggle('saved', saved);
    regionSaveDialog.textContent = saved ? '★ 저장됨' : '☆ 지역 저장하기';
  }
};
const toggleRegionSave = region => {
  const saved = readSavedRegions();
  const next = saved.includes(region) ? saved.filter(item => item !== region) : [region, ...saved];
  if (!writeSavedRegions(next)) return;
  syncRegionSaveButtons();
  renderRegions(currentRegionGroup);
  showToast(saved.includes(region) ? `${region} 저장을 취소했어요` : `${region} 추천을 저장했어요`);
};
const reviewLabel = value => new Intl.NumberFormat('ko-KR').format(value);
const openRegion = region => {
  activeRegion = region;
  regionDialogTitle.textContent = `${region.region} 추천 TOP 5`;
  regionTop5List.replaceChildren(...region.shops.map(shop => {
    const item = document.createElement('article');
    item.className = 'region-top5-item';
    item.innerHTML = `<span class="region-rank">${shop.rank}</span><div class="region-shop-copy"><strong></strong><small></small></div><div class="region-map-actions"><a class="naver" target="_blank" rel="noopener noreferrer">네이버맵</a><a class="kakao" target="_blank" rel="noopener noreferrer">카카오맵</a></div>`;
    item.querySelector('strong').textContent = shop.name;
    item.querySelector('small').textContent = `방문자 리뷰 ${reviewLabel(shop.reviews)}${shop.address ? ' · ' + shop.address : ''}`;
    item.querySelector('.naver').href = shop.naverUrl;
    item.querySelector('.kakao').href = shop.kakaoUrl;
    return item;
  }));
  syncRegionSaveButtons();
  regionDialog.showModal();
};
let currentRegionGroup = '전체';
let currentRegionSort = 'alpha';
const sortTrigger = byId('region-sort-trigger');
const sortMenu = byId('region-sort-menu');
const closeRegionSort = () => { sortMenu.hidden = true; sortTrigger.setAttribute('aria-expanded','false'); };
sortTrigger?.addEventListener('click', event => { event.stopPropagation(); const open = sortMenu.hidden; sortMenu.hidden = !open; sortTrigger.setAttribute('aria-expanded',String(open)); });
document.addEventListener('click', event => { if (!event.target.closest('.region-sort-wrap')) closeRegionSort(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeRegionSort(); });
sortMenu?.querySelectorAll('[data-region-sort]').forEach(button => button.addEventListener('click', () => {
  currentRegionSort = button.dataset.regionSort;
  sortTrigger.innerHTML = `${currentRegionSort === 'alpha' ? '가나다순' : '저장한 지역 우선'} <span aria-hidden="true">⌄</span>`;
  sortMenu.querySelectorAll('[data-region-sort]').forEach(item => {
    const active = item === button;
    item.setAttribute('aria-selected',String(active));
    item.querySelector('span').textContent = active ? '✓' : '';
  });
  closeRegionSort(); renderRegions(currentRegionGroup);
}));
const bookmarkSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/></svg>';
const renderRegions = (group = currentRegionGroup) => {
  currentRegionGroup = group;
  const saved = new Set(readSavedRegions());
  const items = (group === '전체' ? regionalTop5 : group === '저장' ? regionalTop5.filter(region => saved.has(region.region)) : regionalTop5.filter(region => region.group === group)).slice();
  items.sort((a,b) => (currentRegionSort === 'saved' ? Number(saved.has(b.region)) - Number(saved.has(a.region)) : 0) || a.region.localeCompare(b.region,'ko'));
  regionGrid.replaceChildren(...items.map(region => {
    const card = document.createElement('article');
    card.className = 'region-card';
    card.innerHTML = `<div class="region-card-top"><h3><span class="region-pin" aria-hidden="true">📍</span><span class="region-name"></span></h3><button type="button" class="region-save" aria-pressed="false">${bookmarkSvg}</button></div><p>방문자 리뷰 기준 TOP 5</p><button class="region-open" type="button">TOP 5 보기 <span aria-hidden="true">→</span></button>`;
    card.querySelector('.region-name').textContent = region.region;
    const saveButton = card.querySelector('.region-save');
    saveButton.dataset.saveRegion = region.region;
    saveButton.setAttribute('aria-label',`${region.region} 저장하기`);
    card.querySelector('.region-open').addEventListener('click', () => openRegion(region));
    saveButton.addEventListener('click', () => toggleRegionSave(region.region));
    return card;
  }));
  syncRegionSaveButtons();
};
document.querySelectorAll('[data-region-group]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-region-group]').forEach(item => item.classList.toggle('active', item === button));
  renderRegions(button.dataset.regionGroup);
}));
regionDialog?.querySelector('.dialog-close')?.addEventListener('click', () => regionDialog.close());
regionDialog?.addEventListener('click', event => { if (event.target === regionDialog) regionDialog.close(); });
regionSaveDialog?.addEventListener('click', () => activeRegion && toggleRegionSave(activeRegion.region));
renderRegions();

const storageKeys = {recent: 'bbangbang_recent_v1', stamps: 'bbangbang_stamps_v1', reports: 'bbangbang_reports_v1', wishes: 'bbangbang_wishes_v1'};
const readLocal = key => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch (_) { return []; } };
const writeLocal = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { showToast('기기 저장 공간을 사용할 수 없어요'); return false; } };
const placeKey = place => `${place.name}|${place.address}`;
const snapshot = place => ({key: placeKey(place), name: place.name, address: place.address, district: place.district, type: place.type, naverUrl: place.naverUrl, lat: place.lat, lon: place.lon, savedAt: new Date().toISOString()});
const formatSavedAt = value => new Intl.DateTimeFormat('ko-KR', {month: 'numeric', day: 'numeric'}).format(new Date(value));

function miniPlace(place, stamped = false, wished = false) {
  const item = document.createElement('article');
  item.className = 'mini-place';
  item.innerHTML = '<div class="mini-place-info"><strong></strong><small></small></div><div class="mini-map-links"><a class="mini-map-link naver" target="_blank" rel="noopener noreferrer">네이버로 보기</a><a class="mini-map-link kakao" target="_blank" rel="noopener noreferrer">카카오로 보기</a></div>';
  item.querySelector('strong').textContent = place.name;
  item.querySelector('small').textContent = `${place.district || place.type || '지역 정보 없음'} · ${stamped ? '방문 ' : wished ? '저장 ' : '확인 '}${formatSavedAt(place.savedAt)}`;
  item.querySelector('.mini-map-link.naver').href = place.naverUrl;
  item.querySelector('.mini-map-link.kakao').href = `https://map.kakao.com/?q=${encodeURIComponent(place.name)}`;
  item.querySelectorAll('.mini-map-link').forEach(link => link.addEventListener('click', () => window.bbangbangTrackView(place)));
  return item;
}
function renderPersonalTrip() {
  const stamps = readLocal(storageKeys.stamps), recent = readLocal(storageKeys.recent), wishes = readLocal(storageKeys.wishes);
  byId('stamp-count').textContent = stamps.length;
  byId('recent-count').textContent = recent.length;
  byId('wish-count').textContent = wishes.length;
  const stampList = byId('stamp-list'), recentList = byId('recent-list'), wishList = byId('wish-list');
  stampList.replaceChildren(...(stamps.length ? stamps.slice(0, 5).map(place => miniPlace(place, true)) : [Object.assign(document.createElement('p'), {className: 'mini-empty', textContent: '아직 받은 스탬프가 없어요.'})]));
  recentList.replaceChildren(...(recent.length ? recent.slice(0, 5).map(place => miniPlace(place)) : [Object.assign(document.createElement('p'), {className: 'mini-empty', textContent: '아직 확인한 매장이 없어요.'})]));
  wishList.replaceChildren(...(wishes.length ? wishes.map(place => miniPlace(place, false, true)) : [Object.assign(document.createElement('p'), {className: 'mini-empty', textContent: '매장 카드의 별을 눌러 가고 싶은 빵집을 저장해 보세요.'})]));
}

window.bbangbangSyncWishButtons = () => {
  const wishedKeys = new Set(readLocal(storageKeys.wishes).map(place => place.key));
  document.querySelectorAll('.wish-button').forEach(button => {
    const wished = wishedKeys.has(button.dataset.placeKey);
    button.classList.toggle('active', wished);
    button.textContent = wished ? '★' : '☆';
    button.setAttribute('aria-pressed', String(wished));
    button.setAttribute('aria-label', `${button.closest('.card').querySelector('h3').textContent} ${wished ? '저장 취소' : '가고 싶은 빵집에 저장'}`);
  });
};
window.bbangbangToggleWish = place => {
  const entry = snapshot(place);
  const wishes = readLocal(storageKeys.wishes);
  const wished = wishes.some(item => item.key === entry.key);
  const next = wished ? wishes.filter(item => item.key !== entry.key) : [entry, ...wishes];
  if (!writeLocal(storageKeys.wishes, next)) return;
  renderPersonalTrip();
  window.bbangbangSyncWishButtons();
  showToast(wished ? '가고 싶은 빵집에서 삭제했어요' : '가고 싶은 빵집에 저장했어요');
};
window.bbangbangSyncWishButtons();

window.bbangbangTrackView = place => {
  const entry = snapshot(place);
  const recent = readLocal(storageKeys.recent).filter(item => item.key !== entry.key);
  if (writeLocal(storageKeys.recent, [entry, ...recent].slice(0, 20))) renderPersonalTrip();
};

window.bbangbangStamp = place => {
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
    showToast('이 매장은 위치 좌표가 없어 스탬프를 받을 수 없어요');
    return;
  }
  if (!navigator.geolocation) { showToast('이 기기에서는 위치 확인을 지원하지 않아요'); return; }
  showToast('매장과의 거리를 확인하고 있어요');
  navigator.geolocation.getCurrentPosition(position => {
    const distance = distanceKm(position.coords.latitude, position.coords.longitude, place.lat, place.lon);
    const allowedKm = Math.min(.5, Math.max(.3, (position.coords.accuracy || 0) * 2 / 1000));
    if (distance > allowedKm) {
      showToast(`현재 매장과 ${distance < 1 ? Math.round(distance * 1000) + 'm' : distance.toFixed(1) + 'km'} 떨어져 있어요`);
      return;
    }
    const entry = snapshot(place);
    const stamps = readLocal(storageKeys.stamps);
    if (stamps.some(item => item.key === entry.key)) { showToast('이미 방문 스탬프를 받은 매장이에요'); return; }
    if (writeLocal(storageKeys.stamps, [entry, ...stamps])) { window.bbangbangTrackView(place); renderPersonalTrip(); showToast('방문 스탬프를 받았어요!'); }
  }, () => showToast('위치 권한을 허용해야 스탬프를 받을 수 있어요'), {enableHighAccuracy: true, timeout: 12000, maximumAge: 60000});
};

const reportDialog = byId('report-dialog'), reportForm = byId('report-form');
const reportSuccessDialog = byId('report-success-dialog');
let reportingPlace = null;
window.bbangbangOpenReport = place => {
  reportingPlace = place;
  reportForm.reset();
  byId('report-shop').textContent = `${place.name} · ${place.address}`;
  reportDialog.showModal();
};
reportDialog.querySelector('.dialog-close').addEventListener('click', () => reportDialog.close());
reportDialog.addEventListener('click', event => { if (event.target === reportDialog) reportDialog.close(); });
reportForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!reportingPlace || !reportForm.reportValidity()) return;
  const data = new FormData(reportForm);
  const report = {...snapshot(reportingPlace), reason: data.get('reason'), detail: String(data.get('detail') || '').trim()};
  const reports = readLocal(storageKeys.reports);
  if (!writeLocal(storageKeys.reports, [report, ...reports].slice(0, 50))) return;
  reportDialog.close();
  reportSuccessDialog.showModal();
});
reportSuccessDialog.querySelector('.report-success-confirm').addEventListener('click', () => reportSuccessDialog.close());

renderPersonalTrip();

const quickNavItems = [...document.querySelectorAll('.quick-nav-item')];
const quickNavSections = quickNavItems.map(item => byId(item.dataset.section)).filter(Boolean);
const setActiveQuickNav = sectionId => {
  document.body.classList.toggle('is-home', sectionId === 'top');
  quickNavSections.forEach(section => {
    const active = section.id === sectionId;
    section.classList.toggle('is-active', active);
    section.setAttribute('aria-hidden', String(!active));
  });
  quickNavItems.forEach(item => {
    const active = item.dataset.section === sectionId;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
};
const goToPage = sectionId => {
  const page = byId(sectionId);
  if (!page) return;
  setActiveQuickNav(sectionId);
  page.scrollTop = 0;
  history.replaceState(null, '', sectionId === 'top' ? location.pathname + location.search : `#${sectionId}`);
};
quickNavItems.forEach(item => item.addEventListener('click', event => {
  event.preventDefault();
  goToPage(item.dataset.section);
}));
document.querySelectorAll('[data-home-section]').forEach(item => item.addEventListener('click', event => {
  event.preventDefault();
  goToPage(item.dataset.homeSection);
}));
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); goToPage('top'); });
const initialPage = location.hash.slice(1);
if (quickNavItems.some(item => item.dataset.section === initialPage)) requestAnimationFrame(() => goToPage(initialPage));
else setActiveQuickNav('top');

const helpItems = {
  'saved-list': {title: '지역 추천 이용 방법', html: '<p>서울 25개 구와 주요 도시의 빵집을 지역마다 다섯 곳씩 보여줘요.</p><ul><li>네이버지도 방문자 리뷰 표시 수를 기준으로 정렬했어요.</li><li>같은 브랜드의 여러 지점은 대표 지점 한 곳만 반영해요.</li><li>TOP 5 보기에서 네이버맵과 카카오맵을 선택할 수 있어요.</li><li>저장한 지역은 ‘저장한 지역’ 필터에서 다시 볼 수 있어요.</li></ul>'},
  'my-trip': {title: '나의 빵지순례', html: '<p>방문 스탬프와 최근 확인한 매장을 한곳에서 볼 수 있어요.</p><ul><li>로그인 없이 현재 브라우저 기기에만 저장돼요.</li><li>브라우저 데이터나 사이트 저장 공간을 삭제하면 기록도 사라질 수 있어요.</li><li>다른 스마트폰이나 브라우저에는 자동으로 동기화되지 않아요.</li></ul>'},
  stamp: {title: '방문 스탬프 이용 방법', html: '<p class="help-highlight">매장 좌표에서 기본 300m 이내에 있어야 스탬프를 받을 수 있어요.</p><p>휴대전화가 알려주는 GPS 정확도가 낮을 때는 허용 범위가 자동으로 늘어나며, 최대 범위는 500m예요.</p><ul><li>위치 권한을 허용해야 해요.</li><li>좌표가 등록된 매장만 이용할 수 있어요.</li><li>같은 매장의 스탬프는 한 번만 저장돼요.</li><li>실내나 건물 밀집 지역에서는 GPS 오차가 발생할 수 있어요.</li></ul>'},
  recent: {title: '최근 본 매장', html: '<p>매장 카드에서 ‘네이버 지도에서 보기’를 누르면 최근 본 매장으로 자동 저장돼요.</p><ul><li>최대 20곳까지 저장돼요.</li><li>화면에는 최근 5곳을 먼저 보여줘요.</li><li>동일한 매장을 다시 확인하면 목록 맨 앞으로 이동해요.</li><li>기록은 현재 기기에만 저장돼요.</li></ul>'},
  wishlist: {title: '가고 싶은 빵집', html: '<p>매장 카드 오른쪽 위의 별을 누르면 이곳에 저장돼요.</p><ul><li>채워진 별은 저장된 매장이에요.</li><li>별을 다시 누르면 저장을 취소할 수 있어요.</li><li>목록은 로그인 없이 현재 기기에만 저장돼요.</li></ul>'},
  finder: {title: '내 취향 매장 찾기', html: '<p>16,738개 등록 매장을 매장명·주소·업종·지역으로 검색할 수 있어요.</p><ul><li>시·도와 시·군·구 필터를 함께 사용할 수 있어요.</li><li>처음에는 12곳을 보여주며 ‘매장 더 보기’로 추가 확인할 수 있어요.</li><li>네이버지도와 카카오맵 버튼은 같은 매장명 검색 화면으로 연결돼요.</li></ul>'},
  nearby: {title: '오늘의 랜덤 빵집', html: '<p>현재 위치 주변에 등록된 빵집 중 오늘 방문할 한 곳을 무작위로 추천해요.</p><ul><li>먼저 반경 2km를 찾고, 결과가 없으면 5km와 10km까지 넓혀요.</li><li>‘다른 빵집 추천’을 누르면 같은 매장이 연속해서 나오지 않아요.</li><li>위치 권한과 매장 좌표가 필요해요.</li><li>방문 전 지도에서 영업 여부를 확인해 주세요.</li></ul>'},
  data: {title: '매장 데이터 안내', html: '<p>주소나 위치 정보가 없는 매장은 목록에서 제외했어요. 기존 확인 매장과 공개 지도 자료가 함께 포함돼요.</p><ul><li>공개 자료의 매장명·주소·업종·좌표가 실제 현황과 다를 수 있어요.</li><li>방문하기 전에 네이버 지도에서 영업 여부와 위치를 다시 확인해 주세요.</li><li>잘못된 정보는 매장 카드의 ‘정보 제보’로 알려주세요.</li></ul>'}
};
const helpDialog = byId('help-dialog'), helpTitle = byId('help-title'), helpContent = byId('help-content');
document.addEventListener('click', event => {
  const button = event.target.closest('.help-button');
  if (!button) return;
  const item = helpItems[button.dataset.help];
  if (!item) return;
  helpTitle.textContent = item.title;
  helpContent.innerHTML = item.html;
  helpDialog.showModal();
});
helpDialog.querySelector('.dialog-close').addEventListener('click', () => helpDialog.close());
helpDialog.querySelector('.help-confirm').addEventListener('click', () => helpDialog.close());
helpDialog.addEventListener('click', event => { if (event.target === helpDialog) helpDialog.close(); });
