<template>
	<div class="voteatifa modal">
		<div class="dimmer" ref="dimmer" @click="close(false)"></div>
		<div class="holder" ref="holder">
			<h1 class="head">
				<span class="title">S'il vous plait votez...</span>
				<ClearButton @click="close(false)" />
			</h1>
			<div class="content">
				<p style="text-align:center; font-style: italic; opacity: .8;">...ne laissez pas notre pays tomber sous l'extrême droite le 30 juin...</p>

				<div class="card-item" style="margin-bottom: 1em;">
					<SwitchButton v-model="short" :labels="['Version courte', 'Version longue']" :values="[true, false]"></SwitchButton>
				</div>

				<Transition name="fadeScale">
				<div v-if="short==true" class="conditionalSection">
					<p class="card-item premium"><Icon name="info" /> Twitchat existe grâce aux aides sociales que le RN compte détruire.</p>
					<strong style="text-align:center; margin-top: 1em; display: block;">Voici certains votes du RN ces dernières années</strong>
				</div>
				</Transition>

				<Transition name="fadeScale">
					<div v-if="short==false" class="conditionalSection">
						<div class="card-item" style="margin-bottom:1em">
							<p class="small">Encore un message sur un sujet clivant dans Twitchat, oui.</p>
							<p class="small">Je vous présente mes excuses pour ça.</p>
							<p class="small">Ca ne deviendra pas une habitude je vous le promets, mais le contexte politique en France est beaucoup trop grave pour rester muet.</p>
						</div>
						<p>Je ne vous dirai pas quoi voter, mais si vous pensiez voter RN, je vous en conjure prenez 2min pour lire ce pour quoi ils ont voté ces dernières années ci-dessous, résumant ainsi les combats réels de ce parti. Bien loin de ce qu'ils essaient de vendre.</p>
						<p class="small">TLDR; à moins d'être vous-même un homme blanc hétéro non transgenre sans handicap et très riche, vous n'avez qu'à y perdre. Il en va de même pour vos proches.</p>
						<p></p>
					</div>
				</Transition>
				<ToggleBlock alert :icons="['cross']" title="Votes contre (35)" :open="false">
					<section>
						<strong>Salaires/Retraites</strong>
						<ul>
							<li><Icon name="cross" theme="light" />Augmentation du Smic</li>
							<li><Icon name="cross" theme="light" />Indexation des salaires sur l'inflation</li>
							<li><Icon name="cross" theme="light" />Encadrement des salaires</li>
							<li><Icon name="cross" theme="light" />Revalorisation des salaires des fonctionnaires de 10%</li>
							<li><Icon name="cross" theme="light" />Revalorisation des petites retraites</li>
							<li><Icon name="cross" theme="light" />Abrogation de la réforme des retraites</li>
							<li><Icon name="cross" theme="light" />Suppression des aides publiques aux entreprises qui ont augmenté les dividendes aux actionnaires sans augmenter leurs salariés</li>
						</ul>
					</section>
					<section>
						<strong>Pouvoir d'achat</strong>
						<ul>
							<li><Icon name="cross" theme="light" />Blocage des prix de produits de première nécessité</li>
							<li><Icon name="cross" theme="light" />Gratuité des premiers mètres cubes d'eau</li>
							<li><Icon name="cross" theme="light" />Revalorisation des APL de 10%</li>
							<li><Icon name="cross" theme="light" />Gel des prix des loyers</li>
							<li><Icon name="cross" theme="light" />Augmentation des hébergements d'urgence</li>
						</ul>
					</section>
					<section>
						<strong>Fiscalité</strong>
						<ul>
							<li><Icon name="cross" theme="light" />Rétablissement de l'ISF</li>
							<li><Icon name="cross" theme="light" />Taxe sur les superprofits</li>
							<li><Icon name="cross" theme="light" />Taxe sur les revenus supérieurs à 3 millions d'euros</li>
							<li><Icon name="cross" theme="light" />Augmentation de la TVA sur les produits de luxe</li>
							<li><Icon name="cross" theme="light" />Augmentation de la taxe sur les logements vacants</li>
							<li><Icon name="cross" theme="light" />Augmentation des moyens pour lutter contre la fraude fiscale</li>
							<li><Icon name="cross" theme="light" />Augmentation de la fiscalité sur les résidences secondaires</li>
						</ul>
					</section>
					<section>
						<strong>Education</strong>
						<ul>
							<li><Icon name="cross" theme="light" />Gratuité des cantines et fournitures scolaires pour les plus modestes</li>
							<li><Icon name="cross" theme="light" />Revalorisation des bourses étudiantes au niveau de l'inflation</li>
							<li><Icon name="cross" theme="light" />Garantie d'autonomie jeunes à 1063 euros</li>
						</ul>
					</section>
					<section>
						<strong>Féminisme</strong>
						<ul>
							<li><Icon name="cross" theme="light" />Allouer 1 millard pour lutter contre la violence faites aux femmes</li>
							<li><Icon name="cross" theme="light" />Droit à l'IVG</li>
						</ul>
					</section>
					<section>
						<strong>Services Publics</strong>
						<ul>
							<li><Icon name="cross" theme="light" />Recrutement de sapeurs-pompiers et revalorisation des salaires</li>
							<li><Icon name="cross" theme="light" />Augmentation des budgets de l'Université</li>
							<li><Icon name="cross" theme="light" />Augmentation des moyens alloués aux hôpitaux</li>
							<li><Icon name="cross" theme="light" />Augmentation des budgets de l'Université</li>
							<li><Icon name="cross" theme="light" />Baisse de la TVA sur les transports en commun</li>
							<li><Icon name="cross" theme="light" />Augmentation du nombre de greffier et magistrats</li>
						</ul>
					</section>
					<section>
						<strong>Ecologie</strong>
						<ul>
							<li><Icon name="cross" theme="light" />Conditionnement des aides publiques aux grandes entreprises au respect de contraintes écologique</li>
							<li><Icon name="cross" theme="light" />Suppression de la niche fiscale sur le kérosène aérien</li>
							<li><Icon name="cross" theme="light" />Instauration d'un impôt sur la fortune climatique</li>
							<li><Icon name="cross" theme="light" />Taxation des yachts et jets privés</li>
							<li><Icon name="cross" theme="light" />Interdiction du glyphosate</li>
						</ul>
					</section>
				</ToggleBlock>
				<ToggleBlock primary :icons="['checkmark']" title="Votes pour (10)" :open="false">
					<section>
						<strong>Travail</strong>
						<ul>
							<li><Icon name="checkmark" class="green" theme="light" />Fin des droits au chômage après abandon de poste</li>
							<li><Icon name="checkmark" class="green" theme="light" />Fin des allocations chômage pour les employés refusant un CDI à la fin de leur CDD</li>
							<li><Icon name="checkmark" class="green" theme="light" />Réduire les droits au chômage des étrangers hors Union européenne</li>
							<li><Icon name="checkmark" class="green" theme="light" />Interdire la présence d'étrangers au sein des instances représentatives des entreprises</li>
							<li><Icon name="checkmark" class="green" theme="light" />Limiter le droit de vote des travailleurs précaires aux élections professionnelles</li>
						</ul>
					</section>
					<section>
						<strong>Fiscalité</strong>
						<ul>
							<li><Icon name="checkmark" class="green" theme="light" />Hausse du plafond de défiscalisation des heures supplémentaires</li>
							<li><Icon name="checkmark" class="green" theme="light" />Baisse des impôts de production (CVAE)</li>
						</ul>
					</section>
					<section>
						<strong>Culture</strong>
						<ul>
							<li><Icon name="checkmark" class="green" theme="light" />Suppression de la redevance audiovisuelle</li>
							<li><Icon name="checkmark" class="green" theme="light" />Exclure l'achat de mangas du pass culture</li>
							<li><Icon name="checkmark" class="green" theme="light" />Interdiction de l'écriture inclusive</li>
						</ul>
					</section>
				</ToggleBlock>
				<p style="margin-top: 1em;">Pour ma part je voterai Front Populaire car il s'agit selon moi de la seule chance d'éviter le pire, tant statistiquement que socialement.</p>
				<div class="ctas">
					<TTButton primary icon="cross" @click="close(false)">Fermer</TTButton>
					<TTButton alert @click="close(true)">Ne plus afficher</TTButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { gsap } from 'gsap/gsap-core';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import ClearButton from '../ClearButton.vue';
import { ToggleBlock } from '../ToggleBlock.vue';
import Icon from '../Icon.vue';
import { TTButton } from '../TTButton.vue';
import DataStore from '@/store/DataStore';
import SwitchButton from '../SwitchButton.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ClearButton,
		ToggleBlock,
		SwitchButton,
	},
	emits:["close"],
})
class VoteAtifa extends Vue {

	public short = true;

	public mounted():void {
		gsap.set(this.$refs.holder as HTMLElement, {marginTop:0, opacity:1});
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:1});
		gsap.from(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.out"});
	}

	public async close(doNotShowAgain:boolean):Promise<void> {
		if(doNotShowAgain) {
			await new Promise<void>((resolve)=>{
				this.$confirm("Confirmer", "Tu ne pourras plus voir ce message du tout 🥺").then(()=>resolve()).catch(error=>{});
			});
			DataStore.set(DataStore.ANTIFA_HIDE, true);
			this.$store.main.antifaHide = true;

		}
		gsap.killTweensOf([this.$refs.holder, this.$refs.dimmer]);
		gsap.to(this.$refs.dimmer as HTMLElement, {duration:.25, opacity:0, ease:"sine.in"});
		gsap.to(this.$refs.holder as HTMLElement, {duration:.25, marginTop:-100, opacity:0, ease:"back.in", onComplete:()=> {
			this.$emit('close');
		}});
	}

}
export default toNative(VoteAtifa);
</script>

<style scoped lang="less">
.voteatifa{
	
	z-index: 2;

	.holder {
		line-height: 1.2em;
		width: 600px;
		height: fit-content;
		max-width: 600px;
		max-height: var(--vh);

		.content {
			gap: .5em;
			display: flex;
			flex-direction: column;
			* {
				flex-shrink: 0;
			}
		}

		p {
			line-height: 1.5em;
			white-space: pre-line;
			&.small {
				font-size: .8em;
			}
		}

		section {
			&:not(:first-of-type){
				margin-top: 1em;
			}
			strong {
				margin-bottom: .5em;
				display: block;
			}
			ul {
				list-style: none;
				padding-left: 1em;
				li + li {
					margin-top: .25em;
				}
				.icon {
					background-color: var(--color-alert);
					border-radius: 50%;
					padding: 3px;
					vertical-align: baseline;
					margin-right: .5em;
					&.green {
						background-color: var(--color-primary);
					}
				}
			}
		}

		.ctas {
			margin-top: 1em;
			gap:.5em;
			display: flex;
			flex-direction: column;
			align-items: center;
		}

		.thanks {
			font-size: 1.5em;
			font-weight: bold;
			margin: auto;
		}
	}

	.icon {
		height: 1em;
		vertical-align: middle;
	}

	.conditionalSection {
		transition: all .25s;
		max-height: 300px;
		opacity: 1;
		overflow: hidden;

		&.fadeScale-enter-from,
		&.fadeScale-leave-to {
			opacity: 0;
			max-height: 0;
		}
	}
}

</style>