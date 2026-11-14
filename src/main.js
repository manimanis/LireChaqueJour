import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router/index.js';
import App from './App.vue';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import '@fontsource/open-sans/400.css';
import '@fontsource/open-sans/700.css';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';

import './assets/main.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
