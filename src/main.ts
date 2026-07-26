import { createApp } from 'vue' // 【补上这一行】核心导入
import './style.css'
import App from './App.vue'
import './assets/global.css' 
import { DynamicScroller, DynamicScrollerItem } from 'vue3-virtual-scroller'
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css'
import { createPinia } from 'pinia'
import router from './router/index' 
import i18n from './i18n'

const app = createApp(App)
const pinia = createPinia()

app.component('DynamicScroller', DynamicScroller)
app.component('DynamicScrollerItem', DynamicScrollerItem)

app.use(pinia)
app.use(router)
app.use(i18n)

app.mount('#app')
