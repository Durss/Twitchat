<template>
	<component
	:class="classes"
	:is="nodeType"
	:type="type"
	:target="target"
	:to="to"
	:href="type=='link'? to : null"
	@click="onClick($event)"
	@mouseup="onRelease($event)">
		<span class="background"></span>
		<Icon v-if="copySuccess" name="checkmark" />

		<Icon v-else-if="copyFail" name="cross" theme="alert" />

		<template v-else>
			<span v-if="loading" class="loadingBorder"></span>

			<Icon v-if="icon && loading" name="loader" />

			<Icon class="icon" v-if="icon && !loading" :name="icon" alt="icon" />
			<span class="icon" v-if="$slots.icon"><slot name="icon"></slot></span>
			<span class="label" ref="label" v-if="$slots.default"><slot></slot></span>

			<div class="clickArea"></div>

			<input type="file" v-if="type=='file'" class="browse" :accept="accept" ref="browse" @change="onBrowseFile()" />
		</template>
	</component>
</template>

<script setup lang="ts">
import Utils from '@/utils/Utils';
import { gsap } from 'gsap/gsap-core';
import { computed, getCurrentInstance, ref, useSlots, useTemplateRef } from 'vue';
import Icon from './Icon.vue';

const props = withDefaults(defineProps<{
	icon?: string;
	loading?: boolean;
	type?: "link" | "button" | "file";
	target?: string;
	to?: unknown;
	big?: boolean;
	small?: boolean;
	primary?: boolean;
	secondary?: boolean;
	alert?: boolean;
	premium?: boolean;
	twitch?: boolean;
	light?: boolean;
	transparent?: boolean;
	selected?: boolean;
	disabled?: boolean;
	modelValue?: boolean;
	noBounce?: boolean;
	accept?: string;
	copy?: string;
	file?: string;
}>(), {
	loading: false,
	type: 'button',
	big: false,
	small: false,
	primary: false,
	secondary: false,
	alert: false,
	premium: false,
	twitch: false,
	light: false,
	transparent: false,
	selected: false,
	disabled: false,
	modelValue: false,
	noBounce: false,
	accept: "image/*",
	copy: "",
});

const emit = defineEmits<{
	'click': [event: MouseEvent];
	'update:file': [file: File];
}>();

const slots = useSlots();
const instance = getCurrentInstance();

const copySuccess = ref(false);
const copyFail = ref(false);
const browseRef = useTemplateRef("browse");

const nodeType = computed(() => {
	if(props.to) return "router-link";
	if(props.type == "link") return "a";
	return "button";
});

const classes = computed(() => {
	let list =  ["button", "type-"+props.type];
	if(!slots.default) list.push("noTitle");
	if(props.primary !== false || copySuccess.value) list.push("primary");
	if(props.twitch !== false) list.push("twitch");
	if(props.secondary !== false) list.push("secondary");
	if(props.alert !== false) list.push("alert");
	if(props.premium !== false) list.push("premium");
	if(props.light !== false) list.push("light");
	if(props.transparent !== false) list.push("transparent");
	if(props.big !== false) list.push("big");
	if(props.small !== false) list.push("small");
	if(props.selected !== false) list.push("selected");
	if(props.loading !== false) list.push("disabled", "loading");
	else if(props.disabled !== false) list.push("disabled");
	return list;
});

function onBrowseFile(): void {
	let input = browseRef.value;
	if(input?.files && input.files[0]) {
		emit('update:file', input.files[0])
	}
}

async function onClick(event: MouseEvent): Promise<void> {
	if(props.disabled !== false || props.loading) {
		event.preventDefault();
		event.stopPropagation();
		return;
	}
	emit("click", event);

	if(props.copy) {
		try {
			await Utils.copyToClipboard(props.copy);
			copySuccess.value = true;
		}catch(e) {
			copyFail.value = true;
		}
		await Utils.promisedTimeout(2000);
		copySuccess.value = false;
		copyFail.value = false;
	}
}

function onRelease(_event: MouseEvent): void {
	if(props.disabled || props.loading || props.noBounce !== false) return;
	const el = instance?.proxy?.$el;
	if (el) {
		gsap.fromTo(el, {translateY:-3, scaleY:1.1}, {duration:.5, translateY:0, scaleY:1, clearProps:"all", ease:"elastic.out(1.5)", delay:.05});
	}
}
</script>

<style lang="less" scoped>
.button {
	.emboss();
	cursor: pointer;
	border-radius: var(--border-radius);
	display: inline-flex;
	flex-direction: row;
	position: relative;
	flex-wrap: wrap;
	padding: .3em .7em;
	row-gap: 0;
	column-gap: .5em;
	align-items: center;
	justify-content: center;
	text-decoration: none;
	user-select: none;
	text-decoration: none !important;
	font-size: 1rem;
	color: var(--color-text);

	&:not(.type-file)>* {
		pointer-events: none;
	}

	.clickArea {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		background: transparent;
	}

	.loadingBorder {
		@offset: 0px;
		position: absolute;
		z-index: -1;
		top: -@offset;
		left: -@offset;
		border-radius: inherit;
		background-color: var(--color-button);
		background-image: linear-gradient(20deg, rgba(255,255,255,0) 35%, rgba(255,255,255,.7) 40%, rgba(255,255,255,.7) 60%, rgba(255,255,255,0) 65%);
		background-repeat: repeat-x;
		background-size:  200% 100%;
		width: calc(100% + @offset*2);
		height: calc(100% + @offset*2);
		animation: glowing 1s linear infinite;

		@keyframes glowing {
			0% { background-position: 200% 0; }
			100% { background-position: 0 0; }
		}
	}

	.background {
		border-radius: inherit;
		position: absolute;
		top:0;
		left:0;
		width: 100%;
		height: 100%;
		transition: all .15s;
		background-color: var(--color-button);
	}

	&.disabled {
		opacity: .5;
		cursor: not-allowed;
	}
	&.loading {
		cursor: wait;
		.background {
			top: 1px;
			left: 1px;
			width: calc(100% - 2px);
			height: calc(100% - 2px);
		}
	}

	&:not(.disabled){
		&:hover {
			.background {
				background-color: var(--color-button-light);
			}
		}

		&:active{
			transform: translateY(2px);
			.clickArea{
				top: -2px;
			}
			.background {
				background-color: var(--color-button-dark);
				box-shadow: 0px 0px 0px rgba(255, 255, 255, 0), 0px 0px 0px rgba(0, 0, 0, 0);
			}
		}
	}
	.icon, .label {
		transition: all .25s;
		z-index: 0;
	}
	.label {
		line-height: 1em;
		text-align: center;
		flex-grow: 1;
		// flex-basis: 50px;
		text-overflow: ellipsis;
		overflow: hidden;
		display: block;
		line-height: 1.25em;//Makes sure letters like g or p are not cut on the bottom
		text-shadow: 1px 1px 0 rgba(0, 0, 0, .5);
		&:empty {
			display: none;
		}
	}

	.browse {
		position: absolute;
		top: -1em;
		left: -1em;
		width: calc(100% + 1em);
		height: calc(100% + 1em);
		opacity: .01;
		&::file-selector-button {
			cursor: pointer;
			width: 200%;
			height: 200%;
		}
	}
	.icon {
		height: 1em;
		max-width: 1em;
		justify-self: center;
		line-height: 1em;
		color: inherit;
		:deep(img) {
			width: 100%;
			height: 100%;
			vertical-align: top;
		}
	}
	&.big {
		font-size: 1.4rem;
	}

	&.small {
		font-size: .8rem;
	}

	&.noTitle {
		padding: .3em;
	}

	&.primary {
		color: var(--color-light);
		.background {
			background-color: var(--color-primary);
		}
		&:not(.disabled){
			&:hover {
				.background {
					background-color: var(--color-primary-light);
				}
			}
			&:active {
				.background {
					background-color: var(--color-primary-dark);
				}
			}
		}
		.loadingBorder {
			background-color: var(--color-primary);
		}
	}

	&.secondary {
		color: var(--color-light);
		.label {
			text-shadow: 1px 1px 0 rgba(0, 0, 0, .5);
		}
		.background {
			background-color: var(--color-secondary);
		}
		&:not(.disabled){
			&:hover {
				.background {
					background-color: var(--color-secondary-light);
				}
			}
			&:active {
				.background {
					background-color: var(--color-secondary-dark);
				}
			}
		}
		.loadingBorder {
			background-color: var(--color-secondary);
		}
	}

	&.twitch {
		color: var(--color-light);
		.label {
			text-shadow: 1px 1px 0 rgba(0, 0, 0, .5);
		}
		.background {
			background-color: var(--color-twitch);
		}
		&:not(.disabled){
			&:hover {
				.background {
					background-color: var(--color-twitch-light);
				}
			}
			&:active {
				.background {
					background-color: var(--color-twitch-dark);
				}
			}
		}
		.loadingBorder {
			background-color: var(--color-twitch);
		}
	}

	&.alert {
		color: var(--color-light);
		.label {
			text-shadow: none;
		}
		.background {
			background-color: var(--color-alert);
		}
		&:not(.disabled){
			&:hover {
				.background {
					background-color: var(--color-alert-light);
				}
			}
			&:active {
				.background {
					background-color: var(--color-alert-dark);
				}
			}
		}
		.loadingBorder {
			background-color: var(--color-alert);
		}
	}

	&.premium {
		color: var(--color-light);
		.label {
			text-shadow: none;
			opacity: 1;
		}
		.icon {
			opacity: 1;
		}
		.background {
			background-color: var(--color-premium);
		}
		&:not(.disabled){
			&:hover {
				.background {
					background-color: var(--color-premium-light);
				}
			}
			&:active {
				.background {
					background-color: var(--color-premium-dark);
				}
			}
		}
		.loadingBorder {
			background-color: var(--color-premium);
		}
	}

	&.light {
		color: var(--color-primary);
		.label {
			text-shadow: unset;
		}
		&.secondary {
			color: var(--color-secondary);
		}
		&.alert {
			color: var(--color-alert);
		}
		&.premium {
			color: var(--color-premium);
		}
		.background {
			background-color: var(--color-light);
		}
		&:not(.disabled){
			&:hover {
				.background {
					background-color: var(--color-light-dark);
				}
			}
			&:active {
				.background {
					background-color: var(--color-light-dark);
				}
			}
		}
	}

	&.transparent {
		color: var(--color-text);
		box-shadow: unset;
		.label {
			text-shadow: unset;
		}
		&.secondary {
			color: var(--color-secondary);
		}
		&.alert {
			color: var(--color-alert);
		}
		&.premium {
			color: var(--color-premium);
		}
		&.light {
			color: var(--color-light);
		}
		.background {
			background-color: transparent;
		}
		&:not(.disabled){
			&:hover {
				.background {
					background-color: var(--color-text-fadest);
				}
			}
			&:active {
				.background {
					background-color: transparent;
				}
			}
		}
	}

	&.selected {
		color: var(--color-text-inverse);
		.label {
			font-weight: bold;
			text-shadow: unset;
		}
		.background{
			background-color: var(--color-button-extralight);
		}
		&:active {
			.background{
				background-color: var(--color-button);
			}
		}
		&.primary {
			color: var(--color-dark);
			.background{
				background-color: var(--color-primary-extralight);
			}
			&:active {
				.background{
					background-color: var(--color-primary);
				}
			}
		}
		&.secondary {
			color: var(--color-dark);
			.background{
				background-color: var(--color-secondary-extralight);
			}
			&:active {
				.background{
					background-color: var(--color-secondary);
				}
			}
		}
		&.alert {
			color: var(--color-dark);
			.background{
				background-color: var(--color-alert-extralight);
			}
			&:active {
				.background{
					background-color: var(--color-alert);
				}
			}
		}
		&.premium {
			color: var(--color-dark);
			.background{
				background-color: var(--color-premium-extralight);
			}
			&:active {
				.background{
					background-color: var(--color-premium);
				}
			}
		}
	}
}

@media only screen and (max-width: 500px) {
	.button {
		&.noTitle.big, &.big {
			padding: .5em;
			font-size: 1.2rem;
			min-height: calc(1.2em + .5em);
		}
	}
}
</style>



<style lang="less">
body.light {
	.button {
		.loadingBorder {
			background-image: linear-gradient(20deg, rgba(255,255,255,0) 35%, rgba(255,255,255,1) 40%, rgba(255,255,255,1) 60%, rgba(255,255,255,0) 65%) !important;
		}
		&.selected {
			color: var(--color-text);
		}
		.label {
			text-shadow: none;
		}
	}
}
</style>
