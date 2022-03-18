import {createApp} from './main';

const {app} = createApp();

function mount() {
  app.$mount('#app');
}

if (
  document.readyState === 'complete' ||
  document.readyState === 'interactive'
) {
  mount();
} else window.addEventListener('DOMContentLoaded', mount);
