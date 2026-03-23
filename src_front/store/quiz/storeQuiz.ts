import DataStore from "@/store/DataStore";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import PublicAPI from "@/utils/PublicAPI";
import SSEHelper from "@/utils/SSEHelper";
import Utils from "@/utils/Utils";
import {
	acceptHMRUpdate,
	defineStore,
	type PiniaCustomProperties,
	type _GettersTree,
	type _StoreWithGetters,
	type _StoreWithState,
} from "pinia";
import type { UnwrapRef } from "vue";
import type { IQuizActions, IQuizGetters, IQuizState } from "../StoreProxy";
import StoreProxy from "../StoreProxy";

let broadcastDebounceTO = -1;
const POINTS_PER_QUESTION = 100;

interface AnswerScoreParams {
	quiz: TwitchatDataTypes.QuizParams;
	question: TwitchatDataTypes.QuizParams["questionList"][number];
	/** Answer ID (for classic/majority modes) */
	answerId?: string;
	/** Raw text answer (for freeAnswer mode) */
	answerText?: string;
	/** Date (ISO 8601 string) when the user voted */
	votedAt: string;
	/**
	 * For majority mode, the set of winning answer IDs.
	 * Must be provided when scoring majority questions (i.e. at reveal time).
	 */
	majorityWinnerIds?: Set<string>;
}

/**
 * Computes the final score for a single answer.
 * Handles all question modes (classic, freeAnswer, majority),
 * applies time-based speed multiplier and loosePointsOnFail guard.
 */
function computeAnswerScore(params: AnswerScoreParams): number {
	const { quiz, question, answerId, answerText, votedAt, majorityWinnerIds } = params;
	let rawScore = 0;

	if (question.mode === "freeAnswer") {
		const tolerancePercent =
			Math.max(0, Math.min(5, question.toleranceLevel ?? quiz.toleranceLevel ?? 0)) / 5;
		// Max tolerance level accepts half of the answer to differ
		const levenshteinTolerance = (tolerancePercent * question.answer.length) / 2;
		let isCorrect: boolean;
		if (levenshteinTolerance > 0) {
			isCorrect =
				Utils.levenshtein(answerText ?? "", question.answer) <= levenshteinTolerance;
		} else {
			isCorrect = answerText === question.answer;
		}
		rawScore = isCorrect ? POINTS_PER_QUESTION : -POINTS_PER_QUESTION;
	} else if (question.mode === "classic" && answerId) {
		const answer = question.answerList.find((a) => a.id === answerId);
		if (answer) {
			rawScore = answer.correct ? POINTS_PER_QUESTION : -POINTS_PER_QUESTION;
		}
	} else if (question.mode === "majority" && answerId && majorityWinnerIds) {
		rawScore = majorityWinnerIds.has(answerId) ? POINTS_PER_QUESTION : -POINTS_PER_QUESTION;
	}

	// Apply time-based speed multiplier
	let score = rawScore;
	if (quiz.timeBasedScoring) {
		const questionDuration = (question.duration_s ?? quiz.durationPerQuestion_s) * 1000;
		const speedMult =
			(new Date(votedAt).getTime() - new Date(quiz.questionStarted_at).getTime()) /
			questionDuration;
		score *= speedMult;
	}

	// Avoid losing points if the quiz isn't configured for it
	if (score <= 0 && !quiz.loosePointsOnFail) {
		score = 0;
	}

	return score;
}

export const storeQuiz = defineStore("quiz", {
	state: () =>
		({
			quizList: [],
			liveState: null,
			currentFreeAnswerStats: {
				right: 0,
				wrong: 0,
			},
		}) as IQuizState,

	getters: {} as IQuizGetters &
		ThisType<UnwrapRef<IQuizState> & _StoreWithGetters<IQuizGetters> & PiniaCustomProperties> &
		_GettersTree<IQuizState>,

	actions: {
		async populateData(): Promise<void> {
			const json = DataStore.get(DataStore.QUIZ_CONFIGS);
			if (json) {
				const data = JSON.parse(json) as IStoreData;
				this.quizList = data.quizList ?? [];
				this.liveState = data.liveState ?? null;
			} else {
				this.quizList = [];
			}

			PublicAPI.instance.addEventListener("GET_QUIZ_CONFIGS", (_eevent) => {
				this.broadcastQuizState(true);
			});

			PublicAPI.instance.addEventListener("SET_QUIZ_NEXT_QUESTION", (_eevent) => {
				const quiz = this.quizList.find((q) => q.enabled);
				if (!quiz) return;
				this.startNextQuestion(quiz.id);
			});

			PublicAPI.instance.addEventListener("SET_QUIZ_REVEAL", (_eevent) => {
				const quiz = this.quizList.find((q) => q.enabled);
				if (!quiz) return;
				this.revealAnswer(quiz.id);
			});

			PublicAPI.instance.addEventListener("SET_QUIZ_TOGGLE_LEADERBOARD", (_eevent) => {
				const quiz = this.quizList.find((q) => q.enabled);
				if (!quiz) return;
				void this.showLeaderBoard(quiz.id);
			});

			SSEHelper.instance.addEventListener("TWITCHEXT_QUIZ_ANSWER", async (event) => {
				const eventData = event.data;
				if (!eventData) return;

				void this.handleAnswer(
					"twitch",
					eventData.delay_ms,
					eventData.quizId,
					eventData.questionId,
					eventData.answerId,
					eventData.answerText,
					eventData.userId,
					eventData.opaqueUserId,
				);
			});
		},

		async saveData(
			quizId?: string,
			broadcastToOverlayOnly?: boolean,
			directBroadcast?: boolean,
		): Promise<void> {
			const quiz = quizId ? this.quizList.find((q) => q.id === quizId) : undefined;

			// Are we saving a specifc quiz that's enabled?
			if (quiz?.enabled) {
				// Are we about to lose live quiz progress?
				if (quiz?.enabled && this.liveState && this.liveState.quizId !== quizId) {
					const t = StoreProxy.i18n.t;
					const activeQuiz = this.quizList.find((q) => q.id === this.liveState!.quizId);
					try {
						await StoreProxy.main.confirm(
							t("quiz.form.live_progress_warning.title"),
							t("quiz.form.live_progress_warning.description", {
								NAME: activeQuiz?.title,
							}),
						);
					} catch (_error) {
						// User cancelled, disable the quiz
						quiz.enabled = false;
						return;
					}
					this.liveState = null;
				}

				// Disable all other quizzes
				this.quizList.forEach((q) => {
					if (q.id !== quizId) {
						q.enabled = false;
					}
				});
			}
			const data: IStoreData = {
				quizList: this.quizList,
				liveState: this.liveState,
			};
			DataStore.set(DataStore.QUIZ_CONFIGS, data);
			this.broadcastQuizState(broadcastToOverlayOnly, directBroadcast);
		},

		addQuiz(): TwitchatDataTypes.QuizParams {
			let data: TwitchatDataTypes.QuizParams = {
				id: Utils.getUUID(),
				enabled: this.quizList.length === 0,
				title: "",
				questionList: [],
				durationPerQuestion_s: 20,
				loosePointsOnFail: false,
				timeBasedScoring: false,
				currentQuestionId: "",
				quizStarted_at: "",
				questionStarted_at: "",
			};
			this.quizList.push(data);
			void this.saveData(data.id);
			return data;
		},

		removeQuiz(id: string): void {
			const t = StoreProxy.i18n.t;
			StoreProxy.main
				.confirm(
					t("quiz.form.delete_confirm.title"),
					t("quiz.form.delete_confirm.description"),
				)
				.then(() => {
					this.quizList = this.quizList.filter((g) => g.id !== id);
					void this.saveData();
				})
				.catch(() => {});
		},

		duplicateQuiz(id: string): TwitchatDataTypes.QuizParams | undefined {
			const source = this.quizList.find((g) => g.id === id);
			if (!source) return;
			const clone = JSON.parse(JSON.stringify(source)) as typeof source;
			clone.id = Utils.getUUID();
			clone.questionList.forEach((q) => {
				q.id = Utils.getUUID();
				if (q.mode !== "freeAnswer") {
					q.answerList.forEach((a) => {
						a.id = Utils.getUUID();
					});
				}
			});
			this.quizList.push(clone);
			void this.saveData(clone.id);
			return clone;
		},

		async handleAnswer(
			platform: TwitchatDataTypes.ChatPlatform,
			delay_ms: number,
			quizId: string,
			questionId: string,
			answerId?: string,
			answerText?: string,
			userId?: string,
			opaqueUserId?: string,
		): Promise<void> {
			const quiz = this.quizList.filter((q) => q.id === quizId)[0];
			if (!quiz || !quiz.enabled) return;
			const question = quiz.questionList.filter((q) => q.id === questionId)[0];
			if (!question) return;
			const uid = userId || opaqueUserId;
			if (!uid) return;

			// Clamp delay to 10s max or question duration
			delay_ms = Math.min(
				(question.duration_s || quiz.durationPerQuestion_s || 10) * 1000,
				delay_ms,
			);
			const votedAt = new Date(Date.now() - delay_ms).toISOString();

			// Check if question is still accepting answers based on duration
			const totalTime = (question.duration_s || quiz.durationPerQuestion_s) * 1000;
			if (new Date(quiz.questionStarted_at).getTime() + totalTime < Date.now()) {
				return;
			}

			if (!this.liveState) {
				this.liveState = {
					quizId,
					questionVotes: {},
					users: {},
				};
			}

			// Check if user already voted for this question
			if (this.liveState.questionVotes[questionId]?.find((v) => v.uid === uid)) return;

			// Record vote
			this.liveState.questionVotes[question.id] =
				this.liveState.questionVotes[question.id] || [];
			this.liveState.questionVotes[question.id]!.push({
				uid,
				answer: answerId ?? answerText ?? "",
				votedAt,
			});

			// Get or create user data
			let userData = this.liveState.users[uid];
			if (!userData) {
				let name: string = "";
				let avatarPath: string | undefined = undefined;
				if (userId) {
					// User isn't anonymous, grab their name from the Twitch API
					const user = await new Promise<TwitchatDataTypes.TwitchatUser>((resolve) => {
						StoreProxy.users.getUserFrom(
							"twitch",
							StoreProxy.auth.twitch.user.id,
							userId,
							undefined,
							undefined,
							(user) => resolve(user),
						);
					});
					name = user?.displayNameOriginal ?? "";
					avatarPath = user?.avatarPath ?? "";
					if (!name) name = "#" + userId;
				} else {
					// User is anonymous, get random name
					name = Utils.getNameFromOpaqueId(uid);
				}
				userData = this.liveState.users[uid] = {
					platform,
					name,
					avatarPath,
					score: 0,
					isAnonymous: !!opaqueUserId && !userId,
				};
			}

			if (question.mode === "freeAnswer") {
				const score = computeAnswerScore({
					quiz,
					question,
					answerId: undefined,
					answerText: answerText,
					votedAt,
					majorityWinnerIds: undefined,
				});
				if (score > 0) {
					this.currentFreeAnswerStats.right++;
				} else {
					this.currentFreeAnswerStats.wrong++;
				}
				userData.score += score;
			}

			void this.saveData(quizId, true);
		},

		startNextQuestion(quizId: string): void {
			const quiz = this.quizList.find((v) => v.id === quizId);
			if (!quiz) return;
			this.currentFreeAnswerStats.right = 0;
			this.currentFreeAnswerStats.wrong = 0;
			delete quiz.currentQuestionRevealed;
			delete quiz.currentQuestionStats;
			quiz.questionStarted_at = new Date().toISOString();
			const index = quiz.questionList.findIndex((q) => q.id === quiz.currentQuestionId);
			if (index < quiz.questionList.length - 1) {
				quiz.currentQuestionId = quiz.questionList[index + 1]!.id;
			} else {
				quiz.currentQuestionId = "";
				quiz.currentQuestionId = quiz.questionList[0]?.id ?? ""; //TODO: remove this. Only here for testing to loop back to 1st question
				//TODO: quiz ended, do whatever needs to be done at that moment
			}
			void this.saveData(quizId, false, true);
		},

		resetQuizState(quizId: string, confirm: boolean = true): void {
			const reset = () => {
				const quiz = this.quizList.find((v) => v.id === quizId);
				if (!quiz) return;
				quiz.currentQuestionId = "";
				delete quiz.currentQuestionRevealed;
				delete quiz.currentQuestionStats;
				quiz.quizStarted_at = "";
				quiz.questionStarted_at = "";
				if (this.liveState?.quizId == quizId) this.liveState = null;
				void this.saveData(quizId, false, true);
			};
			if (confirm) {
				StoreProxy.main
					.confirm(
						StoreProxy.i18n.t("quiz.state.reset_confirm.title"),
						StoreProxy.i18n.t("quiz.state.reset_confirm.description"),
					)
					.then(() => {
						reset();
					})
					.catch(() => {});
			} else {
				reset();
			}
		},

		revealAnswer(quizId: string): void {
			const quiz = this.quizList.find((v) => v.id === quizId);
			if (!quiz) return;
			quiz.currentQuestionRevealed = true;
			quiz.currentQuestionStats = this.computeQuestionStats(quizId, quiz.currentQuestionId);
			// Compute scores, must run before resetting questionStarted_at (needed for time-based scoring)
			quiz.currentQuestionScores = this.computeQuestionScores(quizId, quiz.currentQuestionId);
			quiz.questionStarted_at = new Date(0).toISOString();
			quiz.allScores = {};
			Object.keys(this.liveState?.users || {}).map((uid) => {
				quiz.allScores![uid] = this.liveState?.users[uid]?.score ?? 0;
			});
			void this.saveData(quizId, false, true);
		},

		async showLeaderBoard(quizId: string): Promise<void> {
			const quiz = this.quizList.find((v) => v.id === quizId);
			if (!quiz) return;
			PublicAPI.instance.broadcast("ON_QUIZ_LEADERBOARD", {
				leaderboard: this.liveState?.users ?? {},
			});
		},

		broadcastQuizState(overlayOnly?: boolean, directBroadcast: boolean = false): void {
			const quiz = this.quizList.find((v) => v.enabled);

			const i18n = {
				mode_classic: StoreProxy.i18n.t("quiz.form.mode_classic.title"),
				mode_majority: StoreProxy.i18n.t("quiz.form.mode_majority.title"),
				mode_freeAnswer: StoreProxy.i18n.t("quiz.form.mode_freeAnswer.title"),
			};
			PublicAPI.instance.broadcast("ON_QUIZ_STATE", { quiz, i18n });
			PublicAPI.instance.broadcastGlobalStates();
			if (!overlayOnly) {
				// Debounce server broadcast
				window.clearTimeout(broadcastDebounceTO);
				broadcastDebounceTO = window.setTimeout(
					() => {
						void ApiHelper.call("quiz/broadcast", "PUT", {
							quiz,
						});
					},
					directBroadcast ? 0 : 1500,
				);
			}
		},

		computeQuestionScores(quizId: string, questionId: string): { [uid: string]: number } {
			const quiz = this.quizList.find((v) => v.id === quizId);
			if (!quiz || !this.liveState) return {};
			const question = quiz.questionList.find((q) => q.id === questionId);
			if (!question) return {};

			const votes = this.liveState.questionVotes[questionId];
			if (!votes || votes.length === 0) return {};

			const summary: { [uid: string]: number } = {};

			// For majority mode, determine the winning answer(s)
			let majorityWinnerIds: Set<string> | undefined;
			if (question.mode === "majority") {
				const voteCounts: { [answerId: string]: number } = {};
				for (const vote of votes) {
					voteCounts[vote.answer] = (voteCounts[vote.answer] || 0) + 1;
				}
				const maxVoteCount = Math.max(...Object.values(voteCounts));
				majorityWinnerIds = new Set(
					Object.keys(voteCounts).filter((id) => voteCounts[id] === maxVoteCount),
				);
			}

			for (const vote of votes) {
				const userData = this.liveState.users[vote.uid];
				if (!userData) continue;
				const score = computeAnswerScore({
					quiz,
					question,
					answerId: question.mode !== "freeAnswer" ? vote.answer : undefined,
					answerText: question.mode === "freeAnswer" ? vote.answer : undefined,
					votedAt: vote.votedAt ?? new Date().toISOString(),
					majorityWinnerIds,
				});
				summary[vote.uid] = score;
				userData.score += score;
			}
			return summary;
		},

		computeQuestionStats(
			quizId: string,
			questionId: string,
		): NonNullable<TwitchatDataTypes.QuizParams["currentQuestionStats"]> {
			const quiz = this.quizList.find((v) => v.id === quizId);
			const question = quiz?.questionList.find((q) => q.id === questionId);
			if (question?.mode === "freeAnswer") return {};
			if (!quiz || !question) return {};
			const votes = this.liveState?.questionVotes[question.id];
			if (!votes || votes.length === 0)
				return question.answerList.reduce(
					(acc, a) => {
						acc[a.id] = { globalPercent: 0, relativePercent: 0, voteCount: 0 };
						return acc;
					},
					{} as NonNullable<TwitchatDataTypes.QuizParams["currentQuestionStats"]>,
				);

			const maxVotes = question.answerList.reduce((max, a) => {
				const count = votes.filter((v) => v.answer == a.id).length;
				return count > max ? count : max;
			}, 0);
			return question.answerList.reduce(
				(acc, a) => {
					acc[a.id] = {
						globalPercent:
							Math.round(
								(votes.filter((v) => v.answer == a.id).length / votes.length) *
									1000,
							) / 1000,
						relativePercent:
							Math.round(
								(votes.filter((v) => v.answer == a.id).length / maxVotes) * 1000,
							) / 1000,
						voteCount: votes.filter((v) => v.answer == a.id).length,
					};
					return acc;
				},
				{} as NonNullable<TwitchatDataTypes.QuizParams["currentQuestionStats"]>,
			);
		},
	} as IQuizActions &
		ThisType<
			IQuizActions &
				UnwrapRef<IQuizState> &
				_StoreWithState<"quiz", IQuizState, IQuizGetters, IQuizActions> &
				_StoreWithGetters<IQuizGetters> &
				PiniaCustomProperties
		>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeQuiz, import.meta.hot));
}

interface IStoreData {
	quizList: TwitchatDataTypes.QuizParams[];
	liveState: TwitchatDataTypes.QuizState | null;
}
