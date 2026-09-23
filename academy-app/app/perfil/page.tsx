import Link from "next/link";
import type { Metadata } from "next";
import { ProfileDashboard } from "../components/ProfileDashboard";
import { AccountNav } from "../components/AccountNav";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ProfilePage() { return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/#explorar">Explorar</Link><Link href="/premium">Premium</Link><AccountNav /></span></nav><ProfileDashboard /></main>; }
