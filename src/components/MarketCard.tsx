"use client";

import Link from "next/link";
import { Market, MarketStats } from "@/modules/market/domain/Market";

type Props = {
  market: Market;
  marketStats?: MarketStats | null;
};

export function MarketCard({ market, marketStats }: Props) {
  return (
    <Link key={market.id} href={`/markets/${market.id}`} className="block">
      <div key={market.id} className="marketcard-base">
        <h3 className="marketcard-question">{market.question}</h3>

        {market.description && (
          <p className="marketcard-description">{market.description}</p>
        )}

        <div className="marketcard-statusbar">
          <span>Status: {market.status}</span>
          <span>Closes: {new Date(market.closeAt).toLocaleString()}</span>
        </div>

        {marketStats && (
          <div className="marketcard-statusbar">
            Bets: {marketStats.totalMarketStats.totalBets} · Volume:{" "}
            {marketStats.totalMarketStats.totalVolume}
          </div>
        )}
      </div>
    </Link>
  );
}
