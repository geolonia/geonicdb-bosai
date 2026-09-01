"use client";

type QuickLink = {
  id: string;
  label: string;
  href: string | null;
  comingSoonLabel: string;
};

type Props = {
  heading: string;
  links: QuickLink[];
};

export function QuickLinks({ heading, links }: Props) {
  return (
    <section className="quick-links" aria-labelledby="quick-links-heading">
      <h2 id="quick-links-heading">{heading}</h2>
      <ul className="quick-links__list">
        {links.map((link) => (
          <li key={link.id} className="quick-links__item">
            {link.href ? (
              <a className="quick-links__card" href={link.href}>
                <span className="quick-links__label">{link.label}</span>
              </a>
            ) : (
              <div
                className="quick-links__card quick-links__card--disabled"
                aria-disabled="true"
              >
                <span className="quick-links__label">{link.label}</span>
                <span className="quick-links__status">
                  {link.comingSoonLabel}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
