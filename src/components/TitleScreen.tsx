import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

// Earth component with rotation
function Earth() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001; // Slow rotation
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        color="#2a5a8a"
        roughness={0.8}
        metalness={0.2}
      >
        {/* We can add a texture map here later */}
      </meshStandardMaterial>
    </mesh>
  );
}

// Moon component orbiting Earth
function Moon() {
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += 0.003; // Orbital rotation
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002; // Moon's own rotation
    }
  });

  return (
    <group ref={orbitRef}>
      <mesh ref={meshRef} position={[5, 0.5, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color="#a0a0a0"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

// Star field background
function Stars() {
  const count = 5000;
  const starsRef = useRef<THREE.Points>(null);

  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Random position in a large sphere
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = Math.random() * 1.5 + 0.5;
    }

    return [positions, sizes];
  }, []);

  useFrame((state) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001; // Very slow rotation
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ffffff"
        size={0.1}
        sizeAttenuation
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Nebula-like particle effect
function Nebula() {
  const count = 2000;
  const nebulaRef = useRef<THREE.Points>(null);

  const [positions, colors, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Random position in a toroidal shape around Earth
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * 10;
      const radius = 8 + Math.random() * 12;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Purple/blue nebula colors
      const colorChoice = Math.random();
      if (colorChoice < 0.5) {
        // Purple
        colors[i * 3] = 0.5 + Math.random() * 0.3;
        colors[i * 3 + 1] = 0.2 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.7 + Math.random() * 0.3;
      } else {
        // Blue
        colors[i * 3] = 0.2 + Math.random() * 0.2;
        colors[i * 3 + 1] = 0.4 + Math.random() * 0.3;
        colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
      }

      sizes[i] = Math.random() * 3 + 1;
    }

    return [positions, colors, sizes];
  }, []);

  useFrame((state) => {
    if (nebulaRef.current) {
      nebulaRef.current.rotation.y -= 0.0002;
    }
  });

  return (
    <points ref={nebulaRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        sizeAttenuation
        transparent
        opacity={0.3}
        vertexColors
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Camera controller for smooth movement
function CameraController() {
  useFrame((state) => {
    // Gentle camera movement
    const time = state.clock.getElapsedTime();
    state.camera.position.x = Math.sin(time * 0.1) * 2;
    state.camera.position.y = Math.sin(time * 0.05) * 1 + 2;
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

interface TitleScreenProps {
  basePath?: string;
}

export default function TitleScreen({ basePath = '' }: TitleScreenProps) {
  const [selectedOption, setSelectedOption] = useState(0);

  const menuOptions = [
    { label: 'Start Game', href: `${basePath}character-create` },
    { label: 'Walkable Demo', href: `${basePath}walkable` },
    { label: 'Combat Demo', href: `${basePath}attackable` },
    { label: 'Asset Gallery', href: `${basePath}player` },
  ];

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowUp') {
      setSelectedOption((prev) => (prev - 1 + menuOptions.length) % menuOptions.length);
    } else if (event.key === 'ArrowDown') {
      setSelectedOption((prev) => (prev + 1) % menuOptions.length);
    } else if (event.key === 'Enter') {
      window.location.href = menuOptions[selectedOption].href;
    }
  };

  // Add keyboard listener
  useState(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#000' }}>
      {/* 3D Canvas */}
      <Canvas camera={{ position: [8, 3, 8], fov: 60 }}>
        {/* Lighting */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, 5, -10]} intensity={0.5} color="#6677ff" />

        {/* Space elements */}
        <Stars />
        <Nebula />
        <Earth />
        <Moon />

        {/* Camera animation */}
        <CameraController />
      </Canvas>

      {/* UI Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
        }}
      >
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '4rem',
              fontWeight: 'bold',
              margin: 0,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 40px rgba(102, 126, 234, 0.5)',
              letterSpacing: '0.1em',
            }}
          >
            PHANTASY STAR ZERO
          </h1>
          <p
            style={{
              fontSize: '1.2rem',
              color: '#aaa',
              marginTop: '1rem',
              letterSpacing: '0.2em',
            }}
          >
            A FAN RECREATION
          </p>
        </div>

        {/* Menu */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            pointerEvents: 'auto',
          }}
        >
          {menuOptions.map((option, index) => (
            <a
              key={option.label}
              href={option.href}
              onMouseEnter={() => setSelectedOption(index)}
              style={{
                fontSize: '1.5rem',
                color: selectedOption === index ? '#667eea' : '#888',
                textDecoration: 'none',
                textAlign: 'center',
                padding: '0.75rem 2rem',
                borderRadius: '8px',
                background: selectedOption === index ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                border: selectedOption === index ? '2px solid #667eea' : '2px solid transparent',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                textShadow: selectedOption === index ? '0 0 20px rgba(102, 126, 234, 0.8)' : 'none',
                fontWeight: selectedOption === index ? 'bold' : 'normal',
                letterSpacing: '0.1em',
              }}
            >
              {option.label}
            </a>
          ))}
        </div>

        {/* Controls hint */}
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            fontSize: '0.9rem',
            color: '#666',
            textAlign: 'center',
          }}
        >
          <p>Use ↑↓ arrows or hover to select • Press Enter or click to start</p>
        </div>
      </div>
    </div>
  );
}
