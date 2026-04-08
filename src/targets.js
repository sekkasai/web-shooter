import {
  Box3,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3
} from "three";
import { randomBetween } from "./random.js";

const DEFAULT_FORWARD = new Vector3(0, 0, -1);
const TEMP_VECTOR = new Vector3();
const TEMP_BOX = new Box3();
const TEMP_FORWARD = new Vector3();
const TEMP_SIDE = new Vector3();
const TEMP_CENTER = new Vector3();
const TEMP_SIZE = new Vector3();
const TEMP_HIDDEN = new Vector3();
const TEMP_PEEK = new Vector3();
const TEMP_LOOK = new Vector3();

export class TargetManager {
  constructor(scene, arenaHalfSize, targetCount) {
    this.scene = scene;
    this.arenaHalfSize = arenaHalfSize;
    this.targetCount = targetCount;
    this.respawnDelay = 0.35;
    this.headGeometry = new SphereGeometry(0.45, 24, 24);
    this.bodyGeometry = new CylinderGeometry(0.38, 0.48, 1.65, 24);
    this.targetScale = 1;
    this.targetSpacing = 3.8;
    this.targets = [];
    this.pendingRespawns = [];
    this.obstacles = [];
    this.obstacleBounds = [];
  }

  setObstacles(obstacles) {
    this.obstacles = [...obstacles];
    this.obstacleBounds = this.obstacles.map((obstacle) =>
      new Box3().setFromObject(obstacle)
    );
  }

  getTargetHeight() {
    return (
      (this.bodyGeometry.parameters.height + this.headGeometry.parameters.radius * 2) *
      this.targetScale
    );
  }

  getTargetRadius() {
    return (
      Math.max(
        this.bodyGeometry.parameters.radiusBottom,
        this.headGeometry.parameters.radius
      ) * this.targetScale
    );
  }

  reset(playerPosition, playerForward = DEFAULT_FORWARD) {
    this.targets.forEach((target) => {
      this.removeTarget(target);
    });

    this.targets = [];
    this.pendingRespawns = [];

    for (let index = 0; index < this.targetCount; index += 1) {
      this.spawnTarget(playerPosition, playerForward);
    }
  }

  update(deltaSeconds, playerPosition, playerForward = DEFAULT_FORWARD, allowRespawn) {
    this.targets.forEach((target) => {
      this.updateTargetMotion(target, deltaSeconds, playerPosition);
    });

    if (!allowRespawn || this.pendingRespawns.length === 0) {
      return;
    }

    this.pendingRespawns = this.pendingRespawns
      .map((timer) => timer - deltaSeconds)
      .filter((timer) => {
        if (timer > 0) {
          return true;
        }

        this.spawnTarget(playerPosition, playerForward);
        return false;
      });
  }

  handleShot(raycaster) {
    const colliders = [
      ...this.obstacles,
      ...this.targets.map((target) => target.group)
    ];
    const hit = raycaster.intersectObjects(colliders, true)[0];

    if (!hit) {
      return null;
    }

    const targetIndex = this.targets.findIndex(
      (target) => target.group === hit.object || target.parts.includes(hit.object)
    );

    if (targetIndex === -1) {
      return null;
    }

    const [target] = this.targets.splice(targetIndex, 1);
    this.removeTarget(target);
    this.pendingRespawns.push(this.respawnDelay);

    return {
      points: 100
    };
  }

  spawnTarget(playerPosition, playerForward) {
    const placement = this.findSpawnPlacement(playerPosition, playerForward);
    const material = this.createTargetMaterial();

    const body = new Mesh(this.bodyGeometry, material);
    body.position.y =
      (this.bodyGeometry.parameters.height * 0.5) * this.targetScale;
    body.scale.setScalar(this.targetScale);
    body.castShadow = true;
    body.receiveShadow = true;

    const head = new Mesh(this.headGeometry, material);
    head.position.y =
      (this.bodyGeometry.parameters.height + this.headGeometry.parameters.radius) *
      this.targetScale;
    head.scale.setScalar(this.targetScale);
    head.castShadow = true;
    head.receiveShadow = true;

    const group = new Group();
    group.position.copy(placement.hiddenPosition);
    group.add(body);
    group.add(head);

    this.scene.add(group);
    const target = {
      group,
      parts: [body, head],
      basePosition: placement.peekPosition.clone(),
      hiddenPosition: placement.hiddenPosition.clone(),
      jiggleDirection: placement.jiggleDirection.clone(),
      jiggleAmplitude: randomBetween(0.08, 0.18),
      jiggleSpeed: randomBetween(1.35, 2.05),
      jigglePhase: randomBetween(0, Math.PI * 2),
      jiggleTime: 0
    };
    this.facePlayer(target, playerPosition);
    this.targets.push(target);
  }

  createTargetMaterial() {
    const hue = randomBetween(0.02, 0.11);
    return new MeshStandardMaterial({
      color: new Color().setHSL(hue, 0.85, 0.56),
      emissive: new Color().setHSL(hue, 0.82, 0.2),
      roughness: 0.28,
      metalness: 0.14
    });
  }

  removeTarget(target) {
    this.scene.remove(target.group);
    target.parts[0].material.dispose();
  }

  updateTargetMotion(target, deltaSeconds, playerPosition) {
    target.jiggleTime += deltaSeconds;
    const wave =
      Math.sin(target.jiggleTime * target.jiggleSpeed + target.jigglePhase) * 0.5 +
      0.5;
    const peekAmount = wave ** 1.35;

    target.group.position.lerpVectors(
      target.hiddenPosition,
      target.basePosition,
      peekAmount
    );

    const wiggle =
      Math.sin(
        target.jiggleTime * (target.jiggleSpeed * 2.4) + target.jigglePhase * 0.7
      ) * target.jiggleAmplitude;
    target.group.position.addScaledVector(target.jiggleDirection, wiggle);

    this.facePlayer(target, playerPosition);
  }

  facePlayer(target, playerPosition) {
    TEMP_LOOK.set(playerPosition.x, target.group.position.y, playerPosition.z);

    if (TEMP_LOOK.distanceToSquared(target.group.position) === 0) {
      return;
    }

    target.group.lookAt(TEMP_LOOK);
    target.group.rotation.x = 0;
    target.group.rotation.z = 0;
  }

  findSpawnPlacement(playerPosition, playerForward) {
    const targetRadius = this.getTargetRadius();
    const obstaclePlacement = this.findObstacleEdgePlacement(playerPosition, playerForward, targetRadius);

    if (obstaclePlacement) {
      return obstaclePlacement;
    }

    return this.findFallbackPlacement(playerPosition, playerForward, targetRadius);
  }

  findObstacleEdgePlacement(playerPosition, playerForward, targetRadius) {
    const forward = this.getHorizontalForward(playerForward);
    const candidates = [];
    const minDotThresholds = [0.78, 0.55, 0.28, 0.05];

    for (const minDot of minDotThresholds) {
      candidates.length = 0;

      this.obstacleBounds.forEach((bounds, obstacleIndex) => {
        this.collectObstaclePlacements(
          candidates,
          bounds,
          obstacleIndex,
          playerPosition,
          forward,
          targetRadius,
          minDot
        );
      });

      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    return null;
  }

  collectObstaclePlacements(
    candidates,
    bounds,
    obstacleIndex,
    playerPosition,
    playerForward,
    targetRadius,
    minDot
  ) {
    bounds.getCenter(TEMP_CENTER);
    bounds.getSize(TEMP_SIZE);

    TEMP_VECTOR.copy(TEMP_CENTER).sub(playerPosition);
    TEMP_VECTOR.y = 0;

    if (TEMP_VECTOR.lengthSq() < 16) {
      return;
    }

    TEMP_VECTOR.normalize();

    if (TEMP_VECTOR.dot(playerForward) < minDot) {
      return;
    }

    TEMP_SIDE.set(-TEMP_VECTOR.z, 0, TEMP_VECTOR.x);
    const depthHalf =
      Math.abs(TEMP_VECTOR.x) * TEMP_SIZE.x * 0.5 +
      Math.abs(TEMP_VECTOR.z) * TEMP_SIZE.z * 0.5;
    const sideHalf =
      Math.abs(TEMP_SIDE.x) * TEMP_SIZE.x * 0.5 +
      Math.abs(TEMP_SIDE.z) * TEMP_SIZE.z * 0.5;

    if (sideHalf < targetRadius * 0.8) {
      return;
    }

    const depthOffset = depthHalf + targetRadius * 0.9;
    const hiddenSideOffset = Math.max(targetRadius * 0.2, sideHalf - targetRadius * 0.45);
    const peekSideOffset = sideHalf + targetRadius * 0.55;

    [-1, 1].forEach((sign) => {
      TEMP_HIDDEN
        .copy(TEMP_CENTER)
        .addScaledVector(TEMP_VECTOR, depthOffset)
        .addScaledVector(TEMP_SIDE, hiddenSideOffset * sign);
      TEMP_HIDDEN.y = 0;

      TEMP_PEEK
        .copy(TEMP_CENTER)
        .addScaledVector(TEMP_VECTOR, depthOffset)
        .addScaledVector(TEMP_SIDE, peekSideOffset * sign);
      TEMP_PEEK.y = 0;

      if (
        !this.isEdgePlacementValid(
          TEMP_HIDDEN,
          TEMP_PEEK,
          playerPosition,
          playerForward,
          targetRadius,
          obstacleIndex
        )
      ) {
        return;
      }

      candidates.push({
        hiddenPosition: TEMP_HIDDEN.clone(),
        peekPosition: TEMP_PEEK.clone(),
        jiggleDirection: TEMP_SIDE.clone().multiplyScalar(sign)
      });
    });
  }

  isEdgePlacementValid(
    hiddenPosition,
    peekPosition,
    playerPosition,
    playerForward,
    targetRadius,
    obstacleIndex
  ) {
    if (!this.isWithinArena(hiddenPosition) || !this.isWithinArena(peekPosition)) {
      return false;
    }

    if (
      !this.isSpawnPositionClear(
        hiddenPosition,
        playerPosition,
        targetRadius,
        obstacleIndex,
        true
      ) ||
      !this.isSpawnPositionClear(
        peekPosition,
        playerPosition,
        targetRadius,
        obstacleIndex,
        true
      )
    ) {
      return false;
    }

    if (!this.isPositionInFrontOfPlayer(peekPosition, playerPosition, playerForward)) {
      return false;
    }

    return true;
  }

  findFallbackPlacement(playerPosition, playerForward, targetRadius) {
    const margin = 3;
    const forward = this.getHorizontalForward(playerForward);
    TEMP_SIDE.set(-forward.z, 0, forward.x);
    TEMP_CENTER.set(playerPosition.x, 0, playerPosition.z);

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const distance = randomBetween(10, 18);
      const sideOffset = randomBetween(-distance * 0.45, distance * 0.45);
      const candidate = new Vector3()
        .copy(TEMP_CENTER)
        .addScaledVector(forward, distance)
        .addScaledVector(TEMP_SIDE, sideOffset);

      if (this.isSpawnPositionClear(candidate, playerPosition, targetRadius)) {
        const jiggleDirection =
          sideOffset === 0
            ? TEMP_SIDE.clone().multiplyScalar(Math.random() > 0.5 ? 1 : -1)
            : TEMP_SIDE.clone().multiplyScalar(Math.sign(sideOffset));
        const hiddenPosition = candidate
          .clone()
          .addScaledVector(jiggleDirection, -targetRadius * 0.6);

        if (
          !this.isWithinArena(hiddenPosition) ||
          !this.isSpawnPositionClear(hiddenPosition, playerPosition, targetRadius)
        ) {
          hiddenPosition.copy(candidate);
        }

        return {
          hiddenPosition,
          peekPosition: candidate.clone(),
          jiggleDirection
        };
      }
    }

    for (let x = -this.arenaHalfSize + margin; x <= this.arenaHalfSize - margin; x += 2) {
      for (let z = -this.arenaHalfSize + margin; z <= this.arenaHalfSize - margin; z += 2) {
        const candidate = new Vector3(x, 0, z);

        TEMP_VECTOR.copy(candidate).sub(playerPosition);
        TEMP_VECTOR.y = 0;

        if (
          this.isSpawnPositionClear(candidate, playerPosition, targetRadius) &&
          TEMP_VECTOR.lengthSq() > 0 &&
          TEMP_VECTOR.normalize().dot(forward) > 0.1
        ) {
          return {
            hiddenPosition: candidate.clone(),
            peekPosition: candidate.clone(),
            jiggleDirection: TEMP_SIDE.clone()
          };
        }
      }
    }

    return {
      hiddenPosition: playerPosition.clone().add(
        forward.clone().multiplyScalar(10).setY(-playerPosition.y)
      ),
      peekPosition: playerPosition.clone().add(
        forward.clone().multiplyScalar(10).setY(-playerPosition.y)
      ),
      jiggleDirection: TEMP_SIDE.clone()
    };
  }

  getHorizontalForward(playerForward) {
    TEMP_FORWARD.copy(playerForward ?? DEFAULT_FORWARD);
    TEMP_FORWARD.y = 0;

    if (TEMP_FORWARD.lengthSq() === 0) {
      TEMP_FORWARD.copy(DEFAULT_FORWARD);
    } else {
      TEMP_FORWARD.normalize();
    }

    return TEMP_FORWARD;
  }

  isPositionInFrontOfPlayer(position, playerPosition, playerForward) {
    TEMP_VECTOR.copy(position).sub(playerPosition);
    TEMP_VECTOR.y = 0;

    if (TEMP_VECTOR.lengthSq() === 0) {
      return false;
    }

    TEMP_VECTOR.normalize();
    return TEMP_VECTOR.dot(playerForward) > -0.05;
  }

  isWithinArena(position) {
    const margin = 2.6;
    return (
      position.x >= -this.arenaHalfSize + margin &&
      position.x <= this.arenaHalfSize - margin &&
      position.z >= -this.arenaHalfSize + margin &&
      position.z <= this.arenaHalfSize - margin
    );
  }

  isSpawnPositionClear(
    candidate,
    playerPosition,
    targetRadius,
    ignoredObstacleIndex = -1,
    allowPrimaryEdge = false
  ) {
    const obstaclePadding = 0.2;
    const candidateAtPlayerHeight = TEMP_VECTOR.set(
      candidate.x,
      playerPosition.y,
      candidate.z
    );

    if (candidateAtPlayerHeight.distanceTo(playerPosition) < 8) {
      return false;
    }

    const overlapsTarget = this.targets.some((target) => {
      TEMP_VECTOR.copy(target.basePosition);
      return TEMP_VECTOR.distanceTo(candidate) < this.targetSpacing;
    });

    if (overlapsTarget) {
      return false;
    }

    return !this.obstacleBounds.some((bounds, obstacleIndex) => {
      TEMP_BOX.copy(bounds);

      if (allowPrimaryEdge && obstacleIndex === ignoredObstacleIndex) {
        TEMP_BOX.expandByScalar(0.05);
        return TEMP_BOX.containsPoint(candidate);
      }

      return TEMP_BOX.distanceToPoint(candidate) < targetRadius + obstaclePadding;
    });
  }
}
