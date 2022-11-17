<template>
	<template v-for="item in list" :key="item.id">
		<TestComponent @mouseenter="hoveredItem = item" @mouseleave="hoveredItem = null"/>
	</template>
	<div v-if="hoveredItem">hovered!</div>
</template>

<script lang="ts">
import TestComponent from '@/components/TestComponent.vue';
import { Options, Vue } from 'vue-class-component';
interface IItem {id:number, message:string}

@Options({
	props:{},
	components:{ TestComponent, }
})
export default class TestView extends Vue {

	public list:IItem[] = [];
	public hoveredItem:IItem|null = null;

	public mounted():void {
		for (let i = 0; i < 3; i++) {
			this.list.push({ id:i, message:"Message "+(i+1), });
		}
	}

}
</script>