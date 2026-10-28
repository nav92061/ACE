# ACE Sets

A study game: 10 questions per launch, 60 seconds each. Right answers fly the rocket from the launch pad up through the sky and into space. Points reward accuracy and speed.

```bash
npm install
npm run dev
```

Open `/` or `/daily`. No account is required. Progress stays in the browser.

## Modes

- **Launch from my notes**: paste study notes (or add `.txt` / `.md` files) and Claude writes questions from them. A notes set never repeats a question. Questions you miss come back on a later launch, marked "Retry opportunity", until you get them right.
- **Daily set**: the same 10 AP Calculus AB problems for everyone until the next UTC midnight. One scored flight a day.
- **Unlimited** and **Practice by unit**: unscored calculus flights.
- **Best attempts**: your top launches and all-time stats.

## Scoring

A right answer earns 100 (easy), 200 (medium), 300 (hard) or 500 (rare) points, plus a speed bonus of up to the same amount again (answer instantly to double it; at 60 seconds the bonus is 0). Wrong answers score 0.

## Question generation setup

Notes mode calls the Claude API from the server route `src/app/api/questions/route.ts`. Create `.env.local` in the project root:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Restart `npm run dev` after adding it. Without a key, notes launches show a message explaining what's missing; the calculus modes work either way.
