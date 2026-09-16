import { ImageResponse } from "next/og";

export const alt = "Curso de podcast presencial en Madrid | Local Reset Academy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "70px", background: "linear-gradient(135deg, #080a10 0%, #182436 55%, #d8ed48 160%)", color: "#f7f6f1" }}>
      <div style={{ display: "flex", fontSize: 30, letterSpacing: 3 }}>LOCAL RESET <span style={{ color: "#d8ed48", marginLeft: 14 }}>ACADEMY</span></div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 72, fontWeight: 700, lineHeight: 1.04 }}>Curso de podcast<br />presencial en Madrid</div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 30, color: "#d8ed48" }}>IDEA · AUDIO · VÍDEO · PUBLICACIÓN</div>
      </div>
      <div style={{ display: "flex", fontSize: 26 }}>10 horas prácticas en estudio profesional · Madrid</div>
    </div>,
    size,
  );
}
