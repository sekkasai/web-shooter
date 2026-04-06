import {
  Box3,
  CylinderGeometry,
  Euler,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { assetPath } from "./assetPath.js";

const MODEL_PATHS = {
  pistol: assetPath("models/weapons/p320.glb"),
  suppressor: assetPath("models/weapons/suppressor.glb"),
  redDot: assetPath("models/weapons/red-dot.glb"),
  flashlight: assetPath("models/weapons/flashlight.glb")
};

const TEMP_BOX = new Box3();
const TEMP_SIZE = new Vector3();
const TEMP_CENTER = new Vector3();

function easeInOutCubic(value) {
  if (value < 0.5) {
    return 4 * value * value * value;
  }

  return 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function scaleObjectToDepth(object, targetDepth) {
  TEMP_BOX.setFromObject(object);
  TEMP_BOX.getSize(TEMP_SIZE);
  const currentDepth = TEMP_SIZE.z || 1;
  const scaleFactor = targetDepth / currentDepth;
  object.scale.multiplyScalar(scaleFactor);
  object.updateMatrixWorld(true);
}

function getBoxPoint(object, xFactor, yFactor, zFactor) {
  TEMP_BOX.setFromObject(object);
  TEMP_BOX.getSize(TEMP_SIZE);

  return new Vector3(
    TEMP_BOX.min.x + TEMP_SIZE.x * xFactor,
    TEMP_BOX.min.y + TEMP_SIZE.y * yFactor,
    TEMP_BOX.min.z + TEMP_SIZE.z * zFactor
  );
}

function configureViewModelMesh(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;

  materials.forEach((material) => {
    material.depthTest = true;
    material.depthWrite = true;
  });
}

export class FirstPersonWeapon {
  constructor(camera) {
    this.camera = camera;
    this.loader = new GLTFLoader();
    this.viewScale = 1;
    this.basePosition = {
      x: 2.6,
      y: -2,
      z: 0.6,
    };
    this.baseRotation = {
      x: -0.1,
      y: -0.02,
      z: -0.02
    };
    this.walkTime = 0;
    this.recoil = 0;
    this.flash = 0;
    this.reloadTimer = 0;
    this.reloadDuration = 0;
    this.isReloading = false;
    this.isReady = false;

    this.root = new Group();
    this.root.position.set(
      this.basePosition.x,
      this.basePosition.y,
      this.basePosition.z
    );
    this.root.rotation.set(
      this.baseRotation.x,
      this.baseRotation.y,
      this.baseRotation.z
    );
    this.root.scale.setScalar(this.viewScale);

    this.weaponPivot = new Group();
    this.root.add(this.weaponPivot);

    this.weaponGroup = new Group();
    this.weaponPivot.add(this.weaponGroup);

    this.pistol = null;
    this.suppressor = null;
    this.redDot = null;
    this.flashlight = null;
    this.magazine = null;
    this.showMagazine = false;
    this.magazineBasePosition = new Vector3();
    this.magazineBaseRotation = new Euler();
    this.weaponPivotBasePosition = new Vector3();
    this.weaponGroupBasePosition = new Vector3();
    this.muzzleFlash = this.createMuzzleFlash();
    this.weaponGroup.add(this.muzzleFlash);

    this.camera.add(this.root);
    this.loadAssets();
  }

  async loadAssets() {
    try {
      const pistol = await this.loadModel(MODEL_PATHS.pistol);

      this.assembleWeapon(pistol.scene);
      this.isReady = true;
      this.reset();
    } catch (error) {
      console.error("Failed to load first-person weapon assets.", error);
    }
  }

  loadModel(path) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, resolve, undefined, reject);
    });
  }

  createMuzzleFlash() {
    const flashGroup = new Group();
    const flashMaterial = new MeshBasicMaterial({
      color: "#ffd37a",
      transparent: true,
      opacity: 0
    });
    const flashCoreMaterial = new MeshBasicMaterial({
      color: "#fff6d5",
      transparent: true,
      opacity: 0
    });

    const flashCone = new Mesh(
      new CylinderGeometry(0.01, 0.05, 0.1125, 6),
      flashMaterial
    );
    flashCone.rotation.x = Math.PI / 2;
    flashCone.position.z = -0.03125;
    configureViewModelMesh(flashCone);
    flashGroup.add(flashCone);

    const flashCore = new Mesh(new SphereGeometry(0.028125, 10, 10), flashCoreMaterial);
    flashCore.position.z = -0.075;
    configureViewModelMesh(flashCore);
    flashGroup.add(flashCore);

    flashGroup.visible = false;
    return flashGroup;
  }

  prepareImportedObject(object) {
    object.traverse((child) => {
      if (!(child instanceof Mesh)) {
        return;
      }

      configureViewModelMesh(child);
    });
  }

  assembleWeapon(pistolScene) {
    this.pistol = pistolScene;
    this.suppressor = null;
    this.redDot = null;
    this.flashlight = null;

    this.prepareImportedObject(this.pistol);
    this.weaponGroup.add(this.pistol);

    scaleObjectToDepth(this.pistol, 0.17);

    TEMP_BOX.setFromObject(this.pistol);
    TEMP_BOX.getCenter(TEMP_CENTER);
    this.pistol.position.set(
      -TEMP_CENTER.x + 0.015,
      -TEMP_CENTER.y - 0.06,
      -TEMP_BOX.max.z + 0.11
    );
    this.pistol.updateMatrixWorld(true);

    this.magazine = this.pistol.getObjectByName("Magazine");

    if (this.magazine) {
      this.magazine.visible = this.showMagazine;
      this.magazineBasePosition.copy(this.magazine.position);
      this.magazineBaseRotation.copy(this.magazine.rotation);
    }

    this.positionAttachments();
    this.configureReloadPivot();
  }

  positionAttachments() {
    this.weaponGroup.updateMatrixWorld(true);
    const barrel = this.pistol?.getObjectByName("Barrel");

    if (!barrel) {
      return;
    }

    const flashAnchor = this.weaponGroup.worldToLocal(
      getBoxPoint(barrel, 0.5, 0.52, 0).clone()
    );
    this.muzzleFlash.position.copy(flashAnchor);
    this.muzzleFlash.position.z -= 0.01;
  }

  configureReloadPivot() {
    if (!this.pistol) {
      return;
    }

    const pivotPoint = this.weaponGroup.worldToLocal(
      getBoxPoint(this.pistol, 0.5, 0.36, 0.82).clone()
    );

    this.weaponPivot.position.copy(pivotPoint);
    this.weaponGroup.position.copy(pivotPoint).multiplyScalar(-1);
    this.weaponPivotBasePosition.copy(this.weaponPivot.position);
    this.weaponGroupBasePosition.copy(this.weaponGroup.position);
  }

  reset() {
    this.walkTime = 0;
    this.recoil = 0;
    this.flash = 0;
    this.reloadTimer = 0;
    this.reloadDuration = 0;
    this.isReloading = false;
    this.muzzleFlash.visible = false;
    this.root.position.set(
      this.basePosition.x,
      this.basePosition.y,
      this.basePosition.z
    );
    this.root.rotation.set(
      this.baseRotation.x,
      this.baseRotation.y,
      this.baseRotation.z
    );
    this.weaponPivot.position.copy(this.weaponPivotBasePosition);
    this.weaponPivot.rotation.set(0, 0, 0);
    this.weaponGroup.position.copy(this.weaponGroupBasePosition);

    if (this.magazine) {
      this.magazine.visible = this.showMagazine;
      this.magazine.position.copy(this.magazineBasePosition);
      this.magazine.rotation.copy(this.magazineBaseRotation);
    }
  }

  triggerFire() {
    this.recoil = Math.min(this.recoil + 1, 1.35);
    this.flash = 1;
  }

  triggerReload(duration) {
    this.isReloading = true;
    this.reloadDuration = Math.max(duration, 0.01);
    this.reloadTimer = 0;
  }

  update(deltaSeconds, movementAmount) {
    this.walkTime += deltaSeconds * (2.2 + movementAmount * 8);
    this.recoil = MathUtils.damp(this.recoil, 0, 18, deltaSeconds);
    this.flash = MathUtils.damp(this.flash, 0, 34, deltaSeconds);

    if (this.isReloading) {
      this.reloadTimer = Math.min(
        this.reloadTimer + deltaSeconds,
        this.reloadDuration
      );

      if (this.reloadTimer >= this.reloadDuration) {
        this.isReloading = false;
      }
    }

    const walkBobX = 0;
    const walkBobY = 0;
    const idleSwayX = Math.sin(this.walkTime * 0.55) * 0.004;
    const idleSwayY = Math.cos(this.walkTime * 0.42) * 0.004;
    const recoilOffset = this.recoil * 0.055;
    const recoilLift = this.recoil * 0.018;

    let reloadTilt = 0;
    let reloadYaw = 0;
    let reloadRoll = 0;
    let reloadShiftX = 0;
    let reloadShiftY = 0;
    let reloadShiftZ = 0;
    let magazineDrop = 0;
    let magazineYaw = 0;

    if (this.isReloading) {
      const progress = this.reloadTimer / this.reloadDuration;
      const posePhase = Math.sin(progress * Math.PI);
      const dropPhase = Math.sin(Math.min(progress, 0.75) / 0.75 * Math.PI);
      const insertPhase = progress > 0.45 ? (progress - 0.45) / 0.55 : 0;
      const insertEase = easeInOutCubic(Math.min(insertPhase, 1));

      // Keep the weapon anchored in place during reload and only raise the muzzle.
      reloadTilt = posePhase * 0.34;
      reloadYaw = 0;
      reloadRoll = posePhase * -0.32;
      reloadShiftX = 0;
      reloadShiftY = 0;
      reloadShiftZ = 0;
      magazineDrop = dropPhase * 0.34 - insertEase * 0.05;
      magazineYaw = dropPhase * 0.12 - insertEase * 0.04;
    }

    this.root.position.set(
      this.basePosition.x + walkBobX + idleSwayX + reloadShiftX,
      this.basePosition.y - walkBobY + idleSwayY + recoilLift + reloadShiftY,
      this.basePosition.z + recoilOffset + reloadShiftZ
    );

    this.root.rotation.set(
      this.baseRotation.x - walkBobY * 0.6,
      this.baseRotation.y + walkBobX * 0.8,
      this.baseRotation.z - walkBobX * 0.9
    );

    this.weaponPivot.position.copy(this.weaponPivotBasePosition);
    this.weaponGroup.position.copy(this.weaponGroupBasePosition);
    this.weaponPivot.rotation.set(reloadTilt, reloadYaw, reloadRoll);

    if (this.magazine) {
      this.magazine.position.set(
        this.magazineBasePosition.x - magazineYaw * 0.015,
        this.magazineBasePosition.y - magazineDrop,
        this.magazineBasePosition.z + magazineDrop * 0.08
      );
      this.magazine.rotation.set(
        this.magazineBaseRotation.x + magazineDrop * 0.5,
        this.magazineBaseRotation.y + magazineYaw,
        this.magazineBaseRotation.z
      );
    }

    const flashVisible = this.flash > 0.08;
    this.muzzleFlash.visible = flashVisible;

    if (flashVisible) {
      const flashScale = 0.5 + this.flash * 0.5625;
      this.muzzleFlash.scale.set(
        0.5 + this.flash * 0.21875,
        0.5 + this.flash * 0.21875,
        flashScale
      );

      this.muzzleFlash.children[0].material.opacity = this.flash * 0.72;
      this.muzzleFlash.children[1].material.opacity = this.flash * 0.95;
    }
  }
}
