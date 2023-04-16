<template>
	<div :class="classes" @click.stop="toggle">
		<span :class="modelValue === true? 'label' : 'label selected'" @click.capture.stop="setState(false)">{{ label1 }}</span>

		<div class="toggle">
			<div class="circle"></div>
		</div>

		<span :class="modelValue === true? 'label selected' : 'label'" @click.capture.stop="setState(true)">{{ label2 }}</span>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits: ['update:modelValue', 'change'],
})
export default class SwitchButton extends Vue {
	@Prop
	public label1!:string;
	
	@Prop
	public label2!:string;
	
	@Prop({type:Boolean, default: false})
	public small!:boolean;
	
	@Prop({type:Boolean, default: false})
	public clear!:boolean;
	
	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({type:Boolean, default: false})
	public modelValue!:boolean;

	public get classes():string[] {
		let res = ["switchbutton"];
		if(this.small !== false) res.push("small");
		if(this.clear !== false) res.push("clear");
		if(this.alert !== false) res.push("alert");
		if(this.modelValue) res.push("selected");
		return res;
	}

	public setState(state:boolean):void {
		this.$emit('update:modelValue', state);
		this.$emit('change');
	}

	public toggle():void {
		this.$emit('update:modelValue', !this.modelValue);
		this.$emit('change');
	}

}
</script>

<style scoped lang="less">
.switchbutton{
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: .5em;
	@size: 1em;
	@sizeSmall: .75em;
	
	.label {
		opacity: .5;
		font-size: 1em;
		cursor: pointer;
		transition: all .25s;
		&.selected {
			opacity: 1;
		}
	}
	
	.toggle {
		width: @size * 2;
		min-width: @size * 2;
		height: @size;
		border-radius: 1em;
		border: 1px solid var(--mainColor_normal);
		position: relative;
		cursor: pointer;
		transition: all .2s;
	
		&:hover {
			border-color: var(--mainColor_normal_light);
			background-color: var(--mainColor_normal_extralight);
		}
	
		.circle {
			transition: all .2s;
			position: absolute;
			top: 1px;
			left: 1px;
			background-color: var(--mainColor_normal);
			width: calc(@size - 4px);
			height: calc(@size - 4px);
			border-radius: 50%;
		}
	}

	
	&.small {
		.label {
			font-size: .8em;
		}
		.toggle {
			height: @sizeSmall;
			width: @sizeSmall * 2;
			min-width: @sizeSmall * 2;
			.circle {
				width: calc(@sizeSmall - 4px);
				height: calc(@sizeSmall - 4px);
			}
		}
	}

	&.clear {
		@c: @mainColor_light;
		color: @c;
		.toggle {
			border-color: @c;
			&:hover {
				border-color: @c;
				background-color: fade(@c, 30%);
			}
			.circle {
				background-color: @c;
			}
		}
	}

	&.alert {
		@c: @mainColor_alert;
		color: @c;
		.toggle {
			border-color: @c;
			&:hover {
				border-color: @c;
				background-color: fade(@c, 30%);
			}
			.circle {
				background-color: @c;
			}
		}
	}

	&.selected {
		.toggle {
			.circle {
				left: calc(@size * 2 - @size + 1px);
			}
			&.small {
				.circle {
					left: calc(@sizeSmall * 2 - @sizeSmall + 1px);
				}
			}
		}
	}
	
}
</style>