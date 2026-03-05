<template>
	<div class="obsbrowsersources">
		<Button icon="refresh"
			class="refreshAllBt"
			@click="refreshAllSource()"
			:loading="refreshingAll">{{ $t("obs.browser_sources_refresh_all") }}</Button>

		<div class="card-item row" v-for="entry in sources" ref="row">
			<div class="infos">
				<p class="name">{{ entry.source.inputName }}</p>
				<p class="url" v-if="entry.localFile">{{ entry.url }}</p>
				<a v-else class="url" :href="entry.url" target="_blank">{{ entry.url }}</a>
			</div>
			<Button :icon="entry.success? 'checkmark' : 'refresh'"
				@click="refreshSource(entry)"
				:primary="entry.success"
				:loading="entry.loading">{{ $t("obs.browser_sources_refresh") }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import TTButton from '@/components/TTButton.vue';
import OBSWebsocket, { type OBSInputItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';

@Component({
	components:{
		Button: TTButton,
	},
	emits:[],
})
class OBSBrowserSources extends Vue {

	public refreshingAll:boolean = false;
	public sources:{loading:boolean, success:boolean, source:OBSInputItem, url:string, localFile:boolean}[] = [];

	public async mounted():Promise<void> {
		const res = await OBSWebsocket.instance.socket.call("GetInputList", {inputKind:"browser_source"});
		const sources = (res.inputs as unknown) as OBSInputItem[];
		this.sources = sources
						.filter(v=> v.inputKind == "browser_source")
						.map(v=>{
							return {loading:false, success:false, source:v, url:"", localFile:false}
						});

		this.sources.forEach(v=> {
			OBSWebsocket.instance.getSourceSettings<{is_local_file:boolean, url:string, local_file:string}>(v.source.inputName).then(res => {
				v.localFile = res.inputSettings.is_local_file === true;
				if(v.localFile) {
					v.url = res.inputSettings.local_file as string || "";
				}else{
					v.url = res.inputSettings.url as string || "";
				}
			});
		})

		await this.$nextTick();
		
		const items = this.$refs.row as HTMLDivElement[];
		gsap.from(items, {height:0, scaleY:0, paddingTop:0, marginTop:0, duration:0.25, stagger:0.025, delay:.25, clearProps:"all"});
	}

	public async refreshSource(entry:typeof this.sources[0]):Promise<void> {
		entry.loading = true;
		await OBSWebsocket.instance.socket.call("PressInputPropertiesButton", {inputName:entry.source.inputName, propertyName:"refreshnocache"});
		await Utils.promisedTimeout(200);
		entry.loading = false;
		entry.success = true;
		Utils.promisedTimeout(1000).then(()=> {
			entry.success = false;
		})
	}

	public async refreshAllSource():Promise<void> {
		this.refreshingAll = true;
		for (const source of this.sources) {
			await this.refreshSource(source);
		}
		this.refreshingAll = false;
	}

}
export default toNative(OBSBrowserSources);
</script>

<style scoped lang="less">
.obsbrowsersources{
	gap: .5em;
	display: flex;
	flex-direction: column;
	.refreshAllBt {
		align-self: center;
	}
	.row {
		gap: 1em;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		overflow: hidden;

		.infos {
			gap: .5em;
			display: flex;
			flex-direction: column;
			flex-shrink: 1;
			.name {
				font-weight: bold;
			}
			.url {
				word-break: break-all;
				font-size: .75em;
			}
		}
		.button {
			flex-shrink: 0;
		}
	}
}
</style>