"use client";

import { useEffect, useRef, useState } from "react";
import MapLibreGL from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { College } from "@/lib/college-types";

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface CollegeMapProps {
  readonly college: College;
  readonly className?: string;
}

// College coordinates lookup — lat/lng for US colleges
const COLLEGE_COORDS: Record<string, [number, number]> = {
  "Harvard University": [-71.1167, 42.3770],
  "Yale University": [-72.9223, 41.3163],
  "Princeton University": [-74.6514, 40.3573],
  "Columbia University": [-73.9626, 40.8075],
  "University of Pennsylvania": [-75.1932, 39.9522],
  "Brown University": [-71.4025, 41.8268],
  "Dartmouth College": [-72.2887, 43.7044],
  "Cornell University": [-76.4735, 42.4534],
  "MIT": [-71.0921, 42.3601],
  "Stanford University": [-122.1697, 37.4275],
  "Duke University": [-78.9382, 36.0014],
  "Northwestern University": [-87.6753, 42.0565],
  "Johns Hopkins University": [-76.6205, 39.3299],
  "Caltech": [-118.1253, 34.1377],
  "Rice University": [-95.4013, 29.7174],
  "Vanderbilt University": [-86.8025, 36.1447],
  "Washington University in St. Louis": [-90.3108, 38.6488],
  "Emory University": [-84.3233, 33.7925],
  "Georgetown University": [-77.0723, 38.9076],
  "Carnegie Mellon University": [-79.9427, 40.4433],
  "University of Notre Dame": [-86.2350, 41.7022],
  "University of Southern California": [-118.2851, 34.0224],
  "Tufts University": [-71.1190, 42.4075],
  "NYU": [-73.9965, 40.7295],
  "Boston College": [-71.1685, 42.3355],
  "Wake Forest University": [-80.2773, 36.1335],
  "Boston University": [-71.1054, 42.3505],
  "Northeastern University": [-71.0892, 42.3398],
  "Tulane University": [-90.1185, 29.9401],
  "Villanova University": [-75.3372, 40.0340],
  "Case Western Reserve University": [-81.6085, 41.5045],
  "UCLA": [-118.4452, 34.0689],
  "UC Berkeley": [-122.2585, 37.8719],
  "University of Michigan": [-83.7382, 42.2780],
  "University of Virginia": [-78.5080, 38.0336],
  "UNC Chapel Hill": [-79.0469, 35.9049],
  "Georgia Tech": [-84.3963, 33.7756],
  "UT Austin": [-97.7341, 30.2849],
  "University of Florida": [-82.3549, 29.6436],
  "University of Wisconsin-Madison": [-89.4125, 43.0766],
  "University of Illinois Urbana-Champaign": [-88.2272, 40.1020],
  "Ohio State University": [-83.0144, 40.0068],
  "Penn State University": [-77.8600, 40.7982],
  "University of Washington": [-122.3035, 47.6553],
  "Purdue University": [-86.9136, 40.4237],
  "University of Maryland": [-76.9426, 38.9869],
  "University of Minnesota": [-93.2277, 44.9740],
  "Indiana University Bloomington": [-86.5264, 39.1653],
  "Virginia Tech": [-80.4228, 37.2284],
  "Clemson University": [-82.8374, 34.6834],
  "University of Pittsburgh": [-79.9533, 40.4444],
  "University of Georgia": [-83.3771, 33.9480],
  "Florida State University": [-84.2986, 30.4419],
  "Texas A&M University": [-96.3441, 30.6187],
  "University of Colorado Boulder": [-105.2705, 40.0076],
  "University of Connecticut": [-72.2540, 41.8084],
  "Rutgers University": [-74.4474, 40.5008],
  "University of Iowa": [-91.5364, 41.6627],
  "Michigan State University": [-84.4839, 42.7018],
  "Arizona State University": [-111.9281, 33.4242],
  "University of South Carolina": [-81.0348, 33.9940],
  "University of Tennessee Knoxville": [-83.9408, 35.9544],
  "University of Oregon": [-123.0780, 44.0448],
  "University of Alabama": [-87.5497, 33.2140],
  "University of Kentucky": [-84.5040, 38.0317],
  "Iowa State University": [-93.6466, 42.0267],
  "University of Kansas": [-95.2558, 38.9543],
  "University of Nebraska-Lincoln": [-96.7001, 40.8202],
  "University of Oklahoma": [-97.4395, 35.2058],
  "University of Arkansas": [-94.1748, 36.0685],
  "University of Mississippi": [-89.5265, 34.3668],
  "University of Arizona": [-110.9503, 32.2319],
  "University of Utah": [-111.8421, 40.7649],
  "Colorado State University": [-105.0844, 40.5734],
  "NC State University": [-78.6777, 35.7872],
  "University of Central Florida": [-81.2001, 28.6024],
  "San Diego State University": [-117.0703, 32.7757],
  "George Washington University": [-77.0481, 38.8997],
  "Syracuse University": [-76.1351, 43.0392],
  "University of Miami": [-80.2781, 25.7175],
  "Lehigh University": [-75.3776, 40.6063],
  "University of Rochester": [-77.6287, 43.1289],
  "Brandeis University": [-71.2598, 42.3659],
  "Worcester Polytechnic Institute": [-71.8083, 42.2746],
  "Stevens Institute of Technology": [-74.0237, 40.7453],
  "RPI": [-73.6766, 42.7302],
  "Drexel University": [-75.1876, 39.9566],
  "Fordham University": [-73.8886, 40.8612],
  "American University": [-77.0919, 38.9365],
  "SMU": [-96.7844, 32.8412],
  "TCU": [-97.3629, 32.7098],
  "Baylor University": [-97.1186, 31.5487],
  "University of Denver": [-104.9634, 39.6782],
  "Loyola Marymount University": [-118.4195, 33.9710],
  "Santa Clara University": [-121.9404, 37.3496],
  "Gonzaga University": [-117.4001, 47.6671],
  "University of San Diego": [-117.1883, 32.7719],
  "Pepperdine University": [-118.7148, 34.0360],
};

// Fallback: approximate from state
const STATE_COORDS: Record<string, [number, number]> = {
  AL: [-86.9023, 32.3182], AK: [-153.3694, 63.5888], AZ: [-111.0937, 34.0489],
  AR: [-92.3731, 34.7465], CA: [-119.4179, 36.7783], CO: [-105.7821, 39.5501],
  CT: [-72.7554, 41.6032], DC: [-77.0369, 38.9072], DE: [-75.5277, 38.9108],
  FL: [-81.5158, 27.6648], GA: [-83.6431, 32.1656], HI: [-155.4983, 19.8968],
  ID: [-114.7420, 44.0682], IL: [-89.3985, 40.6331], IN: [-86.1349, 40.2672],
  IA: [-93.0977, 41.8780], KS: [-98.4842, 39.0119], KY: [-84.2700, 37.8393],
  LA: [-91.1871, 30.9843], ME: [-69.4455, 45.2538], MD: [-76.6413, 39.0458],
  MA: [-71.3824, 42.4072], MI: [-84.5555, 44.3148], MN: [-94.6859, 46.7296],
  MS: [-89.6785, 32.3547], MO: [-91.8318, 38.5767], MT: [-109.5337, 46.8797],
  NE: [-99.9018, 41.4925], NV: [-116.4194, 38.8026], NH: [-71.5724, 43.1939],
  NJ: [-74.4057, 40.0583], NM: [-105.8701, 34.5199], NY: [-74.2179, 43.2994],
  NC: [-79.0193, 35.7596], ND: [-101.0020, 47.5515], OH: [-82.9071, 40.4173],
  OK: [-97.0929, 35.0078], OR: [-120.5542, 43.8041], PA: [-77.2098, 41.2033],
  RI: [-71.4774, 41.5801], SC: [-81.1637, 33.8361], SD: [-99.9018, 43.9695],
  TN: [-86.5804, 35.5175], TX: [-99.9018, 31.9686], UT: [-111.0937, 39.3210],
  VT: [-72.5778, 44.5588], VA: [-78.6569, 37.4316], WA: [-120.7401, 47.7511],
  WV: [-80.4549, 38.5976], WI: [-89.6165, 43.7844], WY: [-107.2903, 43.0760],
};

function getCollegeCoords(college: College): [number, number] {
  const exact = COLLEGE_COORDS[college.name];
  if (exact) return exact;
  const stateCoords = STATE_COORDS[college.state];
  if (stateCoords) return stateCoords;
  return [-98.5795, 39.8283]; // center of US
}

export function CollegeMap({ college, className }: CollegeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreGL.Map | null>(null);
  const markerRef = useRef<MapLibreGL.Marker | null>(null);
  const [loaded, setLoaded] = useState(false);

  const coords = getCollegeCoords(college);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: coords,
      zoom: 11,
      renderWorldCopies: false,
      attributionControl: false,
    });

    map.on("load", () => setLoaded(true));
    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setLoaded(false);
    };
  }, []);

  // Update marker + center when college changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    markerRef.current?.remove();

    const el = document.createElement("div");
    el.innerHTML = `
      <div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 0 12px rgba(59,130,246,0.6);"></div>
    `;

    const marker = new MapLibreGL.Marker({ element: el })
      .setLngLat(coords)
      .addTo(map);

    markerRef.current = marker;

    map.flyTo({ center: coords, zoom: 11, duration: 1200 });
  }, [college.name, coords, loaded]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.06] ${className ?? ""}`}>
      <div ref={containerRef} className="w-full h-full min-h-[250px]" />
      {loaded && (
        <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-[#06060f]/85 backdrop-blur-md ring-1 ring-white/[0.08] px-3 py-1.5 text-xs text-zinc-300">
          {college.name} &middot; {college.state}
        </div>
      )}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c1a]">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse [animation-delay:300ms]" />
          </div>
        </div>
      )}
    </div>
  );
}
