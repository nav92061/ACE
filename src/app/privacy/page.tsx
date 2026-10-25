import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="subpage">
      <article className="pixel-frame subpage-card">
        <div className="pixel-inner">
          <h1>Privacy</h1>
          <p>
            ACE Sets does not require an account to play. Today’s flight, your streak, and
            practice history stay in this browser’s local storage. This version does not send
            answers to a server. There are no ads and no third-party trackers.
          </p>
          <p>
            Sound is off until you turn it on. Tones are generated on your device and are not
            recorded.
          </p>
          <p>
            <Link href="/">Back to the pad</Link>
          </p>
        </div>
      </article>
    </main>
  );
}
