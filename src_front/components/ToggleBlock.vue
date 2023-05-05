<template>
	<div :class="classes">
		<div class="header" @click.stop="toggle()">
			<slot name="left_actions"></slot>
			
			<img v-for="icon in localIcons" :src="$image('icons/'+icon+'.svg')" :key="icon" :alt="icon" class="icon">
			
			<div class="title" v-if="title || subtitle">
				<h2 v-if="title">{{ title }}</h2>
				<h3 v-if="subtitle">{{ subtitle }}</h3>
			</div>

			<slot name="right_actions"></slot>
		</div>
		<div class="content" v-if="opened" ref="content">
			<slot></slot>
		</div>
	</div>
</template>

<script lang="ts">
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Button from './Button.vue';

/**
 * To add actions on the right or left of the header
 * use the template tag like this :
 * 	<ToggleBlock>
 * 		<template #right_actions>...</template>
 * 		<template #left_actions>...</template>
 * 	</ToggleBlock>
 */

@Component({
	name:"ToggelBlock",
	components:{
		Button,
	},
	emits:["startDrag"],
})
export default class ToggleBlock extends Vue {

	@Prop({type:Array, default:[]})
	public icons!:string[];
	
	@Prop
	public title!:string;

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

	public opened = false;

	public get classes():string[] {
		let res = ["toggleblock"];
		if(!this.opened)				res.push("closed");
		if(this.error !== false)		res.push("error");
		if(this.primary !== false)		res.push("primary");
		if(this.secondary !== false)	res.push("secondary");
		if(this.alert !== false)		res.push("alert");
		if(this.small !== false)		res.push("small");
		else if(this.medium !== false)	res.push("medium");
		return res;
	}

	public get localIcons():string[] {
		const icons = this.icons.concat();
		if(this.error) icons.push("automod");
		return icons;
	}

	public beforeMount():void {
		this.opened = this.open;
	}

	public mounted():void {
		watch(() => this.open, () => {
			this.toggle(this.open);
		})
	}

	public async toggle(forcedState?:boolean):Promise<void> {
		const params:gsap.TweenVars = {paddingTop:0, paddingBottom:0, height:0, duration:.25, ease:"sine.inOut", clearProps:"all"};
		let open = !this.opened;
		if(forcedState !== undefined) {
			open = forcedState;
			if(open == this.opened) return;//Already in the proper state, ignore
		}
		gsap.killTweensOf(this.$refs.content as HTMLDivElement);
		if(!open) {
			params.onComplete = ()=>{ this.opened = false; }
			gsap.to(this.$refs.content as HTMLDivElement, params);
		}else {
			this.opened = true;
			await this.$nextTick();
			gsap.from(this.$refs.content as HTMLDivElement, params);
		}
	}

}
</script>

<style scoped lang="less">
.toggleblock{
	align-self: flex-start;
	border-radius: var(--border-radius);
	background-color: rgba(125, 125, 125, .2);

	.header {
		text-align: center;
		padding: .5em;
		overflow: hidden;
		cursor: pointer;
		background-color: var(--color-dark-extralight);
		border-top-left-radius: var(--border-radius);
		border-top-right-radius: var(--border-radius);
		border-bottom: 2px solid var(--color-dark-fader);
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		transition: background-color .25s;
		.title {
			font-size: 1.2em;
			flex-grow: 1;
			color: var(--color-light);
			display: flex;
			flex-direction: column;
			gap: 0;
			h3 {
				font-size: .8em;
				font-weight: normal;
				font-style: italic;
			}
		}
		&:hover {
			background-color: var(--color-primary-light);
		}

		:deep(.icon) {
			height: 1em;
			width: 1em;
			object-fit: fill;
			display: block;
			margin:auto;
		}
	}

	.content {
		// .bevel();
		overflow: hidden;
		// margin: 0 .5em .5em .5em;
		padding: .5em;
		color: var(--color-light);
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
		background-color: var(--color-alert-dark);
		.header {
			background-color: var(--color-alert);
			&:hover {
				background-color: var(--color-alert-light);
			}
		}
	}

	&.primary{
		background-color: var(--color-primary-dark);
		.header {
			background-color: var(--color-primary);
			&:hover {
				background-color: var(--color-primary-light);
			}
		}
	}

	&.secondary{
		background-color: var(--color-secondary-dark);
		.header {
			background-color: var(--color-secondary);
			&:hover {
				background-color: var(--color-secondary-light);
			}
		}
	}

	&.medium {
		.header {
			font-size: .8em;
		}
	}


	&.small {
		background-color: var(--color-dark-fadest);
		.header {
			padding: 0;
			background-color: transparent;
			border-bottom-left-radius: var(--border-radius);
			border-bottom: none;
			&:hover {
				background-color: var(--color-dark-fadest);
			}
			.title {
				gap: .25em;
				text-align: left;
				align-items: center;
				flex-direction: row;
				line-height: 1.25em;
				color: var(--color-secondary);
				text-shadow: 1px 1px 0px rgba(0, 0, 0, 1);
				font-size: .8em;
				&::before {
					content:"►";
					margin-left: .3em;
					transform: rotate(90deg);
					transition: transform .25s;
				}
			}
		}

		&.closed {
			background-color: transparent;
			.header {
				border-radius: var(--border-radius);
				.title::before {
					transform: rotate(0);
				}
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

}
</style>