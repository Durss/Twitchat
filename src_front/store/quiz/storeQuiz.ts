import DataStore from "@/store/DataStore";
import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import PublicAPI from "@/utils/PublicAPI";
import SSEHelper from "@/utils/SSEHelper";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IQuizActions, IQuizGetters, IQuizState } from "../StoreProxy";
import StoreProxy from "../StoreProxy";

// Local fast access to current question to avoid searching for it
// everytime we receive a chat message.
let currentQuiz: TwitchatDataTypes.QuizParams | null = null;
let currentQuestion: TwitchatDataTypes.QuizParams["questionList"][number] | null = null;
let broadcastDebounceTO = -1;
// Cached OpenQuizzDB CSV between language detection and final import
let openquizzdbCSVCache = "";
const POINTS_PER_QUESTION = 100;
const letterIndexes = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const CLASSIC_ANSWER_SLOTS = 6;
const MAJORITY_ANSWER_SLOTS = 4;

/**
 * Parses CSV content into rows of cells. Supports double-quoted cells with
 * escaped quotes (""), and embedded separators / newlines inside quoted cells.
 */
function parseCSVRows(content: string, sep: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = "";
	let inQuotes = false;
	const pushRow = () => {
		if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
		row = [];
	};
	for (let i = 0; i < content.length; i++) {
		const c = content[i]!;
		if (inQuotes) {
			if (c === '"') {
				if (content[i + 1] === '"') {
					cell += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				cell += c;
			}
		} else if (c === '"' && cell === "") {
			inQuotes = true;
		} else if (c === sep) {
			row.push(cell);
			cell = "";
		} else if (c === "\n" || c === "\r") {
			if (c === "\r" && content[i + 1] === "\n") i++;
			row.push(cell);
			cell = "";
			pushRow();
		} else {
			cell += c;
		}
	}
	if (cell !== "" || row.length > 0) {
		row.push(cell);
		pushRow();
	}
	return rows;
}

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

function validateFreeAnswer(
	answer: string,
	quiz: TwitchatDataTypes.QuizParams,
	question: TwitchatDataTypes.QuizParams["questionList"][number],
): boolean {
	if (question.mode !== "freeAnswer") return false;
	const expectedAnswer = question.answer.toLowerCase();
	answer = answer.toLowerCase();
	const tolerancePercent =
		Math.max(0, Math.min(5, question.toleranceLevel ?? quiz.toleranceLevel ?? 0)) / 5;
	// Max tolerance level accepts half of the answer to differ
	const levenshteinTolerance = Math.ceil((tolerancePercent * expectedAnswer.length) / 1.5);
	let isCorrect: boolean;
	if (levenshteinTolerance > 0) {
		isCorrect = Utils.levenshtein(answer ?? "", expectedAnswer) <= levenshteinTolerance;
	} else {
		isCorrect = answer === expectedAnswer;
	}
	if (!isCorrect) {
		isCorrect = answer.includes(expectedAnswer);
	}
	return isCorrect;
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
		rawScore = validateFreeAnswer(answerText ?? "", quiz, question)
			? POINTS_PER_QUESTION
			: -POINTS_PER_QUESTION;
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
			Math.min(
				questionDuration,
				Math.max(
					0,
					new Date(votedAt).getTime() - new Date(quiz.questionStarted_at).getTime(),
				),
			) / questionDuration;
		score = Math.round(score * (1 - speedMult));
	}

	// Avoid losing points if the quiz isn't configured for it
	if (score <= 0 && !quiz.loosePointsOnFail) {
		score = 0;
	}

	return score;
}

export const storeQuiz = defineStore("quiz", {
	state: (): IQuizState => ({
		quizList: [],
		currentFreeAnswerStats: {
			right: 0,
			wrong: 0,
		},
	}),

	getters: {} satisfies StoreGetters<IQuizGetters, IQuizState>,

	actions: {
		async populateData(): Promise<void> {
			const json = DataStore.get(DataStore.QUIZ_CONFIGS);
			if (json) {
				const data = JSON.parse(json) as IStoreData;
				this.quizList = data.quizList ?? [];
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

			SSEHelper.instance.addEventListener("ON_CONNECT", async (_event) => {
				this.broadcastQuizState(false, true);
			});
		},

		async saveData(
			quizId?: string,
			broadcastToOverlayOnly?: boolean,
			directBroadcast?: boolean,
		): Promise<void> {
			const quiz = quizId ? this.quizList.find((q) => q.id === quizId) : undefined;
			if (!quiz) return;

			// Are we saving a specifc quiz that's enabled?
			if (quiz.enabled) {
				const otherActiveQuiz = this.quizList.filter(
					(q) =>
						q.enabled && q.id !== quizId && Object.keys(q.leaderboard || {}).length > 0,
				)[0];
				// Are we about to lose live quiz progress?
				if (otherActiveQuiz) {
					const t = StoreProxy.i18n.t;
					try {
						await StoreProxy.main.confirm(
							t("quiz.form.lost_progress_warning.title"),
							t("quiz.form.lost_progress_warning.description_other", {
								NAME: otherActiveQuiz?.title,
							}),
						);
					} catch (_error) {
						// User cancelled, disable the quiz
						quiz.enabled = false;
						return;
					}
					this.resetQuizState(otherActiveQuiz.id, false);
				}

				// Disable all other quizzes
				this.quizList.forEach((q) => {
					if (q.id !== quizId) {
						q.enabled = false;
					}
				});
				// Force back to true to solve an UI race condition
				quiz.enabled = true;
			} else if (!quiz.enabled && Object.keys(quiz.leaderboard || {}).length > 0) {
				const t = StoreProxy.i18n.t;
				try {
					await StoreProxy.main.confirm(
						t("quiz.form.lost_progress_warning.title"),
						t("quiz.form.lost_progress_warning.description_self"),
					);
				} catch (_error) {
					// User cancelled, enable it back
					quiz.enabled = true;
					return;
				}
			}
			if (!quiz.enabled) this.resetQuizState(quiz.id, false, false);
			const data: IStoreData = {
				quizList: this.quizList,
			};
			DataStore.set(DataStore.QUIZ_CONFIGS, data);
			this.broadcastQuizState(broadcastToOverlayOnly, directBroadcast);
		},

		addQuiz(): TwitchatDataTypes.QuizParams {
			let data: TwitchatDataTypes.QuizParams = {
				id: Utils.getUUID(),
				enabled: false,
				title: "",
				questionList: [],
				durationPerQuestion_s: 20,
				loosePointsOnFail: false,
				timeBasedScoring: false,
				currentQuestionId: "",
				quizStarted_at: "",
				questionStarted_at: "",
				leaderboard: {},
				currentQuestionScores: {},
				currentQuestionVotes: {},
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
			clone.enabled = false;
			this.quizList.push(clone);
			this.resetQuizState(clone.id, false);
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

			// Initialize leaderboard entry for user if not present
			if (!quiz.leaderboard[uid]) {
				quiz.leaderboard[uid] = {
					anon: !!opaqueUserId && !userId,
					score: 0,
					platform,
				};
				// If user doesn't come from Twitch, store username and avatar as they probably cannot
				// be retrieved from any API but are needed for leaderboard.
				if (platform != "twitch") {
					StoreProxy.users.getUserFrom(
						platform,
						StoreProxy.auth.twitch.user.id,
						uid,
						undefined,
						undefined,
						(user) => {
							quiz.leaderboard[uid]!.name = user?.displayNameOriginal ?? "";
							quiz.leaderboard[uid]!.avatarPath = user?.avatarPath ?? "";
						},
					);
				}
			}

			// Clamp delay to 10s max or question duration
			// EDIT: Removed as quiz isn't in sync with overlay anymore
			/*
			delay_ms = Math.min(
				(question.duration_s || quiz.durationPerQuestion_s || 10) * 1000,
				delay_ms,
			);
			const votedAt = new Date(Date.now() - delay_ms).toISOString();
			//*/
			const votedAt = new Date().toISOString();

			// Check if question is still accepting answers based on duration
			const totalTime = (question.duration_s || quiz.durationPerQuestion_s) * 1000;
			if (new Date(quiz.questionStarted_at).getTime() + totalTime < Date.now()) {
				return;
			}

			if (!quiz.leaderboard) {
				quiz.leaderboard = {};
			}
			if (!quiz.currentQuestionScores) {
				quiz.currentQuestionScores = {};
			}
			if (!quiz.currentQuestionVotes) {
				quiz.currentQuestionVotes = {};
			}

			// Check if user already voted for this question
			if (quiz.currentQuestionVotes[uid]) {
				return;
			}

			// Record vote
			quiz.currentQuestionVotes[uid] = {
				answer: answerId ?? answerText ?? "",
				voted_at: votedAt,
			};

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
			delete quiz.currentQuestionVotes;
			delete quiz.currentQuestionScores;
			quiz.questionStarted_at = new Date().toISOString();
			const index = quiz.questionList.findIndex((q) => q.id === quiz.currentQuestionId);
			if (index < quiz.questionList.length - 1) {
				currentQuestion = quiz.questionList[index + 1] || null;
				if (currentQuestion) quiz.currentQuestionId = currentQuestion.id;
				currentQuiz = quiz;
			}
			void this.saveData(quizId, false, true);
		},

		resetQuizState(quizId: string, confirm: boolean = true, save: boolean = true): void {
			const reset = () => {
				const quiz = this.quizList.find((v) => v.id === quizId);
				if (!quiz) return;
				quiz.currentQuestionId = "";
				delete quiz.currentQuestionRevealed;
				delete quiz.currentQuestionStats;
				delete quiz.currentQuestionVotes;
				delete quiz.currentQuestionScores;
				currentQuiz = null;
				currentQuestion = null;
				quiz.leaderboard = {};
				quiz.quizStarted_at = "";
				quiz.questionStarted_at = "";
				if (save) void this.saveData(quizId, false, true);
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
			const index = quiz.questionList.findIndex((q) => q.id === quiz.currentQuestionId);

			// If this is the last question, compute the final leaderboard and send a message to chat with the winner
			if (index === quiz.questionList.length - 1) {
				const leaderboard = Object.entries(quiz.leaderboard || {})
					.map(([uid, data]) => ({
						uid,
						...data,
					}))
					.sort((a, b) => b.score - a.score);
				const firstUser = leaderboard[0];
				if (firstUser) {
					StoreProxy.users.getUserFrom(
						firstUser.platform || "twitch",
						StoreProxy.auth.twitch.user.id,
						firstUser.uid || "",
						firstUser.name,
						firstUser.platform != "twitch" ? firstUser.name : undefined,
						//Wait for user data to be computed (potential API call)
						(winner) => {
							if (firstUser.avatarPath) winner.avatarPath = firstUser.avatarPath;
							const message: TwitchatDataTypes.MessageQuizCompleteData = {
								channel_id: StoreProxy.auth.twitch.user.id,
								platform: "twitch",
								type: "quiz_complete",
								id: Utils.getUUID(),
								date: Date.now(),
								quizResult: {
									quizId: quiz.id,
									quizName: quiz.title,
									leaderboard,
									winner,
								},
							};
							void StoreProxy.chat.addMessage(message);
						},
					);
				}
			}
			void this.saveData(quizId, false, true);
		},

		async showLeaderBoard(quizId: string): Promise<void> {
			const quiz = this.quizList.find((v) => v.id === quizId);
			if (!quiz) return;
			const leaderboard: TwitchatDataTypes.QuizLeaderboard = {};
			const promises: Promise<TwitchatDataTypes.TwitchatUser | void>[] = [];
			for (const uid in quiz.leaderboard) {
				const element = quiz.leaderboard[uid]!;
				const promise = new Promise<TwitchatDataTypes.TwitchatUser | void>((resolve) => {
					if (element.anon) {
						resolve();
						return;
					}
					const platform = element.platform || "twitch";
					StoreProxy.users.getUserFrom(
						platform,
						StoreProxy.auth.twitch.user.id,
						uid,
						element.name,
						undefined,
						(user) => {
							resolve(user);
							leaderboard[uid] = {
								...element,
								platform,
								name: user.displayNameOriginal,
								avatarPath: user.avatarPath || "",
							};
						},
					);
				});
				promises.push(promise);
			}
			await Promise.all(promises);
			PublicAPI.instance.broadcast("ON_QUIZ_LEADERBOARD", leaderboard);
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

		validateFreeAnswer(
			answer: string,
			quiz: TwitchatDataTypes.QuizParams,
			question: TwitchatDataTypes.QuizParams["questionList"][number],
		): boolean {
			return validateFreeAnswer(answer, quiz, question);
		},

		async handleChatAnswer(message: TwitchatDataTypes.TranslatableMessage): Promise<void> {
			if (!currentQuestion || !currentQuiz) return;
			const answer = (message.message ?? "").trim();
			let answerId: string | undefined = undefined;
			if (currentQuestion.mode !== "freeAnswer") {
				if (answer.length == 1) {
					// Search if answer matches an answer index, either letter (A, B, C...) or number (1, 2, 3...)
					let index = letterIndexes.indexOf(answer.toUpperCase());
					if (index === -1) index = parseInt(answer) - 1;
					if (index >= 0 && index < currentQuestion.answerList.length) {
						answerId = currentQuestion.answerList[index]!.id;
					}
				}
				// Search if answer matches an actual text answer
				if (!answerId) {
					currentQuestion.answerList.forEach((a) => {
						if (a.title.trim().toLowerCase() === answer.toLowerCase()) {
							answerId = a.id;
						}
					});
				}
			}
			// Handle the answer
			void this.handleAnswer(
				message.platform,
				0,
				currentQuiz.id,
				currentQuestion.id,
				answerId,
				answerId ? undefined : answer,
				message.user.id,
			);
		},

		computeQuestionScores(quizId: string, questionId: string): { [uid: string]: number } {
			const quiz = this.quizList.find((v) => v.id === quizId);
			if (!quiz) return {};
			const question = quiz.questionList.find((q) => q.id === questionId);
			if (!question || !quiz.currentQuestionVotes) return {};

			const votes = quiz.currentQuestionVotes;
			if (!votes || Object.keys(votes).length === 0) return {};

			const summary: { [uid: string]: number } = {};

			// For majority mode, determine the winning answer(s)
			let majorityWinnerIds: Set<string> | undefined;
			if (question.mode === "majority") {
				const voteCounts: { [answerId: string]: number } = {};
				for (const uid in votes) {
					const vote = votes[uid]!;
					voteCounts[vote.answer] = (voteCounts[vote.answer] || 0) + 1;
				}
				const maxVoteCount = Math.max(...Object.values(voteCounts));
				majorityWinnerIds = new Set(
					Object.keys(voteCounts).filter((id) => voteCounts[id] === maxVoteCount),
				);
			}

			for (const uid in votes) {
				const vote = votes[uid]!;
				const userData = quiz.leaderboard[uid];
				if (!userData) continue;
				const score = computeAnswerScore({
					quiz,
					question,
					answerId: question.mode !== "freeAnswer" ? vote.answer : undefined,
					answerText: question.mode === "freeAnswer" ? vote.answer : undefined,
					votedAt: vote.voted_at ?? new Date().toISOString(),
					majorityWinnerIds,
				});
				summary[uid] = score;
				userData.score += score;
			}
			return summary;
		},

		async importCSV(quizId: string, file: File): Promise<boolean> {
			if (file.type !== "text/csv" || !file.name.endsWith(".csv")) return false;
			const quiz = this.quizList.find((v) => v.id === quizId);
			if (!quiz) return false;

			let content = await file.text();
			if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);

			const rows = parseCSVRows(content, ";");
			const knownModes = new Set(["classic", "majority", "freeAnswer"]);
			if (!rows.some((r) => knownModes.has((r[0] || "").trim()))) return false;

			const parseDuration = (raw: string | undefined): number | undefined => {
				const n = parseInt((raw || "").trim());
				return isNaN(n) || n <= 0 ? undefined : n;
			};
			const parseTolerance = (raw: string | undefined): 0 | 1 | 2 | 3 | 4 | 5 | undefined => {
				const trimmed = (raw || "").trim();
				if (!trimmed) return undefined;
				const n = parseInt(trimmed);
				if (isNaN(n) || n < 0 || n > 5) return undefined;
				return n as 0 | 1 | 2 | 3 | 4 | 5;
			};

			let added = 0;
			for (const row of rows) {
				const mode = (row[0] || "").trim();
				const questionText = (row[1] || "").trim();
				if (!questionText) continue;

				if (mode === "classic") {
					const duration = parseDuration(row[CLASSIC_ANSWER_SLOTS + 2]);
					const answerList: { id: string; title: string; correct?: boolean }[] = [];
					for (let i = 0; i < CLASSIC_ANSWER_SLOTS; i++) {
						const raw = (row[i + 2] || "").trim();
						if (!raw) continue;
						const correct = raw.startsWith("*");
						const title = (correct ? raw.slice(1) : raw).trim();
						if (!title) continue;
						answerList.push({ id: Utils.getUUID(), title, correct });
					}
					if (answerList.length < 2) continue;
					quiz.questionList.push({
						id: Utils.getUUID(),
						mode: "classic",
						question: questionText,
						duration_s: duration,
						answerList,
					});
					added++;
				} else if (mode === "majority") {
					const duration = parseDuration(row[MAJORITY_ANSWER_SLOTS + 2]);
					const answerList: { id: string; title: string }[] = [];
					for (let i = 0; i < MAJORITY_ANSWER_SLOTS; i++) {
						const title = (row[i + 2] || "").trim();
						if (!title) continue;
						answerList.push({ id: Utils.getUUID(), title });
					}
					if (answerList.length < 2) continue;
					quiz.questionList.push({
						id: Utils.getUUID(),
						mode: "majority",
						question: questionText,
						duration_s: duration,
						answerList,
					});
					added++;
				} else if (mode === "freeAnswer") {
					const answer = (row[2] || "").trim();
					if (!answer) continue;
					quiz.questionList.push({
						id: Utils.getUUID(),
						mode: "freeAnswer",
						question: questionText,
						duration_s: parseDuration(row[3]),
						answer,
						toleranceLevel: parseTolerance(row[4]),
					});
					added++;
				}
			}

			if (added === 0) return false;
			void this.saveData(quizId);
			return true;
		},

		exportCSV(quizId: string): void {
			const quiz = this.quizList.find((v) => v.id === quizId);
			if (!quiz) return;

			const escape = (v: string | number | undefined | null): string => {
				if (v === undefined || v === null || v === "") return "";
				const s = String(v);
				if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
				return s;
			};

			const rows: string[] = [];
			for (const q of quiz.questionList) {
				const cols: string[] = [q.mode, escape(q.question)];
				if (q.mode === "freeAnswer") {
					cols.push(escape(q.answer));
					cols.push(escape(q.duration_s));
					cols.push(escape(q.toleranceLevel));
				} else {
					const slots =
						q.mode === "classic" ? CLASSIC_ANSWER_SLOTS : MAJORITY_ANSWER_SLOTS;
					const isClassic = q.mode === "classic";
					for (let i = 0; i < slots; i++) {
						const a = q.answerList[i];
						if (!a) {
							cols.push("");
							continue;
						}
						const prefix = isClassic && (a as { correct?: boolean }).correct ? "*" : "";
						cols.push(escape(prefix + (a.title || "")));
					}
					cols.push(escape(q.duration_s));
				}
				rows.push(cols.join(";"));
			}

			const csv = "﻿" + rows.join("\r\n");
			const safeName =
				(quiz.title || "quiz").replace(/[^a-z0-9\-_]+/gi, "_").slice(0, 60) || "quiz";
			Utils.downloadFile(safeName + ".csv", csv, undefined, "text/csv");
		},

		async parseOpenquizzdbCSV(file: File): Promise<string[] | null> {
			if (file.type !== "text/csv" || !file.name.endsWith(".csv")) return null;
			const content = await file.text();
			const firstRow = content.split("\n")[0]?.split(";");
			if (!firstRow) return null;
			if (firstRow.length < 8) return null;
			if (isNaN(parseInt(firstRow[0]!))) return null;
			if (firstRow[1]!.length !== 2) return null;

			openquizzdbCSVCache = content;
			const languages: string[] = [];
			const langDone = new Set<string>();
			content.split("\n").forEach((row) => {
				const [, lang] = row.split(";");
				if (!lang || langDone.has(lang)) return;
				langDone.add(lang);
				languages.push(lang);
			});
			return languages;
		},

		importOpenquizzdbCSV(quizId: string, langRef: string): void {
			const quiz = this.quizList.find((v) => v.id === quizId);
			if (!quiz) return;
			const content = openquizzdbCSVCache;
			const questions = content
				.split("\n")
				.map((line) => line.split(";"))
				.filter((line) => line.length > 0);
			questions.forEach((line) => {
				const [, lang, question, answer1, answer2, answer3, answer4] = line;
				if (!question || !answer1 || !answer2 || !answer3 || !answer4 || lang !== langRef)
					return;
				quiz.questionList.push({
					id: Utils.getUUID(),
					mode: "classic",
					question: question,
					answerList: [answer1, answer2, answer3, answer4].map((a, index) => ({
						id: Utils.getUUID(),
						title: a.trim(),
						correct: index === 0,
					})),
				});
			});
			openquizzdbCSVCache = "";
			void this.saveData(quizId);
		},

		computeQuestionStats(
			quizId: string,
			questionId: string,
		): NonNullable<TwitchatDataTypes.QuizParams["currentQuestionStats"]> {
			const quiz = this.quizList.find((v) => v.id === quizId);
			const question = quiz?.questionList.find((q) => q.id === questionId);
			if (question?.mode === "freeAnswer") return {};
			if (!quiz || !question) return {};
			const votes = quiz.currentQuestionVotes;
			if (!votes || Object.keys(votes).length === 0)
				return question.answerList.reduce(
					(acc, a) => {
						acc[a.id] = { globalPercent: 0, relativePercent: 0, voteCount: 0 };
						return acc;
					},
					{} as NonNullable<TwitchatDataTypes.QuizParams["currentQuestionStats"]>,
				);

			const maxVotes = question.answerList.reduce((max, a) => {
				const count = Object.values(votes).filter((v) => v.answer == a.id).length;
				return count > max ? count : max;
			}, 0);
			return question.answerList.reduce(
				(acc, a) => {
					acc[a.id] = {
						globalPercent:
							Math.round(
								(Object.values(votes).filter((v) => v.answer == a.id).length /
									Object.keys(votes).length) *
									1000,
							) / 1000,
						relativePercent:
							Math.round(
								(Object.values(votes).filter((v) => v.answer == a.id).length /
									maxVotes) *
									1000,
							) / 1000,
						voteCount: Object.values(votes).filter((v) => v.answer == a.id).length,
					};
					return acc;
				},
				{} as NonNullable<TwitchatDataTypes.QuizParams["currentQuestionStats"]>,
			);
		},
	} satisfies StoreActions<"quiz", IQuizState, IQuizGetters, IQuizActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeQuiz, import.meta.hot));
}

interface IStoreData {
	quizList: TwitchatDataTypes.QuizParams[];
}
