/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { AssetType, defineAssets } from '@iwsdk/core';
import {
  carbonAtom,
  nitrogenAtom,
  oxygenAtom,
} from './scene-assets/atoms.scene-asset.js';
import labRoom from './scene-assets/lab-room.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

export default defineAssets({
  'lab-room': labRoom,
  'atom-carbon': carbonAtom,
  'atom-nitrogen': nitrogenAtom,
  'atom-oxygen': oxygenAtom,
  'molecule-panel': {
    url: publicAssetUrl('ui/molecule-panel.uikitml'),
    type: AssetType.UIKitML,
    name: 'Molecule Panel',
  },
});
