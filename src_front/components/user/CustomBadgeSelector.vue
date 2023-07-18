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

			<template #content>
				<div class="list" v-if="$store('users').customBadgeList.length > 0">
					<Button light secondary small icon="edit" class="editBt"
					@click="$emit('manageBadges')">{{ $t("usercard.manage_badgesBt") }}</Button>

					<button class="badge" v-for="badge in $store('users').customBadgeList" :key="badge.id" @click="addBadge(badge.img)">
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
import { Component, Prop, Vue } from 'vue-facing-decorator';
import Icon from '../Icon.vue';
import Button from '../Button.vue';

@Component({
	components:{
		Icon,
		Button,
	},
	emits:["manageBadges"],
})
export default class CustomBadgeSelector extends Vue {

	@Prop()
	public user!:TwitchatDataTypes.TwitchatUser;

	/**
	 * Called when selecting a file for a custom badge
	 * @param e 
	 */
	public onSelectBadgeFile(e:Event):void {
		const input = (e.target as HTMLInputElement);

		const files = input.files;
		if(!files || files.length == 0) return;

		Utils.fileToBase64Img(files[0]).then(base64Img=> {
			this.$store("users").addCustomBadge(this.user!, base64Img);
			input.value = "";
		});
	}

	public addBadge(image:string):void {
		this.$store("users").addCustomBadge(this.user!, image);
	}

}
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
		button:not(.editBt) {
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
		}
		.editBt {
			flex-basis: 100%;
			margin-bottom: .5em;
		}
	}
}
</style>