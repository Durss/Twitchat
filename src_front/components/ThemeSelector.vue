<template>
	<div class="themeselector card-item">
		<SwitchButton label1="🌙" label2="☀️" v-model="lightMode" @change="toggleTheme()" />
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-facing-decorator';
import SwitchButton from './SwitchButton.vue';
import Utils from '@/utils/Utils';

@Component({
	components:{
		SwitchButton,
	},
	emits:[],
})
export default class ThemeSelector extends Vue {

	public lightMode:boolean = false;

	public beforeMount():void {
		this.lightMode = Utils.isLightMode;
	}

	public toggleTheme():void {
		this.$store("main").toggleTheme(this.lightMode? "light" : "dark");
	}

}
</script>

<style scoped lang="less">
.themeselector{
	
}
</style>