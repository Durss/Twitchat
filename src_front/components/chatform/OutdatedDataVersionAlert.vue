<template>
	<div class="outdateddataversionalert modal">
		<div class="dimmer" ref="dimmer"></div>
		<div class="holder" ref="holder">
			<div class="head">
				<h1 class="title"><Icon name="alert" /> {{ $t('outdated_data.title') }}</h1>
			</div>
			<div class="content" v-if="!confirm">
				<p>{{ $t("outdated_data.description") }}</p>
				<div class="buttonList">
					<TTButton class="uploadBt" icon="upload" :loading="saving" @click="confirm = true">{{ $t("outdated_data.erase_bt") }}</TTButton>
				</div>
			</div>
			<div class="content" v-else>
				<p>{{ $t("outdated_data.confirm") }}</p>
				<div class="buttonList">
					<TTButton icon="cross" :loading="saving" @click="confirm = false" alert>{{ $t("global.cancel") }}</TTButton>
					<TTButton icon="upload" :loading="saving" @click="saveData()" primary>{{ $t("global.confirm") }}</TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { gsap } from 'gsap/all';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';
import ToggleBlock from '../ToggleBlock.vue';
import ToggleButton from '../ToggleButton.vue';
import HeatScreenPreview from '../params/contents/heat/areas/HeatScreenPreview.vue';
import TriggerListFolderItem from '../params/contents/triggers/TriggerListFolderItem.vue';
import Utils from '@/utils/Utils';
import DataStore from '@/store/DataStore';

@Component({
	components:{
		Icon,
		TTButton,
		ToggleBlock,
		ToggleButton,
		HeatScreenPreview,
		TriggerListFolderItem,
	},
	emits:[],
})
class OutdatedDataVersionAlert extends Vue {
	
	public saving:boolean = false;
	public confirm:boolean = false;

	public mounted():void {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close():Promise<void> {
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$store.main.hideOutdatedDataVersionAlert();
		}});
	}

	public async saveData():Promise<void>{
		this.saving = true;
		await DataStore.save(true);
		await Utils.promisedTimeout(500);
		this.saving = false;
		this.close();
	}

}
export default toNative(OutdatedDataVersionAlert);
</script>

<style scoped lang="less">
.outdateddataversionalert{
	.content {
		p {
			white-space: pre-line;
			line-height: 1.25em;
		}
		.buttonList {
			gap: 1em;
			width: 100%;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			margin-top: 1em;
		}
	}
}
</style>