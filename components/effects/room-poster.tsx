import Image from 'next/image';
import { cn } from '@/lib/utils';
import roomPoster from '@/public/images/room-poster.jpg';

/** Still frame of the idle camera — stands in for the room until WebGL is requested and ready. */
export function RoomPoster({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn('absolute inset-0 bg-[#c5c2bb]', className)} aria-hidden>
      <Image
        src={roomPoster}
        alt=""
        fill
        sizes="100vw"
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
