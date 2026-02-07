import { MyMarketBetDTO } from "@/modules/market/dto/myMarketBetDTO";
import Link from "next/link";
import { useMe } from "@/context/MeContext";
import { apiFetch } from "@/lib/apiFetch";

type Bet = {
  orderId: string;
  outcome: "YES" | "NO";
  amount: number;
  price: number;
  status: string;
  createdAt: string;
};

type Props = {
  market: MyMarketBetDTO;
  onUpdate: (updatedMarket: MyMarketBetDTO | null) => void;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function MarketRow({ market, onUpdate }: Props) {
  const { refreshMe } = useMe();

  async function onCancel(bet: Bet) {
    const ok = window.confirm("Are you sure you want to cancel this order?");

    if (!ok) return;

    try {
      const res = await apiFetch(`/api/orders/${bet.orderId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Cancel failed");
      }

      const remainingBets = market.bets.filter((b) => b.orderId !== bet.orderId);

      if (remainingBets.length === 0) {
        onUpdate(null);
      } else {
        onUpdate({
          ...market,
          bets: remainingBets,
        });
      }

      await refreshMe();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Cancel failed"));
    }
  }

  return (
    <div className="bg-stone-900 rounded-lg p-4 space-y-3">
      <Link
        href={`/markets/${market.marketId}`}
        className="block marketcard-question hover:underline"
      >
        {market.question}
      </Link>

      <div className="space-y-2">
        {market.bets.map((bet) => (
          <div
            key={bet.orderId}
            className="flex justify-between text-sm text-stone-300"
          >
            <span>
              {bet.outcome} · {bet.amount} @ {bet.price}
            </span>
            <span>
              {new Date(bet.createdAt).toLocaleString()} @ {bet.status}
            </span>

            <button
              className="text-yellow-400 hover:text-yellow-300 text-xs font-semibold cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel(bet);
              }}
            >
              Cancel
            </button>
          </div>
        ))}
      </div>

      <div className="marketcard-statusbar text-stone-400">
        <span>{market.status}</span>
        <span>
          Fogadás zár {new Date(market.closesAt).toLocaleDateString()}
        </span>
        {market.resolvesAt && (
          <span>
            Esemény vége {new Date(market.resolvesAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
