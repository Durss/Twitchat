<template>
	<div :class="classes" :style="contentStyles">
		<div class="header" @click.stop="toggle()">
			<div class="customBg" v-if="customColor" :style="bgStyles"></div>
			<slot name="left_actions"></slot>
			
			<Icon v-for="icon in localIcons" :key="icon" :alt="icon"
				class="icon"
				:name="icon"
				:theme="(error !== false || alert !== false || primary !== false || secondary !== false || premium !== false) && small === false? 'light': small === true? 'secondary' : ''"
				/>
			
							
			<div class="editableTitle" v-if="editableTitle !== false">
				<div class="title">
					<span class="default" v-if="!localTitle && titleDefault">{{ titleDefault }}</span>
					<contenteditable class="label" tag="h2"
						:contenteditable="true"
						v-model="localTitle"
						:no-nl="true"
						:no-html="true"
						@click.stop
						@input="limitLabelSize()" />
				</div>
				<Icon name="edit" />
			</div>

			<div class="title" v-else-if="title || titleDefault || subtitle">
				<h2 v-if="title">{{ title }}</h2>
				<h2 v-else-if="titleDefault">{{ titleDefault }}</h2>
				<h3 v-if="subtitle">{{ subtitle }}</h3>
			</div>

			<slot name="title"></slot>

			<div class="rightSlot">
				<slot name="right_actions"></slot>
	
				<button class="arrowBt" v-if="noArrow === false"><Icon name="arrowRight" /></button>
			</div>
		</div>
		<div class="content" v-if="localOpen" ref="content">
			<slot></slot>
			<slot name="content"></slot>
		</div>
	</div>
</template>

<script lang="ts">
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { StyleValue } from 'vue';
import contenteditable from 'vue-contenteditable';
import { Component, Prop, Vue } from 'vue-facing-decorator';

/**
 * To add actions on the right or left of the header
 * use the template tag like this :
 * 	<ToggleBlock>
 * 		<template #right_actions>...</template>
 * 		<template #left_actions>...</template>
 * 	</ToggleBlock>
 */

@Component({
	name:"ToggleBlock",
	components:{
		contenteditable,
	},
	emits:["startDrag", "update:title", "update:open"],
})
export default class ToggleBlock extends Vue {

	@Prop({type:Array, default:[]})
	public icons!:string[];
	
	@Prop()
	public title!:string;
	
	@Prop()
	public titleDefault!:string;

	@Prop({type:String, default:""})
	public subtitle!:string;

	@Prop({type:Boolean, default:true})
	public open!:boolean;

	@Prop({type:Boolean, default:false})
	public error!:boolean;

	@Prop({type:Boolean, default:false})
	public small!:boolean;

	@Prop({type:Boolean, default:false})
	public medium!:boolean;

	@Prop({type:Boolean, default: false})
	public primary!:boolean;

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({type:Boolean, default: false})
	public premium!:boolean;

	@Prop({type:Boolean, default: false})
	public disabled!:boolean;

	@Prop({type:Boolean, default: false})
	public noBackground!:boolean;

	@Prop({type:Boolean, default: false})
	public noArrow!:boolean;

	@Prop({type:Boolean, default: false})
	public editableTitle!:boolean;

	@Prop({type:String, default: ""})
	public customColor!:string;

	public closing = false;
	public localOpen = false;
	public localTitle = "";

	public get classes():string[] {
		let res = ["toggleblock"];
		if(!this.localOpen || this.closing)res.push("closed");
		if(this.error !== false)		res.push("error");
		if(this.primary !== false)		res.push("primary");
		if(this.secondary !== false)	res.push("secondary");
		if(this.alert !== false)		res.push("alert");
		if(this.premium !== false)		res.push("premium");
		if(this.noBackground !== false)	res.push("noBackground");
		if(this.small !== false)		res.push("small");
		else if(this.medium !== false)	res.push("medium");
		return res;
	}

	public get bgStyles():StyleValue {
		const res:StyleValue = {};
		if(this.customColor) {
			res.backgroundColor = this.customColor;
		}
		return res;
	}

	public get contentStyles():StyleValue {
		const res:StyleValue = {};
		if(this.customColor) {
			// const hsl = Utils.rgb2hsl(parseInt(this.customColor.replace("#", ""), 16));
			// const maxL = .4;
			// if(hsl.l > maxL) {
			// 	res.color = "#000000";
			// }else{
			// 	res.color = "#ffffff";
			// }
			res.backgroundColor = this.customColor+"20";
		}
		return res;
	}

	public get localIcons():string[] {
		const icons = this.icons.concat();
		if(this.error) icons.push("automod");
		return icons;
	}

	public beforeMount():void {
		this.localOpen = this.open;
		this.localTitle = this.title;

		watch(()=>this.localTitle, ()=>{
			this.$emit("update:title", this.localTitle);
		})

		watch(()=>this.localOpen, ()=>{
			this.$emit("update:open", this.localOpen);
		})
	}

	public mounted():void {
		watch(() => this.open, () => {
			this.toggle(this.open);
		})
	}

	public async toggle(forcedState?:boolean):Promise<void> {
		if(this.disabled !== false && (forcedState == true || !this.localOpen)) return;

		const params:gsap.TweenVars = {paddingTop:0, paddingBottom:0, height:0, duration:.25, ease:"sine.inOut", clearProps:"all"};
		let open = !this.localOpen;
		this.closing = !open;
		if(forcedState !== undefined) {
			open = forcedState;
			if(open == this.localOpen) return;//Already in the proper state, ignore
		}
		gsap.killTweensOf(this.$refs.content as HTMLDivElement);
		if(!open) {
			params.onComplete = ()=>{ this.localOpen = this.closing = false; };
			gsap.to(this.$refs.content as HTMLDivElement, params);
		}else {
			this.localOpen = true;
			await this.$nextTick();
			gsap.from(this.$refs.content as HTMLDivElement, params);
		}
	}

	/**
	 * Limit the size of the label.
	 * Can't use maxLength because it's a content-editable tag.
	 * @param item 
	 */
	public async limitLabelSize():Promise<void> {
		const sel = window.getSelection();
		if(sel && sel.rangeCount > 0) {
			//Save caret index
			var range = sel.getRangeAt(0);
			let caretIndex = range.startOffset;
			await this.$nextTick();
			//Limit label's size
			this.localTitle = this.localTitle.substring(0, 100);
			await this.$nextTick();
			//Reset caret to previous position
			if(range.startContainer.firstChild) range.setStart(range.startContainer.firstChild, Math.min(this.localTitle.length, caretIndex-1));
		}else{
			this.localTitle = this.localTitle.substring(0, 100);
		}
	}

}
</script>

<style scoped lang="less">
.toggleblock{
	border-radius: var(--border-radius);
	background-color: var(--background-color-fadest);
	
	//Set emote sizes only for top-level icons
	&:deep(.header) {
		&>.icon, &>.rightSlot>.icon {
			height: 1em;
			width: 1.5em;
			object-fit: fill;
			display: block;
			margin:auto;
			flex-shrink: 0;
		}
	}

	.header {
		text-align: center;
		padding: .25em .5em;
		overflow: hidden;
		cursor: pointer;
		background-color: var(--toggle-block-header-background);
		border-top-left-radius: var(--border-radius);
		border-top-right-radius: var(--border-radius);
		border-bottom: 2px solid var(--color-dark-fader);
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		transition: background-color .25s;
		color: var(--color-text);
		position: relative;
		.title {
			font-size: 1.2em;
			flex-grow: 1;
			display: flex;
			flex-direction: column;
			gap: 0;
			h2 {
				word-break: break-all;
			}
			h3 {
				font-size: .8em;
				font-weight: normal;
				font-style: italic;
			}
		}
		&:hover {
			background-color: var(--toggle-block-header-background-hover);
		}

		.customBg {
			position: absolute;
			width: 100%;
			height: 100%;
			top: 0;
			left: 0;
			opacity: .3;
			z-index: 0;
		}
		*:not(.customBg) {
			z-index: 1;
		}

		.editableTitle {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			flex-grow: 1;
			.icon {
				height: 1em;
				vertical-align: middle;
			}
			.title {
				position: relative;
				justify-self: center;
				flex-grow: unset;
				.label, .default {
					cursor: text;
					min-width: 2em;
					width: fit-content;
					font-weight: bold;
					// flex-grow: 1;
					padding: .25em .5em;
					border-radius: var(--border-radius);

					&.label {
						&:hover, &:active, &:focus {
							.bevel();
							background-color: var(--color-text-inverse-fader);
							// border: 1px double var(--color-light);
							// border-style: groove;
						}
					}
				}
				.label {
					position: relative;
					z-index: 1;
					min-width: 100px;
					padding-right: 2em;
					word-break: break-word;
					line-height: 1.2em;
				}
				.default {
					position: absolute;
					text-wrap: nowrap;
					opacity: .8;
					font-style: italic;
					top:0;
					left:50%;
					transform: translateX(-50%);
					padding-right: 2em;
				}
			}
			&>.icon {
				margin-left: -1.5em;
				flex-shrink: 0;
			}
		}

		.rightSlot {
			display: flex;
			flex-direction: row;
			align-self: stretch;
			.arrowBt {
				color: inherit;
				transition: transform .25s;
				transform: rotate(90deg);
				flex-grow: 0;
				flex-shrink: 1;
				height: 1em;
				width: 1em;
				align-self: center;
				margin-left: .5em;
				.icon {
					display: inline-block;
					height: 1em;
				}
			}
		}

	}
	&.closed {
		.header {
			.arrowBt {
				transform: rotate(0deg);
			}
		}
	}

	.content {
		// .bevel();
		overflow: hidden;
		// margin: 0 .5em .5em .5em;
		padding: .5em;
		color: var(--color-text);
		// background-color: var(--color-dark-fadest);
	}

	&.closed {
		.header {
			border-bottom: none;
			border-bottom-left-radius: var(--border-radius);
			border-bottom-right-radius: var(--border-radius);
		}
	}

	&:not(.small) {
		.emboss();
		border-radius: var(--border-radius);
	}

	&.error, &.alert{
		background-color: var(--color-alert-fadest);
		.header {
			color: var(--color-light);
			background-color: var(--color-alert);
			&:hover {
				background-color: var(--color-alert-light);
			}
		}
	}

	&.premium{
		background-color: var(--color-premium-fadest);
		.header {
			color: var(--color-light);
			background-color: var(--color-premium);
			&:hover {
				background-color: var(--color-premium-light);
			}
		}
	}

	&.primary{
		background-color: var(--color-primary-fadest);
		.header {
			color: var(--color-light);
			background-color: var(--color-primary);
			&:hover {
				background-color: var(--color-primary-light);
			}
		}
	}

	&.secondary{
		background-color: var(--color-secondary-fadest);
		.header {
			color: var(--color-light);
			background-color: var(--color-secondary);
			&:hover {
				background-color: var(--color-secondary-light);
			}
		}
	}

	&.medium {
		&>.header {
			font-size: .8em;
		}
	}


	&.small {
		.header {
			padding: 0;
			background-color: transparent;
			border-bottom-left-radius: var(--border-radius);
			border-bottom: none;
			color: var(--color-secondary);
			font-size: .7em;
			&:hover {
				background-color: var(--color-dark-fadest);
			}
			.title {
				gap: .25em;
				text-align: left;
				align-items: center;
				flex-direction: row;
				line-height: 1.25em;
				text-shadow: var(--text-shadow-contrast);
			}
		}

		&.closed {
			background-color: transparent;
			.header {
				border-radius: var(--border-radius);
				&:hover {
					background-color: var(--color-dark-fadest);
				}
			}
		}

		.content {
			padding: .5em;
			// margin-left: 1.4em;
		}
	}

	&.noBackground {
		background-color: transparent;
	}
}
</style>