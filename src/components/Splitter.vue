<template>
	<div class="splitter">
			<span class="line"></span>
			<span>{{title}}</span>
			<span class="line"></span>
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({
	props:{
		title:String
	},
	components:{}
})
export default class Splitter extends Vue {

	public title!:string;

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
	
	span {
		padding: 0 1em;
	}
	.line {
		flex-grow: 1;
		background-color: @mainColor_normal;
		height: 1px;
		// border-top: 1px solid @mainColor_normal;
		// border-bottom: 1px solid @mainColor_normal;
		// height: 10px;
	}
}
</style>