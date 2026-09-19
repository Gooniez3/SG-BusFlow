"use client";

import dynamic from "next/dynamic";

export const DynamicStopMap = dynamic(() => import("./StopMap").then((mod) => mod.StopMap), {
  ssr: false,
  loading: () => <div className="bf-map-slot" />,
});
