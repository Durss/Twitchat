<template>
	<span class="userBadges" v-if="badgeList.length > 0">
		<template v-for="b in badgeList" :key="b.key">
			<span
				v-if="b.kind == 'mini'"
				class="badge mini"
				:class="b.cls"
				v-tooltip="b.tooltip"
			></span>
			<Icon v-else-if="b.kind == 'icon'" class="badge" :name="b.name" v-tooltip="b.tooltip" />
			<img
				v-else
				class="badge"
				:class="{ removable: b.customId != undefined && props.removableCustomBadges }"
				:src="b.src"
				:alt="b.alt"
				v-tooltip="b.tooltip"
				@click="onClickBadge(b)"
			/>
		</template>
	</span>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";

type BadgeItem =
	| { kind: "img"; key: string; src: string; alt: string; tooltip: string; customId?: string }
	| { kind: "icon"; key: string; name: string; tooltip: string }
	| { kind: "mini"; key: string; cls: string; tooltip: string };

const MINI_BADGES: Partial<
	Record<TwitchatDataTypes.TwitchatUserBadgeType, { cls: string; labelKey: string }>
> = {
	subscriber: { cls: "subscriber", labelKey: "chat.message.badges.subscriber" },
	vip: { cls: "vip", labelKey: "chat.message.badges.vip" },
	premium: { cls: "premium", labelKey: "chat.message.badges.prime" },
	moderator: { cls: "moderator", labelKey: "chat.message.badges.moderator" },
	staff: { cls: "staff", labelKey: "chat.message.badges.twitch_staff" },
	broadcaster: { cls: "broadcaster", labelKey: "chat.message.badges.broadcaster" },
	partner: { cls: "partner", labelKey: "chat.message.badges.partner" },
	founder: { cls: "founder", labelKey: "chat.message.badges.founder" },
	ambassador: { cls: "ambassador", labelKey: "chat.message.badges.ambassador" },
};

const storeAuth = useStoreAuth();
const storeUsers = useStoreUsers();
const { t } = useI18n();
const emit = defineEmits<{ removeCustom: [badgeId: string] }>();
const props = withDefaults(
	defineProps<{
		/**
		 * User to show badges of
		 */
		user: TwitchatDataTypes.TwitchatUser;
		/**
		 * Badges to display (custom badges excluded)
		 */
		badges: TwitchatDataTypes.TwitchatUserBadge[];
		/**
		 * Display `badges` as minimized version (coloured stripes)
		 */
		miniBadges?: boolean;
		/**
		 * Use HD badge images when available
		 */
		hdImages?: boolean;
		/**
		 * Show "not follower" badge ?
		 */
		showNoFollow?: boolean;
		/**
		 * Can we click custom badges to remove them? (emits "removeCustom")
		 */
		removableCustomBadges?: boolean;
	}>(),
	{
		miniBadges: false,
		hdImages: false,
		showNoFollow: false,
		removableCustomBadges: false,
	},
);

/**
 * Custom badges of the user.
 */
const customBadges = computed(() => {
	const userBadges = storeUsers.customUserBadges[props.user.id];
	if (!userBadges) return [];

	let list = storeUsers.customBadgeList;
	if (!storeAuth.isPremium) {
		list = list.filter((v) => v.enabled !== false);
	}
	const res: TwitchatDataTypes.TwitchatCustomUserBadge[] = [];
	for (const badge of userBadges) {
		const badgeSource = list.find((v) => v.id == badge.id);
		if (badgeSource) res.push(badgeSource);
	}
	return res;
});

const badgeList = computed<BadgeItem[]>(() => {
	const res: BadgeItem[] = [];

	// Index-based keys as some platforms give multiple badges with the same ID
	props.badges.forEach((b, i) => {
		const key = "p" + i;
		if (props.miniBadges) {
			if (b.id == "predictions") {
				const color = (b.version ?? "").indexOf("pink") > -1 ? "pink" : "blue";
				res.push({
					kind: "mini",
					key,
					cls: "prediction " + color,
					tooltip: b.title ?? "Prediction",
				});
				return;
			}
			const mini = MINI_BADGES[b.id];
			if (!mini) return;
			// Subscriber title contains the sub duration
			const tooltip = b.id == "subscriber" && b.title ? b.title : t(mini.labelKey);
			res.push({ kind: "mini", key, cls: mini.cls, tooltip });
		} else if (b.iconName) {
			res.push({ kind: "icon", key, name: b.iconName, tooltip: b.title ?? "" });
		} else {
			res.push({
				kind: "img",
				key,
				src: props.hdImages ? b.icon.hd || b.icon.sd : b.icon.sd,
				alt: b.title ?? b.id,
				tooltip:
					"<div style='text-align:center'><img src='" +
					(b.icon.hd || b.icon.sd) +
					"' width='64' class='emote'><br>" +
					(b.title ?? "") +
					"</div>",
			});
		}
	});

	for (const b of customBadges.value) {
		res.push({
			kind: "img",
			key: "c" + b.id,
			src: b.img,
			alt: b.name || "custom badge",
			tooltip: props.removableCustomBadges ? t("usercard.remove_badgesBt") : b.name || "",
			customId: b.id,
		});
	}

	if (props.showNoFollow) {
		res.push({
			kind: "icon",
			key: "noFollow",
			name: "unfollow",
			tooltip: t("chat.message.no_follow"),
		});
	}

	return res;
});

function onClickBadge(badge: BadgeItem): void {
	if (badge.kind == "img" && badge.customId && props.removableCustomBadges) {
		emit("removeCustom", badge.customId);
	}
}
</script>

<style scoped lang="less">
.userBadges {
	gap: 2px;
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	vertical-align: middle;
	color: var(--color-text);

	.badge {
		width: 1em;
		height: 1em;
		flex-shrink: 0;
		object-fit: contain;

		&.removable {
			cursor: not-allowed;
		}

		&.mini {
			width: 0.4em;
			&.prediction {
				width: 1em;
				border-radius: 50%;
				margin-right: 0.25em;
				&.pink {
					background-color: #f50e9b;
				}
				&.blue {
					background-color: #387aff;
				}
			}
			&.vip {
				background-color: #e00bb9;
			}
			&.subscriber {
				background-color: #9147ff;
			}
			&.premium {
				background-color: #00a3ff;
			}
			&.moderator {
				background-color: #39db00;
			}
			&.staff {
				background-color: #666666;
			}
			&.broadcaster {
				background-color: #ff0000;
			}
			&.partner {
				background: linear-gradient(
					0deg,
					rgba(145, 71, 255, 1) 0%,
					rgba(145, 71, 255, 1) 40%,
					rgba(255, 255, 255, 1) 41%,
					rgba(255, 255, 255, 1) 59%,
					rgba(145, 71, 255, 1) 60%,
					rgba(145, 71, 255, 1) 100%
				);
			}
			&.founder {
				background: linear-gradient(0deg, #e53fcc 0%, #884ef6 100%);
			}
			&.ambassador {
				background: linear-gradient(0deg, #40e4cb 0%, #9048ff 100%);
			}
		}
	}
}
</style>
