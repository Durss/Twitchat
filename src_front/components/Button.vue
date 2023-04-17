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
		<img :src="parsedIcon" v-if="parsedIcon && !isIconSVG" alt="icon" class="icon" :class="loading? 'hide' : 'show'">
		<div v-html="parsedIcon" v-if="parsedIcon && isIconSVG" alt="icon" class="icon" :class="loading? 'hide' : 'show'"></div>

		<img src="@/assets/loader/loader_white.svg" alt="loader" class="loader" v-if="loading">
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
	@Prop
	public iconSelected!:string;
	@Prop({type:Boolean, default: false})
	public loading!:boolean;
	@Prop({type:String, default:'button'})
	public type!:string;
	@Prop
	public target!:string;
	@Prop
	public to!:unknown;
	@Prop({type:Boolean, default: false},)
	public big!:boolean;
	@Prop({type:Boolean, default: false},)
	public small!:boolean;
	@Prop({type:Boolean, default: false})
	public white!:boolean;
	@Prop({type:Boolean, default: false},)
	public highlight!:boolean;
	@Prop({type:Boolean, default: false},)
	public selected!:boolean;
	@Prop({type:Boolean, default: false},)
	public disabled!:boolean;
	@Prop({type:Boolean, default: false},)
	public modelValue!:boolean;
	@Prop({type:Boolean, default: false},)
	public bounce!:boolean;
	@Prop({type:String, default: "image/*"})
	public accept!:string;
	@Prop
	public file!:string;
	
	public pInterpolated = -1;
	public checked = false;
	
	public get isIconSVG():boolean {
		return this.parsedIcon.indexOf("<") != -1;
	}

	public get nodeType():string {
		if(this.to) return "router-link";
		if(this.type == "link") return "a";
		return "button";
	}

	public get parsedIcon():string {
		if(this.selected !== false && this.iconSelected) {
			return this.iconSelected;
		}else{
			return this.icon;
		}
	}

	public get progressStyle():StyleValue {
		if(this.pInterpolated> -1 && this.pInterpolated<100) {
			let p:number = Math.round(this.pInterpolated);
			let color = "255, 255, 255";
			let alpha = .5;
			if(this.white !== false) {
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
		if(this.white !== false) list.push("white");
		if(this.big !== false) list.push("big");
		if(this.small !== false) list.push("small");
		if(this.highlight !== false) list.push("highlight");
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
	color: var(--mainColor_light);
	font-family: var(--font-inter);
	cursor: pointer;

	&:hover {
		&::before {
			background-color: var(--mainColor_normal_light);
		}
	}
	
	&::before {
		content: "";
		width: 100%;
		height: 100%;
		position: absolute;
		top:0;
		left:0;
		transition: background-color .25s;
		border-radius: var(--border_radius);
		background-color: var(--mainColor_normal);
	}

	.loader {
		position: absolute;
		height: 1.25em;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.icon {
		height: 1em;
		z-index: 1;
	}
	.label {
		z-index: 1;
		line-height: 1em;
	}

	&.big {
		font-size: 1.6em;
	}

	&.small {
		font-size: .75em;
		padding: .3em;
	}

	&.noTitle {
		padding: .25em;
	}

	&.selected::before {
		outline: 2px solid var(--mainColor_light);
	}

	&.white {
		color: var(--mainColor_normal);
		&:before {
			background-color: var(--mainColor_light);
		}
		&.disabled {
			color: var(--mainColor_normal);
			.icon, .label {
				filter: brightness(.25);
			}
		}

		&:hover {
			&::before {
				background-color: var(--mainColor_normal_extralight);
			}
		}
		&.selected::before {
			outline: 2px solid var(--mainColor_normal);
		}
	}

	&.highlight {
		color: var(--mainColor_light);
		&:before {
			background-color: var(--mainColor_alert);
		}
		&:hover {
			&::before {
				background-color: var(--mainColor_alert_light);
			}
		}
	}

	&.disabled {
		.label, .icon {
			opacity: .35;
		}
		&::before {
			opacity: .5;
		}
	}

	border-width: 2px;
	border-image: linear-gradient(to right, #007bff, #00bfff);
	border-image-slice: 1;

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