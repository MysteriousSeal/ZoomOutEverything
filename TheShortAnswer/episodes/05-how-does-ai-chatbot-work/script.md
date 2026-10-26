# 05 — How Does an AI Chatbot Work?

- **Category:** Tech & internet
- **Length:** ~30s (84 words)
- **Core idea:** A language model is trained to predict the next word. It answers by turning text into numbers, picking a likely next word, and repeating, which is also why it can be fluently wrong.
- **Hook:** A chat window where an answer types itself out: "How does an AI chatbot write its answers?"
- **Accent colour:** mint `(120, 235, 170)`
- **Signature transition:** the typed reply's words split into tokens that flip into columns of numbers and flow into the network; the network's output probabilities become the next word appearing in the chat (loop)
- **Production:** not rendered yet

## Narration script

> How does an AI chatbot write its answers?
> It's trained on a huge amount of text: books, websites, code.
> It learns one core skill: predicting the next word.
> Your words become numbers, and it calculates the likeliest next word.
> Then it adds that word, and repeats.
> On its own, it isn't checking facts, so it can be confidently wrong.
> Every reply is built that way, one word at a time.

## Scene breakdown

| # | Chapter | Visuals | On-screen labels |
|---|---------|---------|------------------|
| 0 | — (hook) | A minimal chat interface; a reply types itself out, word by word | HOW DOES IT **KNOW?** |
| 1 | 01 — Training | Streams of text fragments flow from all sides into a dense, glowing network | trillions of words |
| 2 | 02 — Prediction | "The sky is ___" with a probability bar chart: blue 71% · clear 9% · falling 2% … (a nod to episode 01) | predict the next word |
| 3 | 03 — Numbers | The sentence breaks into tokens, each becoming a column of numbers that flows through layers of the network | words → numbers → probabilities |
| 4 | 04 — One at a time | Loop diagram: predict → append → feed back in; the sentence grows one token per pass | one token per step |
| 5 | 05 — Limits | The model fluently outputs a wrong fact; a "plausible ≠ true" stamp; a magnifier hovers over it | plausible ≠ true |
| 6 | 06 — Like this | The captions on screen are shown being "generated": each word drops in with a tiny probability bar (loops to the hook) | — |

## YouTube metadata

- **Title:** How Does AI Actually Write Its Answers? #shorts
- **Description:** It isn't thinking up the whole answer at once. It writes one word at a time.
- **Hashtags:** #AI #ChatGPT #LLM #tech #explained #shorts
- **Pinned comment:** "Next: how does AI turn words into numbers? 🔢"

## Fact-check notes

- LLMs are pretrained to predict the next **token** (a word or part of a word). "Word" is a simplification.
- After pretraining, chat models are fine-tuned (e.g. on instructions and with human feedback) to be helpful and safe. The script leaves this step out.
- Output is **autoregressive**: one token is chosen from a probability distribution (often with some randomness), appended, and the process repeats.
- "Isn't checking facts" means the base model on its own. Many chatbots can also call search or other tools, hence "on its own".
- **Hallucination:** fluent but false output, because the model optimizes for plausible text, not verified truth.
- Probabilities in the "The sky is ___" chart are illustrative.
- Training sets for frontier models are typically measured in trillions of tokens.
