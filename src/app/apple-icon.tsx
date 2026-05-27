import { ImageResponse } from "next/og";

// ImageResponse requer Edge Runtime para resolver corretamente em build
export const runtime = "edge";

// Apple touch icon padrão: 180x180
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const CORAL = "#FF6B47";
const INK = "#0F0F0F";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: INK,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Apple não usa arredondamento total (o SO aplica a máscara), mas dá uma borda suave
          borderRadius: 32,
        }}
      >
        <svg width="100" height="100" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            fill={CORAL}
            d="M12.7 2.3a1 1 0 0 0-1.4 0L1.6 12a1 1 0 0 0 1.4 1.4l.5-.5v7.6a1.5 1.5 0 0 0 1.5 1.5h4.5v-7a2.5 2.5 0 0 1 5 0v7H19a1.5 1.5 0 0 0 1.5-1.5v-7.6l.5.5A1 1 0 0 0 22.4 12L12.7 2.3Z"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
