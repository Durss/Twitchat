<template>
	<div class="pinslist blured-background-window">
		<div class="scrollable">
			<button v-for="pin in pinList" v-tooltip="pin.label || $t(pin.labelKey)"
			:class="{pinned: pin.pinned}"
			@click="togglePin(pin.id)">
				<icon :name="pin.icon" class="icon" />
				<span class="label">{{ pin.label || $t(pin.labelKey) }}</span>
			</button>
		</div>
	</div>
</template>

<script lang="ts">
import { TriggerTypes } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TriggerUtils from '@/utils/TriggerUtils';
import { gsap } from 'gsap/gsap-core';
import { Component, toNative, Vue } from 'vue-facing-decorator';

@Component({
	components:{},
	emits:["close"],
})
class PinsList extends Vue {

	private clickHandler!:(e:MouseEvent) => void;

	public get pinList() {
		const pins = TwitchatDataTypes.PinnableMenuItems.map(v=> {
			return {
				id:v.id,
				icon:v.icon,
				label:"",
				labelKey:v.labelKey,
				pinned: this.$store.params.pinnedMenuItems.includes(v.id),
			}
		});
		const triggerPins: typeof pins[0][] = [];
		this.$store.triggers.triggerList.filter(v=> v.type == TriggerTypes.SLASH_COMMAND).forEach(trigger => {
			const triggerInfo = TriggerUtils.getTriggerDisplayInfo(trigger);
			triggerPins.push({
				id:`trigger:${trigger.id}`,
				icon:"broadcast",
				label:triggerInfo.label,
				labelKey:triggerInfo.labelKey || "",
				pinned: this.$store.params.pinnedMenuItems.includes(`trigger:${trigger.id}`),
			});
		});
		return [...pins, ...triggerPins];
	}

	public mounted():void {
		this.clickHandler = (e:MouseEvent) => this.onClick(e);
		document.addEventListener("mousedown", this.clickHandler);
		this.open();
	}

	public beforeUnmount():void {
		document.removeEventListener("mousedown", this.clickHandler);
	}

	public togglePin(id:typeof TwitchatDataTypes.PinnableMenuItems[number]["id"]):void {
		this.$store.params.toggleChatMenuPin(id);
	}

	private open():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.from(ref, {duration:.3, scaleY:0, clearProps:"scaleY", ease:"back.out"});
	}

	private close():void {
		const ref = this.$el as HTMLDivElement;
		gsap.killTweensOf(ref);
		gsap.to(ref, {duration:.2, scaleY:0, delay:.1, clearProps:"scaleY", ease:"back.in", onComplete:() => {
			this.$emit("close");
		}});
	}

	private onClick(e:MouseEvent):void {
		let target = e.target as HTMLDivElement;
		const ref = this.$el as HTMLDivElement;
		while(target != document.body && target != ref && target) {
			target = target.parentElement as HTMLDivElement;
		}
		if(target != ref) {
			this.close();
		}
	}

}
export default toNative(PinsList);
</script>

<style scoped lang="less">
.pinslist {
	max-width: 500px;
	max-height: 300px;
	
	.scrollable {
		max-width: 500px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5em, 1fr));
		align-items: stretch;
		align-content: flex-end;
		gap: 5px;
	}

	button {
		padding: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--color-text);
		border-radius: var(--border-radius);
			user-select: none;

		&:hover{
			background-color: var(--color-primary-fader);
		}
		&.pinned {
			color: var(--color-light);
			background-color: var(--color-primary);
		}

		.icon {
			max-width: 1.75em;
			height: 1.5em;
			margin-bottom: 0.25em;
		}
		.label {
			font-size: 0.8em;
			font-weight: 300;
			word-break: break-word;
		}
	}
}

@media only screen and (max-width: 450px) {
	.pinslist {
		max-width: 100%;
		max-height: unset;
		.scrollable {
			max-width: 100%;
		}
	}
}
</style>