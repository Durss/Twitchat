<template>
	<div :class="classes">
		<div class="header" @click="toggle()">
			<img :src="require('@/assets/icons/'+icon+'.svg')" :alt="icon" class="icon" v-if="icon">
			<h2>{{title}}</h2>
		</div>
		<div class="content" v-if="showContent" ref="content">
			<slot></slot>
		</div>
	</div>
</template>

<script lang="ts">
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		title:String,
		icon:String,
		open:{
			type:Boolean,
			default:true,
		},
	},
	components:{}
})
export default class ToggleBlock extends Vue {

	public icon!:string
	public title!:string
	public open!:boolean;

	public showContent:boolean = false;

	public get classes():string[] {
		let res = ["toggleblock"];
		if(!this.showContent) res.push("closed");
		return res;
	}

	public mounted():void {
		this.showContent = this.open;
	}

	public async toggle():Promise<void> {
		const params:gsap.TweenVars = {paddingTop:0, paddingBottom:0, height:0, duration:.25, ease:"sine.inOut", clearProps:"all"};
		if(this.showContent) {
			params.onComplete = ()=>{
				this.showContent = false;
			}
			gsap.to(this.$refs.content as HTMLDivElement, params);
		}else{
			this.showContent = true;
			await this.$nextTick();
			gsap.from(this.$refs.content as HTMLDivElement, params);
		}
	}

}
</script>

<style scoped lang="less">
.toggleblock{

	&.closed {
		.header {
			border-bottom: none;
			border-bottom-left-radius: 1em;
			border-bottom-right-radius: 1em;
		}
	}

	.icon {
		height: 1.5em;
		width: 1.5em;
		object-fit: contain;
		display: block;
		margin:auto;
		&.suggestion {
			height: 2em;
		}
	}

	.header {
		border-bottom: 2px solid @mainColor_normal;
		// border-left: 3px solid @mainColor_normal;
		border-top-left-radius: 1em;
		border-top-right-radius: 1em;
		text-align: center;
		padding: .5em 1em;
		cursor: pointer;
		background-color: white;
		display: flex;
		flex-direction: row;
		align-items: center;
		h2 {
			flex-grow: 1;
		}
	}

	.content {
		overflow: hidden;
		padding: 1em;
		background-color: fade(@mainColor_normal, 10%);
		border-bottom-left-radius: 1em;
		border-bottom-right-radius: 1em;
	}
}
</style>