<template>
	<div class="extensioninstaller card-item">
		test
	</div>
</template>

<script lang="ts">
import Config from '@/utils/Config';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:[],
})
class ExtensionInstaller extends Vue {
	
	mounted():void {
		this.$store.extension.availableExtensions.findIndex(ext=> {
			if(ext.id == Config.instance.TWITCH_EXTENSION_ID) {
				console.log("FOUND IT", ext);
			}
		});
	}

}
export default toNative(ExtensionInstaller);
</script>

<style scoped lang="less">
.extensioninstaller{
	
}
</style>