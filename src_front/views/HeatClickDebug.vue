<template>
	<div class="heatclickdebug">
		<div class="pointer" ref="pointer"></div>
	</div>
</template>

<script lang="ts">
import Utils from '@/utils/Utils';
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
export default class HeatClickDebug extends Vue {

	public mounted():void {
		//@ts-ignore
		window.addEventListener("heat-click", async (event:{detail:{x:number, y:number, uid:string, shift:boolean, alt:boolean, ctrl:boolean, testMode:boolean, login:string, page:string}}):Promise<void> => {
			const hash = await Utils.sha256(document.location.href)
			if(event.detail.page != hash) return;
			
			const pointer = this.$refs.pointer as HTMLDivElement;
			pointer.style.left = (event.detail.x * document.body.clientWidth) + "px";
			pointer.style.top = (event.detail.y * document.body.clientHeight) + "px";
			
		});
	}

}
</script>

<style scoped lang="less">
.heatclickdebug{
	.pointer {
		border-radius: 50%;
		border: 2px solid red;
		width: 20px;
		height: 20px;
		position: absolute;
		top: 0;
		left: 0;
		transform: translate(-50%, -50%);
	}
}
</style>