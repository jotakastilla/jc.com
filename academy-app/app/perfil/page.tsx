import Link from "next/link";
import type { Metadata } from "next";
import { ProfileDashboard } from "../components/ProfileDashboard";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ProfilePage() { return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/#explorar">Explorar</Link><Link href="/premium">Premium</Link></span></nav><ProfileDashboard /></main>; }
