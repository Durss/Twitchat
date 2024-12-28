<template>
	<div :class="classes">
		<span class="label" @click.capture.stop="setState(values[0])"><Icon v-if="icons[0]" :name='icons[0]' />{{ labels[0] }}</span>

		<div class="toggleHolder">
			<div class="dash"></div>
			<ToggleButton class="toggle" v-model="selected"
			noCheckmark
			:big="big"
			:small="small"
			:secondary="secondary"
			:alert="alert" @change="setState(selected? values[1] : values[0])" />
			<div class="dash"></div>
		</div>

		<span class="label" @click.capture.stop="setState(values[1])">{{ labels[1] }}<Icon v-if="icons[1]" :name='icons[1]' /></span>
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import Icon from './Icon.vue';
import ToggleButton from './ToggleButton.vue';

@Component({
	components:{
		Icon,
		ToggleButton,
	},
	emits: ['update:modelValue', 'change'],
})
class SwitchButton extends Vue {
	@Prop({type:Array, default:["",""]})
	public labels!:string[];

	@Prop({type:Array, default:["",""]})
	public icons!:string[];

	@Prop({type:Array, default: [true, false]})
	public values!:unknown[];

	@Prop({type:Boolean, default: false})
	public big!:boolean;

	@Prop({type:Boolean, default: false})
	public small!:boolean;

	@Prop({type:Boolean, default: false})
	public secondary!:boolean;

	@Prop({type:Boolean, default: false})
	public alert!:boolean;

	@Prop({default: false})
	public modelValue!:unknown;

	public localValue:unknown = false;
	public selected:boolean = false;

	public get classes():string[] {
		let res = ["switchbutton"];
		if(this.big !== false) res.push("big");
		if(this.small !== false) res.push("small");
		if(this.secondary !== false) res.push("secondary");
		if(this.alert !== false) res.push("alert");
		if(this.localValue == this.values[1]) res.push("selected");
		return res;
	}

	public beforeMount():void {
		if(this.modelValue != this.values[0] && this.modelValue !== this.values[1]) {
			this.setState(this.values[0])
		}else{
			this.localValue = this.modelValue;
			this.selected = this.localValue === this.values[1];
		}
		watch(()=>this.modelValue, ()=>{
			this.localValue = this.modelValue;
			this.selected = this.localValue === this.values[1];
		});
	}

	public setState(value:unknown):void {
		this.$emit("update:modelValue", value);
		this.$emit('change');
	}

}
export default toNative(SwitchButton);
</script>

<style scoped lang="less">
.switchbutton{
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	color: var(--color-text);
	gap: .5em;

	.toggleHolder {
		display: flex;
		flex-direction: row;
		align-items: center;
		.dash {
			.bevel();
			display: block;
			width: .5em;
			height: .2em;
			border-radius: 1em;
			background: var(--color-dark);
			&:first-of-type {
				background: var(--color-primary);
			}
		}
		.toggle {
			background-color: var(--color-primary-fadest) !important;
			&:hover {
				background-color: var(--color-primary-fader) !important;
			}
			:deep(.circle) {
				background-color: var(--color-primary-light);
			}
		}
	}
	
	.label {
		font-size: 1em;
		transition: all .25s;
		opacity: .6;
		font-weight: bold;
		text-shadow: var(--text-shadow-contrast);
		cursor: pointer;
		&:first-of-type{
			opacity: 1;
			text-align: right;
		}
		.icon {
			height: 1em;
			vertical-align: middle;
			margin-right: .5em;
		}
		&:nth-of-type(2) > .icon {
			margin-right: 0;
			margin-left: .5em;
		}
	}

	&.selected {
		.label {
			opacity: 1;
			&:first-of-type {
				opacity: .6;
			}
		}
		.toggleHolder>.dash {
			background: var(--color-primary);
			&:first-of-type {
				background: var(--color-dark);
			}
		}
	}
	
	
	&.big {
		font-size: 1.2em;
	}
	
	&.small {
		font-size: .8em;
	}

	&.secondary {
		color: var(--color-secondary);
		.toggle {
			background-color: var(--color-secondary-fadest) !important;
			&:hover {
				background-color: var(--color-secondary-fader) !important;
			}
			:deep(.circle) {
				background-color: var(--color-secondary-light);
			}
		}
		.toggleHolder>.dash {
			background: var(--color-dark);
			&:first-of-type {
				background: var(--color-secondary);
			}
		}
		&.selected>.toggleHolder>.dash {
			background: var(--color-secondary);
			&:first-of-type {
				background: var(--color-dark);
			}
		}
	}

	&.alert {
		color: var(--color-alert);
		.toggle {
			background-color: var(--color-alert-fadest) !important;
			&:hover {
				background-color: var(--color-alert-fader) !important;
			}
			:deep(.circle) {
				background-color: var(--color-alert-light);
			}
		}
		.toggleHolder>.dash {
			background: var(--color-dark);
			&:first-of-type {
				background: var(--color-alert);
			}
		}
		&.selected>.toggleHolder>.dash {
			background: var(--color-alert);
			&:first-of-type {
				background: var(--color-dark);
			}
		}
	}
	
}
</style>