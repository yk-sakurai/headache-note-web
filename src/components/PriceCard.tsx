import Button from "./Button";

type PriceCardProps = {
  title: string;
  priceLabel: string;
  promoLabel?: string;
  description?: string;
  features: string[];
  ctaHref: string;
  ctaText: string;
  badgeText?: string;
  highlighted?: boolean;
  onCtaClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  disabled?: boolean;
};

export default function PriceCard({
  title,
  priceLabel,
  promoLabel,
  description,
  features,
  ctaHref,
  ctaText,
  badgeText,
  highlighted = false,
  onCtaClick,
  disabled = false,
}: PriceCardProps) {
  return (
    <div
      className={
        `rounded-2xl ${highlighted ? "border-2 border-[color:var(--brand-primary)] ring-2 ring-offset-2 ring-[color:var(--brand-primary)]" : "border border-gray-200"} p-6 flex flex-col gap-4 bg-white`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {badgeText ? (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            {badgeText}
          </span>
        ) : null}
      </div>

      <div className="flex items-end gap-3">
        {promoLabel ? (
          <>
            <div className="text-3xl font-bold text-gray-900">{promoLabel}</div>
            <div className="text-sm text-gray-500 line-through">{priceLabel}</div>
          </>
        ) : (
          <div className="text-3xl font-bold text-gray-900">{priceLabel}</div>
        )}
      </div>

      {description ? (
        <p className="text-sm text-gray-600">{description}</p>
      ) : null}

      <ul className="mt-2 space-y-2">
        {features.map((f, i) => (
          <li key={i} className="text-sm text-gray-700">
            {f}
          </li>
        ))}
      </ul>

      <div className="pt-2">
        <Button href={ctaHref} onClick={onCtaClick} disabled={disabled}>
          {ctaText}
        </Button>
      </div>
    </div>
  );
}
