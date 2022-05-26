# Model Viewer Vue

Three.js model viewer component for Vue

[GitHub](https://github.com/eodmproductions/model-viewer-vue) |
[NPM](https://www.npmjs.com/package/@jaredcrimmins/eodmproductions__model-viewer-vue)

## Install

```shell
npm install @jaredcrimmins/eodmproductions__model-viewer-vue
```

## Usage

### Registration

```ts
// src/main.ts
import {VModelViewer} from '@jaredcrimmins/eodmproductions__model-viewer-vue';
import Vue from 'vue';

// Register component
Vue.component('v-model-viewer', VModelViewer);
```

### Rendering

```ts
import Vue, {CreateElement} from 'vue';
import * as modelViewer from '@jaredcrimmins/eodmproductions__model-viewer-vue';

export default Vue.extend({
  render(c: CreateElement) {
    return c(
      'v-model-viewer',
      {
        props: {
          src: '/path/to/model'
        } as modelViewer.Props
      }
    );
  }
});
```

### Props

| Prop            | Type                                              | Optional | Description                                                 |
| --------------- | ------------------------------------------------- | -------- | ----------------------------------------------------------- |
| `background`    | `Three.Color \| Three.Texture`                    | `true`   | Background of the three.js scene                            |
| `colors`        | `{[meshName: string]: Three.ColorRepresentation}` | `true`   | Object map of colors to set named meshes                    |
| `data`          | `ArrayBuffer`                                     | `true`   | `ArrayBuffer` of the 3D model. glTF/GLB files are supported |
| `disableRotate` | `Boolean`                                         | `false`  | Disables user rotate                                        |
| `disableZoom`   | `Boolean`                                         | `false`  | Disables user zoom                                          |
| `src`           | `String`                                          | `true`   | URL to the 3D model. glTF/GLB files are supported           |
