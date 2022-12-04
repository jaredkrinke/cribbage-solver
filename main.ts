import { PriorityQueue } from "./priority-queue.ts";

// TODO: Could just be a number
const suits = [
    "clubs",
    "spades",
    "diamonds",
    "hearts",
] as const;

type Suit = typeof suits[number];

interface Card {
    value: number;

    // TODO: Technically not needed, except for UI
    // suit: Suit;
}

type Deck = Card[];

function createDeck(): Deck {
    const deck: Card[] = [];
    for (const suit of suits) {
        for (let value = 1; value <= 13; value++) {
            deck.push({ /*suit,*/ value });
        }
    }
    return deck;
}

function shuffleDeck(deck: Deck): void {
    for (let i = deck.length - 1; i > 0; i--) {
        const index = Math.floor(Math.random() * (i + 1));
        const tmp = deck[index];
        deck[index] = deck[i];
        deck[i] = tmp;
    }
}

function cutDeck(deck: Deck, groupCount = 2): Deck[] {
    const groups: Deck[] = [];
    const groupSize = Math.floor(deck.length / groupCount);
    for (let i = 0; i < groupCount - 1; i++) {
        groups[i] = deck.slice(groupSize * i, groupSize * (i + 1));
    }
    groups[groupCount - 1] = deck.slice(groupSize * (groupCount - 1));
    return groups;
}

function formatCard(card?: Card): string {
    if (!card) {
        // return "    ";
        return "  ";
    }

    let result = "";
    switch (card.value) {
        case 1:
            result = " A";
            break;

        case 10:
            result = "10";
            break;

        case 11:
            result = " J";
            break;

        case 12:
            result = " Q";
            break;

        case 13:
            result = " K";
            break;

        default:
            result = " " + card.value;
            break;
    }

    // switch (card.suit) {
    //     case "clubs":
    //         result += " ♣";
    //         break;

    //     case "spades":
    //         result += " ♠";
    //         break;

    //     case "diamonds":
    //         result += " ♦";
    //         break;

    //     case "hearts":
    //         result += " ♥";
    //         break;
    // }

    return result;
}

interface State {
    decks: Deck[];
    stack: Card[];
    score: number;

    parent?: State;
    choice?: number;
}

function createStartState(deck: Deck): State {
    return {
        decks: cutDeck(deck, 4),
        stack: [],
        score: 0,
    };
}

function randomStartState(): State {
    const deck = createDeck();
    shuffleDeck(deck);
    return createStartState(deck);
}

function isDone(state: State): boolean {
    return state.decks.map(d => d.length).reduce((empty, length) => (empty && length === 0), true);
}

function cardToValue(card: Card): number {
    return Math.min(10, card.value);
}

function sumStack(stack: Card[]): number {
    return stack.reduce((total, card) => (total + cardToValue(card)), 0);
}

const setIndexToPoints = [2, 6, 12];
function scoreCard(stack: Card[], card: Card): number {
    let points = 0;
    if ((stack.length === 0) && (card.value === 11))  {
        points += 2;
    }

    const result = [...stack, card];
    const sum = sumStack(result);
    if (sum === 15) {
        points += 2;
    } else if (sum === 31) {
        points += 2;
    }

    let setPoints = 0;
    for (let i = stack.length - 1; (i >= 0) && (stack[i].value === card.value); i--) {
        setPoints = setIndexToPoints[stack.length - i - 1];
    }
    points += setPoints;

    // TODO: Optimize (e.g. early break if gap is too big or a card is repeated)
    let runPoints = 0;
    for (let runLength = 3; (runLength <= 7) && (stack.length >= (runLength - 1)); runLength++) {
        const list = result.slice(-runLength).map(c => c.value).sort();
        let runPosition = list[0];
        let contiguous = true;
        for (let i = 1; i < list.length; i++) {
            if (list[i] === (runPosition + 1)) {
                runPosition++;
            } else {
                contiguous = false;
                break;
            }
        }

        if (contiguous) {
            runPoints = runLength;
        }
    }
    points += runPoints;

    return points;
}

const stackMax = 31;
function trySelectCard(state: State, index: number): { valid: boolean, state?: State } {
    const deck = state.decks[index];
    const currentStackSum = sumStack(state.stack);
    if ((deck.length <= 0) || ((currentStackSum + cardToValue(deck[deck.length - 1])) > stackMax)) {
        return { valid: false };
    }

    const decks = state.decks.slice();
    const newList = deck.slice();
    decks[index] = newList;
    const card = newList.splice(newList.length - 1, 1)[0];
    const points = scoreCard(state.stack, card);

    // Check for stack end
    const newStackSum = currentStackSum + cardToValue(card);
    const remainder = (stackMax - newStackSum);
    let endStack = (remainder <= 0);
    if (!endStack) {
        const nonEmptyDecks = decks.filter(d => (d.length > 0));
        if (nonEmptyDecks.length === 0) {
            endStack = true;
        } else {
            const min = Math.min(...nonEmptyDecks.map(d => cardToValue(d[d.length - 1])));
            endStack = (min > remainder);
        }
    }

    return {
        valid: true,
        state: {
            decks,
            stack: endStack ? [] : [...state.stack, card],
            score: state.score + points,
            parent: state,
            choice: index,
        },
    }
}

interface StateWrapper {
    readonly priority: number;
    readonly state: State;
}

interface Choice {
    deck: number;
    score: number;
    card: Card;
    endStack: boolean;
}

function findOptimal(initial: State, maxSteps = 1000000): { state: State, choices: Choice[] } {
    // const q = [initial];
    const pq = new PriorityQueue<StateWrapper>();
    pq.enqueue({ priority: 0, state: initial });

    const analyzed: { [json: string]: boolean } = {};
    let optimalState = initial;
    let steps = 0;
    // while (q.length > 0 && (steps++ < maxSteps)) {
    while (pq.size() > 0 && (steps++ < maxSteps)) {
        // const state = q.shift()!;
        const { state } = pq.dequeue();
        if (state.score > optimalState.score) {
            optimalState = state;
        }

        if (!isDone(state)) {
            for (let i = 0; i < state.decks.length; i++) {
                const { valid, state: newState } = trySelectCard(state, i);
                if (valid) {
                    const { parent, choice, ...identity } = newState!;
                    const json = JSON.stringify({ ...identity });
                    if (!analyzed[json]) {
                        // q.push(newState!);
                        pq.enqueue({
                            priority: newState!.score,
                            state: newState!,
                        });
                        analyzed[json] = true;
                    }
                }
            }
        }
    }

    const result: Choice[] = [];
    let state = optimalState
    while (state.parent) {
        const deck = state.parent.decks[state.choice!];
        result.push({
            deck: state.choice!,
            score: state.score,
            card: deck[deck.length - 1],
            endStack: state.stack.length === 0,
        });
        state = state.parent;
    }
    return {
        state: optimalState,
        choices: result.reverse(),
    };
}

function formatState(state: State): string {
    let result = "";
    for (var i = 0; i < 13; i++) {
        result += `${state.decks.map(d => formatCard(d[i])).join(" ")}    ${formatCard(state.stack[i])}\n`;
    }

    result += "\n";
    result += `Stack: ${sumStack(state.stack)}\n`
    result += `Score: ${state.score}\n`;
    return result;
}

function logState(state: State): void {
    console.log(formatState(state));
}

const charToValue: { [char: string]: number } = {
    a: 1,
    j: 11,
    q: 12,
    k: 13,
};

let state: State;
if (Deno.args.length === 52) {
    const deck: Card[] = [];
    for (const a of Deno.args) {
        const value = charToValue[a.toLowerCase()] ?? parseInt(a);
        deck.push({ value });
    }
    state = createStartState(deck);
} else {
    state = randomStartState();
    // TODO
    throw "Skip for now";
}

// while (!isDone(state)) {
//     logState(state);
//     const choice = prompt("?");
//     if (choice !== null) {
//         const stackIndex = parseInt(choice);
//         if (stackIndex >= 1 && stackIndex <= state.decks.length) {
//             const { valid, state: newState } = trySelectCard(state, stackIndex - 1);
//             if (valid) {
//                 state = newState!;
//             } else {
//                 console.log("Invalid choice!");
//             }
//         }
//     }
// }

logState(state);

const start = Date.now();
const { state: optimalState, choices } = findOptimal(state, 3000000);
const elapsedMS = (Date.now() - start);
console.log(`
${choices.map(c => `${c.deck + 1} (${formatCard(c.card)}): ${c.score}${c.endStack ? "\n" : ""}`).join("\n")}

Score: ${optimalState.score}, choices (${choices.length}):
Elapsed: ${elapsedMS / 1000}s
`);
