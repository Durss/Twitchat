<template>
	<div class="buttonnotification" @click="onClick($event)" v-newflag="newflag">
		<Icon :name="icon" class="icon" />
		<span v-if="count > 0" class="count">{{ count }}</span>
	</div>
</template>

<script lang="ts">
import { gsap } from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
export default class ButtonNotification extends Vue {

	@Prop()
	public icon!:string;

	@Prop({type:Number, default:0})
	public count!:number;

	@Prop({type:Object})
	public newflag!:{date:number, id:string};

	public onClick(event:MouseEvent):void {
		gsap.fromTo(this.$el, {scaleX:.7}, {duration:1.4, scale:1, clearProps:"scaleX", ease:"elastic.out(2)"});
		gsap.fromTo(this.$el, {scaleY:.7}, {duration:1.2, scale:1, clearProps:"all", ease:"elastic.out(2)", delay:.05});
	}

}
</script>

<style scoped lang="less">
.buttonnotification{
	width: 2em;
	height: 2em;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--border-radius);
	position: relative;

	&::before {
		//Offset "new flag" so it's closer to the icon
		top: .25em;
		left: .25em;
	}

	.icon {
		position: relative;
		height: 1em;
		width: 1em;
		object-fit: contain;
		&:before {
			//Offset "new flag" for better readability
			margin-left: -5px;
		width: 7px;
		height: 7px;
		}
	}

	&:hover {
		background-color: var(--background-color-fader);
	}

	.count {
		position: absolute;
		pointer-events: none;
		top: 0;
		right: 0;
		transform: translate(20%, -60%);
		border-radius: 1em;
		font-size: 12px;
		padding: .25em .5em;
		font-family: var(--font-roboto);
		color: var(--color-light);
		background-color: var(--color-secondary);
	}
}
@media only screen and (max-width: 600px) {
	.buttonnotification{
		width: 1.5em;
		height: 1.5em;
	}
}
</style>