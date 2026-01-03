import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import './assets/global.css' 
import { DynamicScroller, DynamicScrollerItem } from 'vue3-virtual-scroller';
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css';
import { createPinia } from 'pinia'

const app = createApp(App)

// 全局注册虚拟滚动组件
app.component('DynamicScroller', DynamicScroller)
app.component('DynamicScrollerItem', DynamicScrollerItem)
app.use(createPinia())
app.mount('#app')
