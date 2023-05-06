<template>
	<div class="splitter">
			<span class="line"></span>
			<span><slot /></span>
			<span class="line"></span>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{}
})
export default class Splitter extends Vue {

}
</script>

<style scoped lang="less">
.splitter{
	display: flex;
	flex-direction: row;
	font-weight: bold;
	justify-content: center;
	align-items: center;
	text-align: center;
	color: var(--color-light);
	
	span {
		padding: 0 1em;
	}
	.line {
		flex-grow: 1;
		background-color: var(--color-light);
		height: 1px;
	}
}
</style>