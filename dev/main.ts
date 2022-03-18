import App from './app.vue';
import {VModelViewer} from '../src/index';
import Vue from 'vue';

Vue.component('v-model-viewer', VModelViewer);

export function createApp() {
  const app = new Vue({
    render: c => c(App)
  });

  return {app};
}
