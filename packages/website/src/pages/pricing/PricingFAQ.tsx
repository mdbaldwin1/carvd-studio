export const pricingFAQs = [
  {
    question: "Is this really a one-time payment?",
    answer:
      "Yes. $59.99 once, and you own Carvd Studio forever. No monthly fees, no annual renewals, no surprise charges.",
  },
  {
    question: "Do I get future updates?",
    answer:
      "All future updates are included free forever. New features, improvements, bug fixes — you get them all automatically.",
  },
  {
    question: "What if I'm not satisfied?",
    answer:
      "We offer a 30-day, no-questions-asked money-back guarantee. If Carvd Studio doesn't save you time and money, email us for a full refund.",
  },
  {
    question: "Can I use it on multiple computers?",
    answer:
      "Your license works on up to 3 devices — any combination of Mac and Windows.",
  },
  {
    question: "Will it work offline?",
    answer: "Yes. Carvd Studio works 100% offline. No internet required, ever.",
  },
];

export default function PricingFAQ() {
  return (
    <div className="mb-3xl mt-3xl">
      <h2 className="text-4xl font-bold mb-xl text-center">
        Your Questions, Answered
      </h2>
      <div className="grid gap-xl">
        <div className="card">
          <h3 className="card-title">Is this really a one-time payment?</h3>
          <p className="card-description">
            Yes. $59.99 once, and you own Carvd Studio forever. No monthly fees,
            no annual renewals, no surprise charges. We hate subscriptions as
            much as you do.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">Do I get future updates?</h3>
          <p className="card-description">
            All future updates are included free forever. New features,
            improvements, bug fixes— you get them all automatically. No
            "upgrade" fees, no "pro" tiers, no games.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">What if I'm not satisfied?</h3>
          <p className="card-description">
            We offer a 30-day, no-questions-asked money-back guarantee. If Carvd
            Studio doesn't save you time and money, email us for a full refund.
            You risk nothing.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">Can I use it on multiple computers?</h3>
          <p className="card-description">
            Your license works on up to 3 devices—any combination of Mac and
            Windows. Use it in your shop, office, and on your laptop. All three
            at the same time if you want.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">Will it work offline?</h3>
          <p className="card-description">
            Yes. Carvd Studio works 100% offline. Take your laptop to job sites,
            work in your shop without WiFi, design anywhere. No internet
            required, ever.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">What if I need help?</h3>
          <p className="card-description">
            Email us anytime at support@carvd-studio.com. You'll get help from
            actual woodworkers who know the software inside and out. Most
            questions answered within 24 hours.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">
            What if my business grows and I need more licenses?
          </h3>
          <p className="card-description">
            Great question. Contact us at support@carvd-studio.com for team
            pricing on 5+ licenses. We offer volume discounts for shops and
            schools.
          </p>
        </div>
      </div>
    </div>
  );
}
