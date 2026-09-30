/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createSystem, UIKitMLAsset, VisibilityState } from '@iwsdk/core';

/**
 * Before entering VR the panel is a small title screen (description, credit
 * and a big "Enter VR" button); in VR it becomes the game panel.
 */
export class PanelSystem extends createSystem({}) {
  init(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('molecule-panel');
    const xrButton = panel?.getElementById('xr-button');
    const titleBlock = panel?.getElementById('title-block');
    const gameUi = panel?.getElementById('game-ui');
    const levelName = panel?.getElementById('level-name');
    if (xrButton == null) {
      return;
    }
    const show = (
      el: { setProperties: (p: { display: 'flex' | 'none' }) => void } | null | undefined,
      on: boolean,
    ) => el?.setProperties({ display: on ? 'flex' : 'none' });
    const layout = (is2D: boolean) => {
      show(titleBlock, is2D);
      show(gameUi, !is2D);
      show(levelName, !is2D);
      show(xrButton, is2D && this.world.xrEnabled);
    };
    if (!this.world.xrEnabled) {
      layout(true);
      return;
    }

    const launchXR = () => this.world.launchXR();
    xrButton.addEventListener('click', launchXR);
    this.cleanupFuncs.push(
      () => xrButton.removeEventListener('click', launchXR),
      this.world.visibilityState.subscribe((visibilityState) =>
        layout(visibilityState === VisibilityState.NonImmersive),
      ),
    );
  }
}
