<template>
	<div :class="classes" @click.stop="toggle()">
		<div class="circle"></div>
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits: ['update:modelValue', 'change'],
})
export default class ToggleButton extends Vue {

	@Prop({type:Boolean, default: false})
	public big!:boolean;

	@Prop({type:Boolean, default: false})
	public small!:boolean;

	@Prop({type:Boolean, default: false})
	public primary!:boolean;

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({type:Boolean, default: false})
	public modelValue!:boolean;

	@Prop({type:Boolean, default: false})
	public noOpacity!:boolean;

	public localValue:boolean = false;

	public get classes():string[] {
		let res = ["togglebutton"];
		if(this.big !== false) res.push("big");
		if(this.small !== false) res.push("small");
		if(this.primary !== false) res.push("primary");
		if(this.secondary !== false) res.push("secondary");
		if(this.alert !== false) res.push("alert");
		if(this.noOpacity !== false) res.push("noOpacity");
		if(this.localValue) res.push("selected");
		return res;
	}

	public beforeMount():void {
		this.localValue = this.modelValue;
		watch(()=>this.modelValue, ()=>{
			this.localValue = this.modelValue;
		})
	}

	public toggle():void {
		this.localValue = !this.localValue;
		this.$emit('update:modelValue', this.localValue);
		this.$emit('change');
	}

}
</script>

<style scoped lang="less">
.togglebutton{
	@size: 1em;
	width: @size * 2;
	min-width: @size * 2;
	height: @size;
	border-radius: @size;
	border: 1px solid var(--color-light);
	position: relative;
	cursor: pointer;
	transition: all .2s;

	&:not(.noOpacity) {
		opacity: .5;
	}

	&:hover {
		border-color: var(--color-light);
		background-color: var(--color-dark-light);
	}

	.circle {
		transition: all .2s;
		position: absolute;
		top: 1px;
		left: 1px;
		background-color: var(--color-light);
		width: calc(@size - 4px);
		height: calc(@size - 4px);
		border-radius: 50%;
	}

	&:hover {
		border-color: var(--color-light);
		background-color: var(--color-light-fade);
	}

	
	&.big {
		font-size: 1.2em;
	}
	
	&.small {
		font-size: .8em;
	}

	&.primary {
		border-color: var(--color-primary);
		&:hover {
			border-color: var(--color-primary);
			background-color: var(--color-primary-fade);
		}
		.circle {
			background-color: var(--color-primary);
		}
	}

	&.secondary {
		border-color: var(--color-secondary);
		&:hover {
			border-color: var(--color-secondary);
			background-color: var(--color-secondary-fade);
		}
		.circle {
			background-color: var(--color-secondary);
		}
	}

	&.alert {
		border-color: var(--color-alert);
		&:hover {
			border-color: var(--color-alert);
			background-color: var(--color-alert-fade);
		}
		.circle {
			background-color: var(--color-alert);
		}
	}

	&.selected {
		opacity: 1;
		.circle {
			left: calc(@size * 2 - @size + 1px);
		}
	}
}
</style>