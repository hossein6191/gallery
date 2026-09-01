"use client";

import { useEffect, useRef, useState } from "react";
import SphereImageGrid, { type MemberSphereItem } from "@/components/ui/image-sphere";
import { GenLayerMarkAnim } from "@/components/ui/genlayer-mark-anim";
import { avatarUrl } from "@/lib/utils";

type Member = {
  id: number;
  twitter_handle: string;
  display_name: string;
};

export function MemberSphere({ size = 520 }: { size?: number }) {
  const [items, setItems] = useState<MemberSphereItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  // the sphere is laid out in pixels, so it has to be told the real width
  // available on the device instead of a fixed desktop number
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState(size);

  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.clientWidth ?? size;
      setBox(Math.max(240, Math.min(size, w - 8)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [size]);

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((data) => {
        const members: Member[] = data.members ?? [];
        if (!members.length) {
          setItems([]);
          return;
        }
        // A sparse sphere looks empty — repeat members until ~40 nodes.
        const target = Math.max(members.length, Math.min(40, members.length * 8));
        const filled: MemberSphereItem[] = [];
        for (let i = 0; i < target; i++) {
          const m = members[i % members.length];
          filled.push({
            id: `${m.id}-${i}`,
            src: avatarUrl(m.twitter_handle),
            alt: m.display_name,
            name: m.display_name,
            twitterHandle: m.twitter_handle,
          });
        }
        setItems(filled);
      })
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);

  if (loaded && !items.length) return null;

  return (
    <div ref={wrapRef} className="relative w-full flex justify-center">
      {/* GenLayer mark glowing at the heart of the sphere */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <GenLayerMarkAnim variant="halo" size={box * 0.71} className="absolute" />
        <GenLayerMarkAnim variant="prism" size={box * 0.22} />
      </div>
      <SphereImageGrid
        images={items}
        containerSize={box}
        sphereRadius={box * 0.36}
        dragSensitivity={0.8}
        momentumDecay={0.96}
        maxRotationSpeed={6}
        baseImageScale={0.13}
        autoRotate
        autoRotateSpeed={0.2}
      />
    </div>
  );
}
