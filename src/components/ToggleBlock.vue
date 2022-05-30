<template>
	<div :class="classes">
		<div class="header" @click="toggle()">
			<Button small
				:icon="require('@/assets/icons/orderable_white.svg')"
				class="orderBt"
				warn
				v-if="orderable!==false"
				@mousedown="$emit('startDrag', $event)"
				data-tooltip="Reorder"
			/>
			<img v-for="icon in localIcons" :src="require('@/assets/icons/'+icon+'.svg')" :key="icon" :alt="icon" class="icon">
			<h2 v-html="localTitle"></h2>
			<slot name="actions"></slot>
		</div>
		<div class="content" v-if="showContent" ref="content">
			<slot></slot>
		</div>
	</div>
</template>

<script lang="ts">
import { watch } from '@vue/runtime-core';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from './Button.vue';

@Options({
	props:{
		title:String,
		icons:Array,
		open:{
			type:Boolean,
			default:true,
		},
		medium:{
			type:Boolean,
			default:false,
		},
		small:{
			type:Boolean,
			default:false,
		},
		orderable:{
			type:Boolean,
			default:false,
		},
		error:{
			type:Boolean,
			default:false,
		},
		errorTitle:{
			type:String,
			default:"",
		},
	},
	components:{
		Button,
	},
	emits:["startDrag"],
})
export default class ToggleBlock extends Vue {

	public icons!:string[];
	public title!:string;
	public open!:boolean;
	public error!:boolean;
	public small!:boolean;
	public medium!:boolean;
	public orderable!:boolean;
	public errorTitle!:string;

	public showContent:boolean = false;

	public get classes():string[] {
		let res = ["toggleblock"];
		if(!this.showContent)			res.push("closed");
		if(this.error !== false)		res.push("error");
		if(this.small !== false)		res.push("small");
		else if(this.medium !== false)	res.push("medium");
		return res;
	}

	public get localTitle():string {
		if(this.error && this.errorTitle) return this.errorTitle;
		return this.title;
	}

	public get localIcons():string[] {
		const icons = this.icons;
		if(this.error) icons.push("automod_white");
		return icons;
	}

	public beforeMount():void {
		this.showContent = this.open;
	}

	public mounted():void {
		watch(() => this.open, () => {
			this.toggle(this.open);
		})
	}

	public async toggle(forcedState?:boolean):Promise<void> {
		const params:gsap.TweenVars = {paddingTop:0, paddingBottom:0, height:0, duration:.25, ease:"sine.inOut", clearProps:"all"};
		let open = !this.showContent;
		if(forcedState !== undefined) {
			open = forcedState;
			if(open == this.showContent) return;//Already in the proper state, ignore
		}
		if(!open) {
			params.onComplete = ()=>{ this.showContent = false; }
			gsap.to(this.$refs.content as HTMLDivElement, params);
		}else {
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

	&.small {
		font-size: .8em;
		.header {
			background-color: fade(@mainColor_normal, 15%);
			border: none;
			padding: 0;
			border-radius: 0;
			&:hover {
				background-color: fade(@mainColor_normal, 15%);
			}
			h2 {
				text-align: left;
				&::before {
					content:"▼";
					margin-right: .25em;
				}
			}
		}
		&.closed {
			.header {
				background-color: transparent;
				h2::before {
					content:"►";
				}
			}
		}
		.content {
			background-color: fade(@mainColor_normal, 10%);
			padding: 0;
			padding: .5em;
			margin-left: 1.4em;
			border-radius: 0;
		}
	}

	&.medium {
		@radius: .5em;
		font-size: .9em;
		&.closed {
			.header {
				border-bottom-left-radius: @radius;
				border-bottom-right-radius: @radius;
			}
		}
		&.deletable {
			&>.header {
				padding: 0;
			}
		}
		&>.header {
			padding: 0;
			border-top-left-radius: @radius;
			border-top-right-radius: @radius;
			color: @mainColor_light;
			background-color: @mainColor_normal;
			border-bottom-color: @mainColor_light;
			overflow: hidden;
			&:hover {
				background-color: lighten(@mainColor_normal, 10%);
			}

			.icon {
				margin-left: .25em;
				height: 1em;
				width: 1em;
			}

			h2 {
				// transition: background-color .25s;
				// background-color: @mainColor_normal;
				padding: .25em;
				// &:hover {
				// 	background-color: lighten(@mainColor_normal, 10%);
				// }
			}

			.orderBt {
				border-radius: 0;
				padding: .3em;
				align-self: stretch;
				width: 2.5em;
			}
		}
		&>.content {
			padding: .5em;
			border-bottom-left-radius: @radius;
			border-bottom-right-radius: @radius;
			// background-color: #f2eef8;
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
		padding: .5em;
		cursor: pointer;
		background-color: white;
		display: flex;
		flex-direction: row;
		align-items: center;
		transition: background-color .25s;
		h2 {
			flex-grow: 1;
		}
		&:hover {
			background-color: darken(@mainColor_light, 3%);
		}
	}

	.content {
		overflow: hidden;
		padding: 1em;
		background-color: fade(@mainColor_normal, 10%);
		border-bottom-left-radius: 1em;
		border-bottom-right-radius: 1em;
		&>:deep(img) {
			margin: .5em auto;
			max-width: 100%;
		}
	}

	&.error{
		.header {
			border: 2px dashed @mainColor_alert;
		}
	}
}
</style>