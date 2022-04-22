<template>
	<div :class="classes">
		<div class="header" @click="toggle()">
			<img :src="require('@/assets/icons/'+icon+'.svg')" :alt="icon" class="icon" v-if="icon">
			<h2 v-html="title"></h2>
			<Button small highlight
				:icon="require('@/assets/icons/cross_white.svg')"
				class="deleteBt"
				v-if="deletable!==false"
				@click="$emit('delete')"
			/>
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
		icon:String,
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
		deletable:{
			type:Boolean,
			default:false,
		},
	},
	components:{
		Button,
	},
	emits:["delete"],
})
export default class ToggleBlock extends Vue {

	public icon!:string
	public title!:string
	public open!:boolean;
	public small!:boolean;
	public medium!:boolean;
	public deletable!:boolean;

	public showContent:boolean = false;

	public get classes():string[] {
		let res = ["toggleblock"];
		if(!this.showContent) res.push("closed");
		if(this.deletable != false && this.deletable != undefined) res.push("deletable");
		if(this.small != false && this.small != undefined) res.push("small");
		else if(this.medium != false && this.medium != undefined) res.push("medium");
		return res;
	}

	public mounted():void {
		this.showContent = this.open;
		
		watch(() => this.open, () => {
			this.toggle(this.open);
		})
	}

	public async toggle(forcedState:boolean):Promise<void> {
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
			background-color: fade(@mainColor_normal, 10%);
			border: none;
			padding: 0;
			border-radius: 0;
			&:hover {
				background-color: fade(@mainColor_normal, 10%);
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
			background-color: transparent;
			border-bottom-color: @mainColor_light;
			overflow: hidden;
			&:hover {
				background-color: transparent;
			}

			h2 {
				transition: background-color .25s;
				background-color: @mainColor_normal;
				padding: .25em;
				&:hover {
					background-color: lighten(@mainColor_normal, 10%);
				}
			}

			.deleteBt {
				border-radius: 0;
				padding: .3em;
				align-self: stretch;
			}
		}
		&>.content {
			padding: .5em;
			border-bottom-left-radius: @radius;
			border-bottom-right-radius: @radius;
			background-color: #f2eef8;
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

		.deleteBt {
			border-radius: 50%;
			padding: .3em;
		}
	}

	.content {
		overflow: hidden;
		padding: 1em;
		background-color: fade(@mainColor_normal, 10%);
		border-bottom-left-radius: 1em;
		border-bottom-right-radius: 1em;
		&>:deep(img) {
			margin: .5em 0;
			max-width: 100%;
		}
	}
}
</style>