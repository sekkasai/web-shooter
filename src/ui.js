export class UI {
  constructor(root) {
    this.root = root;
    this.scoreValue = root.querySelector("#score");
    this.timeValue = root.querySelector("#time");
    this.ammoValue = root.querySelector("#ammo");
    this.statusValue = root.querySelector("#status");
    this.screen = root.querySelector("#screen");
    this.screenEyebrow = root.querySelector("#screen-eyebrow");
    this.screenTitle = root.querySelector("#screen-title");
    this.screenBody = root.querySelector("#screen-body");
    this.screenButton = root.querySelector("#screen-button");
    this.mobileControls = root.querySelector("#mobile-controls");
    this.stickZone = root.querySelector("#stick-zone");
    this.stickKnob = root.querySelector("#stick-knob");
    this.lookZone = root.querySelector("#look-zone");
    this.fireButton = root.querySelector("#fire-button");
    this.jumpButton = root.querySelector("#jump-button");
    this.reloadButton = root.querySelector("#reload-button");
    this.orientationLock = root.querySelector("#orientation-lock");
  }

  bindStart(handler) {
    this.screenButton?.addEventListener("click", handler);
  }

  updateHud({ score, timeLeft, ammo, maxAmmo, isReloading, isMobile }) {
    if (this.scoreValue) {
      this.scoreValue.textContent = String(score);
    }

    if (this.timeValue) {
      this.timeValue.textContent = timeLeft.toFixed(1);
    }

    if (this.ammoValue) {
      this.ammoValue.textContent = `${ammo} / ${maxAmmo}`;
    }

    if (this.statusValue) {
      this.statusValue.textContent = isReloading
        ? "재장전 중..."
        : isMobile
          ? "왼쪽 이동 / 오른쪽 조준 / FIRE 발사 / JMP 점프 / RLD 재장전"
          : "좌클릭 사격 / Space 점프 / R 재장전";
    }
  }

  showStart(isMobile) {
    this.configureScreen({
      eyebrow: "THREE.JS FPS",
      title: "Target Rush",
      body: isMobile
        ? "왼쪽 조이스틱으로 이동하고 오른쪽 화면을 드래그해 조준하세요. FIRE로 사격하고 JMP로 점프, RLD로 재장전합니다. 가로 모드에서 시작하면 타겟 6개가 전방 장애물 주변에서 나타납니다."
        : "WASD로 이동하고 마우스로 조준하세요. 좌클릭으로 사격, Space로 점프, R로 재장전합니다. 시작하면 타겟 6개가 전방 장애물 주변에서 나타납니다.",
      button: "게임 시작"
    });
  }

  showPause() {
    this.configureScreen({
      eyebrow: "PAUSED",
      title: "포커스를 다시 잡아주세요",
      body:
        "마우스 포인터가 풀렸습니다. 버튼을 눌러 다시 전장으로 돌아가세요.",
      button: "계속하기"
    });
  }

  showEnd(score) {
    this.configureScreen({
      eyebrow: "TIME OVER",
      title: `최종 점수 ${score}`,
      body:
        "60초가 종료되었습니다. 다시 시작해서 더 높은 점수를 노려보세요.",
      button: "다시 시작"
    });
  }

  hideScreen() {
    this.screen?.classList.remove("screen--visible");
  }

  setMobileControlsVisible(visible) {
    this.mobileControls?.classList.toggle("mobile-controls--visible", visible);
  }

  showOrientationLock() {
    this.orientationLock?.classList.add("orientation-lock--visible");
  }

  hideOrientationLock() {
    this.orientationLock?.classList.remove("orientation-lock--visible");
  }

  resetStick() {
    if (this.stickKnob) {
      this.stickKnob.style.transform = "translate3d(0px, 0px, 0)";
    }
  }

  updateStick(x, y) {
    if (this.stickKnob) {
      this.stickKnob.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }

  configureScreen({ eyebrow, title, body, button }) {
    if (this.screenEyebrow) {
      this.screenEyebrow.textContent = eyebrow;
    }

    if (this.screenTitle) {
      this.screenTitle.textContent = title;
    }

    if (this.screenBody) {
      this.screenBody.textContent = body;
    }

    if (this.screenButton) {
      this.screenButton.textContent = button;
    }

    this.screen?.classList.add("screen--visible");
  }
}
