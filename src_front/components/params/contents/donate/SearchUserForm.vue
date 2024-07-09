<template>
	<div class="searchuserform" :class="inline !== false? 'inline' : ''">
		<form @submit.prevent>
			<input class="giftedInput" type="text"
				maxlength="25"
				:placeholder="$t('global.login_placeholder')"
				v-model="search"
				@input="onSearch()"
				@keydown.stop="onKeyDown($event)"
				v-autofocus>
			<Icon v-if="searching" name="loader" class="loader" />
			<TTButton v-else icon="cross" class="cancel" transparent noBounce @click="$emit('close')"></TTButton>
		</form>
		<div class="userList" v-if="users.length > 0">
				<button class="user" type="button"
				v-for="(user, index) in users"
				v-if="showResult"
				:key="user.id"
				:data-index="index"
				@click="selectUser(user)">
					<img :src="user.profile_image_url.replace(/300x300/gi, '50x50')" alt="avatar">
					<div class="login">{{ user.display_name }}</div>
				</button>
		</div>

		<div class="userList" v-if="staticUserList.length > 0">
				<button class="user" type="button"
				v-for="(user, index) in staticUserList"
				v-if="search.length == 0"
				:key="user.id"
				:data-index="index"
				@click="selectUser(user)">
					<img :src="user.profile_image_url.replace(/300x300/gi, '50x50')" alt="avatar">
					<div class="login">{{ user.display_name }}</div>
				</button>
		</div>
		<div class="noResult" v-if="noResult">{{ $t("global.no_result") }}</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import { TTButton } from '@/components/TTButton.vue';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, Prop, Vue, toNative } from 'vue-facing-decorator';
import { gsap } from 'gsap/gsap-core';

@Component({
	components:{
		Icon,
		TTButton,
	},
	emits:["close", "update:modelValue", "select"],
})
class SearchUserForm extends Vue {

	@Prop()
	public modelValue?:TwitchDataTypes.UserInfo;

	@Prop({default:false})
	public inline!:boolean;

	@Prop({default:[]})
	public excludedUserIds!:string[];

	@Prop({default:[]})
	public staticUserList!:TwitchDataTypes.UserInfo[];

	public search:string = "";
	public users:TwitchDataTypes.UserInfo[] = []
	public noResult:boolean = false;
	public searching:boolean = false;
	public showResult:boolean = false;

	private searchDebounce = -1;

	public onKeyDown(event:KeyboardEvent):void {
		if(event.key == 'Escape') this.$emit("close");
	}

	public onSearch():void {
		this.users = [];
		this.searching = this.search != "";
		this.noResult = false;
		this.showResult = false;
		clearTimeout(this.searchDebounce);
		if(this.searching) {
			this.searchDebounce = setTimeout(async () => {
				this.users = (await TwitchUtils.searchUser(this.search) || []).filter(user => (this.excludedUserIds || []).indexOf(user.id) === -1);
				this.searching = false;
				this.noResult = this.users.length === 0;
				await this.$nextTick();
				this.showResult = true;
			}, 500);
		}
	}

	public selectUser(user:TwitchDataTypes.UserInfo):void {
		this.$emit("update:modelValue", user);
		this.$emit("select", user);
	}

	public onEnter(el:Element, done:()=>void) {
		gsap.fromTo(el, {opacity:0, y:-20},
		{
			y: 0,
			opacity: 1,
			duration:.25,
			maxHeight: "2em",
			delay: parseInt((el as HTMLElement).dataset.index!) * 0.015,
			onComplete: done
		})
	}
}
export default toNative(SearchUserForm);
</script>

<style scoped lang="less">
.searchuserform{
	position: relative;

	&.inline {
		background: unset;
		backdrop-filter: unset;
		box-shadow: unset;
		.userList {
			position: relative;
			background: unset;
		}
		input {
			background-color: var(--background-color-fader);
		}

		.userList{
			.user:hover {
				background-color: var(--background-color-fader);
			}
		}
	}
	form {
		.loader {
			height: 1em;
			width: 1em;
			position: relative;
			top: .25em;
			margin-left: -1.25em;
		}
		.cancel {
			position: relative;
			top: .25em;
			margin-left: -1.7em;
		}
		input {
			background-color: var(--grayout-fadest);
			width: 100%;
			min-width: unset;
			max-width: unset;
		}
	}

	.noResult {
		text-align: center;
		margin-top: .5em;
	}

	.userList{
		gap: 1px;
		display: flex;
		flex-direction: column;
		position: absolute;
		padding: .5em;
		border-radius: var(--border-radius);
		background: var(--background-color-secondary);
		width: 100%;
	}


	.user {
		gap: .5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		color: var(--color-text);
		border-radius: 50px;
		position:relative;
		.login {
			text-overflow: ellipsis;
			overflow: hidden;
			flex-grow: 1;
		}
		img {
			height: 2em;
			border-radius: 50%;
		}
		&:hover {
			background-color: var(--grayout);
		}
		&::after {
			content:"";
			width:7px;
			height:7px;
			border-radius: 50%;
			background-color: #f00;
			box-shadow: -2px 2px 3px #000;
			position: absolute;
			top: .1em;
			left: 1.6em;
		}
	}

	// .list-move,
	// .list-enter-active,
	// .list-leave-active {
	// 	opacity: 1;
	// 	transition: transform .5s cubic-bezier(0.680, -0.550, 0.265, 1.550), opacity .5s;
	// }

	// .list-enter-from,
	// .list-leave-to {
	// 	opacity: 0;
	// 	transform: translateX(-50%);
	// }
	// .list-leave-active {
	// 	position: absolute;
	// }
}
</style>