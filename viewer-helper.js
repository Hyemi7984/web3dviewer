/**
 * 공주역사박물관 3D 뷰어 헬퍼 모듈
 * Google <model-viewer>의 API를 제어하여 조명, 카메라 궤도, 어노테이션(핫스팟)을 관리합니다.
 */

export class MuseumViewerHelper {
  constructor(modelViewerId) {
    this.viewer = document.getElementById(modelViewerId);
    this.hotspotCounter = 0;
    this.onHotspotClicked = null; // 핫스팟 클릭 시 외부 콜백 함수
  }

  // 1. 초기화 및 리스너 등록
  init() {
    if (!this.viewer) {
      console.error("Model viewer element not found.");
      return;
    }
    console.log("Museum 3D Viewer Helper initialized.");
  }

  // 2. 조명 프리셋 변경
  setLightingPreset(preset) {
    if (!this.viewer) return;

    switch (preset) {
      case 'studio':
        this.viewer.exposure = 1.0;
        this.viewer.shadowIntensity = 0.8;
        this.viewer.shadowSoftness = 0.5;
        this.viewer.environmentImage = ''; // 기본 내장 조명
        break;
      case 'exhibition':
        this.viewer.exposure = 0.7;
        this.viewer.shadowIntensity = 1.0;
        this.viewer.shadowSoftness = 0.2; // 날카로운 그림자로 대조 향상
        this.viewer.environmentImage = '';
        break;
      case 'natural':
        this.viewer.exposure = 1.3;
        this.viewer.shadowIntensity = 0.5;
        this.viewer.shadowSoftness = 0.8;
        this.viewer.environmentImage = 'legacy'; // 자연광 느낌
        break;
      case 'cyberpunk':
        this.viewer.exposure = 1.6;
        this.viewer.shadowIntensity = 1.2;
        this.viewer.shadowSoftness = 0.3;
        // 보라/파랑 계열 느낌을 연출하기 위해 노출 및 강도를 강하게 설정
        break;
      default:
        this.viewer.exposure = 1.0;
        this.viewer.shadowIntensity = 0.8;
    }
  }

  // 3. 노출(밝기) 수동 조절
  setExposure(value) {
    if (this.viewer) {
      this.viewer.exposure = parseFloat(value);
    }
  }

  // 4. 그림자 강도 조절
  setShadowIntensity(value) {
    if (this.viewer) {
      this.viewer.shadowIntensity = parseFloat(value);
    }
  }

  // 5. 자동 회전 토글
  toggleAutoRotate(enable) {
    if (this.viewer) {
      this.viewer.autoRotate = enable;
    }
  }

  // 6. 스크린샷 저장
  async captureScreenshot(fileName = 'gongju_artifact_screenshot.png') {
    if (!this.viewer) return;
    
    try {
      // 투명 배경이나 레이아웃이 뭉개지지 않도록 model-viewer 캡처 API 활용
      const dataUrl = this.viewer.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Screenshot capture failed:", e);
      alert("스크린샷 캡처에 실패했습니다.");
    }
  }

  // 7. 특정 어노테이션(핫스팟) 위치로 카메라 부드럽게 이동
  focusOnHotspot(hotspotName, targetCoords, orbitCoords) {
    if (!this.viewer) return;

    // targetCoords: "x y z" (예: "0.01 0.05 -0.02")
    // orbitCoords: "deg1 deg2 radius" (예: "45deg 75deg 0.5m")
    if (targetCoords) {
      this.viewer.cameraTarget = targetCoords;
    }
    if (orbitCoords) {
      this.viewer.cameraOrbit = orbitCoords;
    }
  }

  // 8. 카메라 뷰 기본값으로 리셋
  resetCamera() {
    if (!this.viewer) return;
    this.viewer.cameraTarget = "auto auto auto";
    this.viewer.cameraOrbit = "auto auto auto";
  }

  // 9. 새로운 핫스팟 생성 (동적 HTML 삽입)
  createHotspotDOM(id, position, normal, title, description) {
    const btn = document.createElement('button');
    btn.className = 'hotspot-pin';
    btn.slot = `hotspot-${id}`;
    btn.dataset.position = position;
    btn.dataset.normal = normal;
    btn.dataset.id = id;
    
    // model-viewer용 어트리뷰트
    btn.setAttribute('data-position', position);
    btn.setAttribute('data-normal', normal);

    // 핫스팟 내 팝업 내용
    const annotation = document.createElement('div');
    annotation.className = 'hotspot-annotation';
    
    const h3 = document.createElement('h3');
    h3.innerText = title;
    
    const p = document.createElement('p');
    p.innerText = description;
    
    annotation.appendChild(h3);
    annotation.appendChild(p);
    btn.appendChild(annotation);

    // 클릭 이벤트 바인딩
    btn.addEventListener('click', (e) => {
      // 팝업 토글
      const allAnnotations = document.querySelectorAll('.hotspot-annotation');
      allAnnotations.forEach(ann => {
        if (ann !== annotation) ann.classList.remove('visible');
      });
      annotation.classList.toggle('visible');

      // 카메라 포커싱
      const pos = position.split(' ').map(num => parseFloat(num));
      // 해당 핀 좌표를 카메라 중심으로 설정하고, 약간 가까운 오빗 설정
      this.viewer.cameraTarget = position;
      this.viewer.cameraOrbit = `0deg 75deg 0.15m`; // 클로즈업

      if (this.onHotspotClicked) {
        this.onHotspotClicked(id, title, description);
      }
      e.stopPropagation();
    });

    return btn;
  }

  // 10. 뷰어에 핫스팟 추가 등록
  addHotspot(positionStr, normalStr, title, description) {
    if (!this.viewer) return null;
    
    const id = `custom-${++this.hotspotCounter}`;
    const hotspotElement = this.createHotspotDOM(id, positionStr, normalStr, title, description);
    this.viewer.appendChild(hotspotElement);
    
    return {
      id: id,
      position: positionStr,
      normal: normalStr,
      title: title,
      description: description
    };
  }

  // 11. 모든 핫스팟 초기화
  clearHotspots() {
    if (!this.viewer) return;
    // 기존에 추가된 동적 핫스팟 노드 제거 (slot 이름이 hotspot- 으로 시작하는 버튼들)
    const pins = this.viewer.querySelectorAll('button[slot^="hotspot-"]');
    pins.forEach(pin => pin.remove());
    this.hotspotCounter = 0;
  }
}
