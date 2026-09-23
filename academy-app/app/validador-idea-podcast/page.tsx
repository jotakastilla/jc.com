import Link from "next/link";
import type { Metadata } from "next";
import { PodcastIdeaValidator } from "@/app/components/PodcastIdeaValidator";
import { AccountNav } from "@/app/components/AccountNav";
export const metadata: Metadata = { title: "Validador de ideas de podcast | Local Reset Academy", description: "Define y valida tu idea de podcast paso a paso." };
export default function PodcastIdeaPage() { return <main className="shell"><nav><Link className="brand" href="/">LOCAL RESET <i>ACADEMY</i></Link><span><Link href="/areas">Academy Free</Link><AccountNav /></span></nav><PodcastIdeaValidator /></main>; }
