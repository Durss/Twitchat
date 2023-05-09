<template>
	<button class="closebutton">
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

}
</script>

<style scoped lang="less">
.closebutton{
	position: absolute;
	top: 0;
	right: 0;
	padding: 1em;
	cursor: pointer;
	.icon {
		height: 1em;
		transition: transform .15s;
	}
	&:hover {
		.icon {
			transform: scale(1.2);
		}
	}
}
</style>