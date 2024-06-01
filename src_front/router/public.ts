import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';
const LightAuthView = () => import('@/views/LightAuthView.vue');
const BingoGridView = () => import('@/views/BingoGridView.vue');

const routes: Array<RouteRecordRaw> = [
	{
		path: '/bingo/:uid(.*)/:gridId(.*)',
		name: 'bingo_grid_public',
		component: BingoGridView,
		meta: {
			needAdmin:false,
			overflow:true,
			needAuth:false,
		},
	},
	{
		path: '/oauth',
		name: 'oauth',
		component: LightAuthView,
		meta: {
			overflow:true,
			needAuth:false,
		}
	},
	{
		path: "/:path(.*)",
		redirect:() => {
			return {name:"public"}
		},
	}
]

// const port = parseInt(document.location.port || "80");
// const isLiveDev = port >= 8080 && port < 8090;
const router = createRouter({
	history: createWebHistory("public"),
	routes,
})

export default router
