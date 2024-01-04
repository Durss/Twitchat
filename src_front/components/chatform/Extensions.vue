<template>
	<div class="extensions sidePanel">
		<div class="head">
			<CloseButton @click="close" />
			<h1 class="title"><Icon :name="reloading? 'loader' : 'extension'" />{{ $t("extensions.title") }}</h1>
		</div>

		<div class="content" ref="content">
			<Icon class="spinner" name="loader" v-if="loading" />

			<TransitionGroup name="list" tag="div" ref="list" class="list"  v-if="!loading && extensionList.length > 0">
				<div class="card-item extension" v-for="extension in extensionList" :key="extension.data.id">
					<div class="header">
						<span class="title">{{extension.data.name}}</span>
						<a :href="'https://dashboard.twitch.tv/extensions/'+extension.data.id+'-'+extension.data.version" target="_blank" class="link"><Icon name="newtab" /></a>
					</div>
					<div class="details">
						<Icon name="loader" v-if="extension.loading" />

						<template v-else>
							<div class="card-item install">
								<span>{{$t("extensions.param_install")}}</span>
								<select @change="onInstall(extension)" v-model="extension.selectedValue">
									<option value="" disabled :selected="!extension.enabledType">{{ $t("global.select_placeholder") }}</option>
									<option value="" disabled>━━━━━━━━</option>
									<option v-for="opt in extension.slotOptions"
									:value="opt.type+'_'+opt.index"
									:disabled="opt.type == 'split'"
									:selected="opt.type == extension.enabledType && opt.index == extension.enabledIndex">
										<template v-if="opt.type != 'split'">{{ $t("extensions.type_"+opt.type) }} {{ opt.index }}</template>
										<template v-else>━━━━━━━━</template>
									</option>
								</select>
							</div>
							
							<TTButton icon="offline" alert v-if="extension.enabled" @click="onDisable(extension)" small>{{ $t("global.disable") }}</TTButton>
						</template>

						<div class="version">v{{ extension.data.version }}</div>
					</div>
				</div>
			</TransitionGroup>

			<div class="noExtension" v-else-if="!loading">
				<p>{{ $t("extensions.no_extension") }}</p>
				<TTButton icon="newtab" href="https://dashboard.twitch.tv/extensions" target="_blank" type="link" primary>{{ $t("extensions.no_extension_browse") }}</TTButton>
				<TTButton icon="refresh">{{ $t("global.refresh") }}</TTButton>
			</div>

		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component } from 'vue-facing-decorator';
import AbstractSidePanel from '../AbstractSidePanel';
import CloseButton from '../CloseButton.vue';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';
import ToggleButton from '../ToggleButton.vue';
import ParamItem from '../params/ParamItem.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
		CloseButton,
		ToggleButton,
	},
	emits:["close"],
})
export default class Extensions extends AbstractSidePanel {

	public loading:boolean = true;
	public reloading:boolean = false;
	public extensionList:ExtensionItem[] = [];

	public mounted():void {
		super.open();
	}

	public beforeMount():void {
		this.loadList()
	}

	public async loadList():Promise<void> {
		const list = await TwitchUtils.listExtensions(false) || [];
		const listEnabled = await TwitchUtils.listExtensions(true);
		const idToActive:{[key:string]:boolean} = {};
		const idToSlotType:{[key:string]:{type:TwitchDataTypes.Extension["type"][number], index:string}} = {};
		//Check which extensions are active and in which slot type/index
		for (const key in listEnabled) {
			const slotType =  key as keyof typeof listEnabled;
			const section = listEnabled[slotType];
			for (const slotId in section) {
				if(section[slotId].active) {
					const eId = section[slotId].id;
					idToActive[eId] = true;
					idToSlotType[eId] = {
						index: slotId,
						type: slotType,
					}
				}
			}
		}

		//Build items data
		const items:ExtensionItem[] = list.map(v=> {
			const slotOptions:ExtensionItem["slotOptions"] = [];
			let count = 0;
			for (let i = 0; i < v.type.length; i++) {
				if(v.type[i] == "mobile") continue;//Ignore mobile slots as they're automatic

				if(count > 0) {
					//This shows a disabled splitter on the list
					slotOptions.push({index:"1", type:"split"});
				}
				count ++;
				switch(v.type[i]) {
					case "overlay":{
						slotOptions.push({index:"1", type:"overlay"});
						break;
					}
					case "panel":{
						slotOptions.push({index:"1", type:"panel"});
						slotOptions.push({index:"2", type:"panel"});
						slotOptions.push({index:"3", type:"panel"});
						break;
					}
					case "component":{
						
						slotOptions.push({index:"1", type:"component"});
						slotOptions.push({index:"2", type:"component"});
						break;
					}
				}
			}
			const res:ExtensionItem = {
				data:v,
				enabled:idToActive[v.id],
				enabledType:idToSlotType[v.id]?.type,
				enabledIndex:idToSlotType[v.id]?.index,
				selectedValue:idToSlotType[v.id]?.type? idToSlotType[v.id]?.type+'_'+idToSlotType[v.id]?.index : "",
				slotOptions,
				loading:false,
			};
			return res;
		}).filter(v=> v.data.can_activate)
		.sort((a,b) => { return (a.enabled === b.enabled)? a.data.name.localeCompare(b.data.name) : a.enabled? -1 : 1; })

		this.extensionList = items;
		this.loading = false;
	}

	/**
	 * Disable an extension
	 * @param ext 
	 */
	public async onDisable(ext:ExtensionItem):Promise<void> {
		await this.onInstall(ext, false);
	}

	/**
	 * Called when installing an extension on a slot
	 * @param ext 
	 */
	public async onInstall(ext:ExtensionItem, enable:boolean = true):Promise<void> {
		ext.loading = true;
		const chunks = ext.selectedValue.split("_");//Dirty way of extracting index and type :(
		const slotType = chunks[0] as TwitchDataTypes.Extension["type"][number];
		const slotIndex = chunks[1];
		await TwitchUtils.updateExtension(ext.data.id, ext.data.version, enable, slotIndex, slotType);
		ext.loading = false;
		ext.enabled = enable;
		this.reloading = true;
		await this.loadList();
		this.reloading = false;
	}
}

interface ExtensionItem {
	data:TwitchDataTypes.Extension;
	enabled:boolean;
	enabledType:TwitchDataTypes.Extension["type"][number];
	enabledIndex:string;
	selectedValue:string;
	loading:boolean;
	slotOptions:{type:TwitchDataTypes.Extension["type"][number]|"split", index:string}[];
}
</script>

<style scoped lang="less">
.extensions{
	.spinner {
		height: 2em;
	}

	.head {
		max-width: 100%;
	}

	.content {
		max-width: 100%;
	}

	.list {
		gap: .5em;
		@itemWidth: 200px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));

		.extension {
			display: flex;
			flex-direction: column;
			.link {
				color: var(--color-light);
				text-decoration: none;
				.icon {
					height: 1em;
				}
			}
			.header {
				padding-left: 2em;
			}
			.details {
				gap: .5em;
				display: flex;
				flex-direction: column;
				align-items: center;
				flex-grow: 1;
			}
			.version {
				font-style: italic;
				font-size: .8em;
			}
			.install {
				gap: 1em;
				display: flex;
				flex-direction: row;
				align-items: center;

				select {
					font-size: .8em;
					option {
						text-align: center;
					}
				}
			}
		}
	}

	.noExtension {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	

	.list-move,
	.list-enter-active,
	.list-leave-active {
		transition: all 0.5s ease;
	}

	.list-enter-from,
	.list-leave-to {
		opacity: 0;
		transform: translateX(30px);
	}

	.list-leave-active {
		position: absolute;
	}
}
</style>