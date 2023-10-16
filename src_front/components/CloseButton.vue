<template>
	<button :class="classes">
		<Icon class="icon" name="cross" :theme="theme"/>
	</button>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
export default class CloseButton extends Vue {

	@Prop({type:String, default:""})
	public theme!:string;

	@Prop({type:Boolean, default:false})
	public small!:boolean;

	public classes:string[] = [];

	public beforeMount():void {
		this.classes.push("closebutton");
		if(this.small !== false)  {
			this.classes.push("small");
		}
	}

}
</script>

<style scoped lang="less">
.closebutton{
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