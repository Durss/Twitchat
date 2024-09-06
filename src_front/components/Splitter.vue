<template>
	<div :class="classes">
			<span class="line"></span>
			<span><slot /></span>
			<span class="line"></span>
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{}
})
class Splitter extends Vue {

	@Prop({type:String, default:""})
	public theme!:string;

	public get classes():string[] {
		let res = ["splitter"];
		if(this.theme == "dark") res.push("dark");
		if(this.theme == "light") res.push("light");
		if(this.theme == "primary") res.push("primary");
		if(this.theme == "secondary") res.push("secondary");
		if(this.theme == "alert") res.push("alert");
		return res;
	}

}
export default toNative(Splitter);
</script>

<style scoped lang="less">
.splitter{
	display: flex;
	flex-direction: row;
	font-weight: bold;
	justify-content: center;
	align-items: center;
	text-align: center;
	color: var(--color-text);
	
	span {
		padding: 0 1em;
	}
	.line {
		flex-grow: 1;
		background-color: var(--splitter-color);
		height: 1px;
	}

	&.light {
		color: var(--color-light);
		.line {
			background-color: var(--color-light);
		}
	}
	&.dark {
		color: var(--color-dark);
		.line {
			background-color: var(--color-dark);
		}
	}
	&.primary {
		color: var(--color-primary);
		.line {
			background-color: var(--color-primary);
		}
	}
	&.secondary {
		color: var(--color-secondary);
		.line {
			background-color: var(--color-secondary);
		}
	}
	&.alert {
		color: var(--color-alert);
		.line {
			background-color: var(--color-alert);
		}
	}
}
</style>