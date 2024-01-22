<template>
	<button :class="classes">
		<Icon class="icon" :name="icon" :theme="theme"/>
	</button>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
export default class ClearButton extends Vue {

	@Prop({type:String, default:""})
	public theme!:string;

	@Prop({type:Boolean, default:false})
	public small!:boolean;

	@Prop({type:String, default:"cross"})
	public icon!:string;

	public classes:string[] = [];

	public beforeMount():void {
		this.classes.push("clearbutton");
		if(this.small !== false)  {
			this.classes.push("small");
		}
	}

}
</script>

<style scoped lang="less">
.clearbutton{
	position: absolute;
	top: 0;
	right: 0;
	padding: 1em;
	z-index: 1;
	cursor: pointer;
	color: var(--color-text);
	.icon {
		height: 1em;
		transition: transform .15s;
	}
	&:hover {
		.icon {
			transform: scale(1.2);
		}
	}
	&.small {
		padding: .5em;
	}
}
</style>