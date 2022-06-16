<template>
	<div class="streaminfo">
		<div class="dimmer" ref="dimmer" @click="close()"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<span class="title">Stream info</span>
				<Button aria-label="Close prediction form" :icon="$image('icons/cross_white.svg')" @click="close()" class="close" bounce/>
			</div>
			<div class="content">
				test1
				<ParamItem class="item" :paramData="param_title" autofocus />
				<ParamItem class="item" :paramData="param_category" />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { ParameterData } from '@/types/TwitchatDataTypes';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ParamItem from '../params/ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
	},
	emits:["close"]
})
export default class StreamInfoForm extends Vue {

	public param_title:ParameterData = {label:"Stream title", value:"", type:"text", placeholder:"title..."};
	public param_category:ParameterData = {label:"Category", value:"", type:"text", placeholder:"title..."};

	public async mounted():Promise<void> {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}
}
</script>

<style scoped lang="less">
.streaminfo{
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	.modal();
	
}
</style>