<template>
	<div class="themeselector card-item">
		<SwitchButton :labels="['🌙','☀️']" :values="[false, true]" v-model="lightMode" @change="toggleTheme()" />
	</div>
</template>

<script lang="ts">
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import SwitchButton from './SwitchButton.vue';
import Utils from '@/utils/Utils';

@Component({
	components:{
		SwitchButton,
	},
	emits:[],
})
 class ThemeSelector extends Vue {

	public lightMode:boolean = false;

	public beforeMount():void {
		this.lightMode = Utils.isLightMode;
	}

	public toggleTheme():void {
		this.$store.main.toggleTheme(this.lightMode? "light" : "dark");
	}

}
export default toNative(ThemeSelector);
</script>

<style scoped lang="less">
.themeselector{
	
}
</style>