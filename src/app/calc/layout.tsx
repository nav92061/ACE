import { Brand } from "@/components/Brand";
import Link from "next/link";

export default function CalcLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header hotbar">
        <Brand href="/calc" subtitle="CALC" size={40} />
        <nav className="nav-links hotbar-slots" aria-label="Main">
          <Link href="/calc/practice" className="hotbar-slot">
            Practice
          </Link>
          <Link href="/calc/leaderboard" className="hotbar-slot">
            Board
          </Link>
          <Link href="/calc/progress" className="hotbar-slot">
            Stats
          </Link>
          <Link href="/calc/login" className="hotbar-slot">
            Login
          </Link>
          <Link href="/" className="hotbar-slot">
            Home
          </Link>
        </nav>
      </header>
      <main className="main">{children}</main>
    </>
  );
}
