import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * Outwork mark: bold "O" with a diagonal underline bar.
 * Reads as "cut through the target" — the spirit of outwork.
 */
export default function Icon() {
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
            fontSize: 380,
            fontWeight: 900,
            fontFamily: "system-ui",
            letterSpacing: -18,
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
            bottom: 82,
            left: 128,
            width: 256,
            height: 22,
            background: "#facc15",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
