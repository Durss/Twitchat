<template>
	<div class="extensions sidePanel">
		<div class="head">
			<ClearButton @click="close" />
			<h1 class="title">
				<Icon :name="reloading ? 'loader' : 'extension'" />{{ $t("extensions.title") }}
			</h1>
		</div>

		<div class="content scope" ref="content" v-if="!hasPermissions">
			<p>{{ $t("extensions.scope_grant") }}</p>
			<TTButton icon="lock_fit" primary @click="grantScopes()">{{
				$t("global.grant_scope")
			}}</TTButton>
		</div>

		<div class="content" ref="content" v-else>
			<Icon class="spinner" name="loader" v-if="loading" />

			<TTButton
				v-if="!loading && extensionList.length > 0"
				icon="newtab"
				href="https://dashboard.twitch.tv/extensions"
				target="_blank"
				type="link"
				primary
				>{{ $t("extensions.no_extension_browse") }}</TTButton
			>

			<TransitionGroup
				name="list"
				tag="div"
				ref="list"
				class="list"
				v-if="!loading && extensionList.length > 0"
			>
				<div
					class="extension"
					:class="{ active: extension.enabled }"
					v-for="extension in extensionList"
					:key="extension.data.id"
				>
					<div class="extHeader">
						<span class="statusDot" :class="{ on: extension.enabled }"></span>
						<span class="extName">{{ extension.data.name }}</span>
						<span class="extVersion">v{{ extension.data.version }}</span>
						<a
							class="extLink"
							:href="
								'https://dashboard.twitch.tv/extensions/' +
								extension.data.id +
								'-' +
								extension.data.version
							"
							target="_blank"
						>
							<Icon name="newtab" />
						</a>
					</div>

					<div class="extTypes">
						<Tag
							v-for="t in extension.data.type.filter((t) => t !== 'mobile')"
							:key="t"
							:active="extension.enabled && extension.enabledType === t"
						>
							{{ $t("extensions.type_" + t) }}
						</Tag>
					</div>

					<div class="extActions" v-if="!extension.loading">
						<select
							class="slotSelect"
							v-model="extension.selectedValue"
							@change="onInstall(extension)"
						>
							<option value="" disabled>{{ $t("extensions.slot_assign") }}</option>
							<optgroup
								v-for="group in getGroupedOptions(extension)"
								:key="group.type"
								:label="$t('extensions.type_' + group.type)"
							>
								<option
									v-for="slot in group.slots"
									:key="slot.type + '_' + slot.index"
									:value="slot.type + '_' + slot.index"
								>
									{{ $t("extensions.type_" + slot.type) }} #{{ slot.index }}
								</option>
							</optgroup>
						</select>
						<TTButton
							v-if="extension.enabled"
							icon="offline"
							alert
							small
							@click="onDisable(extension)"
							>{{ $t("global.disable") }}</TTButton
						>
					</div>
					<Icon name="loader" class="extLoader" v-else />
				</div>
			</TransitionGroup>

			<div class="noExtension" v-else-if="!loading">
				<Icon name="extension" class="emptyIcon" />
				<p>{{ $t("extensions.no_extension") }}</p>
				<TTButton
					icon="newtab"
					href="https://dashboard.twitch.tv/extensions"
					target="_blank"
					type="link"
					primary
					>{{ $t("extensions.no_extension_browse") }}</TTButton
				>
				<TTButton icon="refresh" @click="loadList()">{{ $t("global.refresh") }}</TTButton>
			</div>

			<div class="card-item alert error" v-if="error" @click="error = false">
				{{ $t("extensions.update_error") }}
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { toNative, Component } from "vue-facing-decorator";
import AbstractSidePanel from "../AbstractSidePanel";
import ClearButton from "../ClearButton.vue";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";
import ToggleButton from "../ToggleButton.vue";
import ParamItem from "../params/ParamItem.vue";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import Tag from "../Tag.vue";

@Component({
	components: {
		Tag,
		Icon,
		TTButton,
		ParamItem,
		ClearButton,
		ToggleButton,
	},
	emits: ["close"],
})
class Extensions extends AbstractSidePanel {
	public error: boolean = false;
	public loading: boolean = true;
	public reloading: boolean = false;
	public hasPermissions: boolean = false;
	public extensionList: ExtensionItem[] = [];

	public mounted(): void {
		this.hasPermissions = TwitchUtils.hasScopes([TwitchScopes.EXTENSIONS]);
		super.open();
	}

	public beforeMount(): void {
		this.loadList();
	}

	public async loadList(): Promise<void> {
		const list = (await TwitchUtils.listExtensions(false)) || [];
		const listEnabled = await TwitchUtils.listExtensions(true);
		const availableSlotTypes = this.$store.extension.availableSlots;
		const idToActive: { [key: string]: boolean } = {};
		const idToSlotType: {
			[key: string]: { type: TwitchDataTypes.Extension["type"][number]; index: string };
		} = {};
		//Check which extensions are active and in which slot type/index
		for (const key in listEnabled) {
			const slotType = key as keyof typeof listEnabled;
			const section = listEnabled[slotType];
			for (const slotId in section) {
				if (section[slotId]!.active) {
					const eId = section[slotId]!.id;
					idToActive[eId] = true;
					idToSlotType[eId] = {
						index: slotId,
						type: slotType,
					};
				}
			}
		}

		//Build items data
		const items: ExtensionItem[] = list
			.map((v) => {
				const slotOptions: ExtensionItem["slotOptions"] = [];
				let count = 0;
				for (const slotType of v.type) {
					if (slotType == "mobile") continue; //Ignore mobile slots as they're automatic

					if (count > 0) {
						//This shows a disabled splitter on the list
						slotOptions.push({ index: "1", type: "split" });
					}
					count++;
					for (let j = 0; j < availableSlotTypes[slotType]; j++) {
						slotOptions.push({ index: (j + 1).toString(), type: slotType });
					}
				}
				const res: ExtensionItem = {
					data: v,
					enabled: idToActive[v.id]!,
					enabledType: idToSlotType[v.id]?.type || "panel",
					enabledIndex: idToSlotType[v.id]?.index || "",
					selectedValue: idToSlotType[v.id]?.type
						? idToSlotType[v.id]?.type + "_" + idToSlotType[v.id]?.index
						: "",
					slotOptions,
					loading: false,
				};
				return res;
			})
			.filter((v) => v.data.can_activate)
			.sort((a, b) => {
				return a.enabled === b.enabled
					? a.data.name.localeCompare(b.data.name)
					: a.enabled
						? -1
						: 1;
			});

		this.extensionList = items;
		this.loading = false;
	}

	/**
	 * Disable an extension
	 * @param ext
	 */
	public async onDisable(ext: ExtensionItem): Promise<void> {
		await this.onInstall(ext, false);
	}

	/**
	 * Called when installing an extension on a slot
	 * @param ext
	 */
	public async onInstall(ext: ExtensionItem, enable: boolean = true): Promise<void> {
		ext.loading = true;
		const chunks = ext.selectedValue.split("_"); //Dirty way of extracting index and type :(
		const slotType = chunks[0] as TwitchDataTypes.Extension["type"][number];
		const slotIndex = chunks[1]!;
		if (
			await TwitchUtils.updateExtension(
				ext.data.id,
				ext.data.version,
				enable,
				slotIndex,
				slotType,
			)
		) {
			ext.enabled = enable;
		} else {
			this.error = true;
		}
		ext.loading = false;
		this.reloading = true;
		await this.loadList();
		this.reloading = false;
	}

	/**
	 * Groups slot options by type for cleaner display via <optgroup>
	 */
	public getGroupedOptions(
		ext: ExtensionItem,
	): { type: string; slots: { type: string; index: string }[] }[] {
		const groups: { type: string; slots: { type: string; index: string }[] }[] = [];
		let currentGroup: { type: string; slots: { type: string; index: string }[] } | null = null;
		for (const opt of ext.slotOptions) {
			if (opt.type === "split") continue;
			if (!currentGroup || currentGroup.type !== opt.type) {
				currentGroup = { type: opt.type, slots: [] };
				groups.push(currentGroup);
			}
			currentGroup.slots.push(opt);
		}
		return groups;
	}

	public grantScopes(): void {
		TwitchUtils.requestScopes([TwitchScopes.EXTENSIONS]);
	}
}

interface ExtensionItem {
	data: TwitchDataTypes.Extension;
	enabled: boolean;
	enabledType: TwitchDataTypes.Extension["type"][number];
	enabledIndex: string;
	selectedValue: string;
	loading: boolean;
	slotOptions: { type: TwitchDataTypes.Extension["type"][number] | "split"; index: string }[];
}
export default toNative(Extensions);
</script>

<style scoped lang="less">
.extensions {
	.spinner {
		height: 2em;
		margin: 0 auto;
	}

	.head {
		max-width: 100%;
	}

	.content {
		max-width: 100%;

		&.scope {
			align-items: center;
			justify-content: center;
			margin: 0 auto;
			p {
				max-width: 80%;
				text-align: center;
			}
		}
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.5em;

		.extension {
			display: flex;
			flex-direction: column;
			gap: 0.5em;
			padding: 0.75em;
			border-radius: var(--border-radius);
			background-color: var(--background-color-fadest);
			border-left: 3px solid transparent;
			transition:
				border-color 0.3s,
				background-color 0.3s;

			&.active {
				border-left-color: var(--color-primary);
				background-color: var(--color-primary-fadest);
			}

			.extHeader {
				display: flex;
				align-items: center;
				gap: 0.5em;

				.statusDot {
					width: 0.5em;
					height: 0.5em;
					border-radius: 50%;
					background-color: var(--color-alert-light);
					flex-shrink: 0;
					transition: background-color 0.3s;
					&.on {
						background-color: var(--color-primary);
					}
				}

				.extName {
					font-weight: bold;
					flex-grow: 1;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.extVersion {
					font-size: 0.75em;
					opacity: 0.5;
					font-style: italic;
					flex-shrink: 0;
				}

				.extLink {
					color: var(--color-light);
					opacity: 0.5;
					flex-shrink: 0;
					transition: opacity 0.2s;
					.icon {
						height: 0.85em;
					}
					&:hover {
						opacity: 1;
					}
				}
			}

			.extTypes {
				display: flex;
				flex-wrap: wrap;
				gap: 0.25em;
			}

			.extActions {
				display: flex;
				align-items: center;
				gap: 0.5em;

				.slotSelect {
					flex-grow: 1;
				}
			}

			.extLoader {
				height: 1.5em;
				margin: 0 auto;
			}
		}
	}

	.noExtension {
		gap: 0.75em;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2em 1em;
		text-align: center;

		.emptyIcon {
			height: 3em;
			opacity: 0.3;
		}

		p {
			opacity: 0.7;
		}
	}

	.error {
		cursor: pointer;
		margin: 0 auto;
	}

	.list-move,
	.list-enter-active,
	.list-leave-active {
		transition: all 0.4s ease;
	}

	.list-enter-from,
	.list-leave-to {
		opacity: 0;
		transform: translateY(-10px);
	}

	.list-leave-active {
		position: absolute;
	}
}
</style>
