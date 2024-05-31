import Overlay from '@/views/Overlay.vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
	{
		path: '/:id(.*)',
		name: 'overlay',
		component: Overlay,
		meta: {
			needAuth:false,
			public:true,
			noBG:true,
			overflow:false,
		}
	},
	{
		path: "/:path(.*)",
		redirect:() => {
			return {name:"overlay"}
		},
	}
]

// const port = parseInt(document.location.port || "80");
// const isLiveDev = port >= 8080 && port < 8090;
const router = createRouter({
	history: createWebHistory("overlay"),
	routes,
})

export default router
