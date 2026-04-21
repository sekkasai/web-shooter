import {
  getStoredLocale,
  getTranslations,
  normalizeLocale,
  storeLocale
} from "./i18n.js";

export class UI {
  constructor(root) {
    this.root = root;
    this.locale = getStoredLocale();
    this.messages = getTranslations(this.locale);
    this.scoreValue = root.querySelector("#score");
    this.timeValue = root.querySelector("#time");
    this.ammoValue = root.querySelector("#ammo");
    this.statusValue = root.querySelector("#status");
    this.scoreLabel = root.querySelector("#score-label");
    this.timeLabel = root.querySelector("#time-label");
    this.ammoLabel = root.querySelector("#ammo-label");
    this.screen = root.querySelector("#screen");
    this.screenPanel = root.querySelector("#screen-panel");
    this.screenEyebrow = root.querySelector("#screen-eyebrow");
    this.screenTitle = root.querySelector("#screen-title");
    this.screenBody = root.querySelector("#screen-body");
    this.screenButton = root.querySelector("#screen-button");
    this.screenLocale = root.querySelector("#screen-locale");
    this.localeLabel = root.querySelector("#locale-label");
    this.localeButtons = Array.from(root.querySelectorAll("[data-locale]"));
    this.mobileControls = root.querySelector("#mobile-controls");
    this.stickZone = root.querySelector("#stick-zone");
    this.stickKnob = root.querySelector("#stick-knob");
    this.lookZone = root.querySelector("#look-zone");
    this.lookLabel = root.querySelector("#look-label");
    this.fireButton = root.querySelector("#fire-button");
    this.jumpButton = root.querySelector("#jump-button");
    this.reloadButton = root.querySelector("#reload-button");
    this.orientationLock = root.querySelector("#orientation-lock");
    this.orientationEyebrow = root.querySelector("#orientation-eyebrow");
    this.orientationTitle = root.querySelector("#orientation-title");
    this.orientationBody = root.querySelector("#orientation-body");
    this.hudState = {
      score: 0,
      timeLeft: 60,
      ammo: 30,
      maxAmmo: 30,
      isReloading: false,
      isMobile: false
    };
    this.statusMode = "idle";
    this.screenState = {
      type: "start",
      isMobile: false
    };

    this.applyLocale();
  }

  bindStart(handler) {
    this.screenButton?.addEventListener("click", handler);
  }

  bindLocaleChange(handler = () => {}) {
    this.localeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const { locale } = button.dataset;

        if (!locale) {
          return;
        }

        this.setLocale(locale);
        handler(locale);
      });
    });
  }

  setLocale(locale) {
    this.locale = normalizeLocale(locale);
    this.messages = getTranslations(this.locale);
    storeLocale(this.locale);
    this.applyLocale();
  }

  updateHud({ score, timeLeft, ammo, maxAmmo, isReloading, isMobile }) {
    this.hudState = {
      score,
      timeLeft,
      ammo,
      maxAmmo,
      isReloading,
      isMobile
    };
    this.statusMode = "running";

    if (this.scoreValue) {
      this.scoreValue.textContent = String(score);
    }

    if (this.timeValue) {
      this.timeValue.textContent = timeLeft.toFixed(1);
    }

    if (this.ammoValue) {
      this.ammoValue.textContent = `${ammo} / ${maxAmmo}`;
    }

    this.renderStatus();
  }

  showStart(isMobile) {
    this.screenState = {
      type: "start",
      isMobile
    };
    this.statusMode = "idle";
    this.renderStatus();
    this.renderScreen();
  }

  showPause() {
    this.screenState = {
      type: "pause"
    };
    this.statusMode = "paused";
    this.renderStatus();
    this.renderScreen();
  }

  showEnd(score) {
    this.screenState = {
      type: "end",
      score
    };
    this.statusMode = "ended";
    this.renderStatus();
    this.renderScreen();
  }

  showFullscreenResume() {
    this.screenState = {
      type: "fullscreenResume"
    };
    this.statusMode = "paused";
    this.renderStatus();
    this.renderScreen();
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

  applyLocale() {
    document.documentElement.lang = this.locale === "kr" ? "ko" : this.locale;
    document.title = this.messages.meta.documentTitle;
    this.renderHudLabels();
    this.renderStatus();
    this.renderMobileLabels();
    this.renderOrientationLockCopy();
    this.renderLocaleButtons();
    this.renderScreen();
  }

  renderHudLabels() {
    if (this.scoreLabel) {
      this.scoreLabel.textContent = this.messages.hud.score;
    }

    if (this.timeLabel) {
      this.timeLabel.textContent = this.messages.hud.time;
    }

    if (this.ammoLabel) {
      this.ammoLabel.textContent = this.messages.hud.ammo;
    }
  }

  renderStatus() {
    if (!this.statusValue) {
      return;
    }

    if (this.statusMode === "running") {
      this.statusValue.textContent = this.hudState.isReloading
        ? this.messages.hud.reloading
        : this.hudState.isMobile
          ? this.messages.hud.mobileControls
          : this.messages.hud.desktopControls;
      return;
    }

    if (this.statusMode === "paused") {
      this.statusValue.textContent = this.messages.hud.statusPaused;
      return;
    }

    if (this.statusMode === "ended") {
      this.statusValue.textContent = this.messages.hud.statusEnded;
      return;
    }

    this.statusValue.textContent = this.messages.hud.statusIdle;
  }

  renderMobileLabels() {
    if (this.lookLabel) {
      this.lookLabel.textContent = this.messages.mobile.lookLabel;
    }

    if (this.fireButton) {
      this.fireButton.textContent = this.messages.mobile.fire;
    }

    if (this.jumpButton) {
      this.jumpButton.textContent = this.messages.mobile.jump;
    }

    if (this.reloadButton) {
      this.reloadButton.textContent = this.messages.mobile.reload;
    }
  }

  renderOrientationLockCopy() {
    if (this.orientationEyebrow) {
      this.orientationEyebrow.textContent = this.messages.orientation.eyebrow;
    }

    if (this.orientationTitle) {
      this.orientationTitle.textContent = this.messages.orientation.title;
    }

    if (this.orientationBody) {
      this.orientationBody.textContent = this.messages.orientation.body;
    }
  }

  renderLocaleButtons() {
    if (this.localeLabel) {
      this.localeLabel.textContent = this.messages.screen.localeLabel;
    }

    this.localeButtons.forEach((button) => {
      const isActive = button.dataset.locale === this.locale;
      button.classList.toggle("screen__locale-button--active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  renderScreen() {
    if (!this.screenState) {
      return;
    }

    switch (this.screenState.type) {
      case "pause":
        this.configureScreen({
          ...this.messages.screen.pause,
          showLocaleSelector: false,
          isFullscreen: false,
          panelMode: "overlay"
        });
        return;
      case "end":
        this.configureScreen({
          eyebrow: this.messages.screen.end.eyebrow,
          title: this.messages.screen.end.title(this.screenState.score),
          body: this.messages.screen.end.body,
          button: this.messages.screen.end.button,
          showLocaleSelector: false,
          isFullscreen: false,
          panelMode: "overlay"
        });
        return;
      case "fullscreenResume":
        this.configureScreen({
          ...this.messages.screen.fullscreenResume,
          showLocaleSelector: false,
          isFullscreen: false
        });
        return;
      case "start":
      default:
        this.configureScreen({
          eyebrow: this.messages.screen.start.eyebrow,
          title: this.messages.screen.start.title,
          body: this.screenState.isMobile
            ? this.messages.screen.start.mobileBody
            : this.messages.screen.start.desktopBody,
          button: this.messages.screen.start.button,
          showLocaleSelector: true,
          isFullscreen: true
        });
    }
  }

  configureScreen({
    eyebrow,
    title,
    body,
    button,
    showLocaleSelector = false,
    isFullscreen = false,
    panelMode = "card"
  }) {
    if (this.screenEyebrow) {
      this.screenEyebrow.textContent = eyebrow;
      this.screenEyebrow.classList.toggle("screen__eyebrow--hidden", !eyebrow);
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

    this.screenLocale?.classList.toggle(
      "screen__locale--visible",
      showLocaleSelector
    );
    this.screen?.classList.toggle("screen--fullscreen", isFullscreen);
    this.screenPanel?.classList.toggle("screen__panel--fullscreen", isFullscreen);
    this.screenPanel?.classList.toggle(
      "screen__panel--overlay",
      panelMode === "overlay"
    );
    this.screen?.classList.add("screen--visible");
  }
}
