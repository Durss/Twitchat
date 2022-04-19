<template>
	<component
	:class="classes"
	:is="nodeType"
	:type="type=='checkbox'? null : type"
	:target="target"
	:to="to"
	:href="type=='link'? to : null"
	@click.stop="onClick($event)"
	:style="progressStyle"
	v-model="modelValue">
		<img :src="parsedIcon" v-if="parsedIcon && !isIconSVG" alt="icon" class="icon" :class="loading? 'hide' : 'show'">
		<div v-html="parsedIcon" v-if="parsedIcon && isIconSVG" alt="icon" class="icon" :class="loading? 'hide' : 'show'"></div>

		<div class="checkboxContent" v-if="type=='checkbox'">
			<div class="checkmark">
				<img :src="checkMarkIcon" v-if="checked" alt="icon" class="img">
			</div>
			<span class="label" :class="loading? 'hide' : 'show'" v-if="title" v-html="title"></span>
			<input type="checkbox" :name="name" :id="name" class="checkboxInput" ref="checkbox" v-model="checked" v-if="type=='checkbox'" />
		</div>

		<img src="@/assets/loader/loader_white.svg" alt="loader" class="spinner" v-if="loading">
		<span class="label" :class="loading? 'hide' : 'show'" v-if="title && type!='checkbox'" v-html="title"></span>
		<input type="file" v-if="type=='file'" class="browse" :accept="accept" ref="browse" @change="$emit('change', $event)" />
	</component>
</template>

<script lang="ts">
import { Ref, watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
	},
	props: {
		icon:String,
		iconSelected:String,
		title:String,
		name:String,
		loading:{type:Boolean, default: false},
		type:{type:String, default:'button'},
		target:String,
		to:Object,
		percent:{default: -1, type:Number},
		white:{type:Boolean, default: false},
		big:{type:Boolean, default: false},
		small:{type:Boolean, default: false},
		highlight:{type:Boolean, default: false},
		selected:{type:Boolean, default: false},
		disabled:{type:Boolean, default: false},
		modelValue:{type:Boolean, default: false},
		bounce:{type:Boolean, default: false},
		accept:{type:String, default: "image/*"},
	},
	emits: ['click', 'change', 'update:modelValue'],
	expose: ['value'],
})
export default class Button extends Vue {

	public icon!:string;
	public iconSelected!:string;
	public title!:string;
	public name!:string;
	public loading!:boolean;
	public type!:string;
	public target!:string;
	public to!:unknown;
	public percent!:Ref<number>;
	public white!:boolean;
	public big!:boolean;
	public small!:boolean;
	public highlight!:boolean;
	public selected!:boolean;
	public disabled!:boolean;
	public modelValue!:boolean;
	public bounce!:boolean;
	public accept!:string;

	public pInterpolated:number = -1;
	public checked:boolean = false;

	public get isIconSVG():boolean {
		return this.parsedIcon.indexOf("<") != -1;
	}

	public get checkMarkIcon():string {
		if(this.white !== false) {
			return require('@/assets/icons/checkmark_white.svg');
		}else{
			return require('@/assets/icons/checkmark.svg');
		}
	}

	public get nodeType():string {
		if(this.to) return "router-link";
		if(this.type == "checkbox") return "div";
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

	public get progressStyle():unknown {
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
		if(!this.title) list.push("noTitle");
		if(this.white !== false) list.push("white");
		if(this.big !== false) list.push("big");
		if(this.small !== false) list.push("small");
		if(this.highlight !== false) list.push("highlight");
		if(this.selected !== false) list.push("selected");
		if(this.loading !== false) list.push("disabled");
		if(this.disabled !== false) list.push("disabled");
		if(this.type == "checkbox") list.push("checkbox");
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
		
		watch(() => this.percent, (val:Ref<number>) => {
			let duration = val.value < this.pInterpolated? 0 : .35;
			gsap.killTweensOf(this);
			gsap.to(this, {duration, pInterpolated:val.value, ease:"sine.inout"});
		});
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
			gsap.fromTo(this.$el, {scaleX:.7}, {duration:1.4, scale:1, clearProps:"scaleX", ease:"elastic.out(2)"});
			gsap.fromTo(this.$el, {scaleY:.7}, {duration:1.2, scale:1, clearProps:"all", ease:"elastic.out(2)", delay:.05});
		}
		this.$emit("click", event);
	}

}
</script>

<style lang="less" scoped>

.button {
	position: relative;//Necessary for loader spinning absolute placement
	display: inline-flex;
	justify-content: center;
	align-items: center;
	flex-direction: row;
	white-space: nowrap;
	// transition: all .25s;
	overflow: hidden;
	// touch-action: none;
	user-select: none;
	cursor: pointer;
	border: none;
	padding: 5px 10px;
	font-size: 20px;
	color: @mainColor_light;
	background-color: @mainColor_normal;
	transition: color .25s, background-color .25s;
	box-sizing: border-box;
	text-align: center;
	border-radius: @border_radius;
	will-change: transform;
	text-decoration: none;

	&:hover {
		color: @mainColor_light;
		background-color: @mainColor_normal_light;
	}

	&.dark {
		color: #fff;
		background-color: @mainColor_dark;

		&:hover {
			background-color: @mainColor_dark_light;
		}
	}

	&.white {
		color: @mainColor_normal;
		background-color: @mainColor_light;

		&:hover {
			background-color: @mainColor_normal_extralight;
		}
	}

	&.disabled {
		cursor: not-allowed;
		color: fade(@mainColor_dark, 25%);
		&.dark {
			color: fade(#000, 25%);
			background-color: fade(@mainColor_dark_extralight, 50%);
		}
	}

	&>*:not(.browse) {
		pointer-events: none;
	}

	&.noTitle {
		margin: 0;
		padding: 7px;
		.icon {
			height: 100%;
			max-height: 26px;
			min-width: 26px;
			margin: 0;
			padding: 0;
		}

		&.big {
			padding: 19px;
			.icon {
				min-width: 40px;
				max-height: 40px;
			}
		}

	}

	&.checkbox {
		background: none;
		padding: 0px;
		border-radius: 0;
		margin: 0;
		display: inline-block;

		.checkboxInput {
			pointer-events: all;
			opacity: .001;
			position: absolute;
			padding: 0;
			margin: 0;
			width: 100%;
			height: 100%;
			left: 0;
			top: 0;
			z-index: 1000;
			cursor: pointer;
		}
	}

	.checkboxContent {
		cursor: pointer;
		display: flex;
		flex-direction: row;
		width: 100%;
		height: 100%;
		align-items: center;

		.checkmark {
			border: 1px solid @mainColor_normal;
			border-radius: 4px;
			padding: 0;
			width: 15px;
			height: 15px;
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: center;
			.img {
				width: 80%;
				margin: 0;
				padding: 0;
			}
		}

		.label {
			flex-grow: 1;
			margin-left: 7px;
			justify-self: flex-start;
			text-align: left;
			width: max-content;
			font-size: 18px;
			color: @mainColor_normal;
			// overflow: visible;
		}
		
		&:hover {
			background: none;
			.checkmark {
				background-color: fade(@mainColor_normal; 30%);
			}
		}
	}

	.icon {
		max-height: 20px;
		height: 20px;
		margin-right: 10px;
		vertical-align: text-top;
	}

	.spinner {
		.center;
		position: absolute;
		vertical-align: middle;
		height: 25px;
		width: 25px;
	}

	.label {
		// flex-grow: 1;
		white-space: nowrap;
		// overflow: hidden;
	}

	.label, .icon {
		opacity: 1;
		transition: opacity .2s;
		&.hide {
			opacity: .25;
		}
	}

	.browse {
		opacity: 0;
		position: absolute;
		z-index: 0;
		left: 0;
		width: 100%;
		height: 200%;//Hack to avoid browse button from locking cursor:pointer by putting it out of button's bounds
		cursor: pointer;
		font-size: 0px;
	}

	&.white {
		color: @mainColor_normal;
		background-color: #fff;
		.label, .icon {
			&.hide {
				opacity: .4;
			}
		}
		&:not(.loading):hover {
			background-color: @mainColor_normal_extralight;
		}
		&.loading {
			background-color: fade(#ffffff, 50%);
		}
		.checkboxContent {
			.checkmark {
				border-color: #fff;
			}
			.label {
				color: #fff;
			}
		}
	}

	&.big {
		padding: 20px;
		.label {
			font-size: 33px;
		}
		.icon {
			min-width: 30px;
			min-height: 30px;
		}
		&.checkbox {
			padding: 0;
			.checkboxContent {
				.checkmark {
					border-radius: 13px;
					width: 40px;
					height: 40px;
				}
			}
		}
	}

	&.small {
		padding: 4px;
		border-radius: 5px;
		// background-color: @mainColor_light;
		// &:hover {
		// 	background-color: @mainColor_normal_extralight;
		// }
		.label {
			font-size: 16px;
		}
		.icon {
			min-width: 15px;
			min-height: 15px;
			// filter: invert();
		}
		&.checkbox {
			padding: 0;
			.checkboxContent {
				.checkmark {
					width: 18px;
					height: 18px;
				}
			}
		}
	}

	&.highlight {
		color: #ffffff;
		background-color: @mainColor_alert;
		&.disabled {
			background-color: fade(@mainColor_alert,50%);
		}
		.label, .icon {
			&.hide {
				opacity: .4;
			}
		}
		&:not(.loading):hover {
			background-color: @mainColor_alert_light;
		}
		&.loading {
			background-color: fade(@mainColor_alert, 50%);
		}
		&.selected {
			background-color: @mainColor_alert_extralight;
		}
	}

	&.selected:not(.highlight) {
		background-color: @mainColor_warn;
		color: #fff;
		&.disabled {
			background-color: fade(@mainColor_warn,50%);
		}
		&:hover {
			background-color: @mainColor_warn_light;
		}
	}
	
	&.disabled {
		color: fade(@mainColor_light, 30%);
		background-color: fade(@mainColor_normal, 30%);
		&:hover {
			background-color: fade(@mainColor_normal, 30%);
		}
		.icon {
			opacity: .4;
		}
	}
}

@media only screen and (max-width: 500px) {
	.button {
		&.noTitle.big, &.big {
			padding: 12px;
			.label {
				font-size: 25px;
			}
			.icon {
				min-width: 25px;
				min-height: 25px;
			}
		}
		&:not(.big) {
			.label {
				font-size: 15px;
			}
			.icon {
				max-height: 18px;
			}
		}
	}
}
</style>