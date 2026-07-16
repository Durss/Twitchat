<template>
	<div
		class="overlayanimatedtext"
		ref="rootEl"
		v-if="params"
		:class="[params.animStyle]"
		:style="{
			fontFamily: params.textFont,
			fontSize: params.textSize + 'px',
			color: params.colorBase,
			opacity: ready ? '1' : '0',
		}"
	>
		<div ref="textEl" v-if="text" v-html="text" class="textHolder"></div>
	</div>
</template>

<script setup lang="ts">
import { useOverlayConnector } from "@/composables/useOverlayConnector";
import type TwitchatEvent from "@/events/TwitchatEvent";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import gsap from "gsap";
import DOMPurify from "isomorphic-dompurify";
import SplitType from "split-type";
import { nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { useRoute } from "vue-router";

type AnimatedTextEntry = NonNullable<TwitchatEvent<"SET_ANIMATED_TEXT_CONTENT">["data"]>;

const text = ref<string>("");
const ready = ref<boolean>(false);
const params = ref<TwitchatDataTypes.AnimatedTextData>();
const strongColor = ref<string>("inherit");

const rootEl = useTemplateRef<HTMLElement>("rootEl");
const textEl = useTemplateRef<HTMLElement>("textEl");

let id: string = "";
let currentEntry: AnimatedTextEntry | null = null;
let messageQueue: (AnimatedTextEntry | null)[] = [];
let raf = -1;
let resolveTO = -1;
let autoHideTO = -1;
let split: SplitType | null = null;
let currentState: "opened" | "closed" = "closed";

const route = useRoute();

useOverlayConnector(requestInfo);

onBeforeMount(() => {
	id = (route.query.twitchat_overlay_id as string) ?? "";

	PublicAPI.instance.addEventListener("SET_ANIMATED_TEXT_CONTENT", onText);
	PublicAPI.instance.addEventListener("ON_ANIMATED_TEXT_CLOSE", onClose);
	PublicAPI.instance.addEventListener("ON_ANIMATED_TEXT_CONFIGS", onConfig);
});

onMounted(() => {
	// messageQueue.push({
	// 	id,
	// 	queryId: "",
	// 	text: "<img class='emote' src='https://cdn.bsky.app/img/avatar/plain/did:plc:wyzra6qiocq57qhfpc2bcfya/bafkreighvsiixoyiddhnq6gywu66gnnxod7zptemvb3xtllnr6bewha3fa@jpeg'>",
	// 	autoHide: true,
	// });
	// messageQueue.push({
	// 	id,
	// 	queryId: "",
	// 	text: "Coucou <strong>ceci</strong> est un test",
	// 	autoHide: true,
	// });
	// messageQueue.push({
	// 	id,
	// 	queryId: "",
	// 	text: "Hello, this is a random <strong>test message</strong>. Another random text for testing.",
	// 	autoHide: false,
	// });
	// next();
});

onBeforeUnmount(() => {
	clearTimeout(resolveTO);
	clearTimeout(autoHideTO);
	cancelAnimationFrame(raf);
	PublicAPI.instance.removeEventListener("SET_ANIMATED_TEXT_CONTENT", onText);
	PublicAPI.instance.removeEventListener("ON_ANIMATED_TEXT_CLOSE", onClose);
	PublicAPI.instance.removeEventListener("ON_ANIMATED_TEXT_CONFIGS", onConfig);
	split?.chars?.forEach((char) => {
		gsap.killTweensOf(char);
	});
});

function requestInfo(): void {
	PublicAPI.instance.broadcast("GET_ANIMATED_TEXT_CONFIGS", { id });
}

/**
 * Called when receiving overlay configs
 * @param e
 */
function onConfig(e: TwitchatEvent<"ON_ANIMATED_TEXT_CONFIGS">): void {
	if (!e.data || e.data.id != id) return;
	const prevParams = params.value;
	params.value = e.data;
	strongColor.value = params.value.colorHighlights;

	let shouldRender = false;
	if (prevParams) {
		shouldRender ||= params.value.animDurationScale != prevParams.animDurationScale;
		shouldRender ||= params.value.animStrength != prevParams.animStrength;
		shouldRender ||= params.value.animStyle != prevParams.animStyle;
		shouldRender ||= params.value.textFont != prevParams.textFont;
		if (text.value && shouldRender) {
			stopAll();
			messageQueue.unshift(currentEntry);
			next();
		}
	} else {
		next();
	}
}

/**
 * Stops all animations
 */
function stopAll(): void {
	currentState = "closed";
	clearTimeout(resolveTO);
	clearTimeout(autoHideTO);
	split?.chars?.forEach((char) => {
		gsap.killTweensOf(char);
	});
	if (raf > -1) cancelAnimationFrame(raf);
}

/**
 * Called when requesting to display a new text
 * @param e
 */
function onText(e: TwitchatEvent<"SET_ANIMATED_TEXT_CONTENT">): void {
	if (!e.data || e.data.id != id) return;
	if (e.data.bypassAll) {
		stopAll();
		messageQueue = [];
	}
	messageQueue.push(e.data);
	if (messageQueue.length == 1) next();
}

/**
 * Called when requesting to display a new text
 * @param e
 */
async function onClose(e: TwitchatEvent<"ON_ANIMATED_TEXT_CLOSE">): Promise<void> {
	if (!e.data || e.data.id != id) return;
	await hideText();
	PublicAPI.instance.broadcast("ON_ANIMATED_TEXT_HIDE_COMPLETE", { queryId: e.data.queryId });
}

/**
 * Animate next text
 */
async function next(): Promise<void> {
	if (!params.value) return;

	if (currentEntry) {
		const prevEntry = currentEntry;
		await hideText();
		PublicAPI.instance.broadcast("ON_ANIMATED_TEXT_HIDE_COMPLETE", {
			queryId: prevEntry.queryId,
		});
		currentEntry = null;
	}

	if (messageQueue.length == 0) return;
	ready.value = false;

	// Grab next item in queue
	const entry = messageQueue[0];
	if (!entry) return;

	// Clear text
	text.value = "";
	await nextTick();

	currentEntry = entry;
	// Render text
	text.value = DOMPurify.sanitize(entry.text);

	// Wait for text to render
	await nextTick();

	// Start animation
	await showText();

	// Remove text from queue once displayed
	messageQueue.shift();

	// If requesting to automatically hide text..
	if (entry.autoHide) {
		// Compute wait duration based on text length
		let textLen = textEl.value?.textContent?.length;

		// Exception for caterpillar animation that has no "hide" animation
		// as the text simply passes through the screen
		if (params.value.animStyle == "caterpillar") textLen = 0;

		// Wait enough time for text to be read
		autoHideTO = window.setTimeout(
			async () => {
				// Close text
				await hideText();
				currentEntry = null;
				PublicAPI.instance.broadcast("ON_ANIMATED_TEXT_HIDE_COMPLETE", {
					queryId: entry.queryId,
				});
				// Next text in queue
				next();
			},
			(textLen || 0) * 100,
		);
	} else {
		PublicAPI.instance.broadcast("ON_ANIMATED_TEXT_SHOW_COMPLETE", {
			queryId: entry.queryId,
		});
		if (messageQueue.length > 0) next();
	}
}

/**
 * Starts text animation
 */
async function showText(): Promise<void> {
	if (currentState == "opened") return;
	currentState = "opened";
	await nextTick();
	let hasImages = false;
	// Wait for potential included images to complete loading
	await new Promise<void>((allImagesLoaded) => {
		const images = Array.from(textEl.value!.querySelectorAll("img"));
		hasImages = images.length > 0;
		if (hasImages) {
			const imagePromises = images.map((img) => {
				return new Promise<void>((resolveImg) => {
					if (img.complete && img.naturalHeight !== 0) {
						resolveImg();
					} else {
						img.addEventListener("load", () => resolveImg(), { once: true });
						img.addEventListener("error", () => resolveImg(), { once: true });
					}
				});
			});
			Promise.all(imagePromises).then(() => allImagesLoaded());
		} else {
			allImagesLoaded();
		}
	});
	return new Promise<void>((resolve) => {
		split = new SplitType(textEl.value!, {
			split: ["words", "chars"],
			charClass: "char",
			wordClass: "word",
		});
		if (split.chars?.length == 0 && !hasImages) {
			resolve();
			return;
		}
		const ads = 2 - params.value!.animDurationScale;
		const amp = params.value!.animStrength;
		const sizeRatio = (params.value!.textSize - 10) / 70;
		// const chars = split.chars || [];
		const chars =
			(Array.from(textEl.value!.querySelectorAll("*")).filter(
				(el) => el.children.length === 0,
			) as HTMLElement[]) || [];
		ready.value = true;

		if (raf > -1) cancelAnimationFrame(raf);

		switch (params.value!.animStyle) {
			case "wave": {
				gsap.fromTo(
					chars,
					{ scale: 0 },
					{
						scale: 1,
						ease: "back.out(" + Math.pow(amp, 2) * 5 + ")",
						duration: 0.5 * ads,
						stagger: 0.025 * ads,
					},
				);
				gsap.fromTo(
					chars,
					{ opacity: 0 },
					{
						opacity: 1,
						ease: "none",
						duration: 0.25 * ads,
						stagger: 0.025 * ads,
						onComplete: () => {
							resolveTO = window.setTimeout(() => {
								resolve();
							}, 250);
						},
					},
				);
				break;
			}

			case "typewriter": {
				let delay = 0;
				for (const char of chars) {
					char.style.opacity = "0";
					window.setTimeout(() => {
						char.style.opacity = "1";
					}, delay * 1000);
					delay += ads * (Math.random() * Math.random() * 0.2);
					if (char === char.parentElement?.lastElementChild) {
						delay += ads * 0.3 * Math.random();
					}
				}
				resolveTO = window.setTimeout(() => {
					resolve();
				}, delay * 1000);
				break;
			}

			case "wobble": {
				gsap.fromTo(
					chars,
					{ scale: 0, opacity: 0 },
					{
						scale: 1,
						opacity: 1,
						ease:
							"elastic.out(" +
							Math.max(1, amp * 1.5) +
							"," +
							Math.max(0.05, ((2 - amp) / 2) * 0.5 + 0.1 - ads * 0.1) +
							")",
						duration: 2 * ads,
						stagger: 0.025 * ads,
						onComplete: () => {
							resolveTO = window.setTimeout(() => {
								resolve();
							}, 250);
						},
					},
				);
				break;
			}

			case "bounce": {
				chars.forEach((v) => (v.style.transformOrigin = "bottom center"));
				for (let i = 0; i < chars.length; i++) {
					const char = chars[i]!;
					gsap.fromTo(
						char,
						{
							y: "-100%",
							scaleX: 1 - (amp / 2) * 0.5,
							scaleY: 2 * amp,
							opacity: 0,
						},
						{
							y: 0,
							scaleY: 1,
							opacity: 1,
							ease: "none",
							duration: 0.1 * ads,
							delay: i * 0.05 * ads,
						},
					);
					gsap.to(char, {
						y: 0,
						scaleY: 0.1,
						scaleX: 2 * amp,
						ease: "none",
						duration: 0.1 * ads,
						delay: i * 0.05 * ads + 0.1 * ads,
					});
					const delay = i * 0.05 * ads + 0.1 * ads + 0.06 * ads;
					gsap.to(char, {
						scaleY: 1,
						ease: "back.out(" + Math.pow(amp, 2) * 2.5 + ")",
						duration: 0.3 * ads,
						delay,
					});
					gsap.to(char, {
						scaleX: 1,
						ease: "back.out",
						duration: 0.3 * ads,
						delay,
					});
					if (i === chars.length - 1) {
						resolveTO = window.setTimeout(
							() => {
								resolve();
							},
							(delay + 0.3) * 1000,
						);
					}
				}
				break;
			}

			case "rotate": {
				chars.forEach((v) => (v.style.transformOrigin = "10% 10%"));

				gsap.fromTo(
					chars,
					{ scale: 0, opacity: 0 },
					{
						scale: 1,
						opacity: 1,
						ease: "back.out(" + Math.pow(amp, 2) * 2.5 + ")",
						duration: 0.5 * ads,
						stagger: 0.025 * ads,
					},
				);
				gsap.fromTo(
					chars,
					{ rotation: 100 * amp + "deg" },
					{
						rotation: 0,
						ease: "back.out",
						duration: 0.5 * ads,
						delay: 0.1,
						stagger: 0.025 * ads,
						onComplete: () => {
							resolveTO = window.setTimeout(() => {
								resolve();
							}, 350);
						},
					},
				);
				break;
			}

			case "neon": {
				chars.forEach((v, index) => {
					gsap.fromTo(
						v,
						{ opacity: 0 },
						{
							opacity: 1,
							ease: "none",
							delay: Math.random() * 0.25 * amp,
							duration: 0.5 * ads * Math.random(),
							onUpdate: () => {
								if (Math.random() > 0.9) {
									v.style.opacity = Math.random() > 0.5 ? "1" : ".25";
								}
							},
							onComplete: () => {
								v.style.opacity = "1";
								if (Math.random() > 0.35) {
									gsap.from(v, {
										immediateRender: false,
										opacity: 0.35,
										delay: 1 * ads * Math.random(),
										ease: "step(5)",
										duration: 0.2 * amp,
										repeat: Math.floor(Math.random() * Math.pow(amp, 3)),
									});
								}
							},
						},
					);
					if (index === chars.length - 1) {
						resolveTO = window.setTimeout(
							() => {
								resolve();
							},
							(0.5 * ads + 0.5 * amp) * 1000,
						);
					}
				});
				break;
			}

			case "elastic": {
				let delay = 0;
				chars.forEach((v, index) => {
					const dist = 100 * amp;
					const angle = Math.random() * Math.PI * 2;
					const ox = Math.cos(angle) * dist;
					const oy = Math.sin(angle) * dist;
					gsap.fromTo(
						v,
						{ x: ox + "%" },
						{
							x: 0,
							ease:
								"elastic.out(" +
								amp * 1.5 +
								"," +
								Math.max(0.05, ((2 - amp) / 2) * 0.5 + 0.1 - ads * 0.1) +
								")",
							delay,
							duration: 1.5 * ads,
						},
					);
					gsap.fromTo(
						v,
						{ y: oy + "%" },
						{
							y: 0,
							ease:
								"elastic.out(" +
								amp * 1.5 +
								"," +
								Math.max(0.05, ((2 - amp) / 2) * 0.5 + 0.1 - ads * 0.1) +
								")",
							delay: delay + 0.025 * ads,
							duration: 1.5 * ads,
						},
					);
					gsap.fromTo(
						v,
						{ opacity: 0 },
						{
							opacity: 1,
							ease: "none",
							delay,
							duration: 0.25 * ads,
						},
					);
					delay += 0.025 * ads;

					if (index === chars.length - 1) {
						resolveTO = window.setTimeout(
							() => {
								resolve();
							},
							(1.5 * ads + delay) * 1000,
						);
					}
				});
				break;
			}

			case "swarm": {
				const bounds = rootEl.value!.getBoundingClientRect();
				const points = chars.map((char) => {
					const rect = char.getBoundingClientRect();
					return {
						x: rect.left,
						y: rect.top,
						dir: Math.random() * Math.PI * 2,
						dist: (Math.random() + 0.25) * 8 * amp,
						speed:
							(Math.random() - Math.random()) * Math.max(0.2, amp * (2 - ads)) * 0.25,
						speedEnd: (Math.random() + 0.25) * 5 * Math.max(0.2, amp * (2 - ads)),
					};
				});
				const leader = { x: bounds.left, y: bounds.height / 2.5 };
				chars.forEach((char) => {
					char.style.position = "fixed";
					char.style.left = `${leader.x}px`;
					char.style.top = `${leader.y}px`;
					char.style.willChange = "left, top";
				});

				const leaderSpeed = 2 + 8 * (2 - ads);
				let leaderAngle = Math.random() * Math.PI * 2;
				let leaderAmp = 25 * amp;

				// const refPoint = document.createElement("div");
				// refPoint.style.position = "fixed";
				// refPoint.style.width = "15px";
				// refPoint.style.height = "15px";
				// refPoint.style.borderRadius = "50%";
				// refPoint.style.backgroundColor = "red";
				// refPoint.style.left = `${points[0].x}px`;
				// refPoint.style.top = `${points[0].y}px`;
				// rootEl.value!.appendChild(refPoint);
				const angleDistance = (angle1: number, angle2: number): number => {
					const angle = Math.abs(((angle1 - angle2 + Math.PI) % (Math.PI * 2)) - Math.PI);
					return angle;
				};
				const renderFrame = () => {
					raf = requestAnimationFrame(() => renderFrame());

					let placed = Array(chars.length).fill(false);
					for (let i = 0; i < chars.length; i++) {
						// if(i < chars.length-1) continue
						const char = chars[i]!;
						const target = points[i]!;
						let currX = parseFloat(char.style.left) + bounds.left;
						let currY = parseFloat(char.style.top) + bounds.top;

						if (leader.x <= target.x) {
							// Follow the leader
							target.dir += target.speed;
							currX += (leader.x - currX) * 0.2;
							currY += (leader.y - currY + Math.sin(leaderAngle) * leaderAmp) * 0.2;
							char.style.left = `${currX + Math.cos(target.dir) * target.dist - bounds.left}px`;
							char.style.top = `${currY + Math.sin(target.dir) * target.dist - bounds.top}px`;
						} else {
							// Gradually move to final position
							const angle = Math.atan2(target.y - currY, target.x - currX);
							target.dir +=
								angleDistance(target.dir, angle) *
								Math.max(0.1, ((2 - ads) / 2) * 0.2);
							const dist = Math.sqrt(
								Math.pow(target.x - currX, 2) + Math.pow(target.y - currY, 2),
							);
							if (dist <= target.speedEnd * 10) {
								target.speedEnd *= 0.95;
							}
							if (dist <= target.speedEnd * 1 + 0.5) {
								char.style.left = `${target.x - bounds.left}px`;
								char.style.top = `${target.y - bounds.top}px`;
								placed[i] = true;
							} else {
								currX += Math.cos(target.dir) * target.speedEnd;
								currY += Math.sin(target.dir) * target.speedEnd;
								char.style.left = `${currX - bounds.left}px`;
								char.style.top = `${currY - bounds.top}px`;
							}
						}
					}

					const dir = Math.atan2(bounds.height / 2 - leader.y, bounds.width - leader.x);
					leader.x += Math.cos(dir) * leaderSpeed;
					leader.y += Math.sin(dir) * leaderSpeed;

					leaderAngle += (2 - ads) * 0.25;

					// refPoint.style.left = `${leader.x}px`;
					// refPoint.style.top = `${leader.y + Math.sin(randAngle) * randAmp}px`;

					if (placed.every((p) => p)) {
						resolve();
					}
				};
				renderFrame();
				break;
			}

			case "caterpillar": {
				const bounds = rootEl.value!.getBoundingClientRect();
				const vw = window.innerWidth;
				let scroll = 0;
				const scrollSpeed = ((2 - ads) / 2) * 3 + 1;
				const points = chars.map((char, index) => {
					const rect = char.getBoundingClientRect();
					return {
						x: rect.left + vw,
						y: rect.top,
						angle: index + 0.01,
						freq: scrollSpeed * 0.1 + Math.random() * 0.005, // + sizeRatio*.01,
					};
				});
				chars.forEach((char, index) => {
					const point = points[index]!;
					char.style.left = point.x + "px";
					char.style.top = point.y + "px";
					char.style.position = "fixed";
					char.style.willChange = "transform";
				});

				const lastCharBounds = chars[chars.length - 1]!.getBoundingClientRect().width;
				const renderFrame = () => {
					raf = requestAnimationFrame(() => renderFrame());
					scroll += scrollSpeed * (sizeRatio / 2 + 1);

					for (let i = 0; i < chars.length; i++) {
						// if(i == 1) break;
						const char = chars[i]!;
						const target = points[i]!;
						let currX = parseFloat(char.style.left) + bounds.left;
						let currY = parseFloat(char.style.top) + bounds.top;
						currX =
							points[i]!.x +
							((Math.cos(target.angle + Math.PI) + 1) / 2) *
								(2 - amp + (amp * 4 + 10)) -
							scroll;
						currY =
							points[i]!.y +
							Math.sin(target.angle) * amp * 10 * Math.pow(sizeRatio, 2);
						target.angle += target.freq;
						char.style.left = `${currX - bounds.left}px`;
						char.style.top = `${currY - bounds.top}px`;
						char.style.transform = `rotate(${Math.cos(target.angle - Math.PI) * (amp * 5 + 10)}deg)`;

						if (i === chars.length - 1 && currX < -lastCharBounds * 2) {
							resolve();
							cancelAnimationFrame(raf);
						}
					}
				};
				renderFrame();
				break;
			}
		}
	});
}

/**
 * Closes current text
 */
async function hideText(): Promise<void> {
	if (currentState == "closed") return;
	currentState = "closed";

	await nextTick();

	const promise = new Promise<void>((resolve) => {
		if (!split) {
			split = new SplitType(textEl.value!, {
				split: ["words", "chars"],
				charClass: "char",
				wordClass: "word",
			});
		}
		const chars =
			(Array.from(textEl.value!.querySelectorAll("*")).filter(
				(el) => el.children.length === 0,
			) as HTMLElement[]) || [];

		if (chars?.length == 0) {
			resolve();
			return;
		}
		const ads = 2 - params.value!.animDurationScale;
		const amp = params.value!.animStrength;
		ready.value = true;

		if (raf > -1) cancelAnimationFrame(raf);

		switch (params.value!.animStyle) {
			case "wave": {
				gsap.to(chars, {
					scale: 0,
					ease: "back.in(" + Math.pow(amp, 2) * 5 + ")",
					duration: 0.5 * ads,
					stagger: 0.025 * ads,
				});
				gsap.to(chars, {
					opacity: 0,
					ease: "none",
					delay: 0.25,
					duration: 0.25 * ads,
					stagger: 0.025 * ads,
					onComplete: () => {
						resolveTO = window.setTimeout(() => {
							resolve();
						}, 250);
					},
				});
				break;
			}

			case "typewriter": {
				let maxDelay = 0;
				for (const char of chars) {
					const delay = ads * (Math.random() * Math.random() * 0.5);
					maxDelay = Math.max(maxDelay, delay);
					window.setTimeout(() => {
						char.style.opacity = "0";
					}, delay * 1000);
				}
				resolveTO = window.setTimeout(() => {
					resolve();
				}, maxDelay * 1000);
				break;
			}

			case "wobble": {
				gsap.to(chars, {
					scale: 0,
					opacity: 0,
					ease: "back.in(" + amp * 3 + ")",
					duration: 0.5 * ads,
					stagger: 0.025 * ads,
					onComplete: () => {
						resolveTO = window.setTimeout(() => {
							resolve();
						}, 250);
					},
				});
				break;
			}

			case "bounce": {
				chars.forEach((v) => (v.style.transformOrigin = "bottom center"));
				for (let i = 0; i < chars.length; i++) {
					const char = chars[i]!;
					let delay = i * 0.05 * ads + 0.1 * ads;
					gsap.to(char, {
						scaleY: 0.1,
						scaleX: Math.max(1.2, 1.5 * amp),
						ease: "none",
						duration: 0.1 * ads,
						delay,
					});
					delay += 0.1 * ads;
					gsap.to(char, {
						scaleX: 0.3 * (2 - amp),
						scaleY: 1,
						ease: "none",
						duration: 0.2 * ads,
						delay,
					});
					gsap.to(char, {
						y: "-50%",
						opacity: 0,
						ease: "back.out",
						duration: 0.3 * ads,
						delay: delay + 0.2 * ads * 0.5,
					});
					if (i === chars.length - 1) {
						resolveTO = window.setTimeout(
							() => {
								resolve();
							},
							(delay + 0.3) * 1000,
						);
					}
				}
				break;
			}

			case "rotate": {
				chars.forEach((v) => (v.style.transformOrigin = "10% 10%"));

				gsap.to(chars, {
					rotation: 100 * amp + "deg",
					ease: "back.in",
					duration: 0.5 * ads,
					stagger: 0.025 * ads,
					onComplete: () => {
						resolveTO = window.setTimeout(() => {
							resolve();
						}, 350);
					},
				});
				gsap.to(chars, {
					scale: 0,
					opacity: 0,
					ease: "back.out(" + Math.pow(amp, 2) * 2.5 + ")",
					duration: 0.5 * ads,
					delay: 0.4 * ads,
					stagger: 0.025 * ads,
				});
				break;
			}

			case "neon": {
				let maxDelay = 0;
				for (const char of chars) {
					const delay = ads * (Math.random() * Math.random() * 0.5);
					maxDelay = Math.max(maxDelay, delay);
					window.setTimeout(() => {
						char.style.opacity = "0";
					}, delay * 1000);
				}
				resolveTO = window.setTimeout(() => {
					resolve();
				}, maxDelay * 1000);
				break;
			}

			case "elastic": {
				let delay = 0;
				chars.forEach((v, index) => {
					const dist = 100 * amp;
					const angle = Math.random() * Math.PI * 2;
					const ox = Math.cos(angle) * dist;
					const oy = Math.sin(angle) * dist;
					gsap.to(v, {
						x: ox + "%",
						ease: "back.in(" + amp * 5 + ")",
						delay,
						duration: 0.5 * ads,
					});
					gsap.to(v, {
						y: oy + "%",
						ease: "back.in(" + amp * 5 + ")",
						delay: delay + 0.025 * ads,
						duration: 0.5 * ads,
					});
					gsap.to(v, {
						opacity: 0,
						ease: "none",
						delay: delay + 0.25 * ads,
						duration: 0.25 * ads,
					});
					delay += 0.025 * ads;

					if (index === chars.length - 1) {
						resolveTO = window.setTimeout(
							() => {
								resolve();
							},
							(1.5 * ads + delay) * 1000,
						);
					}
				});
				break;
			}

			case "swarm": {
				const bounds = rootEl.value!.getBoundingClientRect();
				const points = chars.map((char) => {
					const rect = char.getBoundingClientRect();
					return {
						x: rect.left - bounds.left,
						y: rect.top - bounds.top,
						scale: 1,
						dir: Math.random() * Math.PI * 2,
						speed: (Math.random() - Math.random()) * Math.max(0.15, amp * 0.5) * 5,
						// freq: Math.random() * (0.01 + amp),
						freq: 0,
					};
				});
				chars.forEach((char, index) => {
					const point = points[index]!;
					char.style.left = point.x + "px";
					char.style.top = point.y + "px";
					char.style.position = "fixed";
					char.style.willChange = "transform";
				});

				const renderFrame = () => {
					raf = requestAnimationFrame(() => renderFrame());

					let placed = Array(chars.length).fill(false);
					for (let i = 0; i < chars.length; i++) {
						// if(i == 1) break;
						const char = chars[i]!;
						const target = points[i]!;
						let currX = parseFloat(char.style.left) + bounds.left;
						let currY = parseFloat(char.style.top) + bounds.top;
						currX += Math.cos(target.dir) * target.speed;
						currY += Math.sin(target.dir) * target.speed;
						char.style.left = `${currX - bounds.left}px`;
						char.style.top = `${currY - bounds.top}px`;
						char.style.transform = `scale(${target.scale})`;

						target.dir += target.freq;
						if (target.scale > 0) {
							target.scale -= ((2 - ads) / 2) * 0.04 + 0.01;
						} else {
							target.scale = 0;
							placed[i] = true;
						}
					}

					if (placed.every((p) => p)) {
						resolve();
					}
				};
				renderFrame();
				break;
			}

			case "caterpillar": {
				resolve();
				break;
			}
		}
	});
	promise.then(() => {
		if (currentEntry) {
			split!.chars = [];
			split!.words = [];
			split!.lines = [];
			split = null;
			text.value = "";
		}
	});
	return promise;
}
</script>

<style scoped lang="less">
.overlayanimatedtext {
	position: absolute;
	// top: 50%;
	left: 50%;
	transform: translate(-50%, 0);
	width: 100%;
	text-align: center;
	padding: 0.5em;

	// :deep(.char),
	// :deep(.word) {
	// 	will-change: transform;
	// }

	&.caterpillar {
		white-space: nowrap;
		word-spacing: 0.25em;
		text-align: left;
	}

	:deep(b),
	:deep(strong) {
		color: v-bind(strongColor);
	}

	:deep(.emote) {
		height: 1.2em;
	}
}
</style>

