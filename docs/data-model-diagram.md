# Polipmarket adatmodell (ER áttekintés)

# https://mermaidviewer.com/editor

```mermaid
erDiagram
    USER ||--o| WALLET : has
    USER ||--o{ EVENT : creates
    USER ||--o{ MARKET : creates
    USER ||--o{ ORDER : places
    USER ||--o{ POSITION : owns
    USER ||--o{ POSITION_LOT : owns

    EVENT ||--o{ MARKET : contains

    MARKET ||--o{ OUTCOME : has
    MARKET ||--o{ ORDER : has
    MARKET ||--o{ POSITION : aggregates
    MARKET ||--o{ POSITION_LOT : has
    MARKET ||--o| MARKET_AMM_CONFIG : config
    MARKET ||--o| MARKET_LIQUIDITY : legacy_pool

    OUTCOME ||--o{ POSITION : has
    OUTCOME ||--o{ POSITION_LOT : has
    OUTCOME ||--o| OUTCOME_LIQUIDITY : pool

    ORDER ||--o{ POSITION_LOT : opens_buy_lot
    ORDER ||--o{ LOT_CLOSE : sell_closes_lots

    POSITION_LOT ||--o{ LOT_CLOSE : closed_by
```

## Rövid értelmezés

- **Event → Market**: egy event alatt több market lehet.
- **Market → Outcome**: egy market alatt több outcome lehet (nem csak 1).
- **Order.position (YES/NO)**: a YES/NO nem külön tábla, hanem enum mező (`OrderPosition`) több táblában (`Order`, `Position`, `PositionLot`).
- **Position**: user aggregált pozíciója market+outcome+YES/NO szinten.
- **PositionLot**: BUY-onként nyitott lot (lot-szintű nyilvántartás).
- **LotClose**: SELL műveletek, amelyek konkrét buy lotokat zárnak részben/egészben.

Megjegyzés: a rendszerben megtalálható `MarketLiquidity` (market szintű), de az aktív AMM-logikában az `OutcomeLiquidity` + `MarketAmmConfig` a meghatározó.
