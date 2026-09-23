"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import styles from "./AccountNav.module.css";

export function AccountNav() {
  const [initial, setInitial] = useState<string | null>(null);
  const [avatar, setAvatar] = useState("");
  useEffect(() => {
    async function loadUser() {
      if (!supabase || !isSupabaseConfigured) return setInitial("");
      const { data: { user } } = await supabase.auth.getUser();
      const name = typeof user?.user_metadata.name === "string" ? user.user_metadata.name : user?.email || "";
      setAvatar(typeof user?.user_metadata.avatar_url === "string" ? user.user_metadata.avatar_url : "");
      setInitial(name.trim().charAt(0).toUpperCase());
    }
    void loadUser();
  }, []);

  async function signOut() {
    if (supabase && isSupabaseConfigured) await supabase.auth.signOut();
    localStorage.removeItem("local-reset-registration");
    setInitial("");
    window.location.assign("/");
  }

  if (initial === null) return <span className={styles.placeholder} aria-hidden="true" />;
  if (!initial) return <Link href="/iniciar-sesion">Iniciar sesión</Link>;
  return <span className={styles.accountActions}><Link className={styles.avatar} href="/perfil" aria-label="Abrir mi perfil">{avatar ? <img src={avatar} alt="" /> : initial}</Link><button className={styles.signOut} type="button" onClick={signOut}>Cerrar sesión</button></span>;
}
