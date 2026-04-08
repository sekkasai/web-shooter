import {
  AmbientLight,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector3,
  Vector2,
  WebGLRenderer
} from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { Player } from "./player.js";
import { TargetManager } from "./targets.js";
import { UI } from "./ui.js";
import { FirstPersonWeapon } from "./firstPersonWeapon.js";
import { Weapon } from "./weapon.js";
import { randomBetween } from "./random.js";

const TARGET_COUNT = 6;
const OBSTACLE_COUNT = 6;

export class Game {
  constructor(root) {
    this.root = root;
    this.scene = new Scene();
    this.scene.background = new Color("#87b6d8");
    this.scene.fog = new Fog("#87b6d8", 18, 82);
    this.weaponScene = new Scene();

    this.camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.weaponCamera = new PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.01,
      10
    );
    this.weaponCamera.rotation.order = "YXZ";

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.autoClear = false;

    this.clock = new Clock();
    this.raycaster = new Raycaster();
    this.screenCenter = new Vector2(0, 0);
    this.playerViewDirection = new Vector3(0, 0, -1);
    this.arenaHalfSize = 22;
    this.timeLimit = 60;
    this.state = "menu";
    this.awaitingLock = false;
    this.isMobile = this.detectMobile();
    this.mobileLookSensitivity = 0.004;
    this.mobilePortraitPaused = false;
    this.mobileStartQueued = false;
    this.mobileFireHeld = false;
    this.movePointerId = null;
    this.lookPointerId = null;
    this.stickRadius = 44;
    this.lastLookPoint = {
      x: 0,
      y: 0
    };

    this.ui = new UI(root);
    this.controls = new PointerLockControls(this.camera, document.body);
    this.player = new Player(this.camera, this.arenaHalfSize);
    this.weapon = new Weapon();
    this.firstPersonWeapon = new FirstPersonWeapon(this.weaponCamera);
    this.obstacles = [];
    this.obstacleGroup = new Group();
    this.obstacleMaterial = null;
    this.targetManager = new TargetManager(
      this.scene,
      this.arenaHalfSize,
      TARGET_COUNT
    );

    this.score = 0;
    this.timeLeft = this.timeLimit;

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleStart = this.handleStart.bind(this);
    this.handleMobileStickPointerDown =
      this.handleMobileStickPointerDown.bind(this);
    this.handleMobileStickPointerMove =
      this.handleMobileStickPointerMove.bind(this);
    this.handleMobileStickPointerUp =
      this.handleMobileStickPointerUp.bind(this);
    this.handleMobileLookPointerDown =
      this.handleMobileLookPointerDown.bind(this);
    this.handleMobileLookPointerMove =
      this.handleMobileLookPointerMove.bind(this);
    this.handleMobileLookPointerUp =
      this.handleMobileLookPointerUp.bind(this);
    this.handleMobileFirePointerDown =
      this.handleMobileFirePointerDown.bind(this);
    this.handleMobileFirePointerUp = this.handleMobileFirePointerUp.bind(this);
    this.handleMobileJump = this.handleMobileJump.bind(this);
    this.handleMobileReload = this.handleMobileReload.bind(this);
    this.animate = this.animate.bind(this);
  }

  mount() {
    this.root.prepend(this.renderer.domElement);
    this.setupWorld();
    this.bindEvents();
    this.resetRound();
    this.ui.showStart(this.isMobile);
    this.syncMobilePresentation();
    this.animate();
  }

  setupWorld() {
    this.player.reset();
    this.scene.add(this.controls.object);
    this.weaponScene.add(this.weaponCamera);

    const hemiLight = new HemisphereLight("#f9fbff", "#5d748d", 1.1);
    this.scene.add(hemiLight);

    const ambientLight = new AmbientLight("#ffffff", 0.42);
    this.scene.add(ambientLight);

    const weaponAmbientLight = new AmbientLight("#ffffff", 1.1);
    this.weaponScene.add(weaponAmbientLight);

    const weaponFillLight = new HemisphereLight("#ffffff", "#5a6774", 1.35);
    this.weaponScene.add(weaponFillLight);

    const sun = new DirectionalLight("#fff4cf", 1.2);
    sun.position.set(14, 24, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    this.scene.add(sun);

    const floor = new Mesh(
      new PlaneGeometry(120, 120),
      new MeshStandardMaterial({
        color: "#2a3b49",
        roughness: 0.94,
        metalness: 0.06
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMaterial = new MeshStandardMaterial({
      color: "#506979",
      roughness: 0.88,
      metalness: 0.08
    });
    const wallGeometry = new BoxGeometry(48, 7, 1.2);
    const sideGeometry = new BoxGeometry(1.2, 7, 48);
    const walls = [
      { geometry: wallGeometry, position: [0, 3.5, -24] },
      { geometry: wallGeometry, position: [0, 3.5, 24] },
      { geometry: sideGeometry, position: [-24, 3.5, 0] },
      { geometry: sideGeometry, position: [24, 3.5, 0] }
    ];

    walls.forEach(({ geometry, position }) => {
      const wall = new Mesh(geometry, wallMaterial);
      wall.position.set(...position);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
    });

    this.obstacleMaterial = new MeshStandardMaterial({
      color: "#e5aa51",
      roughness: 0.7,
      metalness: 0.12
    });
    this.scene.add(this.obstacleGroup);
  }

  createRandomObstacles(material) {
    const obstacles = [];
    const playerStart = new Vector3(0, 0, 14);
    const margin = 4;
    const minHeight = this.targetManager.getTargetHeight() + 0.6;
    const maxHeight = minHeight + 3.4;

    for (let attempt = 0; obstacles.length < OBSTACLE_COUNT && attempt < 120; attempt += 1) {
      const size = {
        x: randomBetween(2.8, 5.6),
        y: randomBetween(minHeight, maxHeight),
        z: randomBetween(2.8, 5.6)
      };
      const halfX = size.x * 0.5;
      const halfZ = size.z * 0.5;
      const position = new Vector3(
        randomBetween(-this.arenaHalfSize + margin + halfX, this.arenaHalfSize - margin - halfX),
        size.y * 0.5,
        randomBetween(-this.arenaHalfSize + margin + halfZ, this.arenaHalfSize - margin - halfZ)
      );

      if (!this.isObstaclePlacementClear(position, size, playerStart, obstacles)) {
        continue;
      }

      const obstacle = new Mesh(new BoxGeometry(size.x, size.y, size.z), material);
      obstacle.position.copy(position);
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      obstacles.push(obstacle);
    }

    return obstacles;
  }

  refreshObstacles(material = null) {
    if (material) {
      this.obstacleMaterial = material;
    }

    if (!this.obstacleMaterial) {
      return;
    }

    this.disposeObstacles();
    this.obstacleGroup.clear();
    this.obstacles = this.createRandomObstacles(this.obstacleMaterial);
    this.obstacles.forEach((obstacle) => {
      this.obstacleGroup.add(obstacle);
    });
    this.player.setObstacles(this.obstacles);
    this.targetManager.setObstacles(this.obstacles);
  }

  disposeObstacles() {
    this.obstacles.forEach((obstacle) => {
      obstacle.geometry.dispose();
    });
  }

  isObstaclePlacementClear(position, size, playerStart, obstacles) {
    const playerClearance = 8.5;
    const obstacleGap = 3.5;
    const dxToPlayer = Math.max(Math.abs(position.x - playerStart.x) - size.x * 0.5, 0);
    const dzToPlayer = Math.max(Math.abs(position.z - playerStart.z) - size.z * 0.5, 0);

    if (Math.hypot(dxToPlayer, dzToPlayer) < playerClearance) {
      return false;
    }

    return !obstacles.some((obstacle) => {
      const otherSize = obstacle.geometry.parameters;
      const xGap =
        Math.abs(position.x - obstacle.position.x) -
        (size.x + otherSize.width) * 0.5;
      const zGap =
        Math.abs(position.z - obstacle.position.z) -
        (size.z + otherSize.depth) * 0.5;

      return xGap < obstacleGap && zGap < obstacleGap;
    });
  }

  bindEvents() {
    this.ui.bindStart(this.handleStart);

    this.controls.addEventListener("lock", () => {
      if (this.isMobile) {
        return;
      }

      if (this.awaitingLock || this.state === "paused") {
        this.awaitingLock = false;
        this.state = "running";
        this.clock.getDelta();
        this.ui.hideScreen();
      }
    });

    this.controls.addEventListener("unlock", () => {
      if (this.isMobile) {
        return;
      }

      this.player.clearInput();

      if (this.state === "running") {
        this.state = "paused";
        this.ui.showPause();
      }
    });

    window.addEventListener("resize", this.handleResize);
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    window.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);

    this.ui.stickZone?.addEventListener(
      "pointerdown",
      this.handleMobileStickPointerDown
    );
    this.ui.stickZone?.addEventListener(
      "pointermove",
      this.handleMobileStickPointerMove
    );
    this.ui.stickZone?.addEventListener(
      "pointerup",
      this.handleMobileStickPointerUp
    );
    this.ui.stickZone?.addEventListener(
      "pointercancel",
      this.handleMobileStickPointerUp
    );

    this.ui.lookZone?.addEventListener(
      "pointerdown",
      this.handleMobileLookPointerDown
    );
    this.ui.lookZone?.addEventListener(
      "pointermove",
      this.handleMobileLookPointerMove
    );
    this.ui.lookZone?.addEventListener(
      "pointerup",
      this.handleMobileLookPointerUp
    );
    this.ui.lookZone?.addEventListener(
      "pointercancel",
      this.handleMobileLookPointerUp
    );

    this.ui.fireButton?.addEventListener(
      "pointerdown",
      this.handleMobileFirePointerDown
    );
    this.ui.fireButton?.addEventListener(
      "pointerup",
      this.handleMobileFirePointerUp
    );
    this.ui.fireButton?.addEventListener(
      "pointercancel",
      this.handleMobileFirePointerUp
    );
    this.ui.jumpButton?.addEventListener("pointerdown", this.handleMobileJump);
    this.ui.reloadButton?.addEventListener("pointerdown", this.handleMobileReload);
  }

  resetRound() {
    this.score = 0;
    this.timeLeft = this.timeLimit;
    this.state = "menu";
    this.mobileFireHeld = false;
    this.mobilePortraitPaused = false;
    this.mobileStartQueued = false;
    this.releaseMobilePointers();
    this.weapon.reset();
    this.firstPersonWeapon.reset();
    this.player.reset();
    this.refreshObstacles();
    this.targetManager.reset(
      this.player.getPosition(),
      this.getPlayerViewDirection()
    );
    this.updateHud();
  }

  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.weaponCamera.aspect = window.innerWidth / window.innerHeight;
    this.weaponCamera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.handleOrientationState();
  }

  handleFullscreenChange() {
    if (!this.isMobile || document.fullscreenElement) {
      return;
    }

    if (this.state === "running") {
      this.mobilePortraitPaused = false;
      this.state = "paused";
      this.ui.configureScreen({
        eyebrow: "FULLSCREEN OFF",
        title: "전체화면이 종료되었습니다",
        body:
          "모바일 브라우저 UI가 다시 나타났습니다. 버튼을 눌러 전체화면으로 다시 들어가고 게임을 이어가세요.",
        button: "전체화면으로 계속"
      });
    }

    this.ui.setMobileControlsVisible(false);
  }

  handlePointerDown(event) {
    if (this.isMobile) {
      return;
    }

    if (event.button !== 0 || this.state !== "running" || !this.controls.isLocked) {
      return;
    }

    this.fireShot();
  }

  handleKeyDown(event) {
    if (event.code === "Space") {
      event.preventDefault();

      if (this.state === "running") {
        this.player.jump();
      }
    }

    this.player.setKey(event.code, true);

    if (event.code === "KeyR" && this.state === "running") {
      const reloadingStarted = this.weapon.requestReload();

      if (reloadingStarted) {
        this.firstPersonWeapon.triggerReload(this.weapon.reloadDuration);
        this.updateHud();
      }
    }
  }

  handleKeyUp(event) {
    this.player.setKey(event.code, false);
  }

  async handleStart() {
    if (this.state === "ended" || this.state === "menu") {
      this.resetRound();
    }

    if (this.isMobile) {
      await this.tryEnterFullscreen();
      await this.tryLockLandscape();

      if (!this.isLandscape()) {
        this.mobileStartQueued = true;
        this.handleOrientationState();
        return;
      }

      this.startMobileRound();
      return;
    }

    this.awaitingLock = true;
    this.controls.lock();
  }

  handleMobileStickPointerDown(event) {
    if (!this.canUseMobileControls()) {
      return;
    }

    event.preventDefault();
    this.movePointerId = event.pointerId;
    this.ui.stickZone?.setPointerCapture(event.pointerId);
    this.updateStickFromEvent(event);
  }

  handleMobileStickPointerMove(event) {
    if (event.pointerId !== this.movePointerId) {
      return;
    }

    event.preventDefault();
    this.updateStickFromEvent(event);
  }

  handleMobileStickPointerUp(event) {
    if (event.pointerId !== this.movePointerId) {
      return;
    }

    event.preventDefault();
    this.movePointerId = null;
    this.player.setJoystick(0, 0);
    this.ui.resetStick();
  }

  handleMobileLookPointerDown(event) {
    if (!this.canUseMobileControls()) {
      return;
    }

    if (this.lookPointerId !== null) {
      return;
    }

    event.preventDefault();
    this.lookPointerId = event.pointerId;
    this.lastLookPoint.x = event.clientX;
    this.lastLookPoint.y = event.clientY;
    this.ui.lookZone?.setPointerCapture(event.pointerId);
  }

  handleMobileLookPointerMove(event) {
    if (event.pointerId !== this.lookPointerId || !this.canUseMobileControls()) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - this.lastLookPoint.x;
    const deltaY = event.clientY - this.lastLookPoint.y;
    this.lastLookPoint.x = event.clientX;
    this.lastLookPoint.y = event.clientY;

    this.camera.rotation.y -= deltaX * this.mobileLookSensitivity;
    this.camera.rotation.x -= deltaY * this.mobileLookSensitivity;
    this.camera.rotation.x = Math.max(
      -Math.PI / 2 + 0.08,
      Math.min(Math.PI / 2 - 0.08, this.camera.rotation.x)
    );
  }

  handleMobileLookPointerUp(event) {
    if (event.pointerId !== this.lookPointerId) {
      return;
    }

    event.preventDefault();
    this.lookPointerId = null;
  }

  handleMobileFirePointerDown(event) {
    if (!this.canUseMobileControls()) {
      return;
    }

    event.preventDefault();
    this.mobileFireHeld = true;
    this.fireShot();
  }

  handleMobileFirePointerUp(event) {
    event.preventDefault();
    this.mobileFireHeld = false;
  }

  handleMobileReload(event) {
    if (!this.canUseMobileControls()) {
      return;
    }

    event.preventDefault();
    if (this.weapon.requestReload()) {
      this.firstPersonWeapon.triggerReload(this.weapon.reloadDuration);
      this.updateHud();
    }
  }

  handleMobileJump(event) {
    if (!this.canUseMobileControls()) {
      return;
    }

    event.preventDefault();
    this.player.jump();
  }

  updateHud() {
    this.ui.updateHud({
      score: this.score,
      timeLeft: this.timeLeft,
      ammo: this.weapon.ammo,
      maxAmmo: this.weapon.maxAmmo,
      isReloading: this.weapon.isReloading,
      isMobile: this.isMobile
    });
  }

  endRound() {
    this.state = "ended";
    this.player.clearInput();
    this.player.setJoystick(0, 0);
    this.mobileFireHeld = false;
    this.ui.setMobileControlsVisible(false);
    if (this.controls.isLocked) {
      this.controls.unlock();
    }
    this.ui.showEnd(this.score);
  }

  animate() {
    requestAnimationFrame(this.animate);

    const deltaSeconds = Math.min(this.clock.getDelta(), 0.05);
    const playerViewDirection = this.getPlayerViewDirection();

    if (this.state === "running") {
      this.player.update(deltaSeconds);

      if (this.isMobile && this.mobileFireHeld) {
        this.fireShot();
      }

      const reloadFinished = this.weapon.update(deltaSeconds);
      if (reloadFinished) {
        this.updateHud();
      }

      this.targetManager.update(
        deltaSeconds,
        this.player.getPosition(),
        playerViewDirection,
        true
      );
      this.timeLeft = Math.max(0, this.timeLeft - deltaSeconds);

      if (this.timeLeft === 0) {
        this.endRound();
      }

      this.updateHud();
    } else {
      this.targetManager.update(
        deltaSeconds,
        this.player.getPosition(),
        playerViewDirection,
        false
      );
    }

    this.firstPersonWeapon.update(
      deltaSeconds,
      this.state === "running" ? this.player.getMovementAmount() : 0
    );

    this.weaponCamera.quaternion.copy(this.camera.quaternion);
    this.weaponCamera.position.set(0, 0, 0);

    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth();
    this.renderer.render(this.weaponScene, this.weaponCamera);
  }

  fireShot() {
    const shot = this.weapon.shoot();

    if (!shot.fired) {
      return false;
    }

    this.firstPersonWeapon.triggerFire();

    if (shot.autoReloaded) {
      this.firstPersonWeapon.triggerReload(this.weapon.reloadDuration);
    }

    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    const hit = this.targetManager.handleShot(this.raycaster);

    if (hit) {
      this.score += hit.points;
    }

    this.updateHud();
    return true;
  }

  detectMobile() {
    return (
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches
    );
  }

  isLandscape() {
    return window.innerWidth > window.innerHeight;
  }

  canUseMobileControls() {
    return this.isMobile && this.state === "running" && this.isLandscape();
  }

  getPlayerViewDirection() {
    this.camera.getWorldDirection(this.playerViewDirection);
    this.playerViewDirection.y = 0;

    if (this.playerViewDirection.lengthSq() === 0) {
      this.playerViewDirection.set(0, 0, -1);
    } else {
      this.playerViewDirection.normalize();
    }

    return this.playerViewDirection;
  }

  startMobileRound() {
    this.mobileStartQueued = false;
    this.mobilePortraitPaused = false;
    this.state = "running";
    this.clock.getDelta();
    this.ui.hideScreen();
    this.syncMobilePresentation();
  }

  syncMobilePresentation() {
    const showMobileControls =
      this.isMobile && this.state === "running" && this.isLandscape();
    this.ui.setMobileControlsVisible(showMobileControls);

    if (!this.isMobile || this.isLandscape()) {
      this.ui.hideOrientationLock();
    } else {
      this.ui.showOrientationLock();
    }
  }

  handleOrientationState() {
    if (!this.isMobile) {
      return;
    }

    if (this.isLandscape()) {
      this.ui.hideOrientationLock();

      if (this.mobileStartQueued) {
        this.startMobileRound();
        return;
      }

      if (this.mobilePortraitPaused && this.state === "paused") {
        this.mobilePortraitPaused = false;
        this.state = "running";
        this.ui.hideScreen();
      }

      this.syncMobilePresentation();
      return;
    }

    this.ui.showOrientationLock();
    this.ui.setMobileControlsVisible(false);

    if (this.state === "running") {
      this.mobilePortraitPaused = true;
      this.state = "paused";
    }
  }

  updateStickFromEvent(event) {
    const zone = this.ui.stickZone;

    if (!zone) {
      return;
    }

    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    const distance = Math.min(this.stickRadius, Math.hypot(deltaX, deltaY) || 0);
    const angle = Math.atan2(deltaY, deltaX);
    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;

    this.ui.updateStick(knobX, knobY);
    this.player.setJoystick(knobX / this.stickRadius, knobY / this.stickRadius);
  }

  releaseMobilePointers() {
    this.movePointerId = null;
    this.lookPointerId = null;
    this.player.setJoystick(0, 0);
    this.ui.resetStick();
  }

  async tryLockLandscape() {
    if (!this.isMobile || !screen.orientation?.lock) {
      return;
    }

    try {
      await screen.orientation.lock("landscape");
    } catch {
      // Some mobile browsers only allow orientation lock in fullscreen or don't support it.
    }
  }

  async tryEnterFullscreen() {
    if (!this.isMobile || document.fullscreenElement) {
      return;
    }

    const target = this.root;
    const requestFullscreen =
      target.requestFullscreen?.bind(target) ||
      target.webkitRequestFullscreen?.bind(target);

    if (!requestFullscreen) {
      return;
    }

    try {
      await requestFullscreen({ navigationUI: "hide" });
    } catch {
      try {
        await requestFullscreen();
      } catch {
        // Some mobile browsers do not support fullscreen for arbitrary elements.
      }
    }
  }
}
