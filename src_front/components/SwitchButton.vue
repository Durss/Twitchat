<template>
	<div :class="classes" @click.stop="toggle()">
		<span class="label" @click.capture.stop="setState(false)">{{ label1 }}</span>
		
		<div class="toggleHolder">
			<div class="dash"></div>
			<ToggleButton class="toggle" v-model="localValue" :big="big" :small="small" :secondary="secondary" :alert="alert" @change="setState(localValue)" />
			<div class="dash"></div>
		</div>

		<span class="label" @click.capture.stop="setState(true)">{{ label2 }}</span>
	</div>
</template>

<script lang="ts">
import { watch } from 'vue';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import ToggleButton from './ToggleButton.vue';

@Component({
	components:{
		ToggleButton,
	},
	emits: ['update:modelValue', 'change'],
})
export default class SwitchButton extends Vue {
	@Prop
	public label1!:string;
	
	@Prop
	public label2!:string;

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
		let res = ["switchbutton"];
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

	public setState(state:boolean):void {
		this.localValue = state;
		this.$emit('update:modelValue', state);
		this.$emit('change');
	}

	public toggle():void {
		this.setState(!this.localValue);
	}

}
</script>

<style scoped lang="less">
.switchbutton{
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	color: var(--color-light);
	cursor: pointer;
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
			background-color: var(--color-primary-fade);
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
		text-shadow: 1px 1px 0 var(--color-dark);
		&:first-of-type{
			opacity: 1;
			text-align: right;
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
			background-color: var(--color-secondary-fade);
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
			background-color: var(--color-alert-fade);
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