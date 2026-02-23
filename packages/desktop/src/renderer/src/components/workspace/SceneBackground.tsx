import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const darkBackground = new THREE.Color('#1a1a1a');
const lightBackground = new THREE.Color('#f5f0e0');

interface SceneBackgroundProps {
  theme: 'light' | 'dark';
}

export function SceneBackground({ theme }: SceneBackgroundProps) {
  const scene = useThree((s) => s.scene);

  useEffect(() => {
    scene.background = theme === 'light' ? lightBackground : darkBackground;
  }, [theme, scene]);

  return null;
}
