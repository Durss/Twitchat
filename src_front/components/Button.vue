<template>
	<component
	:class="classes"
	:is="nodeType"
	:type="type"
	:target="target"
	:to="to"
	:href="type=='link'? to : null"
	@click.stop="onClick($event)"
	:style="progressStyle"
	v-model="modelValue">
		<span v-if="loading" class="loadingBorder"></span>

		<img v-if="icon && loading" :src="$image('loader/loader_white.svg')" class="loader">
	
		<img class="icon" v-if="icon && !loading" :src="$image('icons/'+icon+'.svg')" alt="icon">
		<div class="icon" v-if="$slots.icon"><slot name="icon"></slot></div>

		<span class="label" v-if="$slots.default"><slot></slot></span>
		<input type="file" v-if="type=='file'" class="browse" :accept="accept" ref="browse" @change="onBrowseFile()" />
	</component>
</template>

<script lang="ts">
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { StyleValue } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{
	},
	emits: ['click', 'update:modelValue', 'update:file'],
	expose: ['value'],
})
export default class Button extends Vue {

	@Prop
	public icon!:string;

	@Prop({type:Boolean, default: false})
	public loading!:boolean;

	@Prop({type:String, default:'button'})
	public type!:string;

	@Prop
	public target!:string;

	@Prop
	public to!:unknown;

	@Prop({type:Boolean, default: false})
	public big!:boolean;

	@Prop({type:Boolean, default: false})
	public small!:boolean;

	@Prop({type:Boolean, default: false})
	public primary!:boolean;

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({type:Boolean, default: false})
	public selected!:boolean;

	@Prop({type:Boolean, default: false})
	public disabled!:boolean;

	@Prop({type:Boolean, default: false})
	public modelValue!:boolean;

	@Prop({type:Boolean, default: false})
	public bounce!:boolean;

	@Prop({type:String, default: "image/*"})
	public accept!:string;

	@Prop
	public file!:string;
	
	public pInterpolated = -1;
	public checked = false;

	public get nodeType():string {
		if(this.to) return "router-link";
		if(this.type == "link") return "a";
		return "button";
	}

	public get progressStyle():StyleValue {
		if(this.pInterpolated> -1 && this.pInterpolated<100) {
			let p:number = Math.round(this.pInterpolated);
			let color = "255, 255, 255";
			let alpha = .5;
			if(this.primary !== false) {
				color = "75, 201, 194"
				alpha = .3;
			}
			return {backgroundImage: "linear-gradient(to right, rgba("+color+",0) "+p+"%,rgba("+color+",0) "+p+"%,rgba("+color+","+alpha+") "+p+"%,rgba("+color+","+alpha+") 100%)"};
		}else{
			return {};
		}
	}

	public get classes():string[] {
		let list =  ["button"]
		if(!this.$slots.default) list.push("noTitle");
		if(this.primary !== false) list.push("primary");
		if(this.secondary !== false) list.push("secondary");
		if(this.alert !== false) list.push("alert");
		if(this.big !== false) list.push("big");
		if(this.small !== false) list.push("small");
		if(this.selected !== false) list.push("selected");
		if(this.loading !== false) list.push("disabled", "loading");
		else if(this.disabled !== false) list.push("disabled");
		return list;
	}

	public mounted():void {
		this.checked = this.modelValue;

		watch(() => this.checked, (val:boolean) => {
			this.$emit("update:modelValue", val);
		});
		
		watch(() => this.modelValue, (val:boolean) => {
			this.checked = val;
		});
	}

	public onBrowseFile():void {
		let input:HTMLInputElement = this.$refs.browse as HTMLInputElement;
		if(input.files) {
			this.$emit('update:file', input.files[0])
		}
	}
	
	public resetBrowse():void {
		(this.$refs.browse as HTMLFormElement).value = null;
	}

	public onClick(event:MouseEvent):void {
		if(this.disabled !== false || this.loading) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		if(this.bounce) {
			gsap.fromTo(this.$el, {scaleX:.8}, {duration:1.4, scale:1, clearProps:"scaleX", ease:"elastic.out(2)"});
			gsap.fromTo(this.$el, {scaleY:.8}, {duration:1.2, scale:1, clearProps:"all", ease:"elastic.out(2)", delay:.05});
		}
		this.$emit("click", event);
	}

}
</script>

<style lang="less" scoped>

.button {
	display: inline-flex;
	flex-direction: row;
	position: relative;
	padding: .25em .5em;
	gap: .5em;
	align-items: center;
	text-decoration: none;
	text-align: left;
	color: var(--color-light);
	font-family: var(--font-inter);
	cursor: pointer;
	transition: filter .25s;

	.loadingBorder {
		@offset: 1px;
		position: absolute;
		z-index: -1;
		top: -@offset;
		left: -@offset;
		border-radius: var(--border_radius);
		background-color: var(--color-light);
		// background: linear-gradient(10deg, var(--color-primary-transparent) 35%, var(--color-primary) 40%, var(--color-primary) 60%, var(--color-primary-transparent) 65%);
		background: linear-gradient(10deg, rgba(255,255,255,0) 35%, rgba(255,255,255,1) 40%, rgba(255,255,255,1) 60%, rgba(255,255,255,0) 65%);
		background-repeat: repeat-y;
		background-size: 100% 200%;
		filter: blur(1px);
		width: calc(100% + @offset*2);
		height: calc(100% + @offset*2);
		animation: glowing 1.5s linear infinite;
		
		@keyframes glowing {
			0% { background-position: 0 0; }
			100% { background-position: 0 200%; }
		}
	}

	&:not(.disabled):hover {
		&::before {
			background-color: var(--color-dark-extralight);
		}
	}
	
	&::before {
		content: "";
		width: 100%;
		height: 100%;
		position: absolute;
		top:0;
		left:0;
		z-index: 0;
		transition: all .25s;
		border-radius: var(--border_radius);
		background-color: var(--color-dark-light);
	}

	.loader {
		width: 1em;
		height: 1em;
		object-fit: contain;
		z-index: 1;
	}

	.icon, label {
		transition: all .25s;
	}

	.icon {
		height: 1em;
		z-index: 1;
		:deep(img) {
			width: 100%;
			height: 100%;
		}
	}
	.label {
		z-index: 1;
		line-height: 1em;
		text-align: center;
		flex-grow: 1;
	}

	&.big {
		font-size: 1.4em;
	}

	&.small {
		font-size: .75em;
		padding: .3em;
	}

	&.noTitle {
		padding: .25em;
	}

	&.selected::before {
		filter: drop-shadow(0 4px 0px #ffffff);
	}

	&.primary {
		&:before {
			background-color: var(--color-primary);
		}

		&:not(.disabled):hover {
			&::before {
				background-color: var(--color-primary-light);
			}
		}
	}

	&.secondary {
		&:before {
			background-color: var(--color-secondary);
		}
		&:not(.disabled):hover {
			&::before {
				background-color: var(--color-secondary-light);
			}
		}
	}

	&.alert {
		&:before {
			background-color: var(--color-alert);
		}
		&:not(.disabled):hover {
			&::before {
				background-color: var(--color-alert-light);
			}
		}
	}

	&.disabled {
		cursor: wait;
		filter: brightness(70%) saturate(70%);
		.label, .icon {
			opacity: .35;
		}
	}

}

@media only screen and (max-width: 500px) {
	.button {
		&.noTitle.big, &.big {
			padding: .5em;
			font-size: 1.2em;
			min-height: calc(1.2em + .5em);
		}
	}
}
</style>