<template>
	<div :class="classes" data-noselect>
		<Icon name="checkmark" class="checkmark" />
		<div class="circle">
			<Icon v-if="loading === true" name="loader" class="loading" />
		</div>
		<Icon name="cross" class="cross" />
		<input :id="inputId" type="checkbox" v-model="localValue" class="input" @change="onChange()" :disabled="disabled !== false">
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import Icon from "@/components/Icon.vue"

@Component({
	components:{
		Icon,
	},
	emits: ['update:modelValue', 'change'],
})
class ToggleButton extends Vue {

	@Prop({default:"", type:String})
	public inputId!:string;

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

	@Prop({type:Boolean, default: false})
	public loading!:boolean;

	@Prop({type:Boolean, default: false})
	public inverseState!:boolean;

	@Prop({type:Boolean, default: false})
	public disabled!:boolean;

	public localValue:boolean = false;

	public get classes():string[] {
		let res = ["togglebutton"];
		if(this.big !== false) res.push("big");
		if(this.small !== false) res.push("small");
		if(this.secondary !== false) res.push("secondary");
		if(this.alert !== false) res.push("alert");
		if(this.premium !== false) res.push("premium");
		if(this.noCheckmark !== false) res.push("noCheckmark");
		if(this.disabled !== false) res.push("disabled");
		if((this.inverseState === false && this.localValue) || (this.inverseState !== false && !this.localValue)) res.push("selected");
		return res;
	}

	public beforeMount():void {
		this.localValue = this.modelValue;
		watch(()=>this.modelValue, ()=>{
			this.localValue = this.modelValue;
		})
	}

	public onChange():void {
		if(this.disabled) return;
		this.$emit('update:modelValue', this.localValue);
		this.$emit('change', this.localValue);
	}

}
export default toNative(ToggleButton);
</script>

<style scoped lang="less">
.togglebutton{
	@size: 1.25em;
	width: @size * 2;
	min-width: @size * 2;
	height: @size;
	border-radius: @size;
	position: relative;
	transition: background-color .35s;
	background-color: var(--background-color-fader);
	.bevel();
	overflow: hidden;

	&:not(.disabled) {
		cursor: pointer;
		.input {
			cursor: pointer;
		}
	}

	.circle {
		transition: left .35s, background-color .35s;
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		left: 2px;
		background-color: var(--color-primary);
		background-color: var(--color-light);
		width: calc(@size - 4px);
		height: calc(@size - 4px);
		border-radius: 50%;
		color: var(--color-dark);
	}

	.checkmark {
		position: absolute;
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

	.cross {
		position: absolute;
		margin-right: .35em;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		height: .7em;
		width: fit-content;
		display: block;
		opacity: 1;
		transition: opacity .5s, right .5s;
	}

	.input {
		position: absolute;
		max-height: @size;
		top: 0;
		left: 0;
		margin: 0;
		width: 100%;
		height: 100%;
		opacity: 0.001;
		z-index: 1;
	}

	&:not(.disabled):hover {
		background-color: var(--background-color-fade);
	}

	&.noCheckmark {
		.checkmark, .cross {
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
		.cross {
			opacity: 0;
			right: -50%;
		}

		&:not(.disabled):hover {
			background-color: var(--color-primary-extralight);
		}

		&.secondary:not(.disabled):hover {
			background-color: var(--color-secondary-extralight);
		}

		&.alert:not(.disabled):hover {
			background-color: var(--color-alert-extralight);
		}

		&.premium:not(.disabled):hover {
			background-color: var(--color-premium-extralight);
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
