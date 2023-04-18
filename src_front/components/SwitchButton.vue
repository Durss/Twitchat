<template>
	<div :class="classes" @click.stop="toggle()">
		<span :class="localValue === true? 'label' : 'label selected'" @click.capture.stop="setState(false)">{{ label1 }}</span>

		<ToggleButton v-model="localValue" noOpacity :big="big" :small="small" :primary="primary" :secondary="secondary" :alert="alert" />

		<span :class="localValue === true? 'label selected' : 'label'" @click.capture.stop="setState(true)">{{ label2 }}</span>
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
	public primary!:boolean;

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
		if(this.primary !== false) res.push("primary");
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
	color: var(--color-light);
	gap: .5em;
	cursor: pointer;
	
	.label {
		font-size: 1em;
		transition: all .25s;
		filter: brightness(40%);
		&.selected {
			filter: brightness(100%);
		}
		&:first-of-type{
			text-align: right;
		}
	}

	&.primary, &.secondary, &.alert {
		.label {
			filter: saturate(20%);
			&.selected {
				filter: saturate(100%);
			}
		}
	}
	
	
	&.big {
		font-size: 1.2em;
	}
	
	&.small {
		font-size: .8em;
	}

	&.primary {
		color: var(--color-primary);
	}

	&.secondary {
		color: var(--color-secondary);
	}

	&.alert {
		color: var(--color-alert);
	}
	
}
</style>