"use client";

import { useState, useEffect, useRef } from "react";

export default function useSticky<T extends HTMLElement>() {
  const [isSticky, setIsSticky] = useState(false);
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: [1], rootMargin: "-1px 0px 0px 0px" } // A tiny negative margin ensures it triggers correctly
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, []);

  return { ref, isSticky };
}
