<template>
	<button class="closebutton">
		<img src="@/assets/icons/cross_white.svg" alt="close">
	</button>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
export default class CloseButton extends Vue {

}
</script>

<style scoped lang="less">
.closebutton{
	position: absolute;
	top: 1em;
	right: 1em;
	cursor: pointer;
	img {
		height: 1em;
		transition: transform .15s;
	}
	&:hover {
		img {
			transform: scale(1.2);
		}
	}
}
</style>