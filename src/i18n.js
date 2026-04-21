export const SUPPORTED_LOCALES = ["ja", "en", "kr"];
export const DEFAULT_LOCALE = "ja";
export const LOCALE_STORAGE_KEY = "web-shooter.locale";

export const translations = {
  ja: {
    meta: {
      documentTitle: "Target Rush FPS"
    },
    hud: {
      score: "SCORE",
      time: "TIME",
      ammo: "AMMO",
      statusIdle: "スタートしてミッションを始めましょう",
      statusPaused: "ポーズ中",
      statusEnded: "ラウンド終了",
      reloading: "リロード中...",
      mobileControls:
        "左で移動 / 右で視点 / FIREで射撃 / JUMPでジャンプ / RLDでリロード",
      desktopControls: "クリックで射撃 / Spaceでジャンプ / Rでリロード"
    },
    mobile: {
      lookLabel: "DRAG TO AIM",
      fire: "FIRE",
      jump: "JUMP",
      reload: "RLD"
    },
    screen: {
      localeLabel: "LANGUAGE",
      start: {
        eyebrow: "",
        title: "TARGET RUSH",
        mobileBody:
          "左のジョイスティックで移動し、右側をドラッグして照準します。FIREで射撃、JUMPでジャンプ、RLDでリロード。横向きで始めると、前方の障害物のまわりに6つのターゲットが出現します。",
        desktopBody:
          "WASDで移動し、マウスで照準します。クリックで射撃、Spaceでジャンプ、Rでリロード。開始すると、前方の障害物のまわりに6つのターゲットが出現します。",
        button: "ゲーム開始"
      },
      pause: {
        eyebrow: "PAUSED",
        title: "フォーカスを戻してください",
        body: "ポインターロックが解除されました。ボタンを押して戦場に戻りましょう。",
        button: "続ける"
      },
      end: {
        eyebrow: "TIME OVER",
        title: (score) => `最終スコア ${score}`,
        body: "60秒が終了しました。もう一度挑戦してハイスコアを狙いましょう。",
        button: "もう一度遊ぶ"
      },
      fullscreenResume: {
        eyebrow: "FULLSCREEN OFF",
        title: "フルスクリーンが終了しました",
        body:
          "モバイルブラウザのUIが再表示されました。ボタンを押してフルスクリーンに戻り、そのままプレイを続けてください。",
        button: "フルスクリーンで続ける"
      }
    },
    orientation: {
      eyebrow: "MOBILE MODE",
      title: "横向きにしてください",
      body:
        "モバイルでは横向き画面でのみプレイできます。端末を横向きにすると自動で再開します。"
    }
  },
  en: {
    meta: {
      documentTitle: "Target Rush FPS"
    },
    hud: {
      score: "SCORE",
      time: "TIME",
      ammo: "AMMO",
      statusIdle: "Press start to deploy",
      statusPaused: "Paused",
      statusEnded: "Round complete",
      reloading: "Reloading...",
      mobileControls:
        "Move left / Aim right / FIRE shoot / JUMP jump / RLD reload",
      desktopControls: "Click shoot / Space jump / R reload"
    },
    mobile: {
      lookLabel: "DRAG TO AIM",
      fire: "FIRE",
      jump: "JUMP",
      reload: "RLD"
    },
    screen: {
      localeLabel: "LANGUAGE",
      start: {
        eyebrow: "",
        title: "TARGET RUSH",
        mobileBody:
          "Move with the left joystick and drag on the right side to aim. FIRE shoots, JUMP jumps, and RLD reloads. Start in landscape and six targets will spawn around the forward obstacles.",
        desktopBody:
          "Move with WASD and aim with the mouse. Click to shoot, Space to jump, and R to reload. Once the round starts, six targets will spawn around the forward obstacles.",
        button: "Start Game"
      },
      pause: {
        eyebrow: "PAUSED",
        title: "Click back into the match",
        body: "Pointer lock was released. Press the button to jump back into the arena.",
        button: "Resume"
      },
      end: {
        eyebrow: "TIME OVER",
        title: (score) => `Final Score ${score}`,
        body: "Your 60 seconds are up. Run it again and push for a higher score.",
        button: "Play Again"
      },
      fullscreenResume: {
        eyebrow: "FULLSCREEN OFF",
        title: "Fullscreen was closed",
        body:
          "The mobile browser UI is back on screen. Press the button to re-enter fullscreen and continue the run.",
        button: "Resume Fullscreen"
      }
    },
    orientation: {
      eyebrow: "MOBILE MODE",
      title: "Rotate to landscape",
      body:
        "Mobile play is only available in landscape. Turn your device sideways and the match will continue automatically."
    }
  },
  kr: {
    meta: {
      documentTitle: "Target Rush FPS"
    },
    hud: {
      score: "SCORE",
      time: "TIME",
      ammo: "AMMO",
      statusIdle: "시작 버튼으로 게임을 시작하세요",
      statusPaused: "일시정지됨",
      statusEnded: "라운드 종료",
      reloading: "재장전 중...",
      mobileControls:
        "왼쪽 이동 / 오른쪽 조준 / FIRE 발사 / JUMP 점프 / RLD 재장전",
      desktopControls: "좌클릭 사격 / Space 점프 / R 재장전"
    },
    mobile: {
      lookLabel: "드래그로 조준",
      fire: "FIRE",
      jump: "JUMP",
      reload: "RLD"
    },
    screen: {
      localeLabel: "LANGUAGE",
      start: {
        eyebrow: "",
        title: "TARGET RUSH",
        mobileBody:
          "왼쪽 조이스틱으로 이동하고 오른쪽 화면을 드래그해 조준하세요. FIRE로 사격하고 JUMP로 점프, RLD로 재장전합니다. 가로 모드에서 시작하면 전방 장애물 주변에 타겟 6개가 나타납니다.",
        desktopBody:
          "WASD로 이동하고 마우스로 조준하세요. 좌클릭으로 사격, Space로 점프, R로 재장전합니다. 시작하면 전방 장애물 주변에 타겟 6개가 나타납니다.",
        button: "게임 시작"
      },
      pause: {
        eyebrow: "PAUSED",
        title: "포커스를 다시 잡아주세요",
        body: "마우스 포인터가 풀렸습니다. 버튼을 눌러 다시 전장으로 돌아가세요.",
        button: "계속하기"
      },
      end: {
        eyebrow: "TIME OVER",
        title: (score) => `최종 점수 ${score}`,
        body: "60초가 종료되었습니다. 다시 시작해서 더 높은 점수를 노려보세요.",
        button: "다시 시작"
      },
      fullscreenResume: {
        eyebrow: "FULLSCREEN OFF",
        title: "전체화면이 종료되었습니다",
        body:
          "모바일 브라우저 UI가 다시 나타났습니다. 버튼을 눌러 전체화면으로 다시 들어가고 게임을 이어가세요.",
        button: "전체화면으로 계속"
      }
    },
    orientation: {
      eyebrow: "MOBILE MODE",
      title: "가로 모드로 돌려주세요",
      body:
        "모바일에서는 landscape 화면에서만 플레이할 수 있습니다. 기기를 가로로 돌리면 자동으로 이어집니다."
    }
  }
};

export function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function getStoredLocale() {
  try {
    return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function storeLocale(locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, normalizeLocale(locale));
  } catch {
    // Ignore storage failures and keep the in-memory locale.
  }
}

export function getTranslations(locale) {
  return translations[normalizeLocale(locale)];
}
