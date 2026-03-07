import type { Metadata } from "next";
import { EventDetailClient } from "./EventDetailClient";
import { getEventShareData } from "@/modules/event/application/getEventShareData";

const BASE_URL = "https://polipmarket.hu";

function truncateQuestion(question: string): string {
  if (question.length <= 80) {
    return question;
  }

  return `${question.slice(0, 77)}...`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const shareData = await getEventShareData(id);
  const fallbackTitle = "Esemény | Polipmarket";

  if (!shareData) {
    return {
      title: fallbackTitle,
      description: "Esemény részletek a Polipmarketen.",
      openGraph: {
        type: "website",
        url: `${BASE_URL}/events/${id}`,
        title: fallbackTitle,
        description: "Esemény részletek a Polipmarketen.",
        images: [`${BASE_URL}/api/events/${id}/og-image`],
      },
      twitter: {
        card: "summary_large_image",
        title: fallbackTitle,
        description: "Esemény részletek a Polipmarketen.",
        images: [`${BASE_URL}/api/events/${id}/og-image`],
      },
    };
  }

  const title = `${truncateQuestion(shareData.question)} | Polipmarket`;

  return {
    title,
    description: shareData.description,
    openGraph: {
      type: "website",
      url: `${BASE_URL}/events/${id}`,
      title,
      description: shareData.description,
      images: [
        {
          url: `${BASE_URL}/api/events/${id}/og-image`,
          width: 1200,
          height: 630,
          alt: `Polipmarket esemény: ${shareData.question}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: shareData.description,
      images: [`${BASE_URL}/api/events/${id}/og-image`],
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventDetailClient id={id} />;
}
