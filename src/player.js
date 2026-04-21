import { Box3, MathUtils, Vector3 } from "three";

const FORWARD = new Vector3();
const RIGHT = new Vector3();
const WORLD_UP = new Vector3(0, 1, 0);
const EXPANSION_VECTOR = new Vector3();

export class Player {
  constructor(camera, arenaHalfSize) {
    this.camera = camera;
    this.arenaHalfSize = arenaHalfSize;
    this.height = 1.7;
    this.radius = 0.45;
    this.moveSpeed = 10;
    this.jumpVelocity = 5.6;
    this.gravity = 16;
    this.movementAmount = 0;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.obstacleBounds = [];
    this.joystick = {
      x: 0,
      y: 0
    };
    this.keys = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false
    };
  }

  setObstacles(obstacles) {
    EXPANSION_VECTOR.set(this.radius, 0, this.radius);
    this.obstacleBounds = obstacles.map((obstacle) =>
      new Box3().setFromObject(obstacle).expandByVector(EXPANSION_VECTOR)
    );
  }

  reset() {
    this.camera.position.set(0, this.height, 14);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(0, 0, 0);
    this.movementAmount = 0;
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.clearInput();
    this.setJoystick(0, 0);
  }

  clearInput() {
    Object.keys(this.keys).forEach((code) => {
      this.keys[code] = false;
    });
  }

  setKey(code, pressed) {
    if (code in this.keys) {
      this.keys[code] = pressed;
    }
  }

  setJoystick(x, y) {
    this.joystick.x = MathUtils.clamp(x, -1, 1);
    this.joystick.y = MathUtils.clamp(y, -1, 1);
  }

  update(deltaSeconds) {
    const keyboardX = Number(this.keys.KeyD) - Number(this.keys.KeyA);
    const keyboardZ = Number(this.keys.KeyW) - Number(this.keys.KeyS);
    const moveX = MathUtils.clamp(keyboardX + this.joystick.x, -1, 1);
    const moveZ = MathUtils.clamp(keyboardZ - this.joystick.y, -1, 1);
    this.movementAmount = MathUtils.clamp(Math.hypot(moveX, moveZ), 0, 1);

    if (moveX !== 0 || moveZ !== 0) {
      const magnitude = Math.hypot(moveX, moveZ) || 1;
      const step = (this.moveSpeed * deltaSeconds) / magnitude;
      this.camera.getWorldDirection(FORWARD);
      FORWARD.y = 0;
      FORWARD.normalize();
      RIGHT.crossVectors(FORWARD, WORLD_UP).normalize();
      const nextX =
        this.camera.position.x + FORWARD.x * moveZ * step + RIGHT.x * moveX * step;
      const nextZ =
        this.camera.position.z + FORWARD.z * moveZ * step + RIGHT.z * moveX * step;

      this.tryMoveTo(nextX, this.camera.position.z);
      this.tryMoveTo(this.camera.position.x, nextZ);
    }

    this.camera.position.x = MathUtils.clamp(
      this.camera.position.x,
      -this.arenaHalfSize,
      this.arenaHalfSize
    );
    this.camera.position.z = MathUtils.clamp(
      this.camera.position.z,
      -this.arenaHalfSize,
      this.arenaHalfSize
    );

    if (!this.isGrounded || this.verticalVelocity > 0) {
      this.verticalVelocity -= this.gravity * deltaSeconds;
    }

    this.camera.position.y += this.verticalVelocity * deltaSeconds;

    if (this.camera.position.y <= this.height) {
      this.camera.position.y = this.height;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  getPosition() {
    return this.camera.position;
  }

  getMovementAmount() {
    return this.movementAmount;
  }

  isOnGround() {
    return this.isGrounded;
  }

  jump() {
    if (!this.isGrounded) {
      return false;
    }

    this.verticalVelocity = this.jumpVelocity;
    this.isGrounded = false;
    return true;
  }

  tryMoveTo(nextX, nextZ) {
    const clampedX = MathUtils.clamp(nextX, -this.arenaHalfSize, this.arenaHalfSize);
    const clampedZ = MathUtils.clamp(nextZ, -this.arenaHalfSize, this.arenaHalfSize);

    if (this.isBlocked(clampedX, clampedZ)) {
      return;
    }

    this.camera.position.x = clampedX;
    this.camera.position.z = clampedZ;
  }

  isBlocked(x, z) {
    return this.obstacleBounds.some((bounds) => {
      return (
        x >= bounds.min.x &&
        x <= bounds.max.x &&
        z >= bounds.min.z &&
        z <= bounds.max.z
      );
    });
  }
}
