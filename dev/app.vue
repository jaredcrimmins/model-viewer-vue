<template>
  <div id="app">
    <div class="app__designer">
      <div class="app__viewer-container">
        <v-model-viewer
          ref="modelViewer"
          :background="background"
          :colors="{
            'Base': this.baseColor,
            'Hanger': this.hangerColor
          }"
          :data="data"
          :enable-rotate="enableRotate"
          :src="src"
        />
      </div>

      <div class="app__settings">
        <button @click="onChooseFileButtonClick">Choose File</button>
        <input
          ref="fileInputEl"
          type="file"
          accept="model/gltf+json, model/gltf-binary"
          style="display: none;"
          @input="addModel"
        >

        <div>
          <input
            id="hanger"
            type="color"
            name="hanger"
            v-model="hangerColor"
          >
          <label for="hanger">Hanger</label>
        </div>

        <div>
          <input
            id="base"
            type="color"
            name="base"
            v-model="baseColor"
          >
          <label for="base">Base</label>
        </div>
      </div>
    </div>      
  </div>
</template>

<script lang="ts">
  import * as Three from 'three';
  import Vue from 'vue';

  type FileInputElRef = HTMLInputElement;

  export default Vue.extend({
    name: 'app',

    data() {
      return {
        background: new Three.Color('#f1f1f1'),
        baseColor: '#000000',
        data: <ArrayBuffer | null>null,
        enableRotate: true,
        hangerColor: '#000000',
        src: '/models/EoDMHeadphoneStand.glb'
      };
    },

    methods: {
      onChooseFileButtonClick() {
        (<FileInputElRef>this.$refs.fileInputEl).click();
      },

      addModel(event: Event) {
        const eventTarget = <HTMLInputElement>event.target;

        if (!eventTarget.files || !eventTarget.files[0]) return;

        const file = eventTarget.files[0];
        const reader = new FileReader();

        reader.addEventListener('load', progressEvent => {
          this.data = <ArrayBuffer | null | undefined>progressEvent.target?.result || null;
        });
        reader.readAsArrayBuffer(file);
      }
    }
  });
</script>

<style lang="scss">
  .app {
    &__designer {
      display: flex;
    }

    &__viewer-container {
      height: 100vh;
      width: 50%;
    }
  }
</style>
