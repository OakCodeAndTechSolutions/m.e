import { Shield, MapPin, Award } from 'lucide-react';

const items = [
  {
    icon: Award,
    title: 'A-Grade licensed',
    description: 'Licensed electrician for residential, commercial and industrial work.',
  },
  {
    icon: MapPin,
    title: 'Melbourne based',
    description:
      'Electrical work across metropolitan Melbourne, with remote support for web projects.',
  },
  {
    icon: Shield,
    title: 'Work directly with me',
    description:
      'Discuss the scope, ask questions and review progress with the person doing the work.',
  },
];

export default function TrustStrip() {
  return (
    <section
      className="border-y border-border/50 bg-surface-2/30 py-12 sm:py-16"
      aria-label="Credentials"
    >
      <div className="container">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {items.map((item) => (
            <div key={item.title} className="flex items-start gap-4">
              <div className="shrink-0 rounded-lg bg-primary/10 p-2.5">
                <item.icon className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
