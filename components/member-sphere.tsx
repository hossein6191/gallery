"use client";

import { useEffect, useState } from "react";
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
    <div className="relative flex justify-center">
      {/* GenLayer mark glowing at the heart of the sphere */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <GenLayerMarkAnim variant="halo" size={340} className="absolute" />
        <GenLayerMarkAnim variant="prism" size={104} />
      </div>
      <SphereImageGrid
        images={items}
        containerSize={size}
        sphereRadius={size * 0.36}
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
