import type { useThree } from '@react-three/fiber';
import type { ElementRef } from 'react';
import type { OrbitControls } from '@react-three/drei';

declare global {
  interface Window {
    useSimulatorStore?: typeof import('../store/useSimulatorStore').useSimulatorStore;
    threeState?: ReturnType<typeof useThree>;
    threeScene?: ReturnType<typeof useThree>['scene'];
    threeControls?: ElementRef<typeof OrbitControls> | null;
  }
}

export {};
