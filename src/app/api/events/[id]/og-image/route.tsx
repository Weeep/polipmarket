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

  let shareData: Awaited<ReturnType<typeof getEventShareData>> = null;

  try {
    shareData = await getEventShareData(id);
  } catch (error) {
    console.error("[og-image] Failed to fetch event share data", error);
  }

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
              left: "88px",
              top: "548px",
              width: "620px",
              height: "520px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              opacity: 0.2,
            }}
          >
            <div
              style={{
                width: "360px",
                height: "260px",
                borderTopLeftRadius: "190px",
                borderTopRightRadius: "190px",
                borderBottomLeftRadius: "130px",
                borderBottomRightRadius: "130px",
                background: "#f59e0b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0 72px",
                marginBottom: "-28px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "999px",
                  background: "#120808",
                }}
              />
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "999px",
                  background: "#120808",
                }}
              />
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                gap: "-8px",
              }}
            >
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  style={{
                    width: "136px",
                    height: "126px",
                    borderBottomLeftRadius: "80px",
                    borderBottomRightRadius: "80px",
                    borderTopLeftRadius: "70px",
                    borderTopRightRadius: "70px",
                    background: "#f59e0b",
                    transform: index % 2 === 0 ? "rotate(-16deg)" : "rotate(16deg)",
                  }}
                />
              ))}
            </div>
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
