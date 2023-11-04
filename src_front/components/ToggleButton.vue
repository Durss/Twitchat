<template>
	<div :class="classes" @click.stop="toggle()">
		<Icon name="checkmark" class="checkmark" />
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
	public premium!:boolean;

	@Prop({type:Boolean, default: false})
	public modelValue!:boolean;

	@Prop({type:Boolean, default: false})
	public noCheckmark!:boolean;

	public localValue:boolean = false;

	public get classes():string[] {
		let res = ["togglebutton"];
		if(this.big !== false) res.push("big");
		if(this.small !== false) res.push("small");
		if(this.secondary !== false) res.push("secondary");
		if(this.alert !== false) res.push("alert");
		if(this.premium !== false) res.push("premium");
		if(this.noCheckmark !== false) res.push("noCheckmark");
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
	transition: background-color .35s;
	background-color: var(--background-color-fader);
	.bevel();
	overflow: hidden;

	.circle {
		transition: left .35s, background-color .35s;
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		left: 2px;
		background-color: var(--color-primary);
		width: calc(@size - 4px);
		height: calc(@size - 4px);
		border-radius: 50%;
	}

	.checkmark {
		position: relative;
		margin-left: .35em;
		left: -50%;
		top: 50%;
		transform: translateY(-50%);
		height: .7em;
		width: fit-content;
		display: block;
		opacity: 0;
		transition: opacity .5s, left .5s;
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

	&.noCheckmark {
		.checkmark {
			display: none;
		}
	}

	&.selected {
		opacity: 1;
		background: var(--color-primary-light);
		.circle {
			left: calc(@size * 2 - @size + 1px);
			background-color: var(--color-light);
		}
		.checkmark {
			opacity: 1;
			left: 0;
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
				background-color: var(--color-light);
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
				background-color: var(--color-light);
			}
		}
	}

	&.premium {
		.circle {
			background-color: var(--color-premium);
		}
		&.selected {
			background: var(--color-premium);
			.circle {
				background-color: var(--color-light);
			}
		}
	}
}
</style>