import { assetPath } from "./assetPath.js";

const SOUND_BANK = {
  footstep: {
    paths: [
      "audio/sfx/footstep-01.mp3",
      "audio/sfx/footstep-02.mp3",
      "audio/sfx/footstep-03.mp3",
      "audio/sfx/footstep-04.mp3",
      "audio/sfx/footstep-05.mp3"
    ],
    volume: 0.42,
    playbackRateRange: [0.94, 1.04]
  },
  jump: {
    paths: ["audio/sfx/jump.mp3"],
    volume: 0.3,
    playbackRateRange: [0.98, 1.02]
  },
  shot: {
    paths: ["audio/sfx/shot.mp3"],
    volume: 0.62,
    playbackRateRange: [0.97, 1.01]
  },
  reload: {
    paths: ["audio/sfx/reload.mp3"],
    volume: 0.35,
    playbackRateRange: [0.99, 1.01]
  },
  hit: {
    paths: [
      "audio/sfx/hit-01.mp3",
      "audio/sfx/hit-02.mp3",
      "audio/sfx/hit-03.mp3"
    ],
    volume: 0.36,
    playbackRateRange: [0.96, 1.04]
  }
};

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.buffers = new Map();
    this.loadingPromise = null;
    this.activeSources = new Set();
    this.lastPlayedIndex = new Map();
    this.stepTimer = 0;
  }

  async unlock() {
    const context = this.getContext();

    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    await this.ensureBuffers();
  }

  reset() {
    this.stepTimer = 0;
    this.stopAll();
  }

  updateMovement(deltaSeconds, movementAmount, isOnGround) {
    if (!this.getRunningContext() || !isOnGround || movementAmount < 0.24) {
      this.stepTimer = 0;
      return;
    }

    this.stepTimer -= deltaSeconds;

    if (this.stepTimer > 0) {
      return;
    }

    this.stepTimer = Math.max(0.2, 0.46 - movementAmount * 0.17);
    this.play("footstep", {
      volumeMultiplier: 0.9 + movementAmount * 0.12
    });
  }

  playJump() {
    this.play("jump");
  }

  playShot() {
    this.play("shot");
  }

  playReload() {
    this.play("reload");
  }

  playHit() {
    this.play("hit");
  }

  play(key, { volumeMultiplier = 1 } = {}) {
    const context = this.getRunningContext();
    const config = SOUND_BANK[key];

    if (!context || !config) {
      return false;
    }

    const selection = this.pickBuffer(key, config.paths);

    if (!selection) {
      return false;
    }

    const source = context.createBufferSource();
    source.buffer = selection.buffer;
    source.playbackRate.value = randomBetween(
      config.playbackRateRange[0],
      config.playbackRateRange[1]
    );

    const gain = context.createGain();
    gain.gain.value =
      config.volume * volumeMultiplier * randomBetween(0.97, 1.03);

    source.connect(gain);
    gain.connect(this.masterGain);

    const activeEntry = { source, gain };
    this.activeSources.add(activeEntry);

    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      this.activeSources.delete(activeEntry);
    };

    source.start();
    return true;
  }

  stopAll() {
    this.activeSources.forEach(({ source, gain }) => {
      try {
        source.stop();
      } catch {
        // Ignore sources that already ended.
      }

      source.disconnect();
      gain.disconnect();
    });

    this.activeSources.clear();
  }

  pickBuffer(key, paths) {
    const available = paths
      .map((path, index) => ({
        index,
        buffer: this.buffers.get(path)
      }))
      .filter((entry) => Boolean(entry.buffer));

    if (available.length === 0) {
      return null;
    }

    const previousIndex = this.lastPlayedIndex.get(key);
    let pool = available;

    if (available.length > 1 && previousIndex !== undefined) {
      pool = available.filter((entry) => entry.index !== previousIndex);
    }

    const selected = pool[Math.floor(Math.random() * pool.length)];
    this.lastPlayedIndex.set(key, selected.index);
    return selected;
  }

  async ensureBuffers() {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    const context = this.getContext();

    if (!context) {
      return;
    }

    const uniquePaths = [...new Set(Object.values(SOUND_BANK).flatMap(({ paths }) => paths))];

    this.loadingPromise = Promise.allSettled(
      uniquePaths.map(async (path) => {
        const response = await fetch(assetPath(path));

        if (!response.ok) {
          throw new Error(`Failed to fetch ${path}`);
        }

        const audioData = await response.arrayBuffer();
        const buffer = await this.decodeAudioData(context, audioData);
        this.buffers.set(path, buffer);
      })
    ).then((results) => {
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.warn(`Unable to load audio asset: ${uniquePaths[index]}`, result.reason);
        }
      });
    });

    return this.loadingPromise;
  }

  decodeAudioData(context, audioData) {
    return new Promise((resolve, reject) => {
      context.decodeAudioData(audioData.slice(0), resolve, reject);
    });
  }

  getRunningContext() {
    const context = this.getContext();

    if (!context || context.state !== "running") {
      return null;
    }

    return context;
  }

  getContext() {
    if (this.context) {
      return this.context;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.context.destination);

    return this.context;
  }
}
