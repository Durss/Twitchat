<template>
	<div :class="classes" @click="toggle">
		<div class="circle"></div>
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		modelValue:{type:Boolean, default: false},
	},
	components:{},
	emits: ['update:modelValue'],
})
export default class ToggleButton extends Vue {
	public modelValue!:boolean;

	public get classes():string[] {
		let res = ["togglebutton"];
		if(this.modelValue) res.push("selected");
		return res;
	}

	public toggle():void {
		this.$emit('update:modelValue', !this.modelValue);
	}

}
</script>

<style scoped lang="less">
.togglebutton{
	@size: 25px;
	width: 40px;
	min-width: 40px;
	height: @size;
	border-radius: 30px;
	border: 1px solid fade(@mainColor_normal, 50%);
	position: relative;
	cursor: pointer;
	transition: all .2s;

	&:hover {
		border-color: @mainColor_normal_light;
		background-color: @mainColor_normal_extralight;
	}

	&.selected {
		background-color: @mainColor_normal;
		.circle {
			background-color: #ffffff;
			left: 16px;
		}
	}

	.circle {
		transition: all .2s;
		position: absolute;
		top: 1px;
		left: 1px;
		background-color: fade(@mainColor_normal, 50%);
		width: @size - 4px;
		height: @size - 4px;
		border-radius: 50%;
	}
}
</style>