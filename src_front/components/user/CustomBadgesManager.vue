<template>
	<div class="custombadgesmanager">
		<div class="header">
			<button class="backBt" @click="$emit('close')"><Icon name="back" /></button>
			<h1>{{ $t("usercard.manage_badges") }}</h1>
		</div>

		<Icon class="loader" name="loader" v-if="loading" />
		
		<template v-else>
			<div class="badgeList">
				<Button class="addBt" v-tooltip="$t('usercard.add_badgeBt_tt')"
				type="file"
				accept="image/*"
				transparent
				theme="secondary"
				@change="onAddBadgeFile">
					<template #icon><Icon name="add" theme="secondary" /></template>
				</Button>

				<button :class="getBadgeClasses(badge.id)" v-for="badge in badgesList" :key="badge.id"
				@click="selectBadge(badge.id)"><img :src="badge.img"></button>
			</div>

			<template v-if="selectedBadgeId">
				
				<div class="card-item secondary disabledInfo" v-if="!$store.auth.isPremium && selectedBadge?.enabled === false">
					<div>{{ $t("usercard.badge_disabled") }}</div>
					<i18n-t scope="global" keypath="usercard.badge_diusabled_notPremium" v-if="!canEnableABadge">
						<template #MAX>{{ $config.MAX_CUSTOM_BADGES }}</template>
						<template #MAX_PREMIUM>{{ $config.MAX_CUSTOM_BADGES_PREMIUM }}</template>
					</i18n-t>
					<div v-else class="enableToggle">
						<label for="reactivate_badge" @click="selectedBadge!.enabled = !selectedBadge!.enabled; saveBadges()">{{ $t("usercard.badge_users_reactivate") }}</label>
						<ToggleButton secondary id="reactivate_badge" v-model="selectedBadge!.enabled" @change="saveBadges()" />
					</div>
				</div>
				
				<input class="badgeName" type="text" v-model="badgeName" :placeholder="$t('usercard.badge_name_placeholder')" maxlength="50">

				<div class="ctas">
					<Button icon="trash" alert @click="deleteBadge(selectedBadgeId)">{{ $t("usercard.delete_badge") }}</Button>
					<Button icon="upload" type="file" @change="onSelectBadgeFile">{{ $t("usercard.replace_badge_file") }}</Button>
				</div>
	
				<h2>{{ $t("usercard.badge_users") }}</h2>
				<div class="userList" v-if="getUserList(selectedBadgeId).length > 0">
					<div class="user" v-for="user in getUserList(selectedBadgeId)" :key="user.id">
						<button class="removeBt" @click="removeBadgeFromUser(selectedBadgeId, user)"><Icon name="cross" theme="alert" /></button>
						<span>{{ user.displayName }}</span>
					</div>
				</div>
				<div class="noUser" v-else>{{ $t("usercard.badge_users_none") }}</div>
			</template>
		</template>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import { watch } from 'vue';
import ToggleButton from '../ToggleButton.vue';
import Config from '@/utils/Config';

@Component({
	components:{
		Button: TTButton,
		ToggleButton,
	},
	emits:["close"],
})
class CustomBadgesManager extends Vue {

	public loading:boolean = true;
	public badgeName:string = "";
	public selectedBadgeId:string = "";
	
	private userList:TwitchatDataTypes.TwitchatUser[] = [];

	public get badgesList() { return this.$store.users.customBadgeList; }
	public get selectedBadge() { return this.$store.users.customBadgeList.find(v=>v.id == this.selectedBadgeId); }
	public get canEnableABadge() { return this.$store.users.customBadgeList.filter(v=>v.enabled !== false).length < Config.instance.MAX_CUSTOM_BADGES; }

	/**
	 * Get classes for the given badge ID
	 */
	public getBadgeClasses(badgeId:string):string[] {
		this.$store.users
		const res = ["badge"];
		const badge = this.$store.users.customBadgeList.find(v=>v.id == badgeId);
		if(this.selectedBadgeId == badgeId) res.push("selected");
		if(badge && badge.enabled === false && !this.$store.auth.isPremium) res.push("disabled");
		return res;
	}

	/**
	 * Get users related to the given badge ID
	 */
	public getUserList(badgeId:string):TwitchatDataTypes.TwitchatUser[] {
		const res:TwitchatDataTypes.TwitchatUser[] = [];
		const userBadges = this.$store.users.customUserBadges;
		for (const uid in userBadges) {
			if(userBadges[uid]!.findIndex(v=> v.id == badgeId) > -1) {
				const user = this.userList.find(v=>v.id == uid);
				if(user) res.push(user);
			}
		}
		return res;
	}

	public beforeMount():void {
		const userBadges = this.$store.users.customUserBadges;
		const uids = Object.keys(userBadges);
		const channelId = this.$store.auth.twitch.user.id;
		this.userList = [];
		uids.forEach(id=> {
			if(userBadges[id]!.length === 0) return;
			this.userList.push(this.$store.users.getUserFrom(userBadges[id]![0]!.platform, channelId, id));
		});
		this.loading = false;

		watch(()=>this.badgeName, ()=> this.onUpdateName());

		this.selectBadge(this.$store.users.customBadgeList[0]!.id);
	}

	/**
	 * Called when selecting a file for a custom badge
	 * @param e 
	 */
	public onAddBadgeFile(e:Event):void {
		const input = (e.target as HTMLInputElement);

		const files = input.files;
		if(!files || files.length == 0) return;

		Utils.fileToBase64Img(files[0]!).then(base64Img=> {
			this.$store.users.createCustomBadge(base64Img);
		});
	}

	/**
	 * Called when selecting a file for a custom badge
	 * @param e 
	 */
	public onSelectBadgeFile(e:Event):void {
		const input = (e.target as HTMLInputElement);

		const files = input.files;
		if(!files || files.length == 0) return;

		Utils.fileToBase64Img(files[0]!).then(base64Img=> {
			this.$store.users.updateCustomBadgeImage(this.selectedBadgeId, base64Img);
			input.value = "";
		});
	}

	/**
	 * Selects a badge
	 * @param badgeId 
	 */
	public selectBadge(badgeId:string):void {
		const badge = this.$store.users.customBadgeList.find(v=>v.id == badgeId);
		if(!badge) return;
		this.selectedBadgeId = badge.id;
		this.badgeName = badge.name || "";
	}

	/**
	 * Delete a badge
	 * @param badgeId 
	 */
	public deleteBadge(badgeId:string):void {
		this.$store.main.confirm(this.$t("usercard.delete_badge_confirm.title"), this.$t("usercard.delete_badge_confirm.description"))
		.then(v=> {
			this.$store.users.deleteCustomBadge(badgeId);
			this.$nextTick().then(()=>{
				if(this.$store.users.customBadgeList.length > 0) {
					this.selectedBadgeId = this.$store.users.customBadgeList[0]!.id;
				}else{
					this.selectedBadgeId = "";
				}
			})
		}).catch(()=>{/*ignore*/})
	}

	/**
	 * Removes the given badge from the user
	 * @param user 
	 */
	public removeBadgeFromUser(badgeId:string, user:TwitchatDataTypes.TwitchatUser):void {
		const channelId = this.$store.auth.twitch.user.id;
		this.$store.users.removeCustomBadge(user.id, badgeId, channelId);
	}

	/**
	 * Called when badge name is updated
	 */
	public onUpdateName():void {
		const badge = this.$store.users.customBadgeList.find(v=>v.id == this.selectedBadgeId);
		if(!badge) return;
		this.$store.users.updateCustomBadgeName(badge.id, this.badgeName);
	}

	/**
	 * Saves custom user badges
	 */
	public saveBadges():void {
		console.log("save");
		this.$store.users.saveCustomBadges();
	}

}
export default toNative(CustomBadgesManager);
</script>

<style scoped lang="less">
.custombadgesmanager{
	padding-bottom: 4px;//No idea why but this avoids scrollbar to show up when unnecessary

	.header {
		display: flex;
		flex-direction: row;
		align-items: center;
		.backBt {
			padding: .85em 1em;
			color:var(--color-text);
			.icon {
				height: 1em;
				transition: transform .15s;
			}
			&:hover {
				.icon {
					transform: scale(1.2);
				}
			}
		}
		h1 {
			font-size: 2em;
			text-align: center;
			flex-grow: 1;
		}
	}

	h2 {
		font-size: 1.5em;
		text-align: center;
		margin-top: .5em;
	}


	.badgeList {
		gap:5px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		.badge {
			width: 32px;
			height: 32px;
			opacity: .75;
			// outline: 1px solid var(--color-text);
			background-color: var(--color-text);
			box-shadow: 2px 2px 2px 2px rgba(0, 0, 0, .5);
			transition: all .1s;
			img {
				width: 100%;
				height: 100%;
			}

			&.selected {
				opacity: 1;
				outline: 1px solid var(--color-secondary);
				z-index: 1;
				background-color: var(--color-secondary);
				width: 40px;
				height: 40px;
			}

			&.disabled {
				outline: 1px dashed var(--color-text);
				opacity: .35;
			}
		}
	
		.addBt {
			height: 32px;
			border: 1px dashed var(--color-secondary);
			padding: 8px;
			position: relative;
			box-shadow: unset;
			border-radius: 0;
			.icon {
				height: 100%;
				:deep(svg) {
					vertical-align: top;
				}
			}

			input {
				position: absolute;
				cursor: pointer;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				padding: 0;
				margin: 0;
				&::file-selector-button {
					cursor: pointer;
				}
			}
		}
	}

	.disabledInfo {
		text-align: center;
		.enableToggle {
			gap: .5em;
			display: flex;
			flex-direction: row;
			justify-content: center;
			margin-top: .5em;
			label {
				cursor: pointer;
			}
		}
	}

	.badgeName {
		margin: auto;
		width: 100%;
		max-width: 350px;
	}

	.ctas {
		text-align: center;
		.button:not(:last-child) {
			margin-right: .5em;
		}
	}

	.userList {
		row-gap: .5em;
		column-gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		.user {
			.removeBt {
				vertical-align: middle;
				.icon {
					height: .8em;
					margin-right: .25em;
				}
			}
		}
	}

	.noUser {
		text-align: center;
		font-style: italic;
	}

	.loader {
		margin: auto;
		display: block;
		width: fit-content;
	}
	
}
</style>