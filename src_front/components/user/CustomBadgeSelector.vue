<template>
	<div class="custombadgeselector">
		<tooltip tag="div" interactive>
			<template #default>
				<Button class="addBt"
				type="file"
				accept="image/*"
				transparent
				theme="secondary"
				@change="onSelectBadgeFile">
					<template #icon><Icon name="add" theme="secondary" /></template>
				</Button>
			</template>

			<template #content v-if="noTooltip === false">
				<div class="list" v-if="$store.users.customBadgeList.length > 0">
					<Button light secondary small icon="edit" class="editBt"
					@click="$emit('manageBadges')">{{ $t("usercard.manage_badgesBt") }}</Button>

					<button :class="getBadgeClasses(badge)" v-for="badge in $store.users.customBadgeList" :key="badge.id" @click="addBadge(badge.id)">
						<img :src="badge.img">
					</button>
				</div>
				<div v-else>{{ $t('usercard.add_badgeBt_tt') }}</div>
			</template>
		</tooltip>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import TTButton from '../TTButton.vue';

@Component({
	components:{
		Icon,
		Button: TTButton,
	},
	emits:["manageBadges", "limitReached"],
})
class CustomBadgeSelector extends Vue {

	@Prop
	public user!:TwitchatDataTypes.TwitchatUser;

	@Prop
	public channelId!:string;

	@Prop({type:Boolean, default:false})
	public noTooltip!:boolean;

	/**
	 * Called when selecting a file for a custom badge
	 * @param e 
	 */
	public onSelectBadgeFile(e:Event):void {
		const input = (e.target as HTMLInputElement);

		const files = input.files;
		if(!files || files.length == 0) return;

		Utils.fileToBase64Img(files[0]!).then(base64Img=> {
			const badgeId = this.$store.users.createCustomBadge(base64Img);
			if(badgeId !== false && this.user) {
				this.$store.users.giveCustomBadge(this.user.id, this.user.platform, badgeId as string, this.channelId);
			}
			input.value = "";
		});
	}

	public getBadgeClasses(badge:TwitchatDataTypes.TwitchatCustomUserBadge):string[] {
		const res:string[] = ["badge"];
		if(!this.$store.auth.isPremium && badge.enabled === false) res.push("disabled");
		return res;
	}

	public addBadge(id:string):void {
		if(!this.$store.users.giveCustomBadge(this.user!.id, this.user!.platform, id as string, this.channelId)) {
			this.$emit("limitReached");
		}
	}

}
export default toNative(CustomBadgeSelector);
</script>

<style scoped lang="less">
.custombadgeselector{
	position: relative;
	
	.addBt {
		height: 1.2em;//Dunno why i need these weird values
		width: 1.2em;//Dunno why i need these weird values
		border: 1px dashed var(--color-secondary);
		padding: 2px;
		box-shadow: unset;
		border-radius: 0;
		.icon {
			height: 100%;
			max-width: 100%;
			justify-self: center;
			line-height: 1em;
			:deep(svg) {
				//No idea why i need this *ù@& to get icon properly centered vertically...
				height: .8em;
				vertical-align: top;
			}
		}
	}
	
	.list {
		gap: 1px;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		padding: 5px;
		width: 130px;
		justify-content: center;
		max-height: 300px;
		overflow: auto;
		.badge {
			padding: 2px;
			// background-color: var(--grayout);
			outline: 1px solid var(--color-light-fade);
			img, .icon {
				display: block;
				width: 32px;
				height: 32px;
			}

			&:hover {
				outline: 1px solid var(--color-light);
			}

			&.disabled {
				cursor: not-allowed;
				opacity: .35;
				outline: 1px dashed var(--color-light);
			}
		}
		.editBt {
			flex-basis: 100%;
			margin-bottom: .5em;
		}
	}
}
</style>