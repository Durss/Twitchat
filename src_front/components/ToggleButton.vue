<template>
	<div :class="classes" @click.stop="toggle()">
		<div class="circle"></div>
		<input type="checkbox" v-model="localValue" class="input">
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
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({type:Boolean, default: false})
	public modelValue!:boolean;

	public localValue:boolean = false;

	public get classes():string[] {
		let res = ["togglebutton"];
		if(this.big !== false) res.push("big");
		if(this.small !== false) res.push("small");
		if(this.secondary !== false) res.push("secondary");
		if(this.alert !== false) res.push("alert");
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
	@size: 1.25em;
	width: @size * 2;
	min-width: @size * 2;
	height: @size;
	border-radius: @size;
	position: relative;
	cursor: pointer;
	background-color: var(--background-color-fader);
	.bevel();

	.circle {
		transition: left .2s;
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		left: 2px;
		background-color: var(--color-primary);
		width: calc(@size - 4px);
		height: calc(@size - 4px);
		border-radius: 50%;
	}

	.input {
		position: absolute;
		max-height: @size;
		top: 0;
		left: 0;
		opacity: 0.001;
		z-index: -1;
		cursor: pointer;
	}

	&:hover {
		background-color: var(--background-color-fader);
	}

	&.selected {
		opacity: 1;
		background: var(--color-primary-light);
		.circle {
			left: calc(@size * 2 - @size + 1px);
			background-color: var(--color-button);
		}

		&:hover {
			background-color: var(--color-primary-extralight);
		}
	}

	
	&.big {
		font-size: 1.2em;
	}
	
	&.small {
		font-size: .8em;
	}


	&.secondary {
		.circle {
			background-color: var(--color-secondary);
		}
		&.selected {
			background: var(--color-secondary);
			.circle {
				background-color: var(--color-button);
			}
		}
	}

	&.alert {
		.circle {
			background-color: var(--color-alert);
		}
		&.selected {
			background: var(--color-alert);
			.circle {
				background-color: var(--color-button);
			}
		}
	}

	@media (prefers-color-scheme: light) {
		background: var(--color-light-fader);
		&:hover {
			background: var(--color-light-fade);
		}
		&.selected:hover {
			background-color: var(--color-primary-extralight);
			&.secondary {
				background: var(--color-secondary-light);
			}
			&.alert {
				background: var(--color-alert-light);
			}
		}
	}
}
</style>