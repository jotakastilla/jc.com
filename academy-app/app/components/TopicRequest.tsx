import { RegistrationForm } from "./RegistrationForm";
import styles from "./TopicRequest.module.css";

export function TopicRequest() {
  return <aside className={styles.request}><div><small>PRÓXIMA EDICIÓN · 390 €</small><h3>Entra gratis<br />en la <b>lista prioritaria.</b></h3><p>Ahora no hay fechas cerradas ni reserva. Cuando las confirmemos, te avisaremos; si te encajan, podrás pagar 50 € para reservar tu plaza.</p></div><RegistrationForm source="masterclass" /></aside>;
}
