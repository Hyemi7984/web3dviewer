import { MuseumViewerHelper } from './viewer-helper.js';

// ==========================================================================
// 1. 유물 데이터베이스 (Mock Data)
// ==========================================================================
const DEFAULT_ARTIFACTS = [
  {
    id: 'sumaksae',
    title: '8엽연화문와당 (八葉蓮花紋瓦當)',
    era: '백제',
    accession: '18-1',
    has3d: true,
    modelUrl: '41_deci.glb',
    thumbnail: 'sumaksae_capture.png', // 실제 캡처 이미지로 연동
    color: '연화색, 흑색이 약간 보임',
    clay: '고운편이며 다량의 모래 포함 됨',
    pattern: '8엽 연화문이 중앙에 자리 잡고 있음, 가장자리 약간 파손됨, 연자 7과',
    size: '지름 15.5cm, 두께 3.4cm',
    desc: '백제 웅진성 시기 기와 공예의 원숙미를 대변하는 대표적인 지붕 마감용 와당(수막새)입니다. 자방 중앙에 오밀조밀하게 각인된 7개의 씨앗(연자)과 이를 감싸는 8개의 유려한 연꽃잎 조각선이 대칭적 균형을 이룹니다. 가장자리 주연부에 오랜 세월 풍화를 거치며 생긴 파손 흔적이 기품 있는 세월의 무게를 고스란히 증명합니다.',
    hotspots: [
      { id: 'h1', position: '0.01 0.05 0.02', normal: '0 0 1', title: '중앙 자방 (연자 7과)', description: '연꽃 한가운데 씨방을 나타내는 동심원 영역에 7개의 동글동글한 연자가 입체적으로 배치되어 백제 특유의 은은한 조형미를 강조합니다.' },
      { id: 'h2', position: '-0.04 -0.03 0.01', normal: '0 0 1', title: '8엽 연화문 꽃잎', description: '화사하고 부드럽게 융기된 8장의 잎새 형태는 날카롭지 않고 선하며 우아한 백제 문화의 고유 색채를 고스란히 투영하고 있습니다.' },
      { id: 'h3', position: '0.07 -0.01 0.005', normal: '1 0 0', title: '가장자리 파손 부위', description: '부식과 마모로 둥근 가장자리 형태의 일부가 뜯겨 나간 유실 부위로, 학술적 고증에서 이 파손 패턴은 오랜 야외 잔존 역사를 규명하는 중요한 지표가 됩니다.' }
    ]
  },
  {
    id: 'celadon',
    title: '청자 주전자 (靑瓷酒煎子)',
    era: '고려시대 추정',
    accession: '81',
    has3d: true, // 3D 파일 연동 완료
    modelUrl: '159_deci.glb',
    thumbnail: 'celadon_capture.png', // 실제 캡처 이미지로 연동
    color: '녹청색의 유약',
    clay: '평저 (平底)',
    pattern: '난(卵)형 몸체, 손잡이 탈락 추정, 길게 뻗은 주둥이, 좁은 구연부에 뚜껑 받침',
    size: '높이 16.1cm, 굽지름 9.6cm, 구경 3.27cm',
    desc: '고려 시대로 고증된 녹청색 유약 광택이 서린 유려한 청자 주전자입니다. 계란(난형) 모양의 우아하고 풍만한 동체 라인과 액체를 따르는 좁고 가느다란 주둥이가 높은 완성도로 뻗어 있습니다. 몸체 한쪽에 부착되었을 손잡이는 과거 어느 시점에 유실되어 파손 자국만이 도드라지며, 입구부에는 본래 있었을 주전자 뚜껑을 받치던 받침 흔적이 선명하게 남아 있습니다.',
    hotspots: []
  }
];

// 임시: 새로운 데이터 적용을 위해 로컬스토리지 캐시 초기화
localStorage.removeItem('gongju_museum_artifacts');

// 로컬 저장소(localStorage) 연동 데이터 로드
let artifacts = [...DEFAULT_ARTIFACTS];
const savedArtifacts = localStorage.getItem('gongju_museum_artifacts');
if (savedArtifacts) {
  try {
    artifacts = JSON.parse(savedArtifacts);
  } catch (e) {
    console.error("Failed to parse saved artifacts:", e);
  }
}

// 데이터 로컬 저장소 덤프 함수
function saveArtifactsToStorage() {
  localStorage.setItem('gongju_museum_artifacts', JSON.stringify(artifacts));
}

// ==========================================================================
// 2. 앱 전역 상태 관리 및 DOM 요소 취득
// ==========================================================================
let currentArtifact = null;
let viewerHelper = null;
let addHotspotMode = false;
let pendingHotspotClick = null; // 핫스팟이 찍힐 좌표 캐시

// 뷰 DOM
const homeView = document.getElementById('view-home');
const listView = document.getElementById('view-list');
const detailView = document.getElementById('view-detail');

// 내비게이션 DOM
const navHome = document.getElementById('nav-home');
const navList = document.getElementById('nav-list');
const btnGoList = document.getElementById('btn-go-list');

// 로비 DOM
const artifactGrid = document.getElementById('artifact-grid');
const lobbySearchInput = document.getElementById('lobby-search');
const eraFilter = document.getElementById('filter-era');
const typeFilter = document.getElementById('filter-type');
const btnSearch = document.getElementById('btn-search');
const totalCountEl = document.getElementById('total-count');

// 상세 DOM
const btnBack = document.getElementById('btn-back');
const viewerContainer = document.getElementById('viewer-container');
const detailViewer = document.getElementById('detail-viewer');
const fallbackViewport = document.getElementById('fallback-viewport');
const fileUploadInput = document.getElementById('file-upload-input');
const detailModelUploadInput = document.getElementById('detail-model-upload-input');

// 명세서 DOM
const specTitle = document.getElementById('spec-title');
const specAccession = document.getElementById('spec-accession');
const specEra = document.getElementById('spec-era');
const specName = document.getElementById('spec-name');
const specNum = document.getElementById('spec-num');
const specPeriod = document.getElementById('spec-period');
const specColor = document.getElementById('spec-color');
const specClay = document.getElementById('spec-clay');
const specPattern = document.getElementById('spec-pattern');
const specSize = document.getElementById('spec-size');
const specDesc = document.getElementById('spec-desc');

// 어노테이션 리스트 DOM
const hotspotListEl = document.getElementById('hotspot-list');
const toggleHotspotMode = document.getElementById('toggle-hotspot-mode');

// 모달 DOM
const pinPromptOverlay = document.getElementById('pin-prompt-overlay');
const pinTitleInput = document.getElementById('pin-title-input');
const pinDescInput = document.getElementById('pin-desc-input');
const btnCancelPin = document.getElementById('btn-cancel-pin');
const btnConfirmPin = document.getElementById('btn-confirm-pin');

// ==========================================================================
// 3. 로비(메인 목록) 페이지 로직
// ==========================================================================

// 전시 카탈로그 그리드 렌더링
function renderLobbyGrid() {
  artifactGrid.innerHTML = '';
  
  const searchKeyword = lobbySearchInput.value.trim().toLowerCase();
  const selectedEra = eraFilter.value;
  const selectedType = typeFilter.value;
  
  // 필터링 적용
  const filtered = artifacts.filter(item => {
    // 검색어 필터
    const matchesKeyword = item.title.toLowerCase().includes(searchKeyword) || 
                           item.desc.toLowerCase().includes(searchKeyword) ||
                           item.accession.toLowerCase().includes(searchKeyword);
    
    // 시대 필터
    const matchesEra = selectedEra === 'all' || item.era === selectedEra;
    
    // 종류 필터
    let matchesType = true;
    if (selectedType !== 'all') {
      if (selectedType === 'wadang') {
        matchesType = item.title.includes('와당') || item.title.includes('막새');
      } else if (selectedType === 'celadon') {
        matchesType = item.title.includes('청자') || item.title.includes('백자') || item.title.includes('주전자');
      } else {
        // 기타
        matchesType = !item.title.includes('와당') && !item.title.includes('청자') && !item.title.includes('주전자');
      }
    }
    
    return matchesKeyword && matchesEra && matchesType;
  });
  
  totalCountEl.innerText = filtered.length;

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'artifact-card fade-in';
    
    const badgeText = item.has3d ? '3D 감상 가능' : '3D 자료 준비 중';
    const badgeClass = item.has3d ? 'status-ready' : 'status-missing';
    
    // 이미지 썸네일 분기 (없을 시 더미 엠블럼)
    const imgHtml = item.thumbnail 
      ? `<img src="${item.thumbnail}" alt="${item.title}" class="card-img">`
      : `<div class="card-img" style="background: linear-gradient(135deg, #1a365d 0%, #c5a059 100%); display:flex; align-items:center; justify-content:center; color:white; font-family:'Nanum Myeongjo'; font-size:3rem; font-weight:800;">공</div>`;

    card.innerHTML = `
      <div class="card-img-wrapper">
        <span class="card-badge ${badgeClass}">${badgeText}</span>
        ${imgHtml}
      </div>
      <div class="card-content">
        <span class="card-era">${item.era}</span>
        <h4 class="card-title">${item.title}</h4>
        <p class="card-desc">${item.desc}</p>
        <div class="card-footer-meta">
          <span>소장번호: ${item.accession}</span>
          <span>규격: ${item.size.split(',')[0]}</span>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => navigateToDetail(item.id));
    artifactGrid.appendChild(card);
  });

  // 드래그 앤 드롭 업로드 카드 추가 배치
  const uploadCard = document.createElement('div');
  uploadCard.className = 'uploader-card';
  uploadCard.innerHTML = `
    <div class="uploader-icon">📥</div>
    <h4 class="uploader-title">새 소장품 등록</h4>
    <p class="uploader-desc">3D 모델 파일(.glb)을 드래그하여 놓거나 클릭하여 추가하세요.</p>
  `;
  uploadCard.addEventListener('click', () => fileUploadInput.click());
  
  // 드래그앤드롭 이벤트 리스너 바인딩
  uploadCard.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadCard.style.backgroundColor = 'var(--accent-gold-light)';
    uploadCard.style.borderStyle = 'solid';
  });
  uploadCard.addEventListener('dragleave', () => {
    uploadCard.style.backgroundColor = 'transparent';
    uploadCard.style.borderStyle = 'dashed';
  });
  uploadCard.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadCard.style.backgroundColor = 'transparent';
    uploadCard.style.borderStyle = 'dashed';
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleNewGLBFile(files[0]);
    }
  });

  artifactGrid.appendChild(uploadCard);
}

// 새로운 GLB 유물 등록
function handleNewGLBFile(file) {
  if (!file.name.endsWith('.glb')) {
    alert('오직 .glb 형식의 3D 파일만 등록할 수 있습니다.');
    return;
  }

  const titleInput = prompt('새로운 유물의 이름을 입력해 주세요:', file.name.replace('.glb', ''));
  if (!titleInput) return;

  const eraInput = prompt('유물의 시대적 배경을 입력해 주세요 (예: 백제, 조선):', '시대미상');
  
  const blobUrl = URL.createObjectURL(file);
  const newId = 'user-artifact-' + Date.now();
  
  const newArtifact = {
    id: newId,
    title: titleInput,
    era: eraInput || '백제',
    accession: 'User-' + Math.floor(Math.random() * 900 + 100),
    has3d: true,
    modelUrl: blobUrl,
    thumbnail: '', // 업로드된 데이터는 3D 실시간 뷰로 대체
    color: '스캔 텍스처',
    clay: '고운 점토질 추정',
    pattern: '등록된 3D 스캔본 표면 굴곡 확인 가능',
    size: '스캔 원본 3D 스케일 적용됨',
    desc: '큐레이터가 직접 웹 뷰어에서 3D 파일(.glb)을 현장 연동하여 임시 보관 중인 디지털 소장품입니다. 어노테이션 핀 설정 및 뷰어 조작이 즉각 지원됩니다.',
    hotspots: []
  };

  artifacts.push(newArtifact);
  saveArtifactsToStorage();
  renderLobbyGrid();
  
  // 등록 완료 즉시 상세 페이지로 이동
  navigateToDetail(newId);
}

// ==========================================================================
// 4. 상세 페이지 로직 (Viewer Workspace) 및 라우팅
// ==========================================================================

function showHome() {
  homeView.classList.remove('hidden');
  listView.classList.add('hidden');
  detailView.classList.add('hidden');
  navHome.classList.add('active');
  navList.classList.remove('active');
  window.scrollTo(0, 0);
}

function showList() {
  homeView.classList.add('hidden');
  listView.classList.remove('hidden');
  detailView.classList.add('hidden');
  navHome.classList.remove('active');
  navList.classList.add('active');
  renderLobbyGrid();
  window.scrollTo(0, 0);
}

function navigateToDetail(id) {
  currentArtifact = artifacts.find(item => item.id === id);
  if (!currentArtifact) return;

  // SPA 뷰 상태 전환 (상세 뷰만 활성화)
  homeView.classList.add('hidden');
  listView.classList.add('hidden');
  detailView.classList.remove('hidden');
  navHome.classList.remove('active');
  navList.classList.remove('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 뷰어 정보 바인딩
  specTitle.innerText = currentArtifact.title;
  specAccession.innerText = `소장번호: ${currentArtifact.accession}`;
  specEra.innerText = currentArtifact.era;

  specName.innerText = currentArtifact.title;
  specNum.innerText = currentArtifact.accession;
  specPeriod.innerText = currentArtifact.era;
  specColor.innerText = currentArtifact.color;
  specClay.innerText = currentArtifact.clay;
  specPattern.innerText = currentArtifact.pattern;
  specSize.innerText = currentArtifact.size;
  specDesc.innerText = currentArtifact.desc;

  // 핫스팟 모드 리셋
  addHotspotMode = false;
  toggleHotspotMode.checked = false;

  // 3D 뷰어 인스턴스/폴백 제어
  render3DViewer();
}

function render3DViewer() {
  viewerHelper.clearHotspots();
  
  if (currentArtifact.has3d && currentArtifact.modelUrl) {
    // 3D 데이터가 존재하는 경우
    fallbackViewport.classList.add('hidden');
    detailViewer.classList.remove('hidden');
    
    // model-viewer 소스 로드
    detailViewer.src = currentArtifact.modelUrl;
    
    // 로딩 완료 후 핫스팟(어노테이션) 세팅
    detailViewer.addEventListener('load', () => {
      viewerHelper.clearHotspots();
      if (currentArtifact.hotspots && currentArtifact.hotspots.length > 0) {
        currentArtifact.hotspots.forEach(pin => {
          viewerHelper.addHotspot(pin.position, pin.normal, pin.title, pin.description);
        });
      }
      renderHotspotList();
    }, { once: true });

  } else {
    // 3D 데이터가 유실되었거나 준비 중인 경우 ('자료 없음')
    detailViewer.classList.add('hidden');
    fallbackViewport.classList.remove('hidden');
    renderHotspotList(); // 빈 목록 렌더링
  }
}

// 상세 페이지에서 GLB 직접 주입 업로드
function handleDetailGLBInject(file) {
  if (!file || !file.name.endsWith('.glb')) {
    alert('.glb 파일 형식만 지원합니다.');
    return;
  }

  const blobUrl = URL.createObjectURL(file);
  currentArtifact.has3d = true;
  currentArtifact.modelUrl = blobUrl;
  
  // 데이터 목록 및 스토리지 업데이트
  const idx = artifacts.findIndex(item => item.id === currentArtifact.id);
  if (idx !== -1) {
    artifacts[idx] = currentArtifact;
    saveArtifactsToStorage();
  }

  // 3D 뷰어 갱신
  render3DViewer();
}

// ==========================================================================
// 5. 어노테이션(핫스팟) 관리 및 제어
// ==========================================================================

// 사이드바 핫스팟 목록 UI 갱신
function renderHotspotList() {
  hotspotListEl.innerHTML = '';
  const pins = currentArtifact.hotspots || [];

  if (pins.length === 0) {
    hotspotListEl.innerHTML = `<li style="font-size:0.75rem; color:var(--text-muted); list-style:none; padding:10px 0; text-align:center;">등록된 해설 핀이 없습니다.</li>`;
    return;
  }

  pins.forEach(pin => {
    const li = document.createElement('li');
    li.className = 'hotspot-item';
    li.innerHTML = `
      <div>
        <div class="hotspot-item-title">${pin.title}</div>
        <div class="hotspot-item-desc">${pin.description}</div>
      </div>
      <button class="delete-pin-btn" style="border:none; background:transparent; cursor:pointer; color:var(--text-muted); font-size:0.8rem;" title="핀 삭제">✕</button>
    `;

    // 핀 삭제 핸들러
    li.querySelector('.delete-pin-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHotspot(pin.id);
    });

    // 핀 클릭 시 3D 카메라 줌인 타겟 이동
    li.addEventListener('click', () => {
      viewerHelper.focusOnHotspot(pin.id, pin.position, '0deg 75deg 0.15m');
      
      // 3D 뷰어상의 핀 팝업 토글
      const allPins = detailViewer.querySelectorAll('.hotspot-annotation');
      allPins.forEach(ann => ann.classList.remove('visible'));
      
      const targetPin = detailViewer.querySelector(`button[slot="hotspot-${pin.id}"] .hotspot-annotation`);
      if (targetPin) {
        targetPin.classList.add('visible');
      }
    });

    hotspotListEl.appendChild(li);
  });
}

// 핫스팟 핀 삭제 로직
function deleteHotspot(pinId) {
  currentArtifact.hotspots = currentArtifact.hotspots.filter(p => p.id !== pinId);
  
  // 로컬 메모리 동기화
  const idx = artifacts.findIndex(item => item.id === currentArtifact.id);
  if (idx !== -1) {
    artifacts[idx] = currentArtifact;
    saveArtifactsToStorage();
  }

  // 뷰어 및 목록 새로고침
  render3DViewer();
}

// 더블클릭 이벤트 발생 시 핫스팟 생성 팝업(모달) 현시
function handleModelViewerDoubleClick(event) {
  if (!addHotspotMode) return;

  const rect = detailViewer.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  
  // model-viewer 자체 메서드를 활용해 마우스 포인터의 3D 공간 표면 교차 좌표 계산
  const hit = detailViewer.positionAndNormalFromPoint(x, y);
  
  if (hit) {
    pendingHotspotClick = hit;
    // 모달창 오픈
    pinTitleInput.value = '';
    pinDescInput.value = '';
    pinPromptOverlay.classList.remove('hidden');
    pinTitleInput.focus();
  } else {
    alert("유물 표면 위를 더블 클릭해 주세요.");
  }
}

// 신규 핫스팟 핀 저장 확정
function confirmNewHotspot() {
  const title = pinTitleInput.value.trim();
  const desc = pinDescInput.value.trim();

  if (!title || !desc) {
    alert("제목과 해설 내용을 모두 채워주세요.");
    return;
  }

  if (pendingHotspotClick && currentArtifact) {
    const { position, normal } = pendingHotspotClick;
    const posStr = `${position.x} ${position.y} ${position.z}`;
    const normStr = `${normal.x} ${normal.y} ${normal.z}`;

    const newPin = {
      id: 'custom-' + Date.now(),
      position: posStr,
      normal: normStr,
      title: title,
      description: desc
    };

    if (!currentArtifact.hotspots) currentArtifact.hotspots = [];
    currentArtifact.hotspots.push(newPin);

    // 스토리지에 반영
    const idx = artifacts.findIndex(item => item.id === currentArtifact.id);
    if (idx !== -1) {
      artifacts[idx] = currentArtifact;
      saveArtifactsToStorage();
    }

    // 모달 숨기기 및 새로 렌더링
    pinPromptOverlay.classList.add('hidden');
    pendingHotspotClick = null;
    
    render3DViewer();
  }
}

// ==========================================================================
// 6. 이벤트 통합 바인딩 및 앱 로드
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. 3D 뷰어 제어 헬퍼 인스턴스 기동
  viewerHelper = new MuseumViewerHelper('detail-viewer');
  viewerHelper.init();

  // 2. 메인 로비 그리드 첫 렌더링
  renderLobbyGrid();

  // 3. 네비게이션 및 검색 연동
  navHome.addEventListener('click', (e) => { e.preventDefault(); showHome(); });
  navList.addEventListener('click', (e) => { e.preventDefault(); showList(); });
  if (btnGoList) btnGoList.addEventListener('click', showList);

  btnSearch.addEventListener('click', renderLobbyGrid);
  lobbySearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { showList(); renderLobbyGrid(); }
  });
  eraFilter.addEventListener('change', renderLobbyGrid);
  typeFilter.addEventListener('change', renderLobbyGrid);

  // 카테고리 퀵버튼 필터
  const catItems = document.querySelectorAll('.category-item');
  catItems.forEach(item => {
    item.addEventListener('click', () => {
      catItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      const catVal = item.dataset.category;
      if (catVal === 'all') {
        typeFilter.value = 'all';
        eraFilter.value = 'all';
      } else if (catVal === 'wadang') {
        typeFilter.value = 'wadang';
      } else if (catVal === 'celadon') {
        typeFilter.value = 'celadon';
      } else if (catVal === 'muryeong') {
        eraFilter.value = '백제';
        typeFilter.value = 'all';
      }
      showList(); // 카테고리 클릭 시 즉시 목록 뷰로 이동
    });
  });

  // 4. 로비 전용 숨겨진 파일 인풋 핸들러
  fileUploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleNewGLBFile(e.target.files[0]);
    }
  });

  // 5. 상세 페이지 뒤로가기 버튼
  btnBack.addEventListener('click', () => {
    // 3D 렌더링 중지 및 목록 화면 복귀
    detailViewer.src = '';
    showList();
  });

  // 6. 상세 3D 자료 유실 폴백 업로더 연동
  detailModelUploadInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleDetailGLBInject(e.target.files[0]);
    }
  });
  
  // 드래그앤드롭 폴백 화면 적용
  const fallbackBox = document.querySelector('.fallback-box');
  if (fallbackBox) {
    fallbackBox.addEventListener('dragover', (e) => e.preventDefault());
    fallbackBox.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleDetailGLBInject(files[0]);
      }
    });
  }

  // 7. 3D 뷰어 인터랙션 툴바 바인딩
  const btnAutoRotate = document.getElementById('btn-auto-rotate');
  const btnResetCamera = document.getElementById('btn-reset-camera');
  const selectLighting = document.getElementById('select-lighting');
  const sliderExposure = document.getElementById('slider-exposure');
  const sliderShadow = document.getElementById('slider-shadow');
  const btnScreenshot = document.getElementById('btn-screenshot');

  // 자동회전 토글
  btnAutoRotate.addEventListener('click', () => {
    const isActive = btnAutoRotate.classList.toggle('active');
    viewerHelper.toggleAutoRotate(isActive);
  });

  // 카메라 뷰 리셋
  btnResetCamera.addEventListener('click', () => {
    viewerHelper.resetCamera();
  });

  // 조명 프리셋 선택 변경
  selectLighting.addEventListener('change', (e) => {
    const preset = e.target.value;
    viewerHelper.setLightingPreset(preset);
    // 슬라이더 바인딩 연동 동기화
    sliderExposure.value = detailViewer.exposure;
    sliderShadow.value = detailViewer.shadowIntensity;
  });

  // 노출 수동 슬라이더
  sliderExposure.addEventListener('input', (e) => {
    viewerHelper.setExposure(e.target.value);
  });

  // 그림자 수동 슬라이더
  sliderShadow.addEventListener('input', (e) => {
    viewerHelper.setShadowIntensity(e.target.value);
  });

  // 스크린샷 다운로드
  btnScreenshot.addEventListener('click', () => {
    const filename = `${currentArtifact.id}_capture.png`;
    viewerHelper.captureScreenshot(filename);
  });

  // 8. 어노테이션(핫스팟) 핀 등록 기능 더블 클릭 리스너
  detailViewer.addEventListener('dblclick', handleModelViewerDoubleClick);

  // 핀 추가 모드 스위치 연동
  toggleHotspotMode.addEventListener('change', (e) => {
    addHotspotMode = e.target.checked;
    if (addHotspotMode) {
      alert("큐레이터 핀 추가 모드가 활성화되었습니다.\n유물 표면 위를 '더블 클릭'하여 새로운 해설 핀을 꽂을 수 있습니다.");
    }
  });

  // 9. 핫스팟 추가 모달 제어 바인딩
  btnCancelPin.addEventListener('click', () => {
    pinPromptOverlay.classList.add('hidden');
    pendingHotspotClick = null;
  });

  btnConfirmPin.addEventListener('click', confirmNewHotspot);

  // 인기 유물 목록 연동 이동 바인딩
  const rankItems = document.querySelectorAll('.ranking-item');
  rankItems.forEach(item => {
    item.addEventListener('click', () => {
      const artId = item.dataset.artifact;
      if (artId === 'sumaksae') {
        navigateToDetail('sumaksae');
      } else if (artId === 'celadon') {
        navigateToDetail('celadon');
      } else {
        alert("선택하신 인기 유물(석수/관장식)의 3D 데이터 및 전시 준비 중입니다.");
      }
    });
  });
});
