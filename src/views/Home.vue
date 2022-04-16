<template>
	<div class="home">
		
		<Chat v-if="authenticated" />

		<div v-if="!authenticated" class="offline">
			<div class="logo">
				<img src="@/assets/logo.svg" alt="Twitchat">
			</div>
			
			<div class="description">
				<b>Twitchat</b> is a full featured chat alternative for streamers
			</div>
			
			<Button title="Try-it now"
				big
				white
				:to="{name:'login'}"
				class="loginBt"
				:icon="require('@/assets/icons/twitch.svg')"
			/>

			<Button :icon="require('@/assets/icons/discord.svg')"
				title="Join Discord"
				href="https://discord.gg/xFVBprgRvg"
				target="_blank"
				type="link"
				class="discordBt"
				big
			/>
			
			<div class="features">
				<!-- <dir class="title">Features</dir> -->
				<Carousel :items-to-show="1" :wrapAround="true" :autoplay="10000" :pauseAutoplayOnHover="true">
					<Slide :key="0" class="slide">
						<div class="head"><img src="@/assets/icons/hand.svg" alt="hand" class="icon">Greet your viewers</div>
						<div class="description">
							Afraid to forget greeting a viewer?
							<br><strong>Twitchat remembers the first message</strong> of every viewer so you don't forget to greet them.
						</div>
						<img src="@/assets/img/example_greet.jpg" alt="greet">
					</Slide>
					<Slide :key="1" class="slide">
						<div class="head"><img src="@/assets/icons/checkmark_white.svg" alt="check" class="icon">Read mark</div>
						<div class="description">Stop scrolling for hours for the message you stopped reading at, just click it and <strong>instantly see where you stopped reading your chat</strong></div>
						<img src="@/assets/img/example_mark_read.jpg" alt="poll">
					</Slide>
					<Slide :key="2" class="slide">
						<div class="head"><img src="@/assets/icons/conversation.svg" alt="conversation" class="icon"> Follow conversations</div>
						<div class="description">
							Following conversations between viewers can be pretty challenging.
							<br>With a simple click on an button you can <strong>open up a conversation history</strong>.
						</div>
						<img src="@/assets/img/example_conversation.jpg" alt="poll">
					</Slide>
					<Slide :key="3" class="slide">
						<div class="head"><img src="@/assets/icons/search.svg" alt="search" class="icon"> Search messages</div>
						<div class="description">Search messages containing any word.</div>
						<img src="@/assets/img/example_search.jpg" alt="poll">
					</Slide>
					<Slide :key="4" class="slide">
						<div class="head"><img src="@/assets/icons/vip.svg" alt="vip" class="icon"> Mini badges</div>
						<div class="description">
							Badges sometimes makes reading harder.
							<br>You can replace them by <strong>minified versions</strong> to free some space
						</div>
						<img src="@/assets/img/example_minibadges.png" alt="badges">
					</Slide>
					<Slide :key="5" class="slide">
						<div class="head"><img src="@/assets/icons/ticket.svg" alt="raffle" class="icon"> Raffle</div>
						<div class="description">
							Twitchat allows you to <strong>start a raffle</strong> and pick a random winner.
						</div>
						<img src="@/assets/img/example_raffle.png" alt="raffle">
					</Slide>
					<Slide :key="6" class="slide">
						<div class="head"><img src="@/assets/icons/bingo.svg" alt="bingo" class="icon"> Bingo</div>
						<div class="description">
							Twitchat allows you to <strong>start a bingo</strong>.
							<br>Your viewers will have to guess a number or a twitch emote
						</div>
						<img src="@/assets/img/example_bingo.png" alt="raffle">
					</Slide>
					<Slide :key="7" class="slide">
						<div class="head"><img src="@/assets/icons/unfollow_white.svg" alt="raffle" class="icon"> Non followers</div>
						<div class="description">
							See if a user is following your channel or not
						</div>
						<img src="@/assets/img/example_nofollow.jpg" alt="not follwing">
					</Slide>
					<Slide :key="8" class="slide">
						<div class="head"><img src="@/assets/icons/split.svg" alt="poll" class="icon"> Split view</div>
						<div class="description">
							You can split the view in half to give more space to your chat.
							<br>The right column will display all the alerts, greetings, notifications, search results, etc...
						</div>
						<img src="@/assets/img/example_splitview.jpg" alt="splitView">
					</Slide>
					<Slide :key="9" class="slide">
						<div class="head"><img src="@/assets/icons/whispers.svg" alt="whisper" class="icon"> Whispers</div>
						<div class="description">
							Opening twitch to read a whisper and answer it can be pretty annoying.
							<br>Twitchat can <strong>receive whispers</strong> and answer them whithout leaving Twitchat.
						</div>
						<img src="@/assets/img/example_whisper.jpg" alt="splitwhisper">
					</Slide>
					<Slide :key="10" class="slide">
						<div class="head"><img src="@/assets/icons/poll.svg" alt="poll" class="icon"> Manage polls</div>
						<div class="description">Create polls, see their progress live and <strong>never miss their result</strong> sent on chat and stored on the activity feed.</div>
						<img src="@/assets/img/example_poll.jpg" alt="poll">
					</Slide>
					<Slide :key="11" class="slide">
						<div class="head"><img src="@/assets/icons/prediction.svg" alt="prediction" class="icon"> Manage predictions</div>
						<div class="description">Create predictions, see their progress live and <strong>never miss their result</strong> sent on chat and stored on the activity feed.</div>
						<img src="@/assets/img/example_prediction.jpg" alt="prediction">
					</Slide>
					<Slide :key="12" class="slide">
						<div class="head"><img src="@/assets/icons/stars.svg" alt="prediction" class="icon"> And much more</div>
						<div class="description">
							<b>Twitchat has many more features, including native ones:</b>
							<ul>
								<li>Follow, cheers, rewards and raid alerts</li>
								<li>Automod accept/reject flow</li>
								<li>Ban, timeout, delete message</li>
								<li>Hype train progress status</li>
								<li>Highlight subs/vips/Mods messages</li>
								<li>Highlight messages mentioning you</li>
								<li>Easy customizable shoutout command</li>
								<li>Filter out command messages</li>
								<li>Autocomplete emotes (:xxx), user names (@xxx) and commands (/xxx)</li>
								<li>Display BTTV emotes</li>
								<li>...</li>
							</ul>
							<b>Get a more complete list <a href="https://github.com/Durss/Twitchat#readme" target="_blank">on this page</a></b>
						</div>
					</Slide>
					<template #addons>
						<Navigation />
						<Pagination />
					</template>
				</Carousel>
			</div>

			<div class="footer">
				<p>Made with 💘 by <a href="https://twitch.tv/durss" target="_blank">Durss</a></p>
				<p>Sources on <a href="https://github.com/Durss/Twitchat" target="_blank">Github</a></p>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import store from '@/store';
import { Options, Vue } from 'vue-class-component';
import Chat from './Chat.vue';
import 'vue3-carousel/dist/carousel.css';

//@typescript-eslint/ban-ts-comment
//@ts-ignore
import { Carousel, Slide, Pagination, Navigation } from 'vue3-carousel';

@Options({
	props:{},
	components:{
		Chat,
		Button,
		Carousel,
		Slide,
		Pagination,
		Navigation,
	}
})
export default class Home extends Vue {

	public authenticated:boolean = false;

	// public get loginPath():string { return router.resolve({name:'login'}).href; }

	public mounted():void {
		this.authenticated = store.state.authenticated;
	}
}
</script>

<style scoped lang="less">
.home{
	height: 100%;

	.offline {
		text-align: center;
		color: @mainColor_light;
		min-height: 100%;
		// background-image: url("../assets/img/homepage.jpg");
		background: linear-gradient(180deg, darken(@mainColor_normal, 40%) 0%, @mainColor_dark 100%);
		background-size: contain;
		background-repeat: no-repeat;
		background-position: center center;
		margin: auto;
		padding: 2em 5px;

		.logo {
			width: 80vw;
			max-width: 400px;
			margin: auto;
			img {
				filter: drop-shadow(0 10px 20px fade(#000000, 50%));
			}
		}

		.loginBt {
			margin: 0 0 2em 0;
			border-radius: 50px;
			font-weight: bold;
		}

		.discordBt {
			margin: 0 auto 2em auto;
			border-radius: 50px;
			font-weight: bold;
			display: block;
			width: min-content;
			:deep(.icon) {
				vertical-align: bottom;
			}
		}

		&>.description {
			margin: 2em 0;
			font-style: italic;
			opacity: .8;

			&::before {
				content: "“";
				font-family: "Nunito";
				font-size: 2em;
				vertical-align: middle;
				margin-right: 10px;
			}
			&::after {
				content: "”";
				font-family: "Nunito";
				font-size: 2em;
				vertical-align: middle;
			}
		}

		.features {
			widows: 90%;
			max-width: 600px;
			margin: auto;
			// background-color: rgba(255, 255, 255, .2);
			background-color: fade(@mainColor_normal, 50%);
			background: linear-gradient(0deg, rgba(145,71,255,.7) 0%, rgba(145,71,255,.0) 100%);
			// border: 1px solid fade(@mainColor_normal, 30%);
			border-radius: 20px;
			padding: 20px;
			// padding-top: 30px;
			box-shadow: 0px 0px 50px 0 rgba(0,0,0,.5);

			.title {
				font-size: 1.5em;
				padding: 0;
				margin: 0;
				margin-bottom: 20px;
			}

			:deep(.carousel){
				.carousel__next,
				.carousel__prev,
				.carousel__pagination-button {
					background-color: lighten(@mainColor_normal, 5%);
					box-shadow: 0px 0px 10px 0px rgba(0,0,0,.5);
				}
				.carousel__pagination-button--active {
					background-color: @mainColor_alert;
				}

				.carousel__slide {
					align-self: flex-start;
				}
			}

			.slide {
				display: flex;
				flex-direction: column;
				
				.head {
					font-size: 1.5em;
					font-weight: bold;
					margin-bottom: 20px;

					.icon {
						height: 1em;
						width: 1em;
						object-fit: contain;
						margin-right: 10px;
						vertical-align: middle;
					}
				}
				.description {
					margin-bottom: 20px;
					font-size: .8em;
					line-height: 1.5em;
					strong {
						color: lighten(@mainColor_warn, 10%);
					}
					ul {
						margin:auto;
						margin-top: 20px;
						width: 90%;
						max-width: 400px;
						li {
							text-align: left;
							// list-style-type: none;
							// list-style-position: inside;
							padding-left: 0;
							margin-left: 10px;
							margin-bottom: 10px;
						}
					}
				}
				
				&>img {
					filter: drop-shadow(0 0 10px #000000);
					max-width: calc(100% - 60px);
					height: 100%;
					object-fit: contain;
				}
			}
		}
	}

	.footer {
		margin-top: 50px;
		text-align: center;
		font-size: .8em;
		margin-bottom: 10px;
	}
}
</style>