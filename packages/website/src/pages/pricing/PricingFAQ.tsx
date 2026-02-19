import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    <div className="mb-16 mt-16">
      <h2 className="mb-8 text-center text-4xl font-bold">
        Your Questions, Answered
      </h2>
      <Accordion type="multiple" className="grid gap-4">
        <AccordionItem
          value="payment"
          className="rounded-lg border bg-card px-6"
        >
          <AccordionTrigger className="text-left text-xl font-bold">
            Is this really a one-time payment?
          </AccordionTrigger>
          <AccordionContent className="text-text-muted">
            Yes. $59.99 once, and you own Carvd Studio forever. No monthly fees,
            no annual renewals, no surprise charges. We hate subscriptions as
            much as you do.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="updates"
          className="rounded-lg border bg-card px-6"
        >
          <AccordionTrigger className="text-left text-xl font-bold">
            Do I get future updates?
          </AccordionTrigger>
          <AccordionContent className="text-text-muted">
            All future updates are included free forever. New features,
            improvements, bug fixes— you get them all automatically. No
            "upgrade" fees, no "pro" tiers, no games.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="satisfaction"
          className="rounded-lg border bg-card px-6"
        >
          <AccordionTrigger className="text-left text-xl font-bold">
            What if I'm not satisfied?
          </AccordionTrigger>
          <AccordionContent className="text-text-muted">
            We offer a 30-day, no-questions-asked money-back guarantee. If Carvd
            Studio doesn't save you time and money, email us for a full refund.
            You risk nothing.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="devices"
          className="rounded-lg border bg-card px-6"
        >
          <AccordionTrigger className="text-left text-xl font-bold">
            Can I use it on multiple computers?
          </AccordionTrigger>
          <AccordionContent className="text-text-muted">
            Your license works on up to 3 devices—any combination of Mac and
            Windows. Use it in your shop, office, and on your laptop. All three
            at the same time if you want.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="offline"
          className="rounded-lg border bg-card px-6"
        >
          <AccordionTrigger className="text-left text-xl font-bold">
            Will it work offline?
          </AccordionTrigger>
          <AccordionContent className="text-text-muted">
            Yes. Carvd Studio works 100% offline. Take your laptop to job sites,
            work in your shop without WiFi, design anywhere. No internet
            required, ever.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="help" className="rounded-lg border bg-card px-6">
          <AccordionTrigger className="text-left text-xl font-bold">
            What if I need help?
          </AccordionTrigger>
          <AccordionContent className="text-text-muted">
            Email us anytime at support@carvd-studio.com. You'll get help from
            actual woodworkers who know the software inside and out. Most
            questions answered within 24 hours.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="team"
          className="rounded-lg border bg-card px-6"
        >
          <AccordionTrigger className="text-left text-xl font-bold">
            What if my business grows and I need more licenses?
          </AccordionTrigger>
          <AccordionContent className="text-text-muted">
            Great question. Contact us at support@carvd-studio.com for team
            pricing on 5+ licenses. We offer volume discounts for shops and
            schools.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
