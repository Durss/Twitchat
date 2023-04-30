<template>
	<component
	:class="classes"
	:is="nodeType"
	:type="type"
	:target="target"
	:to="to"
	:href="type=='link'? to : null"
	@click.stop="onClick($event)"
	@mouseup="onRelease($event)"
	v-model="modelValue">
		<span v-if="loading" class="loadingBorder"></span>
		<span class="background">
			<span class="select" v-if="selected"></span>
		</span>

		<img v-if="icon && loading" :src="$image('loader/loader.svg')" class="loader">
	
		<img class="icon" v-if="icon && !loading" :src="$image('icons/'+icon+'.svg')" alt="icon">
		<span class="icon" v-if="$slots.icon"><slot name="icon"></slot></span>

		<span class="label" ref="label" v-if="$slots.default"><slot></slot></span>

		<div class="clickArea"></div>

		<!-- <img v-if="selected" class="icon" src="@/assets/icons/checkmark.svg" alt="checkmark"> -->
		
		<input type="file" v-if="type=='file'" class="browse" :accept="accept" ref="browse" @change="onBrowseFile()" />
	</component>
</template>

<script lang="ts">
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
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
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({type:Boolean, default: false})
	public selected!:boolean;

	@Prop({type:Boolean, default: false})
	public disabled!:boolean;

	@Prop({type:Boolean, default: false})
	public modelValue!:boolean;

	@Prop({type:String, default: "image/*"})
	public accept!:string;

	@Prop
	public file!:string;
	
	public checked = false;

	public get nodeType():string {
		if(this.to) return "router-link";
		if(this.type == "link") return "a";
		return "button";
	}

	public get classes():string[] {
		let list =  ["button"]
		if(!this.$slots.default) list.push("noTitle");
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
		this.$emit("click", event);
	}

	public onRelease(event:MouseEvent):void {
		if(this.disabled || this.loading) return;
		gsap.fromTo(this.$el, {translateY:-3, scaleY:1.1}, {duration:.5, translateY:0, scaleY:1, clearProps:"all", ease:"elastic.out(1.5)", delay:.05});
	}

}
</script>

<style lang="less" scoped>

.button {
	.emboss();
	cursor: pointer;
	border-radius: 50px;
	display: inline-flex;
	flex-direction: row;
	position: relative;
	flex-wrap: wrap;
	padding: .3em 1em;
	row-gap: 0;
	column-gap: .5em;
	align-items: center;
	justify-content: center;
	text-decoration: none;
	color: var(--color-light);
	transition: filter .15s, transform .1s;
	user-select: none;
	text-decoration: none !important;

	.clickArea {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		background: transparent;
	}

	.loadingBorder {
		@offset: 0px;
		position: absolute;
		z-index: -1;
		top: -@offset;
		left: -@offset;
		border-radius: inherit;
		background-color: var(--color-light);
		background: linear-gradient(20deg, rgba(255,255,255,0) 35%, rgba(255,255,255,1) 40%, rgba(255,255,255,1) 60%, rgba(255,255,255,0) 65%);
		background-repeat: repeat-x;
		background-size:  200% 100%;
		width: calc(100% + @offset*2);
		height: calc(100% + @offset*2);
		animation: glowing 1s linear infinite;
		
		@keyframes glowing {
			0% { background-position: 200% 0; }
			100% { background-position: 0 0; }
		}
	}
	
	.background {
		border-radius: inherit;
		position: absolute;
		top:0;
		left:0;
		width: 100%;
		height: 100%;
		transition: all .15s;
		background-color: var(--color-primary);
	}

	&.disabled {
		cursor: no-drop;
		filter: brightness(70%) saturate(70%);
		.label, .icon {
			opacity: .35;
		}
	}
	&.loading {
		cursor: wait;
		
		.background {
			top: 1px;
			left: 1px;
			width: calc(100% - 2px);
			height: calc(100% - 2px);
		}
	}

	&:not(.disabled){
		&:hover {
			.background {
				background-color: var(--color-primary-light);
			}
		}
	
		&:active{
			transform: translateY(2px);
			.clickArea{
				top: -2px;
			}
			.background {
				background-color: var(--color-primary-dark);
				box-shadow: 0px 0px 0px rgba(255, 255, 255, 0), 0px 0px 0px rgba(0, 0, 0, 0);
			}
		}
	}
	.loader {
		width: 1em;
		height: 1em;
		z-index: 0;
		object-fit: contain;
	}
	.icon, .label {
		transition: all .25s;
		z-index: 0;
	}
	.label {
		line-height: 1em;
		text-align: center;
		flex-grow: 1;
		// flex-basis: 50px;
		text-overflow: ellipsis;
		overflow: hidden;
		display: block;
		line-height: 1.25em;//Makes sure letters like g or p are not cut on the bottom
		&:empty {
			display: none;
		}
	}
	.icon {
		height: 1em;
		max-width: 1em;
		justify-self: center;
		:deep(img) {
			width: 100%;
			height: 100%;
		}
	}
	&.big {
		font-size: 1.4em;
	}

	&.small {
		font-size: .8em;
	}

	&.noTitle {
		padding: .3em;
	}

	&.secondary {
		.background {
			background-color: var(--color-secondary);
		}
		&:not(.disabled){
			&:hover {
				.background {
					background-color: var(--color-secondary-light);
				}
			}
			&:active {
				.background {
					background-color: var(--color-secondary-dark);
				}
			}
		}
	}

	&.alert {
		.background {
			background-color: var(--color-alert);
		}
		&:not(.disabled){
			&:hover {
				.background {
					background-color: var(--color-alert-light);
				}
			}
			&:active {
				.background {
					background-color: var(--color-alert-dark);
				}
			}
		}
	}

	&.selected {
		.icon {
			filter: invert();
		}
		.label {
			color: var(--color-dark);
			font-weight: bold;
		}
		.background{
			background-color: var(--color-primary-extralight);
		}
		&.secondary {
			.background{
				background-color: var(--color-secondary-extralight);
			}
		}
		&.alert {
			.background{
				background-color: var(--color-alert-extralight);
			}
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