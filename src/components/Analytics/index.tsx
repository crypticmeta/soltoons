import React from 'react';
import historicalStats from '../../data/historicalStats.json';

const number = new Intl.NumberFormat('en-US');

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));

const cards = [
  {
    value: `${number.format(historicalStats.metrics.signaturesInspected)}+`,
    label: 'signatures inspected',
    note: 'The bounded query reached its cap.',
  },
  {
    value: number.format(historicalStats.metrics.successfulSignatures),
    label: 'successful signatures',
    note: 'Raw chain activity, not a play or user count.',
  },
  {
    value: number.format(historicalStats.metrics.currentAccountTypes.UserState),
    label: 'current UserState accounts',
    note: 'Program accounts, not verified unique people.',
  },
  {
    value: number.format(historicalStats.metrics.recognizedSuccessfulTransactionsInSample),
    label: 'recognized successful actions',
    note: `From ${historicalStats.methodology.decodedTransactionSample} decoded signatures.`,
  },
];

function Analytics() {
  const instructions = historicalStats.metrics.instructionCountsInSample;

  return (
    <section className="w-full px-6 pb-20 lg:px-24" aria-labelledby="historical-activity-title">
      <div className="mx-auto max-w-6xl">
        <div className="pb-7 text-center">
          <h2
            id="historical-activity-title"
            className="inline-block border-4 border-black bg-brand_yellow px-5 py-3 text-lg font-extrabold uppercase tracking-wider"
          >
            Verified historical on-chain activity
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold text-white">
            A checked-in Solana mainnet snapshot generated {formatDate(historicalStats.generatedAt)}. It keeps the
            playable archive independent from the retired analytics service.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <article key={card.label} className="rounded-3xl border-4 border-black bg-brand_yellow p-5 shadow-xl">
              <p className="text-3xl font-black">{card.value}</p>
              <h3 className="mt-1 text-sm font-extrabold uppercase">{card.label}</h3>
              <p className="mt-3 text-xs font-semibold leading-relaxed">{card.note}</p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-5 rounded-3xl border-4 border-black bg-black/80 p-6 text-white md:grid-cols-2">
          <div>
            <h3 className="text-sm font-extrabold uppercase text-brand_yellow">Decoded sample</h3>
            <p className="mt-2 text-sm leading-relaxed">
              {number.format(historicalStats.metrics.interactingFeePayersInSample)} distinct fee-payer wallets made
              recognized successful calls in the decoded sample. That is evidence of interacting wallets—not a claim
              about unique people.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-gray-300">
              {instructions.userBet} bets · {instructions.userSettle} settlements · {instructions.collectReward}{' '}
              reward collections · {instructions.userInit} user initializations
            </p>
          </div>
          <div>
            <h3 className="text-sm font-extrabold uppercase text-brand_yellow">Observed history</h3>
            <p className="mt-2 text-sm leading-relaxed">
              The inspected range begins {formatDate(historicalStats.observedActivity.oldestSignatureInRange)}. The most
              recent recognized successful Soltoons action in this snapshot is{' '}
              {formatDate(historicalStats.observedActivity.newestRecognizedSuccessfulActivity)}.
            </p>
            <a
              className="mt-3 inline-block text-xs font-extrabold uppercase text-brand_yellow underline decoration-2 underline-offset-4"
              href={historicalStats.explorerUrl}
              target="_blank"
              rel="noreferrer"
            >
              Inspect the program on Solana Explorer
            </a>
          </div>
        </div>

        <details className="mt-4 rounded-2xl border-2 border-white/30 bg-black/60 p-4 text-xs text-gray-200">
          <summary className="cursor-pointer font-extrabold uppercase text-white">How these numbers were derived</summary>
          <p className="mt-3 leading-relaxed">{historicalStats.methodology.note}</p>
          <p className="mt-2 break-all leading-relaxed">
            Program: {historicalStats.programId} · Source: {historicalStats.source}
          </p>
        </details>
      </div>
    </section>
  );
}

export default Analytics;
