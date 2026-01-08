import { createApp } from 'vue' // 【补上这一行】核心导入
import './style.css'
import App from './App.vue'
import './assets/global.css' 
import { DynamicScroller, DynamicScrollerItem } from 'vue3-virtual-scroller'
import 'vue3-virtual-scroller/dist/vue3-virtual-scroller.css'
import { createPinia } from 'pinia'
import router from './router/index' 

const app = createApp(App)
const pinia = createPinia()

// 全局注册虚拟滚动组件
app.component('DynamicScroller', DynamicScroller)
app.component('DynamicScrollerItem', DynamicScrollerItem)

// 先挂载 Pinia，再挂载路由，最后 Mount
app.use(pinia)
app.use(router)

app.mount('#app')