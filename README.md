# ACE

Subject landing at `/`. Calculus app at **`/calc`**.

## Quick start

```bash
npm install
cp .env.local.example .env.local   # add Firebase web config
npm run dev
```

Open `/` for subjects, `/calc` for AP Calculus timed practice.

## Auth

- Username + password only (no Google).
- Firebase Auth Email/Password stores credentials (email is `username@ace.local` under the hood).
- Firestore `users/{uid}` stores username + role.

Enable **Email/Password** in Firebase Authentication (not Google).

## Unit skills (Calc · through Test 3)

Derivatives in context → Related rates → Linear approx → MVT → Critical points → Inc/Dec → First derivative test → Candidates test → Second derivative test → Graph extrema → Connecting f/f′/f″ → Optimization.

Timed sets only (no mastery unlock). Leaderboard when joined to a class.
