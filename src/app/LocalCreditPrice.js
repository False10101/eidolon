'use client';

import { useEffect, useState } from 'react';

const USD_FX = {
  currency: 'USD',
  symbol: '$',
  rate: 1,
  locale: 'en-US',
};

let cachedFx = null;
let fxRequest = null;

function loadFx() {
  if (cachedFx) return Promise.resolve(cachedFx);

  if (!fxRequest) {
    fxRequest = fetch('/api/topup/fx-rate')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load local pricing.');
        return response.json();
      })
      .then((data) => {
        const rate = Number(data?.rate);
        cachedFx = Number.isFinite(rate) && rate > 0
          ? { ...USD_FX, ...data, rate }
          : USD_FX;
        return cachedFx;
      })
      .catch(() => {
        cachedFx = USD_FX;
        return cachedFx;
      });
  }

  return fxRequest;
}

function numericValues(value) {
  if (Array.isArray(value)) {
    return value.map(Number).filter(Number.isFinite);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? [value] : [];
  }

  return String(value ?? '')
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter(Number.isFinite) ?? [];
}

function formatCurrency(amount, fx) {
  const magnitude = Math.abs(amount);
  const maximumFractionDigits = magnitude >= 100 ? 0 : magnitude >= 10 ? 1 : 2;

  try {
    return new Intl.NumberFormat(fx.locale || 'en-US', {
      style: 'currency',
      currency: fx.currency || 'USD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    return `${fx.symbol || '$'}${amount.toLocaleString(undefined, {
      maximumFractionDigits,
    })}`;
  }
}

export function formatLocalCreditPrice(credits, fx) {
  const values = numericValues(credits);
  if (!fx || values.length === 0) return null;

  const formatted = values.slice(0, 2).map((value) => {
    const localAmount = (value / 100) * fx.rate;
    return formatCurrency(localAmount, fx);
  });

  return formatted.join('–');
}

export default function LocalCreditPrice({
  credits,
  usdAmount,
  prefix = '≈ ',
  suffix = '',
  hideWhenUsd = false,
  className = '',
}) {
  const [fx, setFx] = useState(cachedFx);

  useEffect(() => {
    let active = true;
    loadFx().then((nextFx) => {
      if (active) setFx(nextFx);
    });
    return () => {
      active = false;
    };
  }, []);

  const sourceCredits = usdAmount == null ? credits : Number(usdAmount) * 100;
  const localPrice = formatLocalCreditPrice(sourceCredits, fx);
  if (!localPrice || (hideWhenUsd && fx?.currency === 'USD')) return null;

  return (
    <span className={`whitespace-nowrap font-mono text-[0.85em] font-normal text-[var(--fg-3)] ${className}`}>
      {prefix}{localPrice}{suffix}
    </span>
  );
}
