import { ImageResponse } from "next/og";
import { getEventShareData } from "@/modules/event/application/getEventShareData";

export const runtime = "nodejs";

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 630;
const RENDER_SCALE = 2;
const RENDER_WIDTH = OUTPUT_WIDTH * RENDER_SCALE;
const RENDER_HEIGHT = OUTPUT_HEIGHT * RENDER_SCALE;

function truncateQuestion(question: string): string {
  if (question.length <= 110) {
    return question;
  }

  return `${question.slice(0, 107)}...`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const shareData = await getEventShareData(id);
  const title = shareData ? truncateQuestion(shareData.question) : "Esemény nem található";

  return new ImageResponse(
    (
      <div
        style={{
          width: `${OUTPUT_WIDTH}px`,
          height: `${OUTPUT_HEIGHT}px`,
          overflow: "hidden",
          display: "flex",
          background: "#000000",
        }}
      >
        <div
          style={{
            width: `${RENDER_WIDTH}px`,
            height: `${RENDER_HEIGHT}px`,
            display: "flex",
            position: "relative",
            transform: `scale(${1 / RENDER_SCALE})`,
            transformOrigin: "top left",
            background: "#000000",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "110px",
              top: "560px",
              fontSize: 640,
              lineHeight: 1,
              color: "rgba(245, 158, 11, 0.18)",
              userSelect: "none",
            }}
          >
            🐙
          </div>

          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "180px 220px",
              textAlign: "center",
              fontFamily: "Inter, Segoe UI, Arial, sans-serif",
              color: "#facc15",
              fontSize: 132,
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: -1.1,
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
    },
  );
}
