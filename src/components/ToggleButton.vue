<template>
	<div :class="classes" @click="toggle">
		<div class="circle"></div>
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		small:{type:Boolean, default: false},
		clear:{type:Boolean, default: false},
		modelValue:{type:Boolean, default: false},
	},
	components:{},
	emits: ['update:modelValue', 'change'],
})
export default class ToggleButton extends Vue {

	public small!:boolean;
	public clear!:boolean;
	public modelValue!:boolean;

	public get classes():string[] {
		let res = ["togglebutton"];
		if(this.small) res.push("small");
		if(this.clear) res.push("clear");
		if(this.modelValue) res.push("selected");
		return res;
	}

	public toggle():void {
		this.$emit('update:modelValue', !this.modelValue);
		this.$emit('change');
	}

}
</script>

<style scoped lang="less">
.togglebutton{
	@size: 1em;
	@width: 2em;
	width: @width;
	min-width: @width;
	height: @size;
	border-radius: 1em;
	border: 1px solid fade(@mainColor_normal, 50%);
	position: relative;
	cursor: pointer;
	transition: all .2s;

	&:hover {
		border-color: @mainColor_normal_light;
		background-color: @mainColor_normal_extralight;
	}

	&.small {
		@size: 15px;
		height: @size;
		width: 30px;
		min-width: 30px;
		.circle {
			width: calc(@size - 4px);
			height: calc(@size - 4px);
		}
	}

	&.clear {
		border-color: fade(@mainColor_light, 30%);
		&.selected {
			background-color: transparent;
			border-color: @mainColor_light;
			.circle {
				background-color: @mainColor_light;
			}
		}
		&:hover {
			border-color: @mainColor_light;
			background-color: fade(@mainColor_light, 30%);
		}
		.circle {
			background-color: fade(@mainColor_light, 30%);
		}
	}

	&.selected {
		background-color: @mainColor_normal;
		.circle {
			background-color: #ffffff;
			left: calc(@width - @size + 1px);
		}
	}

	.circle {
		transition: all .2s;
		position: absolute;
		top: 1px;
		left: 1px;
		background-color: fade(@mainColor_normal, 50%);
		width: calc(@size - 4px);
		height: calc(@size - 4px);
		border-radius: 50%;
	}
}
</style>