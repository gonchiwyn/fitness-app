import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            color: "#facc15",
            fontSize: 134,
            fontWeight: 900,
            fontFamily: "system-ui",
            letterSpacing: -7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          O
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: 45,
            width: 90,
            height: 8,
            background: "#facc15",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
