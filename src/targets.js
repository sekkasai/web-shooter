import {
  Box3,
  Color,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3
} from "three";

const TEMP_VECTOR = new Vector3();
const TEMP_BOX = new Box3();

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export class TargetManager {
  constructor(scene, arenaHalfSize, targetCount) {
    this.scene = scene;
    this.arenaHalfSize = arenaHalfSize;
    this.targetCount = targetCount;
    this.respawnDelay = 0.35;
    this.geometry = new SphereGeometry(0.6, 24, 24);
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

  reset(playerPosition) {
    this.targets.forEach((target) => {
      this.scene.remove(target.mesh);
    });

    this.targets = [];
    this.pendingRespawns = [];

    for (let index = 0; index < this.targetCount; index += 1) {
      this.spawnTarget(playerPosition);
    }
  }

  update(deltaSeconds, playerPosition, allowRespawn) {
    const now = performance.now() * 0.001;

    this.targets.forEach((target) => {
      target.mesh.rotation.y += deltaSeconds * target.spinSpeed;
      target.mesh.position.y =
        target.basePosition.y +
        Math.sin(now * target.floatSpeed + target.floatOffset) * 0.22;
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

        this.spawnTarget(playerPosition);
        return false;
      });
  }

  handleShot(raycaster) {
    const colliders = [
      ...this.obstacles,
      ...this.targets.map((target) => target.mesh)
    ];
    const hit = raycaster.intersectObjects(
      colliders,
      false
    )[0];

    if (!hit) {
      return null;
    }

    const targetIndex = this.targets.findIndex(
      (target) => target.mesh === hit.object
    );

    if (targetIndex === -1) {
      return null;
    }

    const [target] = this.targets.splice(targetIndex, 1);
    this.scene.remove(target.mesh);
    this.pendingRespawns.push(this.respawnDelay);

    return {
      points: 100
    };
  }

  spawnTarget(playerPosition) {
    const scale = randomBetween(0.85, 1.35);
    const position = this.findSpawnPosition(playerPosition, scale);
    const hue = randomBetween(0.02, 0.11);
    const material = new MeshStandardMaterial({
      color: new Color().setHSL(hue, 0.85, 0.56),
      emissive: new Color().setHSL(hue, 0.82, 0.2),
      roughness: 0.28,
      metalness: 0.14
    });

    const mesh = new Mesh(this.geometry, material);
    mesh.scale.setScalar(scale);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.scene.add(mesh);
    this.targets.push({
      mesh,
      basePosition: mesh.position.clone(),
      floatOffset: randomBetween(0, Math.PI * 2),
      floatSpeed: randomBetween(1.3, 2.4),
      spinSpeed: randomBetween(0.7, 1.6)
    });
  }

  findSpawnPosition(playerPosition, scale) {
    const margin = 3;
    const targetRadius = this.geometry.parameters.radius * scale;

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const candidate = new Vector3(
        randomBetween(-this.arenaHalfSize + margin, this.arenaHalfSize - margin),
        randomBetween(1.5, 5.5),
        randomBetween(-this.arenaHalfSize + margin, this.arenaHalfSize - margin)
      );

      if (this.isSpawnPositionClear(candidate, playerPosition, targetRadius)) {
        return candidate;
      }
    }

    for (let x = -this.arenaHalfSize + margin; x <= this.arenaHalfSize - margin; x += 2) {
      for (let z = -this.arenaHalfSize + margin; z <= this.arenaHalfSize - margin; z += 2) {
        for (let y = 1.5; y <= 5.5; y += 1) {
          const candidate = new Vector3(x, y, z);

          if (this.isSpawnPositionClear(candidate, playerPosition, targetRadius)) {
            return candidate;
          }
        }
      }
    }

    return playerPosition.clone().add(new Vector3(0, 4, -10));
  }

  isSpawnPositionClear(candidate, playerPosition, targetRadius) {
    const obstaclePadding = 0.2;

    if (candidate.distanceTo(playerPosition) < 8) {
      return false;
    }

    const overlapsTarget = this.targets.some((target) => {
      TEMP_VECTOR.copy(target.basePosition);
      TEMP_VECTOR.y = candidate.y;
      return TEMP_VECTOR.distanceTo(candidate) < 3;
    });

    if (overlapsTarget) {
      return false;
    }

    return !this.obstacleBounds.some((bounds) => {
      TEMP_BOX.copy(bounds);
      return TEMP_BOX.distanceToPoint(candidate) < targetRadius + obstaclePadding;
    });
  }
}
